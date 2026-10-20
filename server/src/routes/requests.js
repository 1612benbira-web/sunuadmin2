import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.js';
import ApplicationRequest from '../models/ApplicationRequest.js';
import Procedure from '../models/Procedure.js';
import AuditLog from '../models/AuditLog.js';
import { verifierTransition } from '../services/workflow.js';
import multer from 'multer';
import User from '../models/User.js';
import Document from '../models/Document.js';
import { storage, detectType } from '../services/storage.js';
import { notify, audit as auditH } from '../utils/helpers.js';
const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const EXT = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' };
const r = Router(); r.use(authenticate);
const ref = () => `SA-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const peutVoir = (u, d) => u.role === 'ADMIN' || (u.role === 'CITOYEN' && String(d.demandeur) === u.id) || (u.role === 'AGENT' && String(d.agent) === u.id);
r.get('/', async (req, res) => {
  const f = req.user.role === 'CITOYEN' ? { demandeur: req.user.id } : req.user.role === 'AGENT' ? { agent: req.user.id } : {};
  if (req.query.statut) f.statut = String(req.query.statut);
  res.json(await ApplicationRequest.find(f).sort('-createdAt').limit(100).populate('procedure', 'nom').populate('demandeur', 'nom prenom'));
});
r.post('/', async (req, res) => {
  if (req.user.role !== 'CITOYEN') return res.status(403).json({ message: 'Réservé aux citoyens.' });
  const p = await Procedure.findOne({ _id: req.body.procedure, actif: true }).catch(() => null);
  if (!p) return res.status(404).json({ message: 'Procédure introuvable.' });
  res.status(201).json(await ApplicationRequest.create({ demandeur: req.user.id, procedure: p.id, reponses: req.body.reponses || {} }));
});
r.get('/stats/me', async (req, res) => {
  if (req.user.role !== 'AGENT') return res.status(403).json({ message: 'Réservé aux agents.' });
  const mine = { agent: req.user._id };
  const [parStatut, delai] = await Promise.all([
    ApplicationRequest.aggregate([{ $match: mine }, { $group: { _id: '$statut', n: { $sum: 1 } } }]),
    ApplicationRequest.aggregate([{ $match: { ...mine, soumisLe: { $type: 'date' }, decisionLe: { $type: 'date' } } }, { $group: { _id: null, ms: { $avg: { $subtract: ['$decisionLe', '$soumisLe'] } } } }]),
  ]);
  const c = Object.fromEntries(parStatut.map((x) => [x._id, x.n]));
  res.json({ attribues: Object.values(c).reduce((a, b) => a + b, 0), enCours: c.EN_COURS || 0, complement: c.COMPLEMENT_REQUIS || 0, acceptes: c.ACCEPTE || 0, rejetes: c.REJETE || 0, delaiMoyenHeures: delai[0] ? +(delai[0].ms / 36e5).toFixed(2) : null });
});
r.get('/:id', async (req, res) => {
  const d = await ApplicationRequest.findById(req.params.id).catch(() => null);
  if (!d || !peutVoir(req.user, d)) return res.status(404).json({ message: 'Dossier introuvable.' });
  res.json(d);
});
const st = z.object({ statut: z.string(), motif: z.string().optional() });
r.patch('/:id/status', async (req, res) => {
  const p = st.safeParse(req.body); if (!p.success) return res.status(422).json({ message: 'Données invalides.' });
  const d = await ApplicationRequest.findById(req.params.id).catch(() => null);
  if (!d || !peutVoir(req.user, d)) return res.status(404).json({ message: 'Dossier introuvable.' });
  const v = verifierTransition(d.statut, p.data.statut, req.user.role, p.data.motif);
  if (!v.ok) return res.status(v.code).json({ message: v.message });
  const ancien = d.statut;
  if (p.data.statut === 'SOUMIS') { d.procedureSnapshot = await Procedure.findById(d.procedure).lean(); d.reference = ref(); d.soumisLe = new Date(); }
  if (['ACCEPTE', 'REJETE'].includes(p.data.statut)) { d.decisionLe = new Date(); d.motifDecision = p.data.motif; }
  d.statut = p.data.statut;
  d.historique.push({ ancien, nouveau: d.statut, auteur: req.user.id, motif: p.data.motif });
  await d.save();
  const txt = `Dossier ${d.reference || ''} : nouveau statut ${d.statut}`;
  if (req.user.role !== 'CITOYEN') await notify(d.demandeur, 'STATUT', txt, d.id);
  else if (d.agent) await notify(d.agent, 'STATUT', txt, d.id);
  await AuditLog.create({ acteur: req.user.id, action: 'REQUEST_STATUS', ressource: 'ApplicationRequest', ressourceId: d.id, resultat: 'OK' });
  res.json(d);
});
r.get('/:id/history', async (req, res) => {
  const d = await ApplicationRequest.findById(req.params.id).catch(() => null);
  if (!d || !peutVoir(req.user, d)) return res.status(404).json({ message: 'Dossier introuvable.' });
  res.json(d.historique);
});
r.post('/:id/assign', async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Accès refusé.' });
  const d = await ApplicationRequest.findById(req.params.id).catch(() => null);
  const a = /^[a-f\d]{24}$/i.test(String(req.body.agent)) && await User.findOne({ _id: req.body.agent, role: 'AGENT', actif: true });
  if (!d || !a) return res.status(404).json({ message: 'Dossier ou agent introuvable.' });
  if (['BROUILLON', 'CLOTURE'].includes(d.statut)) return res.status(409).json({ message: 'Affectation impossible dans ce statut.' });
  const svc = d.procedureSnapshot?.service;
  if (svc && !a.services.some((x) => String(x) === String(svc))) return res.status(409).json({ message: "Cet agent n'est pas rattaché au service responsable de cette démarche." });
  d.agent = a.id; d.historique.push({ ancien: d.statut, nouveau: d.statut, auteur: req.user.id, evenement: 'AFFECTATION', motif: `Affecté à ${a.prenom} ${a.nom}` }); await d.save(); await notify(a.id, 'AFFECTATION', `Dossier ${d.reference} affecté`, d.id); await auditH(req, 'REQUEST_ASSIGN', 'ApplicationRequest', d.id);
  res.json(d);
});
r.post('/:id/documents', up.single('fichier'), async (req, res) => {
  const d = await ApplicationRequest.findById(req.params.id).catch(() => null);
  if (!d || String(d.demandeur) !== req.user.id) return res.status(404).json({ message: 'Dossier introuvable.' });
  if (!['BROUILLON', 'COMPLEMENT_REQUIS'].includes(d.statut)) return res.status(409).json({ message: 'Ajout de pièce impossible dans ce statut.' });
  if (!req.file) return res.status(422).json({ message: 'Fichier requis.' });
  const type = detectType(req.file.buffer);
  if (!type) return res.status(415).json({ message: 'Type de fichier non autorisé (PDF, PNG, JPEG).' });
  const cle = await storage.save(req.file.buffer, EXT[type]);
  const doc = await Document.create({ proprietaire: req.user.id, demande: d.id, categorie: req.body.categorie, nomOriginal: req.file.originalname.slice(0, 100), cleStockage: cle, type, taille: req.file.size });
  await notify(d.agent, 'PIECE', `Nouvelle pièce sur ${d.reference}`, d.id);
  res.status(201).json({ id: doc.id, type, taille: doc.taille, verification: doc.verification });
});
r.get('/:id/documents', async (req, res) => {
  const d = await ApplicationRequest.findById(req.params.id).catch(() => null);
  if (!d || !peutVoir(req.user, d)) return res.status(404).json({ message: 'Dossier introuvable.' });
  res.json(await Document.find({ demande: d.id }));
});
export default r;

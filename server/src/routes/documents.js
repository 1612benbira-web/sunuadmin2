import { Router } from 'express';
import Document from '../models/Document.js';
import ApplicationRequest from '../models/ApplicationRequest.js';
import { authenticate } from '../middlewares/auth.js';
import { storage } from '../services/storage.js';
import { audit, wrap, validId } from '../utils/helpers.js';
const r = Router(); r.use(authenticate);
export const peutVoir = (u, d) => u.role === 'ADMIN' || (u.role === 'CITOYEN' && String(d.demandeur) === u.id) || (u.role === 'AGENT' && String(d.agent) === u.id);
async function charger(req, res) {
  const doc = validId(req.params.id) && await Document.findById(req.params.id).select('+cleStockage');
  const dem = doc && await ApplicationRequest.findById(doc.demande);
  if (!doc || !dem || !peutVoir(req.user, dem)) { res.status(404).json({ message: 'Document introuvable.' }); return null; }
  return doc;
}
r.get('/:id', wrap(async (req, res) => { const d = await charger(req, res); if (d) { const { cleStockage, ...pub } = d.toObject(); res.json(pub); } }));
r.get('/:id/download', wrap(async (req, res) => {
  const d = await charger(req, res); if (!d) return;
  await audit(req, 'DOCUMENT_DOWNLOAD', 'Document', d.id);
  res.set({ 'Content-Type': d.type, 'Content-Disposition': 'attachment', 'X-Content-Type-Options': 'nosniff' }).send(await storage.read(d.cleStockage));
}));
r.patch('/:id/verification', wrap(async (req, res) => {
  if (!['AGENT', 'ADMIN'].includes(req.user.role) || !['VALIDE', 'REFUSE'].includes(req.body.verification)) return res.status(403).json({ message: 'Accès refusé ou valeur invalide.' });
  const d = await charger(req, res); if (!d) return;
  d.verification = req.body.verification; d.verifiePar = req.user.id; await d.save();
  await audit(req, 'DOCUMENT_VERIFY', 'Document', d.id); res.json({ id: d.id, verification: d.verification });
}));
export default r;

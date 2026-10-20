import User from '../models/User.js';
import ApplicationRequest from '../models/ApplicationRequest.js';
import AdministrativeService from '../models/AdministrativeService.js';
// Indicateurs sur les dossiers SOUMIS (hors brouillons). Délai moyen = soumission → décision (ACCEPTE/REJETE), dossiers ayant les deux dates.
export async function dashboard() {
  const sub = { statut: { $ne: 'BROUILLON' } };
  const [citoyens, agents, parStatut, delai] = await Promise.all([
    User.countDocuments({ role: 'CITOYEN', actif: true }), User.countDocuments({ role: 'AGENT', actif: true }),
    ApplicationRequest.aggregate([{ $match: sub }, { $group: { _id: '$statut', n: { $sum: 1 } } }]),
    ApplicationRequest.aggregate([{ $match: { soumisLe: { $type: 'date' }, decisionLe: { $type: 'date' } } },
      { $group: { _id: null, ms: { $avg: { $subtract: ['$decisionLe', '$soumisLe'] } }, n: { $sum: 1 } } }]),
  ]);
  const c = Object.fromEntries(parStatut.map((s) => [s._id, s.n]));
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  return { citoyens, agents, totalSoumis: total, enAttente: (c.SOUMIS || 0) + (c.EN_ATTENTE || 0), enCours: c.EN_COURS || 0,
    acceptes: c.ACCEPTE || 0, rejetes: c.REJETE || 0, delaiMoyenHeures: delai[0] ? +(delai[0].ms / 36e5).toFixed(2) : null, delaiMoyenJours: delai[0] ? +(delai[0].ms / 864e5).toFixed(2) : null, dossiersPourDelai: delai[0]?.n || 0 };
}

// Tendances : dossiers soumis par jour (UTC) sur N jours, jours sans dossier à 0 ; répartition par service sur tous les dossiers soumis (brouillons exclus).
export async function tendances(jours = 30) {
  const debut = new Date(); debut.setUTCHours(0, 0, 0, 0); debut.setUTCDate(debut.getUTCDate() - (jours - 1));
  const [parJour, parService] = await Promise.all([
    ApplicationRequest.aggregate([{ $match: { soumisLe: { $gte: debut } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$soumisLe' } }, n: { $sum: 1 } } }]),
    ApplicationRequest.aggregate([{ $match: { statut: { $ne: 'BROUILLON' } } }, { $group: { _id: '$procedureSnapshot.service', n: { $sum: 1 } } }]),
  ]);
  const map = Object.fromEntries(parJour.map((x) => [x._id, x.n]));
  const serie = [];
  for (let i = 0; i < jours; i++) { const d = new Date(debut); d.setUTCDate(d.getUTCDate() + i); const k = d.toISOString().slice(0, 10); serie.push({ date: k, soumis: map[k] || 0 }); }
  const ids = parService.map((x) => x._id).filter(Boolean);
  const noms = Object.fromEntries((await AdministrativeService.find({ _id: { $in: ids } }).select('nom').lean()).map((s) => [String(s._id), s.nom]));
  const services = parService.map((x) => ({ service: x._id ? noms[String(x._id)] || 'Service supprimé' : 'Sans service', n: x.n })).sort((a, b) => b.n - a.n);
  return { jours, serie, services };
}

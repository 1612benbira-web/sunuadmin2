import User from '../models/User.js';
import ApplicationRequest from '../models/ApplicationRequest.js';
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

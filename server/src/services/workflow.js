export const TRANSITIONS = {
  BROUILLON: { SOUMIS: ['CITOYEN'] },
  SOUMIS: { EN_ATTENTE: ['ADMIN'], EN_COURS: ['AGENT', 'ADMIN'] },
  EN_ATTENTE: { EN_COURS: ['AGENT', 'ADMIN'] },
  EN_COURS: { COMPLEMENT_REQUIS: ['AGENT', 'ADMIN'], ACCEPTE: ['AGENT', 'ADMIN'], REJETE: ['AGENT', 'ADMIN'] },
  COMPLEMENT_REQUIS: { EN_COURS: ['CITOYEN', 'AGENT', 'ADMIN'] },
  ACCEPTE: { CLOTURE: ['ADMIN'] }, REJETE: { CLOTURE: ['ADMIN'] }, CLOTURE: {},
};
const MOTIF_REQUIS = ['COMPLEMENT_REQUIS', 'REJETE'];
export function verifierTransition(de, vers, role, motif) {
  const roles = TRANSITIONS[de]?.[vers];
  if (!roles) return { ok: false, code: 409, message: `Transition ${de} → ${vers} interdite.` };
  if (!roles.includes(role)) return { ok: false, code: 403, message: 'Rôle non autorisé pour cette transition.' };
  if (MOTIF_REQUIS.includes(vers) && !(motif && motif.trim().length >= 5))
    return { ok: false, code: 422, message: 'Un motif est obligatoire.' };
  return { ok: true };
}

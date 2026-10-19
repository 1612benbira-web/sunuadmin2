import mongoose from 'mongoose';
export const STATUTS = ['BROUILLON','SOUMIS','EN_ATTENTE','EN_COURS','COMPLEMENT_REQUIS','ACCEPTE','REJETE','CLOTURE'];
const histo = new mongoose.Schema({
  ancien: String, nouveau: String, auteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  motif: String, date: { type: Date, default: Date.now },
}, { _id: false });
const schema = new mongoose.Schema({
  reference: { type: String, unique: true, sparse: true },
  demandeur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  procedure: { type: mongoose.Schema.Types.ObjectId, ref: 'Procedure', required: true },
  procedureSnapshot: { type: Object },
  statut: { type: String, enum: STATUTS, default: 'BROUILLON', index: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  reponses: { type: Object, default: {} },
  motifDecision: String, soumisLe: Date, decisionLe: Date, historique: [histo],
}, { timestamps: true });
export default mongoose.model('ApplicationRequest', schema);

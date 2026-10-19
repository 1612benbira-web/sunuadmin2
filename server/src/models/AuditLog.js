import mongoose from 'mongoose';
export default mongoose.model('AuditLog', new mongoose.Schema({
  acteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, action: { type: String, index: true },
  ressource: String, ressourceId: String, resultat: String, date: { type: Date, default: Date.now, index: true },
}));

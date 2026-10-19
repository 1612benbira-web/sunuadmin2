import mongoose from 'mongoose';
export default mongoose.model('Document', new mongoose.Schema({
  proprietaire: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  demande: { type: mongoose.Schema.Types.ObjectId, ref: 'ApplicationRequest', required: true, index: true },
  categorie: String, nomOriginal: String, cleStockage: { type: String, required: true, select: false },
  type: String, taille: Number, verification: { type: String, enum: ['EN_ATTENTE', 'VALIDE', 'REFUSE'], default: 'EN_ATTENTE' },
  verifiePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));

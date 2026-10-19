import mongoose from 'mongoose';
export default mongoose.model('AdministrativeService', new mongoose.Schema({
  nom: { type: String, required: true, unique: true, trim: true }, description: String, actif: { type: Boolean, default: true },
}, { timestamps: true }));

import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['CITOYEN', 'AGENT', 'ADMIN'], default: 'CITOYEN', index: true },
  actif: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('User', schema);

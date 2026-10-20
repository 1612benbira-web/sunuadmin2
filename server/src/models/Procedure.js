import mongoose from 'mongoose';
export const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'email', 'tel'];
const field = new mongoose.Schema({
  name: { type: String, required: true }, label: { type: String, required: true },
  type: { type: String, enum: FIELD_TYPES, required: true },
  required: { type: Boolean, default: false }, options: [String],
}, { _id: false });
const schema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true }, description: String,
  categorie: { type: String, index: true }, service: { type: mongoose.Schema.Types.ObjectId, ref: 'AdministrativeService' }, version: { type: Number, default: 1 },
  champs: [field], piecesRequises: [String], instructions: String, delaiIndicatifJours: Number,
  actif: { type: Boolean, default: true },
}, { timestamps: true });
schema.index({ nom: 'text', description: 'text' });
export default mongoose.model('Procedure', schema);

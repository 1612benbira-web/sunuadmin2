import mongoose from 'mongoose';
const s = new mongoose.Schema({
  destinataire: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: String, message: String, requestId: mongoose.Schema.Types.ObjectId,
  lu: { type: Boolean, default: false },
}, { timestamps: true });
s.index({ destinataire: 1, lu: 1, createdAt: -1 });
export default mongoose.model('Notification', s);

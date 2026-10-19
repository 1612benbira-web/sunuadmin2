import { Router } from 'express';
import Notification from '../models/Notification.js';
import { authenticate } from '../middlewares/auth.js';
import { wrap, validId } from '../utils/helpers.js';
const r = Router(); r.use(authenticate);
r.get('/', wrap(async (req, res) => res.json(await Notification.find({ destinataire: req.user.id }).sort('-createdAt').limit(50))));
r.patch('/read-all', wrap(async (req, res) => { await Notification.updateMany({ destinataire: req.user.id, lu: false }, { lu: true }); res.status(204).end(); }));
r.patch('/:id/read', wrap(async (req, res) => {
  const n = validId(req.params.id) && await Notification.findOneAndUpdate({ _id: req.params.id, destinataire: req.user.id }, { lu: true }, { new: true });
  n ? res.json(n) : res.status(404).json({ message: 'Introuvable.' });
}));
export default r;

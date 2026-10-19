import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import User from '../models/User.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { audit, wrap, page, validId } from '../utils/helpers.js';
const r = Router(); r.use(authenticate, authorize('ADMIN'));
r.get('/', wrap(async (req, res) => {
  const f = {}; if (req.query.role) f.role = String(req.query.role); const { skip, limit, p } = page(req.query);
  const [data, total] = await Promise.all([User.find(f).sort('-createdAt').skip(skip).limit(limit), User.countDocuments(f)]);
  res.json({ data, page: p, total });
}));
r.get('/:id', wrap(async (req, res) => { const u = validId(req.params.id) && await User.findById(req.params.id); u ? res.json(u) : res.status(404).json({ message: 'Introuvable.' }); }));
r.post('/', wrap(async (req, res) => {
  const p = z.object({ nom: z.string().min(1), prenom: z.string().min(1), email: z.string().email(), password: z.string().min(12), role: z.enum(['AGENT', 'CITOYEN']) }).safeParse(req.body);
  if (!p.success) return res.status(422).json({ message: 'Données invalides.' });
  const { password, ...d } = p.data;
  if (await User.exists({ email: d.email.toLowerCase() })) return res.status(409).json({ message: 'E-mail déjà utilisé.' });
  const u = await User.create({ ...d, passwordHash: await bcrypt.hash(password, 12) }); await audit(req, 'USER_CREATE', 'User', u.id); res.status(201).json(u);
}));
r.patch('/:id/status', wrap(async (req, res) => {
  if (!validId(req.params.id) || typeof req.body.actif !== 'boolean') return res.status(422).json({ message: 'Données invalides.' });
  if (req.params.id === req.user.id) return res.status(409).json({ message: 'Vous ne pouvez pas désactiver votre propre compte.' });
  const u = await User.findByIdAndUpdate(req.params.id, { actif: req.body.actif }, { new: true });
  if (!u) return res.status(404).json({ message: 'Introuvable.' });
  await audit(req, 'USER_STATUS', 'User', u.id); res.json(u);
}));
export default r;

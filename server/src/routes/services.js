import { Router } from 'express';
import { z } from 'zod';
import AdministrativeService from '../models/AdministrativeService.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { audit, wrap, validId } from '../utils/helpers.js';
const r = Router(); r.use(authenticate);
r.get('/', wrap(async (req, res) => res.json(await AdministrativeService.find(req.user.role === 'ADMIN' ? {} : { actif: true }))));
const b = z.object({ nom: z.string().min(2), description: z.string().optional(), actif: z.boolean().optional() });
r.post('/', authorize('ADMIN'), wrap(async (req, res) => {
  const p = b.safeParse(req.body); if (!p.success) return res.status(422).json({ message: 'Données invalides.' });
  const d = await AdministrativeService.create(p.data); await audit(req, 'SERVICE_CREATE', 'Service', d.id); res.status(201).json(d);
}));
r.patch('/:id', authorize('ADMIN'), wrap(async (req, res) => {
  const p = b.partial().safeParse(req.body); if (!p.success || !validId(req.params.id)) return res.status(422).json({ message: 'Données invalides.' });
  const d = await AdministrativeService.findByIdAndUpdate(req.params.id, p.data, { new: true });
  if (!d) return res.status(404).json({ message: 'Introuvable.' }); await audit(req, 'SERVICE_UPDATE', 'Service', d.id); res.json(d);
}));
export default r;

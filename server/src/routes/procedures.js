import { Router } from 'express';
import { z } from 'zod';
import Procedure, { FIELD_TYPES } from '../models/Procedure.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { audit, wrap, page, validId } from '../utils/helpers.js';
const r = Router();
const body = z.object({
  nom: z.string().min(2), description: z.string().optional(), categorie: z.string().optional(), instructions: z.string().optional(),
  delaiIndicatifJours: z.number().int().positive().optional(), piecesRequises: z.array(z.string()).optional(), actif: z.boolean().optional(),
  champs: z.array(z.object({ name: z.string().regex(/^[a-zA-Z_]\w*$/), label: z.string(), type: z.enum(FIELD_TYPES), required: z.boolean().optional(), options: z.array(z.string()).optional() })).optional(),
});
// Catalogue public : seulement les procédures actives
r.get('/', wrap(async (req, res) => {
  const f = { actif: true }; const { skip, limit, p } = page(req.query);
  if (req.query.q) f.$text = { $search: String(req.query.q) };
  if (req.query.categorie) f.categorie = String(req.query.categorie);
  const [data, total] = await Promise.all([Procedure.find(f).skip(skip).limit(limit), Procedure.countDocuments(f)]);
  res.json({ data, page: p, total });
}));
r.get('/:id', wrap(async (req, res) => {
  const d = validId(req.params.id) && await Procedure.findOne({ _id: req.params.id, actif: true });
  d ? res.json(d) : res.status(404).json({ message: 'Procédure introuvable.' });
}));
r.post('/', authenticate, authorize('ADMIN'), wrap(async (req, res) => {
  const p = body.safeParse(req.body); if (!p.success) return res.status(422).json({ message: 'Données invalides.' });
  const d = await Procedure.create(p.data); await audit(req, 'PROCEDURE_CREATE', 'Procedure', d.id); res.status(201).json(d);
}));
r.patch('/:id', authenticate, authorize('ADMIN'), wrap(async (req, res) => {
  const p = body.partial().safeParse(req.body); if (!p.success || !validId(req.params.id)) return res.status(422).json({ message: 'Données invalides.' });
  // version incrémentée : les dossiers soumis gardent leur instantané
  const d = await Procedure.findByIdAndUpdate(req.params.id, { ...p.data, $inc: { version: 1 } }, { new: true });
  if (!d) return res.status(404).json({ message: 'Procédure introuvable.' });
  await audit(req, 'PROCEDURE_UPDATE', 'Procedure', d.id); res.json(d);
}));
export default r;

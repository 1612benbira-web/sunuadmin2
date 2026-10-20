import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import AuditLog from '../models/AuditLog.js';
import { dashboard, tendances } from '../services/stats.js';
import { wrap, page } from '../utils/helpers.js';
const r = Router(); r.use(authenticate, authorize('ADMIN'));
r.get('/dashboard', wrap(async (req, res) => res.json(await dashboard())));
r.get('/statistics', wrap(async (req, res) => res.json(await tendances(Math.min(90, Math.max(1, +req.query.jours || 30))))));
r.get('/audit-logs', wrap(async (req, res) => {
  const { skip, limit, p } = page(req.query);
  const f = req.query.action ? { action: String(req.query.action) } : {};
  const [data, total] = await Promise.all([AuditLog.find(f).sort('-date').skip(skip).limit(limit).populate('acteur', 'nom prenom email'), AuditLog.countDocuments(f)]);
  res.json({ data, page: p, total });
}));
export default r;

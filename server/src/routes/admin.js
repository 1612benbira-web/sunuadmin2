import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import AuditLog from '../models/AuditLog.js';
import { dashboard } from '../services/stats.js';
import { wrap, page } from '../utils/helpers.js';
const r = Router(); r.use(authenticate, authorize('ADMIN'));
r.get('/dashboard', wrap(async (req, res) => res.json(await dashboard())));
r.get('/audit-logs', wrap(async (req, res) => {
  const { skip, limit, p } = page(req.query);
  const [data, total] = await Promise.all([AuditLog.find().sort('-date').skip(skip).limit(limit), AuditLog.countDocuments()]);
  res.json({ data, page: p, total });
}));
export default r;

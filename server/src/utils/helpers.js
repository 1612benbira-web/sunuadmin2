import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
export const audit = (req, action, ressource, ressourceId, resultat = 'OK') =>
  AuditLog.create({ acteur: req.user?.id, action, ressource, ressourceId: String(ressourceId || ''), resultat });
export const notify = (destinataire, type, message, requestId) => destinataire && Notification.create({ destinataire, type, message, requestId });
export const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
export const page = (q) => { const p = Math.max(1, +q.page || 1), l = Math.min(100, +q.limit || 20); return { skip: (p - 1) * l, limit: l, p }; };
export const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));

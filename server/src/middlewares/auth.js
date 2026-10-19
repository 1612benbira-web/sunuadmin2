import jwt from 'jsonwebtoken';
import User from '../models/User.js';
export async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Authentification requise.' });
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(sub);
    if (!user || !user.actif) return res.status(401).json({ message: 'Compte invalide.' });
    req.user = user; next();
  } catch { res.status(401).json({ message: 'Session invalide.' }); }
}
export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Accès refusé.' });

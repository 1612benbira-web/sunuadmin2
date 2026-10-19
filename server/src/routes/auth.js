import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { authenticate } from '../middlewares/auth.js';
const r = Router();
const reg = z.object({ nom: z.string().min(1), prenom: z.string().min(1), email: z.string().email(), password: z.string().min(10) });
const cookie = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 36e5 * 8 };
const sign = (u) => jwt.sign({ sub: u.id }, process.env.JWT_SECRET, { expiresIn: '8h' });
const pub = (u) => ({ id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role });
r.post('/register', async (req, res) => {
  const p = reg.safeParse(req.body);
  if (!p.success) return res.status(422).json({ message: 'Données invalides.' });
  const { password, ...d } = p.data;
  if (await User.exists({ email: d.email.toLowerCase() })) return res.status(409).json({ message: 'E-mail déjà utilisé.' });
  const u = await User.create({ ...d, role: 'CITOYEN', passwordHash: await bcrypt.hash(password, 12) });
  res.cookie('token', sign(u), cookie).status(201).json(pub(u));
});
r.post('/login', async (req, res) => {
  const u = await User.findOne({ email: String(req.body.email || '').toLowerCase() }).select('+passwordHash');
  const ok = u && (await bcrypt.compare(String(req.body.password || ''), u.passwordHash));
  if (!ok || !u.actif) return res.status(401).json({ message: 'Identifiants invalides.' });
  res.cookie('token', sign(u), cookie).json(pub(u));
});
r.post('/logout', (req, res) => res.clearCookie('token').status(204).end());
r.get('/me', authenticate, (req, res) => res.json(pub(req.user)));
export default r;

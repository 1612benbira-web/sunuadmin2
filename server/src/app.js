import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import auth from './routes/auth.js';
import requests from './routes/requests.js';
import procedures from './routes/procedures.js';
import users from './routes/users.js';
import services from './routes/services.js';
import notifications from './routes/notifications.js';
import documents from './routes/documents.js';
import admin from './routes/admin.js';
export const app = express();
// Nombre de proxys devant l'API (Render seul : 1 ; Vercel puis Render : 2). 0 en local.
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
// Défense CSRF : toute écriture exige un en-tête personnalisé, impossible à poser depuis un autre site sans préflight CORS (refusé par notre CORS restrictif).
app.use('/api', (req, res, next) => (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.get('X-Requested-With') === 'sunuadmin')
  ? next() : res.status(403).json({ message: 'Requête refusée (en-tête de sécurité manquant).' }));
// Santé : utilisée par Render ; 'ip' permet de vérifier que TRUST_PROXY donne bien l'adresse réelle du visiteur.
app.get('/api/v1/health', (req, res) => { const db = mongoose.connection.readyState === 1; res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db, ip: req.ip }); });
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 6e4, limit: 50 }), auth);
app.use('/api/v1/requests', requests);
app.use('/api/v1/procedures', procedures);
app.use('/api/v1/users', users);
app.use('/api/v1/services', services);
app.use('/api/v1/notifications', notifications);
app.use('/api/v1/documents', documents);
app.use('/api/v1/admin', admin);
app.use((req, res) => res.status(404).json({ message: 'Route inexistante.' }));
app.use((err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ message: 'Cette valeur existe déjà.' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Fichier trop volumineux (4 Mo max).' }); console.error(err.message); res.status(500).json({ message: 'Erreur interne.' }); });

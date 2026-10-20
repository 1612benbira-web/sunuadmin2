import 'dotenv/config';
import mongoose from 'mongoose';
const { JWT_SECRET, MONGODB_URI, NODE_ENV, CLIENT_ORIGIN } = process.env;
if (!JWT_SECRET || JWT_SECRET.length < 32) { console.error('JWT_SECRET manquant ou trop court (32 caractères minimum).'); process.exit(1); }
if (!MONGODB_URI) { console.error('MONGODB_URI manquant.'); process.exit(1); }
if (NODE_ENV === 'production' && !CLIENT_ORIGIN) { console.error('CLIENT_ORIGIN requis en production.'); process.exit(1); }
const { app } = await import('./app.js');
try { await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 }); }
catch (e) { console.error('Connexion MongoDB impossible :', e.message); process.exit(1); }
const s = app.listen(process.env.PORT || 5000, () => console.log('API prête'));
process.on('SIGTERM', () => s.close(() => mongoose.disconnect()));

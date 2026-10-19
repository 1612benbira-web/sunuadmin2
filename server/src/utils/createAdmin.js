import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User.js';
const { ADMIN_EMAIL: email, ADMIN_PASSWORD: pw } = process.env;
if (!email || !pw || pw.length < 12) { console.error('ADMIN_EMAIL et ADMIN_PASSWORD (12+ car.) requis.'); process.exit(1); }
await mongoose.connect(process.env.MONGODB_URI);
await User.create({ nom: 'Admin', prenom: 'Initial', email, role: 'ADMIN', passwordHash: await bcrypt.hash(pw, 12) });
console.log('Administrateur créé.'); await mongoose.disconnect();

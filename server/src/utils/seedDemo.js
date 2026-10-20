import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User.js';
import AdministrativeService from '../models/AdministrativeService.js';
import Procedure from '../models/Procedure.js';
if (process.env.NODE_ENV === 'production') { console.error('Données de démonstration interdites en production.'); process.exit(1); }
const pw = process.env.DEMO_PASSWORD;
if (!pw || pw.length < 12) { console.error('DEMO_PASSWORD (12 caractères minimum) requis.'); process.exit(1); }
await mongoose.connect(process.env.MONGODB_URI);
const svc = (nom) => AdministrativeService.findOneAndUpdate({ nom }, { $setOnInsert: { description: 'Service de démonstration (données fictives).' } }, { upsert: true, new: true });
const etat = await svc('État civil (démo)'); const fonc = await svc('Services fonciers (démo)');
const proc = (nom, service, categorie, champs, pieces) => Procedure.findOneAndUpdate({ nom }, { $setOnInsert: { service: service._id, categorie, champs, piecesRequises: pieces, delaiIndicatifJours: 7,
  description: 'Démarche de démonstration : données fictives, sans valeur administrative.', instructions: 'Remplissez le formulaire puis joignez les pièces demandées.' } }, { upsert: true });
await proc('Extrait de naissance (démo)', etat, 'État civil', [{ name: 'lieu_naissance', label: 'Lieu de naissance', type: 'text', required: true }, { name: 'date_naissance', label: 'Date de naissance', type: 'date', required: true }], ["Pièce d'identité"]);
await proc('Certificat de résidence (démo)', etat, 'État civil', [{ name: 'adresse', label: 'Adresse', type: 'textarea', required: true }], ["Pièce d'identité", 'Justificatif de domicile']);
await proc('Demande de bornage (démo)', fonc, 'Foncier', [{ name: 'parcelle', label: 'Référence de la parcelle', type: 'text', required: true }], ['Titre de propriété']);
const user = async (email, nom, prenom, role, services = []) => { if (!(await User.exists({ email }))) await User.create({ email, nom, prenom, role, services, passwordHash: await bcrypt.hash(pw, 12) }); };
await user('agent.demo@sunuadmin.test', 'Demo', 'Agent', 'AGENT', [etat._id]);
await user('citoyen.demo@sunuadmin.test', 'Demo', 'Citoyen', 'CITOYEN');
console.log('Données de démonstration prêtes : agent.demo@sunuadmin.test et citoyen.demo@sunuadmin.test (mot de passe = DEMO_PASSWORD).');
await mongoose.disconnect();

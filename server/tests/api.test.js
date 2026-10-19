import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcrypt';
import request from 'supertest';
process.env.JWT_SECRET = 'secret-de-test-secret-de-test';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'sunuadmin-test-uploads');
const URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/sunuadmin_test';
// Garde-fou : on ne vide JAMAIS une base dont le nom ne finit pas par _test
if (!/_test$/.test(new URL(URI).pathname.slice(1))) throw new Error('MONGODB_URI_TEST doit viser une base *_test');
const { default: mongoose } = await import('mongoose');
const { app } = await import('../src/app.js');
const { default: User } = await import('../src/models/User.js');
const { default: Procedure } = await import('../src/models/Procedure.js');
const { default: AuditLog } = await import('../src/models/AuditLog.js');
const { default: ApplicationRequest } = await import('../src/models/ApplicationRequest.js');
const PW = 'MotDePasseDeTest12';
let n = 0;
const mail = (p) => `${p}${++n}@test.sn`;
const reset = () => mongoose.connection.dropDatabase();
async function creer(role, extra = {}) {
  const email = mail(role.toLowerCase());
  await User.create({ nom: 'N', prenom: 'P', email, role, passwordHash: await bcrypt.hash(PW, 4), ...extra });
  return email;
}
async function session(role, extra) {
  const a = request.agent(app); const email = await creer(role, extra);
  const r = await a.post('/api/v1/auth/login').send({ email, password: PW }); assert.equal(r.status, 200);
  return { a, id: r.body.id, email };
}
const pdf = Buffer.from('%PDF-1.4 test');
before(async () => { await mongoose.connect(URI); await reset(); });
after(async () => { await mongoose.disconnect(); });

test('statistiques sur base vide : zéros, délai null', async () => {
  const adm = await session('ADMIN'); await ApplicationRequest.deleteMany({});
  const r = await adm.a.get('/api/v1/admin/dashboard');
  assert.equal(r.status, 200); assert.equal(r.body.totalSoumis, 0); assert.equal(r.body.delaiMoyenJours, null);
});
test('authentification : inscription, doublon, invalide, mauvais mot de passe, compte désactivé', async () => {
  const email = mail('cit');
  const a = request.agent(app);
  assert.equal((await a.post('/api/v1/auth/register').send({ nom: 'A', prenom: 'B', email, password: PW })).status, 201);
  assert.equal((await request(app).post('/api/v1/auth/register').send({ nom: 'A', prenom: 'B', email, password: PW })).status, 409);
  assert.equal((await request(app).post('/api/v1/auth/register').send({ email: 'x', password: '1' })).status, 422);
  assert.equal((await request(app).post('/api/v1/auth/login').send({ email, password: 'mauvais-mot-de-passe' })).status, 401);
  const off = await creer('CITOYEN', { actif: false });
  assert.equal((await request(app).post('/api/v1/auth/login').send({ email: off, password: PW })).status, 401);
  assert.equal((await a.get('/api/v1/auth/me')).body.email, email);
  await a.post('/api/v1/auth/logout');
});
test('autorisations par rôle', async () => {
  const cit = await session('CITOYEN'); const ag = await session('AGENT');
  assert.equal((await request(app).get('/api/v1/requests')).status, 401);
  assert.equal((await cit.a.get('/api/v1/admin/dashboard')).status, 403);
  assert.equal((await ag.a.get('/api/v1/users')).status, 403);
  assert.equal((await cit.a.post('/api/v1/procedures').send({ nom: 'Interdit' })).status, 403);
});
test('procédures : création admin, champ de type interdit refusé, catalogue public', async () => {
  const adm = await session('ADMIN');
  assert.equal((await adm.a.post('/api/v1/procedures').send({ nom: 'X', champs: [{ name: 'a', label: 'A', type: 'script' }] })).status, 422);
  const ok = await adm.a.post('/api/v1/procedures').send({ nom: 'Extrait de naissance', categorie: 'Etat civil' });
  assert.equal(ok.status, 201);
  const maj = await adm.a.patch(`/api/v1/procedures/${ok.body._id}`).send({ delaiIndicatifJours: 7 });
  assert.equal(maj.body.version, 2);
  const cat = await request(app).get('/api/v1/procedures'); assert.ok(cat.body.data.length >= 1);
});
test('parcours complet, anti-IDOR, documents, audit, statistiques', async () => {
  await reset();
  const adm = await session('ADMIN'); const ag = await session('AGENT'); const ag2 = await session('AGENT');
  const cit = await session('CITOYEN'); const autre = await session('CITOYEN');
  const proc = await Procedure.create({ nom: 'Démo' });
  const d = (await cit.a.post('/api/v1/requests').send({ procedure: proc.id })).body;
  assert.equal(d.statut, 'BROUILLON');
  // documents
  const up = await cit.a.post(`/api/v1/requests/${d._id}/documents`).attach('fichier', pdf, 'a.pdf');
  assert.equal(up.status, 201);
  assert.equal((await cit.a.post(`/api/v1/requests/${d._id}/documents`).attach('fichier', Buffer.from('texte'), 'a.pdf')).status, 415);
  assert.equal((await cit.a.post(`/api/v1/requests/${d._id}/documents`).attach('fichier', Buffer.concat([pdf, Buffer.alloc(6 * 1024 * 1024)]), 'gros.pdf')).status, 413);
  assert.equal((await cit.a.get('/api/v1/documents/64b7f0f0f0f0f0f0f0f0f0f0')).status, 404);
  // soumission
  const st = (a, id, statut, motif) => a.patch(`/api/v1/requests/${id}/status`).send({ statut, motif });
  const s = await st(cit.a, d._id, 'SOUMIS'); assert.equal(s.status, 200); assert.match(s.body.reference, /^SA-\d{4}-[0-9A-F]{8}$/);
  const d2 = (await cit.a.post('/api/v1/requests').send({ procedure: proc.id })).body;
  assert.notEqual((await st(cit.a, d2._id, 'SOUMIS')).body.reference, s.body.reference);
  // accès croisés
  assert.equal((await autre.a.get(`/api/v1/requests/${d._id}`)).status, 404);
  assert.equal((await autre.a.get(`/api/v1/documents/${up.body.id}/download`)).status, 404);
  assert.equal((await ag.a.get(`/api/v1/requests/${d._id}`)).status, 404);
  assert.equal((await cit.a.get(`/api/v1/documents/${up.body.id}/download`)).status, 200);
  // affectation et traitement
  assert.equal((await cit.a.post(`/api/v1/requests/${d._id}/assign`).send({ agent: ag.id })).status, 403);
  assert.equal((await adm.a.post(`/api/v1/requests/${d._id}/assign`).send({ agent: ag.id })).status, 200);
  assert.equal((await ag2.a.get(`/api/v1/requests/${d._id}`)).status, 404);
  assert.equal((await st(ag.a, d._id, 'ACCEPTE', 'ok')).status, 409);          // transition interdite
  assert.equal((await st(ag.a, d._id, 'EN_COURS')).status, 200);
  assert.equal((await st(ag.a, d._id, 'REJETE', '')).status, 422);             // rejet sans motif
  assert.equal((await st(ag.a, d._id, 'COMPLEMENT_REQUIS', 'pièce illisible')).status, 200);
  assert.equal((await cit.a.post(`/api/v1/requests/${d._id}/documents`).attach('fichier', pdf, 'b.pdf')).status, 201);
  assert.equal((await st(cit.a, d._id, 'EN_COURS')).status, 200);
  assert.equal((await ag.a.patch(`/api/v1/documents/${up.body.id}/verification`).send({ verification: 'VALIDE' })).status, 200);
  assert.equal((await st(ag.a, d._id, 'ACCEPTE', 'conforme')).status, 200);
  assert.equal((await st(adm.a, d._id, 'EN_COURS')).status, 409);              // décision finale non réouvrable
  const h = await cit.a.get(`/api/v1/requests/${d._id}/history`); assert.equal(h.body.length, 5);
  assert.ok(await AuditLog.countDocuments({ action: 'REQUEST_STATUS' }) >= 6);
  // statistiques sur données connues : 1 accepté, 1 soumis non traité, brouillons exclus
  await cit.a.post('/api/v1/requests').send({ procedure: proc.id });
  const dash = (await adm.a.get('/api/v1/admin/dashboard')).body;
  assert.equal(dash.totalSoumis, 2); assert.equal(dash.acceptes, 1); assert.equal(dash.enAttente, 1);
  assert.equal(dash.citoyens, 2); assert.equal(dash.agents, 2); assert.equal(dash.dossiersPourDelai, 1); assert.ok(dash.delaiMoyenHeures >= 0);
});
test('désactivation d\'un agent : session refusée ensuite', async () => {
  const adm = await session('ADMIN'); const ag = await session('AGENT');
  assert.equal((await adm.a.patch(`/api/v1/users/${ag.id}/status`).send({ actif: false })).status, 200);
  assert.equal((await ag.a.get('/api/v1/auth/me')).status, 401);
  assert.equal((await adm.a.patch(`/api/v1/users/${adm.id}/status`).send({ actif: false })).status, 409);
});

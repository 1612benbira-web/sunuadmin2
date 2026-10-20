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
const { default: AdministrativeService } = await import('../src/models/AdministrativeService.js');
const { default: AuditLog } = await import('../src/models/AuditLog.js');
const { default: ApplicationRequest } = await import('../src/models/ApplicationRequest.js');
const CSRF = { 'X-Requested-With': 'sunuadmin' };
const anon = () => request.agent(app).set(CSRF);
const PW = 'MotDePasseDeTest12';
let n = 0;
const mail = (p) => `${p}${++n}@test.sn`;
const reset = async () => { await mongoose.connection.dropDatabase(); await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes())); };
async function creer(role, extra = {}) {
  const email = mail(role.toLowerCase());
  await User.create({ nom: 'N', prenom: 'P', email, role, passwordHash: await bcrypt.hash(PW, 4), ...extra });
  return email;
}
async function session(role, extra) {
  const a = request.agent(app).set(CSRF); const email = await creer(role, extra);
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
  const a = request.agent(app).set(CSRF);
  assert.equal((await a.post('/api/v1/auth/register').send({ nom: 'A', prenom: 'B', email, password: PW })).status, 201);
  assert.equal((await anon().post('/api/v1/auth/register').send({ nom: 'A', prenom: 'B', email, password: PW })).status, 409);
  assert.equal((await anon().post('/api/v1/auth/register').send({ email: 'x', password: '1' })).status, 422);
  assert.equal((await anon().post('/api/v1/auth/login').send({ email, password: 'mauvais-mot-de-passe' })).status, 401);
  const off = await creer('CITOYEN', { actif: false });
  assert.equal((await anon().post('/api/v1/auth/login').send({ email: off, password: PW })).status, 401);
  assert.equal((await a.get('/api/v1/auth/me')).body.email, email);
  await a.post('/api/v1/auth/logout');
});
test('autorisations par rôle', async () => {
  const cit = await session('CITOYEN'); const ag = await session('AGENT');
  assert.equal((await anon().get('/api/v1/requests')).status, 401);
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
  const cat = await anon().get('/api/v1/procedures'); assert.ok(cat.body.data.length >= 1);
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
  const h = await cit.a.get(`/api/v1/requests/${d._id}/history`); assert.equal(h.body.length, 6);
  assert.equal((await cit.a.get('/api/v1/notifications')).body.length, 3); // 3 changements de statut par l'agent
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

test('CSRF : écriture sans en-tête refusée, lecture autorisée', async () => {
  assert.equal((await request(app).post('/api/v1/auth/login').send({ email: 'a@b.sn', password: 'x' })).status, 403);
  assert.equal((await request(app).get('/api/v1/procedures')).status, 200);
});
test('déconnexion : l\'ancien jeton est révoqué', async () => {
  const email = await creer('CITOYEN'); const a = anon();
  const l = await a.post('/api/v1/auth/login').send({ email, password: PW });
  const cookie = l.headers['set-cookie'][0].split(';')[0];
  assert.equal((await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status, 200);
  await a.post('/api/v1/auth/logout');
  assert.equal((await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status, 401);
});

test('administration : services, procédures inactives, audit', async () => {
  const adm = await session('ADMIN'); const cit = await session('CITOYEN');
  const nom = `Service ${Date.now()}`;
  const sv = await adm.a.post('/api/v1/services').send({ nom });
  assert.equal(sv.status, 201);
  assert.equal((await adm.a.post('/api/v1/services').send({ nom })).status, 409);
  assert.equal((await cit.a.post('/api/v1/services').send({ nom: 'Interdit' })).status, 403);
  const p = (await adm.a.post('/api/v1/procedures').send({ nom: 'A désactiver', service: sv.body._id })).body;
  await adm.a.patch(`/api/v1/procedures/${p._id}`).send({ actif: false });
  const pub = await anon().get('/api/v1/procedures'); assert.ok(!pub.body.data.some((x) => x._id === p._id));
  const all = await adm.a.get('/api/v1/procedures/admin/all'); const row = all.body.data.find((x) => x._id === p._id);
  assert.equal(row.actif, false); assert.equal(row.version, 1);
  assert.equal((await adm.a.patch(`/api/v1/procedures/${p._id}`).send({ actif: true })).status, 200);
  assert.equal((await cit.a.get('/api/v1/procedures/admin/all')).status, 403);
  const au = await adm.a.get('/api/v1/admin/audit-logs?action=PROCEDURE_UPDATE&limit=5');
  assert.ok(au.body.data.length >= 2); assert.ok(au.body.data[0].acteur.email);
  assert.equal((await cit.a.get('/api/v1/admin/audit-logs')).status, 403);
});

test('statistiques : tendances sur données connues', async () => {
  await reset();
  const adm = await session('ADMIN'); const cit = await session('CITOYEN');
  const sv = await AdministrativeService.create({ nom: 'État civil' });
  const proc = await Procedure.create({ nom: 'P', service: sv.id });
  const mk = (statut, soumisLe, avecService) => ApplicationRequest.create({ demandeur: cit.id, procedure: proc.id, statut, soumisLe, procedureSnapshot: avecService ? { service: sv._id } : {} });
  await mk('SOUMIS', new Date(), true); await mk('EN_COURS', new Date(), true);
  await mk('SOUMIS', new Date(Date.now() - 40 * 864e5), false); await mk('BROUILLON', undefined, true);
  const r = await adm.a.get('/api/v1/admin/statistics?jours=30');
  assert.equal(r.status, 200); assert.equal(r.body.serie.length, 30);
  assert.equal(r.body.serie.reduce((a, x) => a + x.soumis, 0), 2);            // le dossier de 40 jours est hors période
  assert.deepEqual(r.body.services.map((x) => [x.service, x.n]), [['État civil', 2], ['Sans service', 1]]); // brouillon exclu
  assert.equal((await cit.a.get('/api/v1/admin/statistics')).status, 403);
});

test('services : rattachement des agents, affectation sous contrainte, listes enrichies, stats agent', async () => {
  await reset();
  const adm = await session('ADMIN'); const cit = await session('CITOYEN'); const a1 = await session('AGENT'); const a2 = await session('AGENT');
  const sv = (await adm.a.post('/api/v1/services').send({ nom: 'Fiscalité' })).body;
  assert.equal((await adm.a.patch(`/api/v1/users/${a1.id}`).send({ services: [sv._id] })).status, 200);
  assert.equal((await adm.a.patch(`/api/v1/users/${a1.id}`).send({ services: ['64b7f0f0f0f0f0f0f0f0f0f0'] })).status, 422);
  assert.equal((await adm.a.patch(`/api/v1/users/${cit.id}`).send({ services: [sv._id] })).status, 409);
  const proc = (await adm.a.post('/api/v1/procedures').send({ nom: 'Patente', service: sv._id })).body;
  const d = (await cit.a.post('/api/v1/requests').send({ procedure: proc._id })).body;
  await cit.a.patch(`/api/v1/requests/${d._id}/status`).send({ statut: 'SOUMIS' });
  assert.equal((await adm.a.post(`/api/v1/requests/${d._id}/assign`).send({ agent: a2.id })).status, 409);
  assert.equal((await adm.a.post(`/api/v1/requests/${d._id}/assign`).send({ agent: a1.id })).status, 200);
  const list = await a1.a.get('/api/v1/requests'); assert.equal(list.body[0].procedure.nom, 'Patente');
  await a1.a.patch(`/api/v1/requests/${d._id}/status`).send({ statut: 'EN_COURS' });
  const st = await a1.a.get('/api/v1/requests/stats/me'); assert.equal(st.body.attribues, 1); assert.equal(st.body.enCours, 1);
  assert.equal((await cit.a.get('/api/v1/requests/stats/me')).status, 403);
});
test('profil : modification du nom et changement de mot de passe', async () => {
  const u = await session('CITOYEN');
  const m = await u.a.patch('/api/v1/auth/me').send({ nom: 'Nouveau', prenom: 'Nom' });
  assert.equal(m.status, 200); assert.equal(m.body.nom, 'Nouveau');
  assert.equal((await u.a.post('/api/v1/auth/password').send({ ancien: 'mauvais', nouveau: 'NouveauMotDePasse12' })).status, 401);
  assert.equal((await u.a.post('/api/v1/auth/password').send({ ancien: PW, nouveau: 'court' })).status, 422);
  const l = await anon().post('/api/v1/auth/login').send({ email: u.email, password: PW }); const old = l.headers['set-cookie'][0].split(';')[0];
  assert.equal((await u.a.post('/api/v1/auth/password').send({ ancien: PW, nouveau: 'NouveauMotDePasse12' })).status, 200);
  assert.equal((await request(app).get('/api/v1/auth/me').set('Cookie', old)).status, 401);   // autres sessions fermées
  assert.equal((await u.a.get('/api/v1/auth/me')).status, 200);                                  // session courante renouvelée
  assert.equal((await anon().post('/api/v1/auth/login').send({ email: u.email, password: PW })).status, 401);
  assert.equal((await anon().post('/api/v1/auth/login').send({ email: u.email, password: 'NouveauMotDePasse12' })).status, 200);
});

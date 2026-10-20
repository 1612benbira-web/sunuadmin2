import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { api, msg, fmt } from '../api.js';
import { Alert, Badge, Empty, Field, Pager } from '../ui.jsx';
const Stat = ({ l, v }) => <div className="card"><p className="text-2xl font-bold text-green-900">{v ?? '—'}</p><p className="text-sm text-gray-600">{l}</p></div>;
export function AdminDashboard() {
  const [tr, setTr] = useState(null); const [jours, setJours] = useState(30);
  useEffect(() => { api.get('/admin/statistics', { params: { jours } }).then((r) => setTr(r.data)).catch(() => {}); }, [jours]);
  const [s, setS] = useState(null); const [reqs, setReqs] = useState([]); const [agents, setAgents] = useState([]); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const load = () => Promise.all([api.get('/admin/dashboard'), api.get('/requests'), api.get('/users', { params: { role: 'AGENT', limit: 100 } })])
    .then(([a, b, c]) => { setS(a.data); setReqs(b.data); setAgents(c.data.data.filter((u) => u.actif)); }).catch((e) => setErr(msg(e)));
  useEffect(() => { load(); }, []);
  const assign = async (rid, agent) => { setErr(''); setOk(''); try { await api.post(`/requests/${rid}/assign`, { agent }); setOk('Dossier affecté.'); load(); } catch (e) { setErr(msg(e)); } };
  const vis = reqs.filter((d) => d.statut !== 'BROUILLON');
  return (<div><h1 className="text-xl font-bold mb-3">Tableau de bord</h1><Alert>{err}</Alert><Alert type="ok">{ok}</Alert>
    {s && <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2"><Stat l="Citoyens inscrits" v={s.citoyens} /><Stat l="Agents actifs" v={s.agents} /><Stat l="Dossiers soumis" v={s.totalSoumis} /><Stat l="En attente" v={s.enAttente} />
      <Stat l="En cours" v={s.enCours} /><Stat l="Acceptés" v={s.acceptes} /><Stat l="Rejetés" v={s.rejetes} /><Stat l="Délai moyen (h)" v={s.delaiMoyenHeures} /></div>}
    <p className="text-xs text-gray-500 mb-4">Indicateurs sur les dossiers soumis (brouillons exclus). Délai = soumission → décision.</p>
    {tr && s && <section aria-label="Graphiques" className="grid lg:grid-cols-2 gap-4 mb-6">
      <div className="card lg:col-span-2"><div className="flex items-center gap-3 mb-2"><h2 className="font-bold flex-1">Dossiers soumis par jour</h2>
        <select aria-label="Période" className="inp max-w-[10rem]" value={jours} onChange={(e) => setJours(+e.target.value)}>{[7, 30, 90].map((j) => <option key={j} value={j}>{j} jours</option>)}</select></div>
        <div style={{ height: 240 }}><ResponsiveContainer><LineChart data={tr.serie}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} minTickGap={20} /><YAxis allowDecimals={false} /><Tooltip />
          <Line type="monotone" dataKey="soumis" name="Soumis" stroke="#0f6b3a" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></div>
      <div className="card"><h2 className="font-bold mb-2">Répartition par service <span className="text-xs font-normal text-gray-500">(tous les dossiers soumis)</span></h2>
        {!tr.services.length ? <Empty>Aucune donnée.</Empty> : <div style={{ height: 240 }}><ResponsiveContainer><BarChart data={tr.services} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="service" width={110} /><Tooltip /><Bar dataKey="n" name="Dossiers" fill="#f2b705" /></BarChart></ResponsiveContainer></div>}</div>
      <div className="card"><h2 className="font-bold mb-2">Dossiers par statut</h2><div style={{ height: 240 }}><ResponsiveContainer><BarChart data={[{ statut: 'En attente', n: s.enAttente }, { statut: 'En cours', n: s.enCours }, { statut: 'Acceptés', n: s.acceptes }, { statut: 'Rejetés', n: s.rejetes }]}>
        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="statut" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="n" name="Dossiers" fill="#0f6b3a" /></BarChart></ResponsiveContainer></div></div>
      <details className="card lg:col-span-2 text-sm"><summary className="cursor-pointer font-semibold">Données des graphiques (version texte)</summary>
        <p className="mt-2"><b>Statuts :</b> en attente {s.enAttente}, en cours {s.enCours}, acceptés {s.acceptes}, rejetés {s.rejetes}.</p>
        <p><b>Services :</b> {tr.services.map((x) => `${x.service} : ${x.n}`).join(' ; ') || 'aucune donnée'}.</p>
        <p><b>Dossiers soumis par jour (jours non nuls) :</b> {tr.serie.filter((x) => x.soumis > 0).map((x) => `${x.date} : ${x.soumis}`).join(' ; ') || 'aucun'}.</p></details></section>}
    <h2 className="font-bold mb-2">Dossiers</h2>{!vis.length && <Empty>Aucun dossier soumis.</Empty>}
    <div className="overflow-x-auto"><table className="w-full text-sm bg-white rounded-lg"><tbody>{vis.map((d) => <tr key={d._id} className="border-b"><td className="p-2"><Link className="underline" to={`/dossiers/${d._id}`}>{d.reference}</Link></td><td className="p-2">{d.procedure?.nom}<br /><span className="text-xs text-gray-500">{d.demandeur?.prenom} {d.demandeur?.nom}</span></td><td className="p-2"><Badge s={d.statut} /></td>
      <td className="p-2">{!['ACCEPTE', 'REJETE', 'CLOTURE'].includes(d.statut) && <select aria-label="Affecter à" className="inp" value={d.agent || ''} onChange={(e) => e.target.value && assign(d._id, e.target.value)}><option value="">Affecter à…</option>{agents.filter((a) => !d.procedureSnapshot?.service || a.services?.includes(d.procedureSnapshot.service)).map((a) => <option key={a._id} value={a._id}>{a.prenom} {a.nom}</option>)}</select>}</td></tr>)}</tbody></table></div></div>);
}
const EMPTY = { nom: '', categorie: '', description: '', instructions: '', delai: '', pieces: '', service: '' };
export function AdminProcedures() {
  const [list, setList] = useState([]); const [total, setTotal] = useState(0); const [pg, setPg] = useState(1); const [services, setServices] = useState([]);
  const [f, setF] = useState(EMPTY); const [champs, setChamps] = useState([]); const [editId, setEditId] = useState(null); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const load = () => api.get('/procedures/admin/all', { params: { page: pg } }).then((r) => { setList(r.data.data); setTotal(r.data.total); }).catch((e) => setErr(msg(e)));
  useEffect(() => { load(); }, [pg]);
  useEffect(() => { api.get('/services').then((r) => setServices(r.data.filter((x) => x.actif))).catch(() => {}); }, []);
  const reset = () => { setF(EMPTY); setChamps([]); setEditId(null); };
  const edit = (p) => { setEditId(p._id); setOk(''); setErr(''); setF({ nom: p.nom, categorie: p.categorie || '', description: p.description || '', instructions: p.instructions || '', delai: p.delaiIndicatifJours || '', pieces: (p.piecesRequises || []).join(', '), service: p.service || '' });
    setChamps((p.champs || []).map((c) => ({ ...c, options: c.options?.join(', ') }))); window.scrollTo({ top: 0 }); };
  const payload = () => ({ nom: f.nom, categorie: f.categorie || undefined, description: f.description || undefined, instructions: f.instructions || undefined, delaiIndicatifJours: f.delai ? +f.delai : undefined, service: f.service || undefined,
    piecesRequises: f.pieces.split(',').map((x) => x.trim()).filter(Boolean),
    champs: champs.map((c) => ({ name: c.name, label: c.label, type: c.type, required: !!c.required, options: c.type === 'select' ? String(c.options || '').split(',').map((x) => x.trim()).filter(Boolean) : undefined })) });
  const submit = async (e) => { e.preventDefault(); setErr(''); setOk('');
    try { if (editId) await api.patch(`/procedures/${editId}`, payload()); else await api.post('/procedures', payload());
      setOk(editId ? 'Procédure modifiée (nouvelle version). Les dossiers déjà soumis gardent l’ancienne définition.' : 'Procédure créée.'); reset(); load(); } catch (x) { setErr(msg(x)); } };
  const toggle = async (p) => { if (!window.confirm(p.actif ? 'Désactiver cette procédure ?' : 'Réactiver cette procédure ?')) return; setErr('');
    try { await api.patch(`/procedures/${p._id}`, { actif: !p.actif }); load(); } catch (x) { setErr(msg(x)); } };
  const setC = (i, k, v) => setChamps(champs.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (<div className="grid lg:grid-cols-2 gap-6"><form onSubmit={submit} className="card"><h1 className="text-xl font-bold mb-3">{editId ? 'Modifier la procédure' : 'Nouvelle procédure'}</h1>
    <Field label="Nom"><input className="inp" required value={f.nom} onChange={s('nom')} /></Field>
    <Field label="Catégorie"><input className="inp" value={f.categorie} onChange={s('categorie')} /></Field>
    <Field label="Service responsable"><select className="inp" value={f.service} onChange={s('service')}><option value="">Aucun</option>{services.map((x) => <option key={x._id} value={x._id}>{x.nom}</option>)}</select></Field>
    <Field label="Description"><textarea className="inp" value={f.description} onChange={s('description')} /></Field>
    <Field label="Instructions pour le citoyen"><textarea className="inp" value={f.instructions} onChange={s('instructions')} /></Field>
    <Field label="Délai indicatif (jours)"><input className="inp" type="number" min="1" value={f.delai} onChange={s('delai')} /></Field>
    <Field label="Pièces requises (séparées par des virgules)"><input className="inp" value={f.pieces} onChange={s('pieces')} /></Field>
    <h2 className="font-semibold mb-2">Champs du formulaire</h2>
    {champs.map((c, i) => <div key={i} className="grid grid-cols-2 gap-2 mb-3 border-b pb-3"><input aria-label="Identifiant" className="inp" placeholder="identifiant (ex: lieu_naissance)" pattern="[a-zA-Z_]\w*" required value={c.name} onChange={(e) => setC(i, 'name', e.target.value)} />
      <input aria-label="Libellé" className="inp" placeholder="Libellé" required value={c.label} onChange={(e) => setC(i, 'label', e.target.value)} />
      <select aria-label="Type" className="inp" value={c.type} onChange={(e) => setC(i, 'type', e.target.value)}>{['text', 'textarea', 'number', 'date', 'select', 'email', 'tel'].map((t) => <option key={t}>{t}</option>)}</select>
      <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={!!c.required} onChange={(e) => setC(i, 'required', e.target.checked)} />Obligatoire</label>
      {c.type === 'select' && <input aria-label="Options" className="inp col-span-2" placeholder="Options séparées par des virgules" required value={c.options || ''} onChange={(e) => setC(i, 'options', e.target.value)} />}
      <button type="button" className="btn sec col-span-2" onClick={() => setChamps(champs.filter((_, j) => j !== i))}>Retirer ce champ</button></div>)}
    <button type="button" className="btn sec mb-3" onClick={() => setChamps([...champs, { name: '', label: '', type: 'text', required: false }])}>Ajouter un champ</button>
    <Alert>{err}</Alert><Alert type="ok">{ok}</Alert>
    <div className="flex gap-2 mt-2"><button className="btn">{editId ? 'Enregistrer les modifications' : 'Créer la procédure'}</button>{editId && <button type="button" className="btn sec" onClick={reset}>Annuler</button>}</div></form>
    <div><h2 className="font-bold mb-2">Procédures</h2>{!list.length && <Empty>Aucune procédure.</Empty>}
      <ul className="space-y-2">{list.map((p) => <li key={p._id} className="card flex flex-wrap items-center gap-2"><div className="flex-1"><p className="font-semibold">{p.nom} <span className={`text-xs px-2 py-0.5 rounded-full ${p.actif ? 'bg-green-100 text-green-900' : 'bg-gray-200 text-gray-700'}`}>{p.actif ? 'Active' : 'Inactive'}</span></p>
        <p className="text-xs text-gray-500">v{p.version} · {p.champs?.length || 0} champ(s) · {p.categorie || 'sans catégorie'}</p></div>
        <button className="btn sec" onClick={() => edit(p)}>Modifier</button><button className="btn sec" onClick={() => toggle(p)}>{p.actif ? 'Désactiver' : 'Réactiver'}</button></li>)}</ul>
      <Pager page={pg} total={total} onPage={setPg} /></div></div>);
}
export function AdminUsers() {
  const [list, setList] = useState([]); const [f, setF] = useState({ nom: '', prenom: '', email: '', password: '', role: 'AGENT' }); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [svcs, setSvcs] = useState([]);
  useEffect(() => { api.get('/services').then((r) => setSvcs(r.data.filter((x) => x.actif))).catch(() => {}); }, []);
  const toggleSvc = async (u, id) => { const cur = u.services || []; setErr(''); try { await api.patch(`/users/${u._id}`, { services: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }); load(); } catch (x) { setErr(msg(x)); } };
  const [pg, setPg] = useState(1); const [total, setTotal] = useState(0);
  const load = () => api.get('/users', { params: { page: pg } }).then((r) => { setList(r.data.data); setTotal(r.data.total); }).catch((e) => setErr(msg(e)));
  useEffect(() => { load(); }, [pg]);
  const submit = async (e) => { e.preventDefault(); setErr(''); setOk(''); try { await api.post('/users', f); setOk('Compte créé.'); setF({ ...f, nom: '', prenom: '', email: '', password: '' }); load(); } catch (x) { setErr(msg(x)); } };
  const toggle = async (u) => { setErr(''); try { await api.patch(`/users/${u._id}/status`, { actif: !u.actif }); load(); } catch (x) { setErr(msg(x)); } };
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (<div className="grid lg:grid-cols-3 gap-6"><form onSubmit={submit} className="card"><h1 className="text-xl font-bold mb-3">Créer un compte</h1>
    <Field label="Nom"><input className="inp" required value={f.nom} onChange={s('nom')} /></Field><Field label="Prénom"><input className="inp" required value={f.prenom} onChange={s('prenom')} /></Field>
    <Field label="E-mail"><input className="inp" type="email" required value={f.email} onChange={s('email')} /></Field><Field label="Mot de passe (12 caractères min.)"><input className="inp" type="password" minLength={12} required value={f.password} onChange={s('password')} /></Field>
    <Field label="Rôle"><select className="inp" value={f.role} onChange={s('role')}><option value="AGENT">Agent</option><option value="CITOYEN">Citoyen</option></select></Field>
    <Alert>{err}</Alert><Alert type="ok">{ok}</Alert><button className="btn mt-2">Créer</button></form>
    <div className="lg:col-span-2 overflow-x-auto"><h2 className="font-bold mb-2">Comptes</h2><table className="w-full text-sm bg-white rounded-lg"><tbody>{list.map((u) => <tr key={u._id} className="border-b"><td className="p-2">{u.prenom} {u.nom}<br /><span className="text-xs text-gray-500">{u.email}</span></td><td className="p-2">{u.role}</td>
      <td className="p-2">{u.actif ? 'Actif' : 'Désactivé'}</td><td className="p-2">{u.role === 'AGENT' && (svcs.length ? svcs.map((sv) => <label key={sv._id} className="block text-xs"><input type="checkbox" checked={!!u.services?.includes(sv._id)} onChange={() => toggleSvc(u, sv._id)} /> {sv.nom}</label>) : <span className="text-xs text-gray-500">Aucun service</span>)}</td><td className="p-2">{u.role !== 'ADMIN' && <button className="btn sec" onClick={() => toggle(u)}>{u.actif ? 'Désactiver' : 'Réactiver'}</button>}</td></tr>)}</tbody></table><Pager page={pg} total={total} onPage={setPg} /></div></div>);
}

export function AdminServices() {
  const [list, setList] = useState([]); const [f, setF] = useState({ nom: '', description: '' }); const [edit, setEdit] = useState(null); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const load = () => api.get('/services').then((r) => setList(r.data)).catch((e) => setErr(msg(e)));
  useEffect(() => { load(); }, []);
  const submit = async (e) => { e.preventDefault(); setErr(''); setOk('');
    try { if (edit) await api.patch(`/services/${edit}`, f); else await api.post('/services', f); setOk(edit ? 'Service modifié.' : 'Service créé.'); setF({ nom: '', description: '' }); setEdit(null); load(); } catch (x) { setErr(msg(x)); } };
  const toggle = async (x) => { setErr(''); try { await api.patch(`/services/${x._id}`, { actif: !x.actif }); load(); } catch (e) { setErr(msg(e)); } };
  return (<div className="grid lg:grid-cols-3 gap-6"><form onSubmit={submit} className="card"><h1 className="text-xl font-bold mb-3">{edit ? 'Modifier le service' : 'Nouveau service'}</h1>
    <Field label="Nom"><input className="inp" required minLength={2} value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></Field>
    <Field label="Description"><textarea className="inp" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
    <Alert>{err}</Alert><Alert type="ok">{ok}</Alert>
    <div className="flex gap-2 mt-2"><button className="btn">{edit ? 'Enregistrer' : 'Créer'}</button>{edit && <button type="button" className="btn sec" onClick={() => { setEdit(null); setF({ nom: '', description: '' }); }}>Annuler</button>}</div></form>
    <div className="lg:col-span-2"><h2 className="font-bold mb-2">Services administratifs</h2>{!list.length && <Empty>Aucun service.</Empty>}
      <ul className="space-y-2">{list.map((x) => <li key={x._id} className="card flex items-center gap-2"><div className="flex-1"><p className="font-semibold">{x.nom} {!x.actif && <span className="text-xs bg-gray-200 px-2 rounded-full">Inactif</span>}</p><p className="text-xs text-gray-500">{x.description}</p></div>
        <button className="btn sec" onClick={() => { setEdit(x._id); setF({ nom: x.nom, description: x.description || '' }); }}>Modifier</button><button className="btn sec" onClick={() => toggle(x)}>{x.actif ? 'Désactiver' : 'Réactiver'}</button></li>)}</ul></div></div>);
}
const ACTIONS = ['REQUEST_STATUS', 'REQUEST_ASSIGN', 'USER_CREATE', 'USER_STATUS', 'PROCEDURE_CREATE', 'PROCEDURE_UPDATE', 'SERVICE_CREATE', 'SERVICE_UPDATE', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_VERIFY'];
export function AdminAudit() {
  const [data, setData] = useState([]); const [total, setTotal] = useState(0); const [pg, setPg] = useState(1); const [action, setAction] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { api.get('/admin/audit-logs', { params: { page: pg, action: action || undefined } }).then((r) => { setData(r.data.data); setTotal(r.data.total); }).catch((e) => setErr(msg(e))); }, [pg, action]);
  return (<div><div className="flex flex-wrap items-center gap-3 mb-3"><h1 className="text-xl font-bold flex-1">Journal d’audit</h1>
    <select aria-label="Filtrer par action" className="inp max-w-xs" value={action} onChange={(e) => { setPg(1); setAction(e.target.value); }}><option value="">Toutes les actions</option>{ACTIONS.map((a) => <option key={a}>{a}</option>)}</select></div>
    <Alert>{err}</Alert>{!data.length && <Empty>Aucun événement.</Empty>}
    <div className="overflow-x-auto"><table className="w-full text-sm bg-white rounded-lg"><thead><tr className="text-left border-b"><th className="p-2">Date</th><th className="p-2">Acteur</th><th className="p-2">Action</th><th className="p-2">Ressource</th><th className="p-2">Résultat</th></tr></thead>
      <tbody>{data.map((l) => <tr key={l._id} className="border-b"><td className="p-2 whitespace-nowrap">{fmt(l.date)}</td><td className="p-2">{l.acteur ? `${l.acteur.prenom} ${l.acteur.nom}` : '—'}<br /><span className="text-xs text-gray-500">{l.acteur?.email}</span></td>
        <td className="p-2">{l.action}</td><td className="p-2">{l.ressource}<br /><span className="text-xs text-gray-500">{l.ressourceId}</span></td><td className="p-2">{l.resultat}</td></tr>)}</tbody></table></div>
    <Pager page={pg} total={total} onPage={setPg} /></div>);
}

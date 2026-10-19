import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, msg } from '../api.js';
import { Alert, Badge, Empty, Field } from '../ui.jsx';
const Stat = ({ l, v }) => <div className="card"><p className="text-2xl font-bold text-green-900">{v ?? '—'}</p><p className="text-sm text-gray-600">{l}</p></div>;
export function AdminDashboard() {
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
    <h2 className="font-bold mb-2">Dossiers</h2>{!vis.length && <Empty>Aucun dossier soumis.</Empty>}
    <div className="overflow-x-auto"><table className="w-full text-sm bg-white rounded-lg"><tbody>{vis.map((d) => <tr key={d._id} className="border-b"><td className="p-2"><Link className="underline" to={`/dossiers/${d._id}`}>{d.reference}</Link></td><td className="p-2"><Badge s={d.statut} /></td>
      <td className="p-2">{!['ACCEPTE', 'REJETE', 'CLOTURE'].includes(d.statut) && <select aria-label="Affecter à" className="inp" value={d.agent || ''} onChange={(e) => e.target.value && assign(d._id, e.target.value)}><option value="">Affecter à…</option>{agents.map((a) => <option key={a._id} value={a._id}>{a.prenom} {a.nom}</option>)}</select>}</td></tr>)}</tbody></table></div></div>);
}
export function AdminProcedures() {
  const [list, setList] = useState([]); const [f, setF] = useState({ nom: '', categorie: '', description: '', delai: '', pieces: '' }); const [champs, setChamps] = useState([]);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const load = () => api.get('/procedures', { params: { limit: 100 } }).then((r) => setList(r.data.data)).catch((e) => setErr(msg(e)));
  useEffect(() => { load(); }, []);
  const submit = async (e) => { e.preventDefault(); setErr(''); setOk('');
    try { await api.post('/procedures', { nom: f.nom, categorie: f.categorie || undefined, description: f.description || undefined, delaiIndicatifJours: f.delai ? +f.delai : undefined,
      piecesRequises: f.pieces.split(',').map((x) => x.trim()).filter(Boolean), champs: champs.map((c) => ({ ...c, options: c.type === 'select' ? c.options?.split(',').map((x) => x.trim()) : undefined })) });
      setOk('Procédure créée.'); setF({ nom: '', categorie: '', description: '', delai: '', pieces: '' }); setChamps([]); load(); } catch (x) { setErr(msg(x)); } };
  const setC = (i, k, v) => setChamps(champs.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  return (<div className="grid lg:grid-cols-2 gap-6"><form onSubmit={submit} className="card"><h1 className="text-xl font-bold mb-3">Nouvelle procédure</h1>
    <Field label="Nom"><input className="inp" required value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></Field>
    <Field label="Catégorie"><input className="inp" value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })} /></Field>
    <Field label="Description"><textarea className="inp" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
    <Field label="Délai indicatif (jours)"><input className="inp" type="number" min="1" value={f.delai} onChange={(e) => setF({ ...f, delai: e.target.value })} /></Field>
    <Field label="Pièces requises (séparées par des virgules)"><input className="inp" value={f.pieces} onChange={(e) => setF({ ...f, pieces: e.target.value })} /></Field>
    <h2 className="font-semibold mb-2">Champs du formulaire</h2>
    {champs.map((c, i) => <div key={i} className="grid grid-cols-2 gap-2 mb-3 border-b pb-3"><input aria-label="Identifiant" className="inp" placeholder="identifiant (ex: lieu_naissance)" pattern="[a-zA-Z_]\w*" required value={c.name} onChange={(e) => setC(i, 'name', e.target.value)} />
      <input aria-label="Libellé" className="inp" placeholder="Libellé" required value={c.label} onChange={(e) => setC(i, 'label', e.target.value)} />
      <select aria-label="Type" className="inp" value={c.type} onChange={(e) => setC(i, 'type', e.target.value)}>{['text', 'textarea', 'number', 'date', 'select', 'email', 'tel'].map((t) => <option key={t}>{t}</option>)}</select>
      <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={!!c.required} onChange={(e) => setC(i, 'required', e.target.checked)} />Obligatoire</label>
      {c.type === 'select' && <input aria-label="Options" className="inp col-span-2" placeholder="Options séparées par des virgules" required onChange={(e) => setC(i, 'options', e.target.value)} />}
      <button type="button" className="btn sec col-span-2" onClick={() => setChamps(champs.filter((_, j) => j !== i))}>Retirer ce champ</button></div>)}
    <button type="button" className="btn sec mb-3" onClick={() => setChamps([...champs, { name: '', label: '', type: 'text', required: false }])}>Ajouter un champ</button>
    <Alert>{err}</Alert><Alert type="ok">{ok}</Alert><div><button className="btn mt-2">Créer la procédure</button></div></form>
    <div><h2 className="font-bold mb-2">Procédures actives</h2>{!list.length && <Empty>Aucune procédure.</Empty>}
      <ul className="space-y-2">{list.map((p) => <li key={p._id} className="card flex items-center gap-2"><div className="flex-1"><p className="font-semibold">{p.nom}</p><p className="text-xs text-gray-500">v{p.version} · {p.champs?.length || 0} champ(s)</p></div>
        <button className="btn sec" onClick={async () => { if (window.confirm('Désactiver cette procédure ?')) { await api.patch(`/procedures/${p._id}`, { actif: false }); load(); } }}>Désactiver</button></li>)}</ul></div></div>);
}
export function AdminUsers() {
  const [list, setList] = useState([]); const [f, setF] = useState({ nom: '', prenom: '', email: '', password: '', role: 'AGENT' }); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const load = () => api.get('/users', { params: { limit: 100 } }).then((r) => setList(r.data.data)).catch((e) => setErr(msg(e)));
  useEffect(() => { load(); }, []);
  const submit = async (e) => { e.preventDefault(); setErr(''); setOk(''); try { await api.post('/users', f); setOk('Compte créé.'); setF({ ...f, nom: '', prenom: '', email: '', password: '' }); load(); } catch (x) { setErr(msg(x)); } };
  const toggle = async (u) => { setErr(''); try { await api.patch(`/users/${u._id}/status`, { actif: !u.actif }); load(); } catch (x) { setErr(msg(x)); } };
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (<div className="grid lg:grid-cols-3 gap-6"><form onSubmit={submit} className="card"><h1 className="text-xl font-bold mb-3">Créer un compte</h1>
    <Field label="Nom"><input className="inp" required value={f.nom} onChange={s('nom')} /></Field><Field label="Prénom"><input className="inp" required value={f.prenom} onChange={s('prenom')} /></Field>
    <Field label="E-mail"><input className="inp" type="email" required value={f.email} onChange={s('email')} /></Field><Field label="Mot de passe (12 caractères min.)"><input className="inp" type="password" minLength={12} required value={f.password} onChange={s('password')} /></Field>
    <Field label="Rôle"><select className="inp" value={f.role} onChange={s('role')}><option value="AGENT">Agent</option><option value="CITOYEN">Citoyen</option></select></Field>
    <Alert>{err}</Alert><Alert type="ok">{ok}</Alert><button className="btn mt-2">Créer</button></form>
    <div className="lg:col-span-2 overflow-x-auto"><h2 className="font-bold mb-2">Comptes</h2><table className="w-full text-sm bg-white rounded-lg"><tbody>{list.map((u) => <tr key={u._id} className="border-b"><td className="p-2">{u.prenom} {u.nom}<br /><span className="text-xs text-gray-500">{u.email}</span></td><td className="p-2">{u.role}</td>
      <td className="p-2">{u.actif ? 'Actif' : 'Désactivé'}</td><td className="p-2">{u.role !== 'ADMIN' && <button className="btn sec" onClick={() => toggle(u)}>{u.actif ? 'Désactiver' : 'Réactiver'}</button>}</td></tr>)}</tbody></table></div></div>);
}

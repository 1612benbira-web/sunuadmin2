import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api, msg, fmt } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Field, Empty } from '../ui.jsx';
export function Home() {
  const [q, setQ] = useState(''); const [list, setList] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { const t = setTimeout(() => api.get('/procedures', { params: { q: q || undefined } }).then((r) => setList(r.data.data)).catch((e) => setErr(msg(e))), 300); return () => clearTimeout(t); }, [q]);
  const { user } = useAuth();
  return (<div><h1 className="text-2xl font-bold mb-1">Démarches administratives</h1>
    <p className="text-gray-600 mb-4">Consultez les démarches, constituez votre dossier et suivez son avancement.</p>
    <div className="relative max-w-md mb-4"><Search size={16} className="absolute left-3 top-3 text-gray-400" /><input aria-label="Rechercher une démarche" className="inp pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    <Alert>{err}</Alert>{list && !list.length && <Empty>Aucune démarche disponible.</Empty>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{list?.map((p) => <article key={p._id} className="card flex flex-col">
      <span className="text-xs text-green-800 font-semibold">{p.categorie || 'Général'}</span><h2 className="font-bold">{p.nom}</h2>
      <p className="text-sm text-gray-600 flex-1">{p.description}</p>
      {p.delaiIndicatifJours && <p className="text-xs mt-2">Délai indicatif : {p.delaiIndicatifJours} jours</p>}
      {p.piecesRequises?.length > 0 && <p className="text-xs">Pièces : {p.piecesRequises.join(', ')}</p>}
      {(!user || user.role === 'CITOYEN') && <Link className="btn mt-3 justify-center" to={`/citoyen/nouvelle/${p._id}`}>Faire une demande</Link>}</article>)}</div></div>);
}
function Auth({ mode }) {
  const { login, register } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ nom: '', prenom: '', email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); setErr(''); setBusy(true);
    try { const u = mode === 'login' ? await login(f.email, f.password) : await register(f); nav(u.role === 'ADMIN' ? '/admin' : u.role === 'AGENT' ? '/agent' : '/citoyen'); }
    catch (x) { setErr(msg(x)); } finally { setBusy(false); } };
  return (<form onSubmit={submit} className="card max-w-md mx-auto"><h1 className="text-xl font-bold mb-4">{mode === 'login' ? 'Connexion' : 'Créer un compte citoyen'}</h1>
    {mode === 'register' && <><Field label="Nom"><input className="inp" required value={f.nom} onChange={set('nom')} /></Field><Field label="Prénom"><input className="inp" required value={f.prenom} onChange={set('prenom')} /></Field></>}
    <Field label="Adresse e-mail"><input className="inp" type="email" required value={f.email} onChange={set('email')} /></Field>
    <Field label={mode === 'login' ? 'Mot de passe' : 'Mot de passe (10 caractères minimum)'}><input className="inp" type="password" required minLength={mode === 'login' ? 1 : 10} value={f.password} onChange={set('password')} /></Field>
    <Alert>{err}</Alert><button className="btn w-full justify-center mt-3" disabled={busy}>{busy ? 'Patientez…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}</button></form>);
}
export const Login = () => <Auth mode="login" />;
export const Register = () => <Auth mode="register" />;
export function Notifications() {
  const [list, setList] = useState(null); const [err, setErr] = useState('');
  const load = () => api.get('/notifications').then((r) => setList(r.data)).catch((e) => setErr(msg(e)));
  useEffect(() => { load(); }, []);
  return (<div><div className="flex items-center mb-4"><h1 className="text-xl font-bold flex-1">Notifications</h1>
    <button className="btn sec" onClick={async () => { await api.patch('/notifications/read-all'); load(); }}>Tout marquer comme lu</button></div><Alert>{err}</Alert>
    {list && !list.length && <Empty>Aucune notification.</Empty>}
    <ul className="space-y-2">{list?.map((n) => <li key={n._id} className={`card flex items-center gap-3 ${n.lu ? 'opacity-60' : 'border-green-600'}`}>
      <div className="flex-1"><p>{n.message}</p><p className="text-xs text-gray-500">{fmt(n.createdAt)}</p></div>
      {n.requestId && <Link className="underline text-sm" to={`/dossiers/${n.requestId}`}>Ouvrir</Link>}
      {!n.lu && <button className="btn sec" onClick={async () => { await api.patch(`/notifications/${n._id}/read`); load(); }}>Lu</button>}</li>)}</ul></div>);
}

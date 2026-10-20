import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, msg, fmt } from '../api.js';
import { Alert, Badge, Empty, Field } from '../ui.jsx';
export function MyRequests() {
  const [list, setList] = useState(null); const [procs, setProcs] = useState({}); const [err, setErr] = useState('');
  useEffect(() => { Promise.all([api.get('/requests'), api.get('/procedures', { params: { limit: 100 } })])
    .then(([a, b]) => { setList(a.data); setProcs(Object.fromEntries(b.data.data.map((p) => [p._id, p.nom]))); }).catch((e) => setErr(msg(e))); }, []);
  return (<div><div className="flex items-center mb-4"><h1 className="text-xl font-bold flex-1">Mes demandes</h1><Link className="btn" to="/">Nouvelle démarche</Link></div><Alert>{err}</Alert>
    {list && !list.length && <Empty>Vous n'avez aucune demande. Choisissez une démarche pour commencer.</Empty>}
    <div className="space-y-2">{list?.map((d) => <Link key={d._id} to={`/dossiers/${d._id}`} className="card flex items-center gap-3 hover:border-green-600">
      <div className="flex-1"><p className="font-semibold">{d.procedure?.nom || d.procedureSnapshot?.nom || 'Démarche'}</p><p className="text-xs text-gray-500">{d.reference || 'Brouillon'} · créé le {fmt(d.createdAt)}</p></div><Badge s={d.statut} /></Link>)}</div></div>);
}
const TYPES = { text: 'text', textarea: 'textarea', number: 'number', date: 'date', select: 'select', email: 'email', tel: 'tel' };
export function NewRequest() {
  const { id } = useParams(); const nav = useNavigate();
  const [p, setP] = useState(null); const [rep, setRep] = useState({}); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get(`/procedures/${id}`).then((r) => setP(r.data)).catch((e) => setErr(msg(e))); }, [id]);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api.post('/requests', { procedure: id, reponses: rep }); nav(`/dossiers/${r.data._id}`); } catch (x) { setErr(msg(x)); setBusy(false); } };
  if (!p) return <Alert>{err}</Alert>;
  return (<form onSubmit={submit} className="card max-w-2xl mx-auto"><h1 className="text-xl font-bold">{p.nom}</h1><p className="text-sm text-gray-600 mb-3">{p.instructions || p.description}</p>
    {p.champs?.map((c) => <Field key={c.name} label={c.label + (c.required ? ' *' : '')}>
      {c.type === 'textarea' ? <textarea className="inp" required={c.required} onChange={(e) => setRep({ ...rep, [c.name]: e.target.value })} />
        : c.type === 'select' ? <select className="inp" required={c.required} defaultValue="" onChange={(e) => setRep({ ...rep, [c.name]: e.target.value })}><option value="" disabled>Choisir…</option>{c.options?.map((o) => <option key={o}>{o}</option>)}</select>
          : <input className="inp" type={TYPES[c.type] || 'text'} required={c.required} onChange={(e) => setRep({ ...rep, [c.name]: e.target.value })} />}</Field>)}
    {!p.champs?.length && <p className="text-sm mb-3">Aucun champ à remplir : vous ajouterez vos pièces à l'étape suivante.</p>}
    {p.piecesRequises?.length > 0 && <p className="text-sm mb-3">Pièces à fournir ensuite : {p.piecesRequises.join(', ')}.</p>}
    <Alert>{err}</Alert><button className="btn mt-3" disabled={busy}>Enregistrer le brouillon</button></form>);
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Upload } from 'lucide-react';
import { api, msg, fmt } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Empty } from '../ui.jsx';
export function AgentQueue() {
  const [list, setList] = useState(null); const [f, setF] = useState(''); const [q, setQ] = useState(''); const [err, setErr] = useState('');
  const [st, setSt] = useState(null); useEffect(() => { api.get('/requests/stats/me').then((x) => setSt(x.data)).catch(() => {}); }, []);
  useEffect(() => { api.get('/requests', { params: { statut: f || undefined } }).then((r) => setList(r.data)).catch((e) => setErr(msg(e))); }, [f]);
  const shown = list?.filter((d) => (d.reference || '').includes(q.toUpperCase()));
  return (<div><h1 className="text-xl font-bold mb-3">Dossiers qui me sont attribués</h1>
    {st && <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">{[['Attribués', st.attribues], ['En cours', st.enCours], ['Compléments', st.complement], ['Acceptés', st.acceptes], ['Délai moyen (h)', st.delaiMoyenHeures ?? '—']].map(([l, v]) => <div key={l} className="card"><p className="text-2xl font-bold text-green-900">{v}</p><p className="text-sm text-gray-600">{l}</p></div>)}</div>}
    <div className="flex flex-wrap gap-2 mb-3"><input aria-label="Référence" className="inp max-w-xs" placeholder="Référence SA-…" value={q} onChange={(e) => setQ(e.target.value)} />
      <select aria-label="Statut" className="inp max-w-xs" value={f} onChange={(e) => setF(e.target.value)}><option value="">Tous les statuts</option>{['SOUMIS', 'EN_COURS', 'COMPLEMENT_REQUIS', 'ACCEPTE', 'REJETE'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
    <Alert>{err}</Alert>{shown && !shown.length && <Empty>Aucun dossier.</Empty>}
    <div className="space-y-2">{shown?.map((d) => <Link key={d._id} to={`/dossiers/${d._id}`} className="card flex items-center gap-3 hover:border-green-600"><div className="flex-1"><p className="font-semibold">{d.reference} — {d.procedure?.nom}</p><p className="text-xs text-gray-500">{d.demandeur?.prenom} {d.demandeur?.nom} · soumis le {fmt(d.soumisLe)}</p></div><Badge s={d.statut} /></Link>)}</div></div>);
}
export function RequestDetail() {
  const { id } = useParams(); const { user } = useAuth();
  const [d, setD] = useState(null); const [docs, setDocs] = useState([]); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [motif, setMotif] = useState('');
  const load = () => Promise.all([api.get(`/requests/${id}`), api.get(`/requests/${id}/documents`)]).then(([a, b]) => { setD(a.data); setDocs(b.data); }).catch((e) => setErr(msg(e)));
  useEffect(() => { load(); }, [id]);
  const act = async (fn, okMsg) => { setErr(''); setOk(''); try { await fn(); setOk(okMsg || 'Opération effectuée.'); setMotif(''); await load(); } catch (e) { setErr(msg(e)); } };
  const setStatut = (statut) => act(() => api.patch(`/requests/${id}/status`, { statut, motif: motif || undefined }), 'Statut mis à jour.');
  const upload = (e) => { const file = e.target.files[0]; if (!file) return; const fd = new FormData(); fd.append('fichier', file); act(() => api.post(`/requests/${id}/documents`, fd), 'Pièce envoyée.'); e.target.value = ''; };
  if (!d) return <Alert>{err}</Alert>;
  const staff = user.role !== 'CITOYEN'; const lastMotif = [...d.historique].reverse().find((h) => h.motif);
  const needMotif = d.statut === 'EN_COURS' && staff;
  return (<div className="space-y-4"><div className="card"><div className="flex items-center gap-3"><h1 className="text-xl font-bold flex-1">{d.procedureSnapshot?.nom || 'Brouillon'} {d.reference && `· ${d.reference}`}</h1><Badge s={d.statut} /></div>
    {lastMotif && ['COMPLEMENT_REQUIS', 'REJETE', 'ACCEPTE'].includes(d.statut) && <p className="mt-2 text-sm"><b>Motif :</b> {lastMotif.motif}</p>}
    {Object.keys(d.reponses || {}).length > 0 && <dl className="mt-3 text-sm grid grid-cols-[auto_1fr] gap-x-4">{Object.entries(d.reponses).map(([k, v]) => [<dt key={k} className="font-semibold">{k}</dt>, <dd key={k + 'v'}>{String(v)}</dd>])}</dl>}</div>
    <Alert>{err}</Alert><Alert type="ok">{ok}</Alert>
    <div className="card"><h2 className="font-bold mb-2">Pièces justificatives</h2>{!docs.length && <p className="text-sm text-gray-500">Aucune pièce.</p>}
      <ul className="divide-y">{docs.map((x) => <li key={x._id} className="py-2 flex flex-wrap items-center gap-3 text-sm"><span className="flex-1">{x.nomOriginal} <span className="text-gray-500">({x.verification})</span></span>
        <a className="btn sec" href={`/api/v1/documents/${x._id}/download`}><Download size={14} />Télécharger</a>
        {staff && ['VALIDE', 'REFUSE'].map((v) => <button key={v} className="btn sec" onClick={() => act(() => api.patch(`/documents/${x._id}/verification`, { verification: v }), 'Vérification enregistrée.')}>{v === 'VALIDE' ? 'Valider' : 'Refuser'}</button>)}</li>)}</ul>
      {user.role === 'CITOYEN' && ['BROUILLON', 'COMPLEMENT_REQUIS'].includes(d.statut) && <label className="btn mt-3 cursor-pointer"><Upload size={16} />Ajouter une pièce (PDF, PNG, JPEG, 4 Mo max)<input type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" onChange={upload} /></label>}</div>
    <div className="card flex flex-wrap items-center gap-2"><h2 className="font-bold w-full">Actions</h2>
      {user.role === 'CITOYEN' && d.statut === 'BROUILLON' && <button className="btn" onClick={() => window.confirm('Soumettre ce dossier ? Il ne sera plus modifiable.') && setStatut('SOUMIS')}>Soumettre le dossier</button>}
      {user.role === 'CITOYEN' && d.statut === 'COMPLEMENT_REQUIS' && <button className="btn" onClick={() => setStatut('EN_COURS')}>Renvoyer le dossier complété</button>}
      {staff && ['SOUMIS', 'EN_ATTENTE'].includes(d.statut) && <button className="btn" onClick={() => setStatut('EN_COURS')}>Prendre en charge</button>}
      {needMotif && <><input aria-label="Motif" className="inp" placeholder="Motif (obligatoire pour rejet ou complément)" value={motif} onChange={(e) => setMotif(e.target.value)} />
        <button className="btn" onClick={() => setStatut('ACCEPTE')}>Accepter</button><button className="btn sec" onClick={() => setStatut('COMPLEMENT_REQUIS')}>Demander un complément</button>
        <button className="btn red" onClick={() => window.confirm('Rejeter définitivement ce dossier ?') && setStatut('REJETE')}>Rejeter</button></>}
      {user.role === 'ADMIN' && ['ACCEPTE', 'REJETE'].includes(d.statut) && <button className="btn sec" onClick={() => setStatut('CLOTURE')}>Clôturer</button>}
      {!['BROUILLON', 'COMPLEMENT_REQUIS'].includes(d.statut) && user.role === 'CITOYEN' && <p className="text-sm text-gray-500">Aucune action disponible pour le moment.</p>}</div>
    <div className="card"><h2 className="font-bold mb-2">Historique</h2><ol className="text-sm space-y-1">{d.historique.map((h, i) => <li key={i}>{fmt(h.date)} — {h.evenement === 'AFFECTATION' ? <b>{h.motif}</b> : <>{h.ancien} → <b>{h.nouveau}</b>{h.motif && ` (${h.motif})`}</>}</li>)}</ol></div></div>);
}

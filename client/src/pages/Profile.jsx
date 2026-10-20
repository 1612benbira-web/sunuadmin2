import { useState } from 'react';
import { api, msg } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Field } from '../ui.jsx';
export function Profile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ nom: user.nom, prenom: user.prenom }); const [p, setP] = useState({ ancien: '', nouveau: '' });
  const [e1, setE1] = useState(''); const [o1, setO1] = useState(''); const [e2, setE2] = useState(''); const [o2, setO2] = useState('');
  const save = async (e) => { e.preventDefault(); setE1(''); setO1(''); try { const r = await api.patch('/auth/me', f); setUser(r.data); setO1('Profil mis à jour.'); } catch (x) { setE1(msg(x)); } };
  const pw = async (e) => { e.preventDefault(); setE2(''); setO2(''); try { await api.post('/auth/password', p); setP({ ancien: '', nouveau: '' }); setO2('Mot de passe modifié. Vos autres sessions ont été fermées.'); } catch (x) { setE2(msg(x)); } };
  return (<div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
    <form onSubmit={save} className="card"><h1 className="text-xl font-bold mb-1">Mon profil</h1><p className="text-sm text-gray-600 mb-3">{user.email} · rôle : {user.role}</p>
      <Field label="Nom"><input className="inp" required value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></Field>
      <Field label="Prénom"><input className="inp" required value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} /></Field>
      <Alert>{e1}</Alert><Alert type="ok">{o1}</Alert><button className="btn mt-2">Enregistrer</button></form>
    <form onSubmit={pw} className="card"><h2 className="text-xl font-bold mb-3">Changer le mot de passe</h2>
      <Field label="Mot de passe actuel"><input className="inp" type="password" required value={p.ancien} onChange={(e) => setP({ ...p, ancien: e.target.value })} /></Field>
      <Field label="Nouveau mot de passe (10 caractères minimum)"><input className="inp" type="password" required minLength={10} value={p.nouveau} onChange={(e) => setP({ ...p, nouveau: e.target.value })} /></Field>
      <Alert>{e2}</Alert><Alert type="ok">{o2}</Alert><button className="btn mt-2">Modifier</button></form></div>);
}

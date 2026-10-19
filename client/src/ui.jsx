import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Landmark, LogOut, Bell } from 'lucide-react';
import { useAuth } from './auth.jsx';
export const STATUT = { BROUILLON: ['Brouillon', 'bg-gray-200 text-gray-800'], SOUMIS: ['Soumis', 'bg-blue-100 text-blue-900'], EN_ATTENTE: ['En attente', 'bg-yellow-100 text-yellow-900'],
  EN_COURS: ['En cours', 'bg-amber-100 text-amber-900'], COMPLEMENT_REQUIS: ['Complément requis', 'bg-orange-100 text-orange-900'], ACCEPTE: ['Accepté', 'bg-green-100 text-green-900'],
  REJETE: ['Rejeté', 'bg-red-100 text-red-900'], CLOTURE: ['Clôturé', 'bg-gray-300 text-gray-900'] };
export const Badge = ({ s }) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUT[s]?.[1]}`}>{STATUT[s]?.[0] || s}</span>;
export const Alert = ({ type = 'err', children }) => children ? <div role="alert" className={`rounded-lg p-3 text-sm ${type === 'err' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>{children}</div> : null;
export const Field = ({ label, children }) => <label className="block text-sm font-medium mb-3"><span className="block mb-1">{label}</span>{children}</label>;
export const Empty = ({ children }) => <p className="text-center text-gray-500 py-8">{children}</p>;
const NAV = { CITOYEN: [['/citoyen', 'Mes demandes']], AGENT: [['/agent', 'Dossiers à traiter']], ADMIN: [['/admin', 'Tableau de bord'], ['/admin/procedures', 'Procédures'], ['/admin/utilisateurs', 'Utilisateurs']] };
export function Layout() {
  const { user, logout } = useAuth(); const nav = useNavigate();
  const lk = ({ isActive }) => `px-3 py-1 rounded ${isActive ? 'bg-white text-green-900' : 'hover:bg-green-800'}`;
  return (<div className="min-h-screen flex flex-col">
    <header className="bg-green-900 text-white"><div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
      <Link to="/" className="flex items-center gap-2 font-bold text-lg"><Landmark size={22} />SunuAdmin</Link>
      <nav className="flex flex-wrap gap-1 text-sm" aria-label="Navigation principale"><NavLink to="/" end className={lk}>Démarches</NavLink>
        {user && NAV[user.role].map(([to, l]) => <NavLink key={to} to={to} end className={lk}>{l}</NavLink>)}</nav>
      <div className="ml-auto flex items-center gap-3 text-sm">
        {user ? <><Link to="/notifications" aria-label="Notifications"><Bell size={18} /></Link><span>{user.prenom} {user.nom}</span>
          <button className="flex items-center gap-1 underline" onClick={async () => { await logout(); nav('/'); }}><LogOut size={16} />Déconnexion</button></>
          : <><Link to="/connexion" className="underline">Connexion</Link><Link to="/inscription" className="bg-yellow-400 text-black px-3 py-1 rounded font-semibold">Inscription</Link></>}
      </div></div><div className="h-1 bg-gradient-to-r from-green-600 via-yellow-400 to-red-600" /></header>
    <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1"><Outlet /></main>
    <footer className="text-center text-xs text-gray-500 py-4">Projet de conception indépendant, non relié à une administration officielle. Les données affichées peuvent être des données de démonstration.</footer>
  </div>);
}
export function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Empty>Chargement…</Empty>;
  if (!user) return <Navigate to="/connexion" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/403" replace />;
  return children;
}

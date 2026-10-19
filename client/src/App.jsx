import { Routes, Route, Link } from 'react-router-dom';
import { Layout, Guard } from './ui.jsx';
import { Home, Login, Register, Notifications } from './pages/Public.jsx';
import { MyRequests, NewRequest } from './pages/Citizen.jsx';
import { RequestDetail, AgentQueue } from './pages/Requests.jsx';
import { AdminDashboard, AdminProcedures, AdminUsers } from './pages/Admin.jsx';
const Err = ({ code, text }) => <div className="text-center py-16"><h1 className="text-4xl font-bold">{code}</h1><p className="my-3">{text}</p><Link className="btn" to="/">Retour à l'accueil</Link></div>;
export default function App() {
  return (<Routes><Route element={<Layout />}>
    <Route path="/" element={<Home />} /><Route path="/connexion" element={<Login />} /><Route path="/inscription" element={<Register />} />
    <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
    <Route path="/citoyen" element={<Guard roles={['CITOYEN']}><MyRequests /></Guard>} />
    <Route path="/citoyen/nouvelle/:id" element={<Guard roles={['CITOYEN']}><NewRequest /></Guard>} />
    <Route path="/dossiers/:id" element={<Guard><RequestDetail /></Guard>} />
    <Route path="/agent" element={<Guard roles={['AGENT']}><AgentQueue /></Guard>} />
    <Route path="/admin" element={<Guard roles={['ADMIN']}><AdminDashboard /></Guard>} />
    <Route path="/admin/procedures" element={<Guard roles={['ADMIN']}><AdminProcedures /></Guard>} />
    <Route path="/admin/utilisateurs" element={<Guard roles={['ADMIN']}><AdminUsers /></Guard>} />
    <Route path="/403" element={<Err code="403" text="Vous n'avez pas accès à cette page." />} />
    <Route path="*" element={<Err code="404" text="Page introuvable." />} />
  </Route></Routes>);
}

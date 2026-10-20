import axios from 'axios';
export const api = axios.create({ baseURL: '/api/v1', withCredentials: true, headers: { 'X-Requested-With': 'sunuadmin' } });
export const msg = (e) => e.response?.data?.message || 'Erreur de connexion au serveur.';
export const fmt = (d) => (d ? new Date(d).toLocaleString('fr-FR') : '');

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// Le proxy évite CORS et garde le cookie HttpOnly sur la même origine en développement.
export default defineConfig({ plugins: [react(), tailwindcss()], server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } } });

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxy = { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true } };
export default defineConfig({ plugins: [react()], cacheDir: '.vite-cache', server: { proxy }, preview: { proxy } });

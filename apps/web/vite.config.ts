import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true, type: 'module', navigateFallback: 'index.html' },
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'NODO360 - Gestión Bomberos',
        short_name: 'NODO360',
        description: 'Plataforma de gestión operativa para compañías de bomberos',
        theme_color: '#dc2626',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/login',
        icons: [
          { src: 'favicon.png', sizes: '192x192', type: 'image/png' },
          { src: 'favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});

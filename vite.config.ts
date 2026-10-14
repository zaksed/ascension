import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { realpathSync } from 'node:fs';

// base relative : l'app fonctionne servie depuis n'importe quel sous-dossier (ou GitHub Pages).
export default defineConfig({
  // Chemin réel du projet : évite un échec du build quand le dossier est atteint par un lien
  // ou un chemin virtualisé (cas de certains dossiers Windows) ; sans effet sinon.
  root: realpathSync.native(import.meta.dirname),
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // enregistrement manuel dans src/pwa.ts
      includeAssets: ['icons/*.png', 'icons/*.svg', 'audio/**/*'],
      manifest: {
        name: 'Ascension — TOEIC & TAGE MAGE',
        short_name: 'Ascension',
        description:
          'Révisions gamifiées du TOEIC Listening & Reading et du TAGE MAGE. Hors ligne, sans compte, sans publicité.',
        lang: 'fr',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b1220',
        theme_color: '#0e7490',
        categories: ['education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout est pré-caché : le contenu (JSON compilé en JS), l'interface et l'audio éventuel.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json,mp3,ogg}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
  },
});

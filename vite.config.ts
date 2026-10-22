import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /<repo>/, the Android build from the root.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        id: base,
        name: 'Emberfall',
        short_name: 'Emberfall',
        description: 'Turn real-life tasks into quests that drop loot. Built for ADHD: three quests at a time, 5-minute starts, no streaks.',
        lang: 'en',
        dir: 'ltr',
        categories: ['productivity', 'lifestyle', 'games', 'health'],
        theme_color: '#0c0908',
        background_color: '#0c0908',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Shown by Chrome on Android in the richer install sheet.
        screenshots: [
          { src: 'screenshots/loot-drop.png', sizes: '585x1266', type: 'image/png', form_factor: 'narrow', label: 'Every finished task can drop loot' },
          { src: 'screenshots/three-for-now.png', sizes: '585x1266', type: 'image/png', form_factor: 'narrow', label: 'Three quests for your energy right now' },
          { src: 'screenshots/dungeon-run.png', sizes: '585x1266', type: 'image/png', form_factor: 'narrow', label: 'Dungeon Runs: a focus timer that keeps time with the screen off' },
          { src: 'screenshots/realm-blight.png', sizes: '585x1266', type: 'image/png', form_factor: 'narrow', label: 'The Blight: one small quest clears it' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // Store/preview images aren't needed offline.
        globIgnores: ['screenshots/**', 'og-image.png'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
  },
});

import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      filename: 'sw.js',
      workbox: {
        navigateFallback: 'index.html',
        // Медиа НЕ в precache (план: Global Constraints) — отдельный кеш, маршрут зарезервирован.
        runtimeCaching: [
          {
            urlPattern: /\/media\//,
            handler: 'CacheFirst',
            options: { cacheName: 'media-cache-v1' },
          },
        ],
      },
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Стрелковые тренировки',
        short_name: 'Тренировки',
        lang: 'ru',
        dir: 'ltr',
        display: 'standalone',
        start_url: './',
        theme_color: '#14161a',
        background_color: '#14161a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
  },
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mess Manager',
        short_name: 'Mess',
        description:
          'Manage a shared mess: meals, bazar, expenses, payments and monthly settlements.',
        lang: 'en',
        theme_color: '#f5ebe6',
        background_color: '#f5ebe6',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built app shell so it opens offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: '/index.html',
        // Never route Supabase/API calls through the SPA fallback.
        navigateFallbackDenylist: [/^\/rest/, /^\/auth/, /^\/realtime/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Google Fonts stylesheets + files — cache for speed/offline.
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Keep the SW out of `npm run dev` to avoid stale-cache surprises while developing.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Allow sharing via a public tunnel (e.g. Cloudflare / ngrok).
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
})

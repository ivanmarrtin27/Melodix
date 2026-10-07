import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/react-router')) return 'router'
        },
      },
    },
  },
  server: {
    // `npm run dev:all:mobile` / `dev:web:lan` pasan --host 0.0.0.0
    host: 'localhost',
    strictPort: false,
    headers: {
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.range) {
              proxyReq.setHeader('Range', req.headers.range)
            }
          })
          proxy.on('error', (err, _req, res) => {
            console.error('[vite proxy /api]', err.message)
            if (res && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'api_unreachable' }))
            }
          })
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo.png', 'icons/*.png', 'privacy.html'],
      manifest: {
        name: 'Melodix',
        short_name: 'Melodix',
        description: 'Música comercial del panorama — catálogo y reproducción embebida.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^\/api\/health/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/api\/(media|resolve|charts)/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/api\/catalog\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'catalog-api-cache',
              expiration: { maxEntries: 80, maxAgeSeconds: 600 },
            },
          },
          {
            urlPattern: /^https:\/\/cdn-images\.dzcdn\.net/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cover-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
            },
          },
          {
            urlPattern: /^https:\/\/(i\.ytimg\.com|yt3\.ggpht\.com)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'thumbnail-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 604800 },
            },
          },
        ],
      },
    }),
  ],
})

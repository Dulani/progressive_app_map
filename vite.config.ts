import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Progressive Map App',
        short_name: 'Map App',
        description: 'A progressive web app for displaying maps and location data',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ],
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/'
      }
    })
  ],
})

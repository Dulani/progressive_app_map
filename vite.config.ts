import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/progressive_app_map/',
  build: {
    rollupOptions: {
      output: {
        format: 'iife'
      }
    }
  },
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
            src: '/progressive_app_map/vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ],
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/progressive_app_map/',
        scope: '/progressive_app_map/'
      }
    })
  ],
})

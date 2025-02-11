import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/progressive_app_map/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [react()]
})

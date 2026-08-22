import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 3000,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy, rarely-changing vendor code into its own chunks. This keeps
        // the app bundle small (so only it re-downloads on each redeploy) and lets
        // the browser cache the big libraries long-term across releases.
        manualChunks: {
          maplibre: ['maplibre-gl'],
          'react-vendor': ['react', 'react-dom']
        }
      }
    },
    // maplibre-gl is inherently large (~800 kB) and now lives in its own cacheable
    // chunk; raise the advisory threshold above it so build output stays clean.
    chunkSizeWarningLimit: 900
  }
})

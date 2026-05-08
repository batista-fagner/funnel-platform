import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: 5173,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/rapidapi': {
        target: 'https://instagram120.p.rapidapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rapidapi/, ''),
      },
      '/ig-image': {
        target: 'https://instagram.fbdo9-1.fna.fbcdn.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ig-image/, ''),
      },
    },
  },
  plugins: [react()],
})
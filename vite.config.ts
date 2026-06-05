import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import path from 'path'

const copyRedirects = {
  name: 'copy-redirects',
  closeBundle() {
    if (existsSync('public/_redirects')) {
      copyFileSync('public/_redirects', 'dist/_redirects')
      console.log('✓ _redirects copied to dist/')
    }
  },
}

export default defineConfig({
  plugins: [react(), copyRedirects],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa para funcionar tanto localmente quanto no GitHub Pages
export default defineConfig({
  base: './',
  plugins: [react()],
})

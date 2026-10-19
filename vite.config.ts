import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// No federation plugin here on purpose: web component frontends are plain
// scripts that register a custom element, so the host only needs the URL the
// orchestrator resolved. See src/FrontendLoader.tsx.
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  }
})

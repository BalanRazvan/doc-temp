import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward /api/* to FastAPI in development, so the frontend never hardcodes a
    // backend URL and the browser never makes a cross-origin request.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})

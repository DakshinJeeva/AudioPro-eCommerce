import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // bind to 0.0.0.0 so Docker exposes the port correctly
    port: 5173,
    proxy: {
      // All /api/* and /uploads/* requests are proxied from the Vite dev server
      // to the backend container (resolved inside the Docker network as "backend")
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})


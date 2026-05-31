import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ── Service URLs (read from env at build/dev time by Node, NOT the browser) ──
// In Docker: set via environment in docker-compose.yaml
// Local dev:  defaults to localhost ports
const USER_API = process.env.VITE_USER_API_URL || 'http://localhost:5001';
const PRODUCT_API = process.env.VITE_PRODUCT_API_URL || 'http://localhost:5002';
const ORDER_API = process.env.VITE_ORDER_API_URL || 'http://localhost:5003';
const MCP_API = process.env.VITE_MCP_API_URL || 'http://localhost:5004';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // bind to 0.0.0.0 so Docker exposes the port correctly
    port: 5173,
    proxy: {
      // ── user-service (:5001) ───────────────────────────────────────────────
      '/api/users': { target: USER_API, changeOrigin: true },
      '/api/password': { target: USER_API, changeOrigin: true },
      '/api/contact': { target: USER_API, changeOrigin: true },

      // ── product-service (:5002) ────────────────────────────────────────────
      '/api/products': { target: PRODUCT_API, changeOrigin: true },
      '/api/ratings': { target: PRODUCT_API, changeOrigin: true },
      '/api/wishlist': { target: PRODUCT_API, changeOrigin: true },
      '/uploads': { target: PRODUCT_API, changeOrigin: true },

      // ── order-service (:5003) ──────────────────────────────────────────────
      '/api/orders': { target: ORDER_API, changeOrigin: true },
      '/api/cart': { target: ORDER_API, changeOrigin: true },
      '/api/payment': { target: ORDER_API, changeOrigin: true },

      // ── mcp-service (:5004) ────────────────────────────────────────────────
      '/api/chat': { target: MCP_API, changeOrigin: true },
    },
    allowedHosts: [
      'audiopro.local' // ◄── ADD THIS EXACT LINE HERE
    ],
    hmr: {
      host: 'audiopro.local', // Force the websocket client to target your Ingress
      clientPort: 80         // Route it through standard HTTP port handled by Ingress
    }
  },
})

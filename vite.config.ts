import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// issue #16 -- adminprop-back no tiene middleware CORS (confirmado: no
// hay `CORSMiddleware`/`add_middleware` en src/adminprop/main.py). El
// dev server (5173) y `vite preview` (usado por el job E2E de CI, ver
// .github/workflows/ci.yml) hablan con el backend en :8000 -- dos
// orígenes distintos, y el browser bloquearía las cookies HttpOnly de
// sesión (axios `withCredentials: true`) en cualquier request real de
// browser (Playwright incluido). SIN modificar adminprop-back (fuera de
// alcance): el proxy de abajo hace que el browser vea todo como
// same-origin -- reenvía `/v1/*` al backend real. Usar
// `VITE_API_BASE_URL=/v1` (relativo) en vez de una URL absoluta para que
// el bundle pegue contra el proxy. No cambia el comportamiento del build
// de producción (`vite build` con una `VITE_API_BASE_URL` absoluta sigue
// funcionando igual que antes -- el proxy sólo aplica a `server`/`preview`).
const backendProxy = {
  '/v1': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: backendProxy,
  },
  preview: {
    port: 5173,
    proxy: backendProxy,
  },
})

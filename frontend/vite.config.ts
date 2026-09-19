import { defineConfig } from 'vite';
// API stays same-origin in all environments. Never bake a machine address into JS.
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: process.env.FUEL_DEV_HOST ? [process.env.FUEL_DEV_HOST] : undefined,
    proxy: { '/api': { target: process.env.FUEL_API_PROXY || 'http://127.0.0.1:8000' } },
  },
  build: { target: 'es2022', sourcemap: false },
});

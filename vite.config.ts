import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  define: { __PLATFORM_VERSION__: JSON.stringify(JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version) },
  plugins: [vue()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure(proxy) {
          // The browser uses the same origin; CORS is unnecessary for this local hop.
          proxy.on('proxyReq', (request) => request.removeHeader('origin'))
        },
      },
    },
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'happy-dom', env: { VITE_CONSTRUCTION_DATA_MODE: 'mock' }, include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] },
})

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    headers: {
      'Cache-Control': 'no-store',
    },
    watch: {
      usePolling: true,
    },
  },
  build: {
    sourcemap: true,
  },
  optimizeDeps: {
    force: true,
  },
})

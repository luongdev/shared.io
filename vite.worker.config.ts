import { defineConfig } from 'vite';
import { resolve } from 'path';

// Cấu hình cho worker
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/worker/index.ts'),
      name: 'SharedIOWorker',
      formats: ['es', 'umd'],
      fileName: (format) => `worker.${format}.js`,
    },
    rollupOptions: {
      output: {
        globals: {
          'socket.io-client': 'io',
        },
        inlineDynamicImports: true
      },
    },
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    emptyOutDir: false,
  },
}); 
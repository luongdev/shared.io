import { defineConfig } from 'vite';
import { resolve } from 'path';

// Cấu hình cho worker
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  return {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/worker/index.ts'),
        name: 'WorkerIO',
        formats: ['iife'],
        fileName: () => `worker.js`,
      },
      rollupOptions: {
        output: {
          globals: {
            'socket.io-client': 'io',
          },
          inlineDynamicImports: true,
        },
      },
      outDir: 'dist',
      sourcemap: !isProd,
      minify: isProd ? 'terser' : false,
      emptyOutDir: false,
    },
  };
});

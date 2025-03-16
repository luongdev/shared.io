import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// Cấu hình chính cho thư viện
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SharedIO',
      formats: ['es', 'umd'],
      fileName: (format) => `shared-io.${format}.js`,
    },
    rollupOptions: {
      external: ['socket.io-client'],
      output: {
        globals: {
          'socket.io-client': 'io',
        },
        inlineDynamicImports: true
      },
    },
    sourcemap: true,
    minify: 'terser',
    // minify: false,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: 'dist/types',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});

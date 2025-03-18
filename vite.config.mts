import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// Cấu hình chính cho thư viện
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  return {
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
          inlineDynamicImports: true,
        },
      },
      emptyOutDir: isProd,
      sourcemap: !isProd,
      minify: isProd ? 'terser' : false,
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
  };
});

import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => {
  return {
    build: {
      lib: {
        entry: {
          index: resolve(__dirname, 'src/index.ts'),
          worker: resolve(__dirname, 'src/worker/index.ts'),
        },
        name: 'SharedIO',
        formats: ['cjs' as const],
        fileName: (_format, entryName) =>
          entryName === 'worker' ? 'worker.js' : 'shared-io.cjs.js',
      },
      outDir: 'dist-cjs',
      rollupOptions: {
        external: ['socket.io-client'],
        output: {
          assetFileNames: (assetInfo: { name?: string }) => {
            if (assetInfo.name && assetInfo.name.includes('worker')) {
              return '[name][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
      emptyOutDir: false,
      sourcemap: false,
      minify: false,
      assetsInlineLimit: 0,
      copyPublicDir: true,
    },
    plugins: [
      dts({
        outDir: 'dist-cjs/types',
        insertTypesEntry: true,
      }),
      {
        name: 'copy-worker-plugin',
        writeBundle() {
          // This ensures Vite processes worker files properly
          // Empty implementation is sufficient to trigger correct behavior
        },
      },
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  };
});

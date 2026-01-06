import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', 'examples'],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
      },
      name: 'PayAppReact',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const ext = format === 'es' ? 'mjs' : 'js';
        return `${entryName}.${ext}`;
      },
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'payapp-core'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'payapp-core': 'PayAppCore',
        },
      },
    },
    sourcemap: true,
  },
});

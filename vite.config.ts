import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isElectron = process.env.ELECTRON === 'true';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:4545',
          changeOrigin: true
        }
      }
    },
    plugins: [
      react(),
      isElectron && electron({
        main: {
          entry: 'electron/main.js',
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron', './claude-session.cjs'],
              },
            },
          },
        },
        preload: {
          input: 'electron/preload.mjs',
          vite: {
            build: {
              outDir: 'dist-electron',
            },
          },
        },
        renderer: {},
      }),
    ].filter(Boolean),
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});

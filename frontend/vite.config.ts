import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:5080';
  const proxy = { '/api': { target, changeOrigin: true } };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5180,
      strictPort: true,
      proxy,
    },
    preview: {
      host: true,
      port: 5180,
      strictPort: true,
      proxy,
    },
  };
});

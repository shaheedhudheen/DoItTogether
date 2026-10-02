import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@dit/shared': path.resolve(__dirname, '../packages/shared/dist/index.js'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});

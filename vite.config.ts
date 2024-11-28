import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [
        /node_modules/
      ]
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@dnd-kit/core', '@dnd-kit/utilities']
  },
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'https://web-production-4161.up.railway.app',
        changeOrigin: true,
        ws: true
      }
    }
  }
});

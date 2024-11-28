import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@rollup/rollup-linux-x64-gnu']
  },
  build: {
    commonjsOptions: {
      include: []
    }
  }
});

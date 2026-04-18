import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: {
    // This solves the "global is not defined" error from sockjs-client
    global: 'window',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: [
      'sandier-unpsychically-rickie.ngrok-free.dev'
    ]
  },
  build: {
  outDir: '../src/main/resources/static',
  emptyOutDir: true,
}
});
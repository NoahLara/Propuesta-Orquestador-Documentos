import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` permite desplegar el build estático en cualquier subruta,
// incluyendo GitHub Pages (https://usuario.github.io/repositorio/).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});

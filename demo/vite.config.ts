import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-quill-tooltip': path.resolve(__dirname, '..'),
      // Resolve quill and react from demo's node_modules when processing parent library
      quill: path.resolve(__dirname, 'node_modules/quill'),
      react: path.resolve(__dirname, 'node_modules/react'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // SCSS options if needed
      },
    },
  },
  build: {
    cssMinify: true,
    minify: 'esbuild',
  },
});

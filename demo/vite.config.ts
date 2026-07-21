import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves project sites from /<repo-name>/, not the domain
  // root — only apply that prefix for production builds, so the local dev
  // server keeps serving from /.
  base: command === "build" ? "/react-quill-tooltip/" : "/",
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
}));

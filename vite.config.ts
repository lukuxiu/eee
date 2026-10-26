import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'html-dev-transform',
      apply: 'serve', // 仅在 npm run dev (开发服务器) 时生效
      transformIndexHtml(html) {
        return html
          .replace(
            /<script type="module" crossorigin src="\.\/assets\/index\.js"><\/script>/,
            '<script type="module" src="/src/main.tsx"></script>'
          )
          .replace(
            /<link rel="stylesheet" crossorigin href="\.\/assets\/index\.css">/,
            ''
          );
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        app: 'src/main.tsx',
      },
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/index.css';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});

import { resolve } from 'node:path';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vite';

const PAGES = [
  '/lab',
  '/jump',
  '/shift',
  '/stack',
  '/sudoku',
  '/space',
  '/fight',
  '/arcade',
  '/vintage/credits',
];

function rewritePages(): Connect.NextHandleFunction {
  return (req, _res, next) => {
    const raw = req.url ?? '';
    const q = raw.indexOf('?');
    const path = q === -1 ? raw : raw.slice(0, q);
    const qs = q === -1 ? '' : raw.slice(q);
    if (path === '/vintage' || path === '/vintage/') {
      req.url = `/${qs}`;
      next();
      return;
    }
    if (PAGES.includes(path)) req.url = `${path}/${qs}`;
    next();
  };
}

function mpaPages(): Plugin {
  return {
    name: 'alpha11-mpa-pages',
    configureServer(server) {
      server.middlewares.use(rewritePages());
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewritePages());
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [mpaPages()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        lab: resolve(__dirname, 'lab/index.html'),
        jump: resolve(__dirname, 'jump/index.html'),
        shift: resolve(__dirname, 'shift/index.html'),
        stack: resolve(__dirname, 'stack/index.html'),
        sudoku: resolve(__dirname, 'sudoku/index.html'),
        space: resolve(__dirname, 'space/index.html'),
        fight: resolve(__dirname, 'fight/index.html'),
        arcade: resolve(__dirname, 'arcade/index.html'),
        credits: resolve(__dirname, 'vintage/credits/index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});

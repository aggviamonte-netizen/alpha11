import { resolve } from 'node:path';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vite';
import { partnersApiMock } from './worker/dev/vite-api';

const PAGES = [
  '/lab',
  '/jump',
  '/shift',
  '/rush',
  '/sniper',
  '/vintage/stack',
  '/vintage/sudoku',
  '/vintage/space',
  '/vintage/fight',
  '/vintage/credits',
  '/arcade',
];

function rewritePages(): Connect.NextHandleFunction {
  return (req, _res, next) => {
    const raw = req.url ?? '';
    const q = raw.indexOf('?');
    const path = q === -1 ? raw : raw.slice(0, q);
    const qs = q === -1 ? '' : raw.slice(q);
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
  plugins: [mpaPages(), partnersApiMock()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        lab: resolve(__dirname, 'lab/index.html'),
        jump: resolve(__dirname, 'jump/index.html'),
        shift: resolve(__dirname, 'shift/index.html'),
        rush: resolve(__dirname, 'rush/index.html'),
        sniper: resolve(__dirname, 'sniper/index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});

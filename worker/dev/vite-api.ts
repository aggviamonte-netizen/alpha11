import { resolve } from 'node:path';
import type { Connect, Plugin } from 'vite';
import { handleApi } from '../src/api';
import { preflight, withCors } from '../src/cors';
import { createFileWaitlistStore } from './file-store';

const DATA_FILE = resolve(process.cwd(), '.data/partners-waitlist.json');

function mockCtx() {
  return {
    waitUntil(promise: Promise<unknown>) {
      void promise.catch(() => {});
    },
  };
}

function toRequest(req: Connect.IncomingMessage, body: Buffer): Request {
  const host = req.headers.host ?? 'localhost:5173';
  const url = new URL(req.url ?? '/', `http://${host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }
  const method = req.method ?? 'GET';
  const init: RequestInit = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = new Uint8Array(body);
  }
  return new Request(url, init);
}

async function readBody(req: Connect.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function partnersApiMock(): Plugin {
  const env = {
    ADS_LIVE: 'false',
    WAITLIST_STORE: createFileWaitlistStore(DATA_FILE),
    PARTNERS_WEBHOOK: process.env.PARTNERS_WEBHOOK,
  };

  return {
    name: 'alpha11-partners-api-mock',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0] ?? '';
        if (!path.startsWith('/api/')) {
          next();
          return;
        }
        try {
          const request = toRequest(req, await readBody(req));
          const response =
            request.method === 'OPTIONS'
              ? preflight(request)
              : withCors(request, await handleApi(request, env, mockCtx()));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          const buf = Buffer.from(await response.arrayBuffer());
          res.end(buf);
        } catch (err) {
          console.error('[alpha11-api-mock]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: 'internal' }));
        }
      });
    },
  };
}

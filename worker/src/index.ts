import { handleApi } from './api';
import { preflight, withCors } from './cors';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response('Not found', { status: 404 });
    }

    if (request.method === 'OPTIONS') {
      return preflight(request);
    }

    try {
      const response = await handleApi(request, env, ctx);
      return withCors(request, response);
    } catch (err) {
      console.error(
        JSON.stringify({
          msg: 'api_unhandled',
          path: url.pathname,
        }),
      );
      void err;
      return withCors(request, new Response(JSON.stringify({ ok: false, error: 'internal' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }));
    }
  },
} satisfies ExportedHandler<Env>;

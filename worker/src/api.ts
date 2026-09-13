import { API_CONTRACT, INVENTORY_SLOTS } from './contract';
import { json } from './json';
import { waitlistStore, type StoreEnv } from './store';
import { parseWaitlistBody, toWaitlistRecord } from './waitlist';
import { notifyPartnersWebhook, type WebhookEnv } from './webhook';

export type ApiEnv = StoreEnv &
  WebhookEnv & {
    ADS_LIVE?: string;
  };

export type ApiCtx = {
  waitUntil(promise: Promise<unknown>): void;
};

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

export async function handleApi(request: Request, env: ApiEnv, ctx: ApiCtx): Promise<Response> {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  if (path === '/api/health' && request.method === 'GET') {
    const store = waitlistStore(env);
    return json({
      ok: true,
      service: 'alpha11-api',
      ads_live: env.ADS_LIVE === 'true',
      ads_networks: [],
      marketplace: 'planned',
      storage: store.backend,
    });
  }

  if (path === '/api/inventory' && request.method === 'GET') {
    return json({
      ok: true,
      live: false,
      version: 1,
      slots: INVENTORY_SLOTS,
    });
  }

  if (path === '/api/contract' && request.method === 'GET') {
    return json(API_CONTRACT);
  }

  if (path === '/api/partners/waitlist') {
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405);
    }
    const parsed = await parseWaitlistBody(request);
    if (!parsed.ok) {
      return json({ ok: false, error: parsed.error.error, details: parsed.error.details }, parsed.error.status);
    }
    const store = waitlistStore(env);
    const record = toWaitlistRecord(parsed.value);
    await store.put(record);
    ctx.waitUntil(
      notifyPartnersWebhook(env, record).catch((err: unknown) => {
        console.warn(JSON.stringify({ msg: 'partners_webhook_error' }));
        void err;
      }),
    );
    return json({ ok: true, id: record.id, stored: store.backend }, 201);
  }

  if (path === '/api/waitlist') {
    return json(
      {
        ok: false,
        error: 'disabled',
        use: '/api/partners/waitlist',
      },
      410,
    );
  }

  return json({ ok: false, error: 'not_found' }, 404);
}

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleApi } from '../src/api';
import { isAllowedOrigin } from '../src/cors';
import { parseWaitlistBody } from '../src/waitlist';
import type { WaitlistRecord, WaitlistStore } from '../src/store';

function ctx() {
  return { waitUntil(promise: Promise<unknown>) { void promise; } };
}

function memoryStore(): WaitlistStore & { rows: WaitlistRecord[] } {
  const rows: WaitlistRecord[] = [];
  return {
    backend: 'memory',
    rows,
    async put(record) {
      rows.push(record);
    },
  };
}

describe('CORS allowlist', () => {
  it('allows production and local Vite origins', () => {
    assert.equal(isAllowedOrigin('https://alpha11.app'), true);
    assert.equal(isAllowedOrigin('https://www.alpha11.app'), true);
    assert.equal(isAllowedOrigin('http://localhost:5173'), true);
    assert.equal(isAllowedOrigin('https://preview.alpha11.pages.dev'), true);
    assert.equal(isAllowedOrigin('https://alpha11-preview.workers.dev'), true);
  });

  it('rejects unrelated origins', () => {
    assert.equal(isAllowedOrigin('https://evil.example'), false);
    assert.equal(isAllowedOrigin('http://alpha11.app'), false);
  });
});

describe('GET /api/health', () => {
  it('reports ads off and no networks', async () => {
    const store = memoryStore();
    const res = await handleApi(
      new Request('https://alpha11.app/api/health'),
      { WAITLIST_STORE: store, ADS_LIVE: 'false' },
      ctx(),
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.ok, true);
    assert.equal(body.ads_live, false);
    assert.deepEqual(body.ads_networks, []);
    assert.equal(body.marketplace, 'planned');
    assert.equal(body.storage, 'memory');
    assert.equal(JSON.stringify(body).includes('revenue'), false);
  });
});

describe('GET /api/inventory', () => {
  it('returns the static planned slot catalog', async () => {
    const res = await handleApi(
      new Request('https://alpha11.app/api/inventory'),
      { WAITLIST_STORE: memoryStore() },
      ctx(),
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { live: boolean; slots: { id: string }[] };
    assert.equal(body.live, false);
    assert.deepEqual(
      body.slots.map((s) => s.id),
      ['hub_banner', 'hub_native', 'interstitial_soft'],
    );
  });
});

describe('POST /api/partners/waitlist', () => {
  it('stores a valid payload', async () => {
    const store = memoryStore();
    const res = await handleApi(
      new Request('https://alpha11.app/api/partners/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          company: 'Analytical Engines',
          budget_band: '5k_20k',
          message: 'Direct IO later',
        }),
      }),
      { WAITLIST_STORE: store },
      ctx(),
    );
    assert.equal(res.status, 201);
    const body = (await res.json()) as { ok: boolean; id: string; stored: string };
    assert.equal(body.ok, true);
    assert.equal(body.stored, 'memory');
    assert.equal(store.rows.length, 1);
    assert.equal(store.rows[0]?.email, 'ada@example.com');
    assert.equal(store.rows[0]?.id, body.id);
  });

  it('rejects a bad email and unknown budget band', async () => {
    const parsed = await parseWaitlistBody(
      new Request('https://alpha11.app/api/partners/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'x', email: 'nope', budget_band: 'infinite' }),
      }),
    );
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.equal(parsed.error.error, 'invalid_body');
    assert.equal(parsed.error.details?.email, 'invalid');
    assert.equal(parsed.error.details?.budget_band, 'invalid');
  });
});

describe('legacy /api/waitlist', () => {
  it('stays disabled and points at the partners path', async () => {
    const res = await handleApi(
      new Request('https://alpha11.app/api/waitlist', { method: 'POST' }),
      { WAITLIST_STORE: memoryStore() },
      ctx(),
    );
    assert.equal(res.status, 410);
    const body = (await res.json()) as { use: string };
    assert.equal(body.use, '/api/partners/waitlist');
  });
});

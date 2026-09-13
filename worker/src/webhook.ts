import type { WaitlistRecord } from './store';

export type WebhookEnv = {
  PARTNERS_WEBHOOK?: string;
};

export async function notifyPartnersWebhook(
  env: WebhookEnv,
  record: WaitlistRecord,
): Promise<void> {
  const url = env.PARTNERS_WEBHOOK?.trim();
  if (!url) return;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.warn(JSON.stringify({ msg: 'partners_webhook_invalid_url' }));
    return;
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    console.warn(JSON.stringify({ msg: 'partners_webhook_insecure_url' }));
    return;
  }

  const res = await fetch(parsed.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      type: 'partners.waitlist',
      record,
    }),
  });
  if (!res.ok) {
    console.warn(
      JSON.stringify({
        msg: 'partners_webhook_failed',
        status: res.status,
      }),
    );
  }
}

import { BUDGET_BANDS, type BudgetBand } from './contract';
import type { WaitlistRecord } from './store';

const MAX_BODY_BYTES = 8_192;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WaitlistInput = {
  name: string;
  email: string;
  company: string;
  budget_band: BudgetBand;
  message: string;
};

export type ParseError = {
  error: 'payload_too_large' | 'unsupported_media_type' | 'invalid_body';
  status: 400 | 413 | 415;
  details?: Record<string, string>;
};

function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export async function parseWaitlistBody(
  request: Request,
): Promise<{ ok: true; value: WaitlistInput } | { ok: false; error: ParseError }> {
  const length = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return { ok: false, error: { error: 'payload_too_large', status: 413 } };
  }

  const contentType = request.headers.get('Content-Type') ?? '';
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    return { ok: false, error: { error: 'unsupported_media_type', status: 415 } };
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return { ok: false, error: { error: 'payload_too_large', status: 413 } };
    }
    raw = text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: { error: 'invalid_body', status: 400, details: { body: 'json' } } };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: { error: 'invalid_body', status: 400, details: { body: 'object' } } };
  }

  const input = raw as Record<string, unknown>;
  const details: Record<string, string> = {};
  const name = clip(input.name, 120);
  const email = clip(input.email, 254).toLowerCase();
  const company = clip(input.company, 160);
  const message = clip(input.message, 2000);
  const budget = clip(input.budget_band, 32);

  if (!name) details.name = 'required';
  if (!email || !EMAIL_RE.test(email)) details.email = 'invalid';
  if (!(BUDGET_BANDS as readonly string[]).includes(budget)) details.budget_band = 'invalid';

  if (Object.keys(details).length > 0) {
    return { ok: false, error: { error: 'invalid_body', status: 400, details } };
  }

  return {
    ok: true,
    value: {
      name,
      email,
      company,
      budget_band: budget as BudgetBand,
      message,
    },
  };
}

export function toWaitlistRecord(input: WaitlistInput): WaitlistRecord {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    company: input.company,
    budget_band: input.budget_band,
    message: input.message,
    created_at: new Date().toISOString(),
    source: 'partners_form',
  };
}

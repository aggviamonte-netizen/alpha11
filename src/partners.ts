import { bootStudio } from './studio';

// TODO(ads-backend): [data-ad-slot="hub-native-preview"] stays inert. No ads.js here.
bootStudio();

const MAIL = 'Aggviamonte@gmail.com';
const STORAGE_KEY = 'alpha11_partner_waitlist';
const PROD_WAITLIST = 'https://alpha11.app/api/partners/waitlist';
const BUDGET_BANDS = ['under_1k', '1k_5k', '5k_20k', '20k_plus', 'undisclosed'] as const;

type BudgetBand = (typeof BUDGET_BANDS)[number];

type Intent = {
  name: string;
  email: string;
  company: string;
  budget_band: BudgetBand;
  message: string;
  at: number;
};

const form = document.getElementById('waitlist-form');
const status = document.getElementById('waitlist-status');

function waitlistUrl(): string {
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return `${location.origin}/api/partners/waitlist`;
  }
  return PROD_WAITLIST;
}

function readIntents(): Intent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Intent[]) : [];
  } catch {
    return [];
  }
}

function saveIntent(intent: Intent): void {
  const next = [...readIntents(), intent];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function field(formEl: HTMLFormElement, name: string): string {
  const node = formEl.elements.namedItem(name);
  if (
    node instanceof HTMLInputElement ||
    node instanceof HTMLTextAreaElement ||
    node instanceof HTMLSelectElement
  ) {
    return node.value.trim();
  }
  return '';
}

function asBudget(value: string): BudgetBand {
  return (BUDGET_BANDS as readonly string[]).includes(value) ? (value as BudgetBand) : 'undisclosed';
}

function mailtoHref(intent: Intent): string {
  const subject = encodeURIComponent(`ALPHA-11 partners — ${intent.company}`);
  const body = encodeURIComponent(
    [
      'Hola ALPHA-11,',
      '',
      `Soy ${intent.name} (${intent.email}).`,
      `Marca o medio: ${intent.company}`,
      `Banda: ${intent.budget_band}`,
      '',
      intent.message || 'Quiero hablar del inventario del hub / piezas in-game más adelante.',
      '',
      '— enviado desde alpha11.app/partners',
    ].join('\n'),
  );
  return `mailto:${MAIL}?subject=${subject}&body=${body}`;
}

function showStatus(state: 'ok' | 'err', html: string): void {
  if (!status) return;
  status.hidden = false;
  status.dataset.state = state;
  status.innerHTML = html;
}

async function postWaitlist(intent: Intent): Promise<boolean> {
  const payload = {
    name: intent.name,
    email: intent.email,
    company: intent.company,
    budget_band: intent.budget_band,
    message: intent.message,
  };
  const response = await fetch(waitlistUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return false;
  const data: unknown = await response.json().catch(() => null);
  return Boolean(data && typeof data === 'object' && 'ok' in data && (data as { ok: unknown }).ok);
}

if (form instanceof HTMLFormElement) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const intent: Intent = {
      name: field(form, 'name'),
      email: field(form, 'email'),
      company: field(form, 'company'),
      budget_band: asBudget(field(form, 'budget_band')),
      message: field(form, 'message'),
      at: Date.now(),
    };
    if (!intent.name || !intent.email || !intent.company) {
      showStatus('err', 'Faltan nombre, email o marca. Sin eso no sabemos a quién escribir.');
      return;
    }

    saveIntent(intent);
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;

    void (async () => {
      try {
        const stored = await postWaitlist(intent);
        if (stored) {
          form.reset();
          showStatus(
            'ok',
            `Quedó en la lista. Te escribimos. Si quieres adelantar, <a href="${mailtoHref(intent)}">${MAIL}</a>.`,
          );
          return;
        }
      } catch {
        // mailto / localStorage fallback below
      }

      window.location.href = mailtoHref(intent);
      form.reset();
      showStatus(
        'ok',
        `La API no respondió. Guardado en este dispositivo. Si el correo no se abrió, mándanos un mensaje a <a href="mailto:${MAIL}">${MAIL}</a>.`,
      );
    })().finally(() => {
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    });
  });
}

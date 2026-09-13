import { registerPwa } from './pwa';

registerPwa();

const holds = new Map<string, boolean>();

function sendKey(code: string, type: 'keydown' | 'keyup'): void {
  const map: Record<string, string> = {
    KeyA: 'a',
    KeyD: 'd',
    KeyW: 'w',
    KeyS: 's',
    KeyZ: 'z',
    KeyX: 'x',
    KeyC: 'c',
    Space: ' ',
  };
  document.dispatchEvent(
    new KeyboardEvent(type, {
      key: map[code] ?? code,
      code,
      bubbles: true,
    }),
  );
}

document.querySelectorAll<HTMLButtonElement>('[data-fkey]').forEach((btn) => {
  const code = btn.dataset.fkey;
  if (!code) return;
  const down = (event: Event): void => {
    event.preventDefault();
    if (holds.get(code)) return;
    holds.set(code, true);
    sendKey(code, 'keydown');
  };
  const up = (event: Event): void => {
    event.preventDefault();
    if (!holds.get(code)) return;
    holds.set(code, false);
    sendKey(code, 'keyup');
  };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointerleave', up);
  btn.addEventListener('pointercancel', up);
});

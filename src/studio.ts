import { registerPwa } from './pwa';

export function bootStudio(): void {
  registerPwa();
  document.documentElement.classList.add('studio-ready');
  bindPointerGlow();
  bindReveals();
}

function bindPointerGlow(): void {
  const root = document.querySelector<HTMLElement>('.studio');
  if (!root) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let raf = 0;
  let x = window.innerWidth * 0.5;
  let y = 120;
  const apply = (): void => {
    raf = 0;
    root.style.setProperty('--mx', `${x}px`);
    root.style.setProperty('--my', `${y}px`);
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      x = event.clientX;
      y = event.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    },
    { passive: true },
  );
}

function bindReveals(): void {
  const nodes = document.querySelectorAll('.reveal');
  if (!nodes.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    nodes.forEach((node) => node.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  nodes.forEach((node) => io.observe(node));
}

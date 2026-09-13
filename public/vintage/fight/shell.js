/* Hub wrapper: size the 2:1 playfield and synthesize stickfighter keys. */
(function () {
  const BASE_WIDTH = 800;
  const BASE_HEIGHT = 400;
  const RATIO = BASE_WIDTH / BASE_HEIGHT;

  const canvas = document.getElementById('gameCanvas');
  const play = document.querySelector('.fight-play');
  const box = document.getElementById('game-container');
  const held = new Map();

  function playing() {
    return document.querySelector('.pause-instruction')?.classList.contains('show');
  }

  function sendKey(key, type) {
    const payload = {
      key,
      code: key.length === 1 ? 'Key' + key.toUpperCase() : key === 'Escape' ? 'Escape' : key,
      bubbles: true,
      cancelable: true,
    };
    document.dispatchEvent(new KeyboardEvent(type, payload));
  }

  function pressPad(key, type, latch) {
    if (!playing() && key !== 'Escape') {
      if (type === 'keydown') sendKey('Enter', 'keydown');
      return;
    }
    if (!latch && type === 'keydown') {
      sendKey(key, 'keydown');
      sendKey(key, 'keyup');
      return;
    }
    sendKey(key, type);
  }

  function fitCanvas() {
    if (!canvas || !play) return;
    const availW = play.clientWidth;
    const availH = play.clientHeight;
    if (availW < 2 || availH < 2) return;

    let width = availW;
    let height = width / RATIO;
    if (height > availH) {
      height = availH;
      width = height * RATIO;
    }

    const pxW = Math.max(2, Math.floor(width));
    const pxH = Math.max(2, Math.floor(height));

    if (box) {
      box.style.width = `${pxW}px`;
      box.style.height = `${pxH}px`;
      box.style.maxWidth = '100%';
      box.style.maxHeight = '100%';
      box.style.aspectRatio = 'auto';
    }

    canvas.width = BASE_WIDTH;
    canvas.height = BASE_HEIGHT;
    canvas.style.width = `${pxW}px`;
    canvas.style.height = `${pxH}px`;
  }

  window.resizeCanvas = fitCanvas;

  window.addEventListener('resize', () => {
    fitCanvas();
    requestAnimationFrame(fitCanvas);
  });
  window.addEventListener('orientationchange', () => setTimeout(fitCanvas, 120));
  window.visualViewport?.addEventListener('resize', fitCanvas);
  if (typeof ResizeObserver === 'function' && play) {
    new ResizeObserver(fitCanvas).observe(play);
  }

  function bindHold(el, key, latch) {
    const down = (event) => {
      event.preventDefault();
      if (event.button != null && event.button !== 0) return;
      try {
        el.setPointerCapture(event.pointerId);
      } catch (_err) {
        /* older browsers */
      }
      el.classList.add('is-down');
      if (latch) {
        if (held.get(key)) return;
        held.set(key, true);
        pressPad(key, 'keydown', true);
        return;
      }
      pressPad(key, 'keydown', false);
    };

    const up = (event) => {
      event.preventDefault();
      el.classList.remove('is-down');
      if (!latch) return;
      if (!held.get(key)) return;
      held.delete(key);
      pressPad(key, 'keyup', true);
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  document.querySelectorAll('.fight-key[data-key]').forEach((el) => {
    const key = el.getAttribute('data-key');
    const latch = el.hasAttribute('data-hold');
    bindHold(el, key, latch);
  });

  document.querySelector('[data-pause]')?.addEventListener('click', (event) => {
    event.preventDefault();
    sendKey('Escape', 'keydown');
  });

  let drag = null;
  let moveKey = null;

  function setMove(key) {
    if (moveKey === key) return;
    if (moveKey) sendKey(moveKey, 'keyup');
    moveKey = key;
    if (key) sendKey(key, 'keydown');
  }

  function onCanvasDown(event) {
    if (!playing()) return;
    drag = { x: event.clientX, y: event.clientY, jumped: false };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (_err) {
      /* ignore */
    }
  }

  function onCanvasMove(event) {
    if (!drag || !playing()) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const t = rect.width ? x / rect.width : 0.5;
    if (t < 0.38) setMove('a');
    else if (t > 0.62) setMove('d');
    else setMove(null);

    if (!drag.jumped && drag.y - event.clientY > 36) {
      drag.jumped = true;
      sendKey('w', 'keydown');
      sendKey('w', 'keyup');
    }
  }

  function onCanvasUp() {
    drag = null;
    setMove(null);
  }

  if (canvas) {
    canvas.addEventListener('pointerdown', onCanvasDown);
    canvas.addEventListener('pointermove', onCanvasMove);
    canvas.addEventListener('pointerup', onCanvasUp);
    canvas.addEventListener('pointercancel', onCanvasUp);
    canvas.addEventListener(
      'touchstart',
      (event) => {
        if (playing()) event.preventDefault();
      },
      { passive: false },
    );
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ['a', 'd', 's'].forEach((key) => {
        if (held.get(key) || moveKey === key) sendKey(key, 'keyup');
      });
      held.clear();
      moveKey = null;
      document.querySelectorAll('.fight-key.is-down').forEach((el) => el.classList.remove('is-down'));
    }
  });

  fitCanvas();
  requestAnimationFrame(fitCanvas);
})();

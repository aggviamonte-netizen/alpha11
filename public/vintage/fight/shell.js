/* Hub wrapper: landscape fullscreen + overlay pad. Does not letterbox the stage. */
(function () {
  const canvas = document.getElementById('gameCanvas');
  const rotate = document.getElementById('fight-rotate');
  const held = new Map();

  function playing() {
    return document.querySelector('.pause-instruction')?.classList.contains('show');
  }

  function isPhonePortrait() {
    const coarse = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;
    const narrow = Math.min(window.innerWidth, window.innerHeight) <= 900;
    const portrait = window.innerHeight > window.innerWidth;
    return portrait && (coarse || narrow);
  }

  function syncOrientationGate() {
    const block = isPhonePortrait();
    document.documentElement.classList.toggle('fight-portrait', block);
    document.documentElement.classList.toggle('fight-landscape', !block);
    if (rotate) rotate.setAttribute('aria-hidden', block ? 'false' : 'true');
  }

  function refit() {
    if (typeof resizeCanvas === 'function') resizeCanvas();
  }

  async function goFullscreenLandscape() {
    const root = document.documentElement;
    try {
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fs) {
        const req = root.requestFullscreen || root.webkitRequestFullscreen;
        if (req) await req.call(root);
      }
    } catch (_err) {
      /* iOS Safari and some embeds reject Fullscreen */
    }
    try {
      if (screen.orientation && typeof screen.orientation.lock === 'function') {
        await screen.orientation.lock('landscape');
      }
    } catch (_err) {
      /* lock usually needs fullscreen + user gesture */
    }
    syncOrientationGate();
    refit();
    requestAnimationFrame(refit);
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
      if (type === 'keydown') {
        sendKey('Enter', 'keydown');
        canvas?.click();
      }
      return;
    }
    if (!latch && type === 'keydown') {
      sendKey(key, 'keydown');
      sendKey(key, 'keyup');
      return;
    }
    sendKey(key, type);
  }

  function bindHold(el, key, latch) {
    const down = (event) => {
      event.preventDefault();
      event.stopPropagation();
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

  document.querySelectorAll('[data-fullscreen]').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      goFullscreenLandscape();
    });
  });

  function onFirstPlayGesture(event) {
    if (event.target.closest && event.target.closest('a.fight-back')) return;
    document.removeEventListener('pointerdown', onFirstPlayGesture, true);
    const phone =
      window.matchMedia('(pointer: coarse)').matches ||
      Math.min(window.innerWidth, window.innerHeight) <= 900;
    if (phone) goFullscreenLandscape();
  }
  document.addEventListener('pointerdown', onFirstPlayGesture, { capture: true });

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

  window.addEventListener('resize', syncOrientationGate);
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      syncOrientationGate();
      refit();
    }, 120);
  });
  window.visualViewport?.addEventListener('resize', () => {
    syncOrientationGate();
    refit();
  });
  document.addEventListener('fullscreenchange', refit);
  document.addEventListener('webkitfullscreenchange', refit);

  syncOrientationGate();
  refit();
  requestAnimationFrame(refit);
})();

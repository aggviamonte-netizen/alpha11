import { loadBest, saveBest } from '../persist';
import { StackBoard } from './board';
import { StackRenderer } from './render';

const BEST_KEY = 'alpha11_stack_best';

export function startStack(): void {
  const board = new StackBoard();
  const canvas = document.getElementById('game-board') as HTMLCanvasElement;
  const next = document.getElementById('next-piece') as HTMLCanvasElement;
  const renderer = new StackRenderer(board, canvas, next);
  const startOverlay = document.getElementById('overlay-start');
  const overOverlay = document.getElementById('overlay-over');
  const pauseOverlay = document.getElementById('overlay-pause');
  const bestNode = document.getElementById('best');
  if (bestNode) bestNode.textContent = String(loadBest(BEST_KEY));

  let loop: number | null = null;
  let lastDrop = 0;
  let started = false;

  const dropMs = (): number => {
    const level = board.getGameState().level;
    if (level <= 10) return Math.max(100, 1000 - (level - 1) * 100);
    if (level <= 20) return Math.max(20, 100 - (level - 10) * 8);
    return 20;
  };

  const hide = (el: HTMLElement | null): void => {
    if (el) el.hidden = true;
  };
  const show = (el: HTMLElement | null): void => {
    if (el) el.hidden = false;
  };

  const stop = (): void => {
    if (loop !== null) {
      cancelAnimationFrame(loop);
      loop = null;
    }
  };

  const tick = (ts: number): void => {
    if (ts - lastDrop >= dropMs()) {
      board.update();
      lastDrop = ts;
      if (board.getGameState().isGameOver) {
        finish();
        return;
      }
    }
    renderer.render();
    loop = requestAnimationFrame(tick);
  };

  const begin = (): void => {
    board.resetGame();
    started = true;
    hide(startOverlay);
    hide(overOverlay);
    hide(pauseOverlay);
    lastDrop = performance.now();
    stop();
    loop = requestAnimationFrame(tick);
    renderer.render();
  };

  const finish = (): void => {
    stop();
    started = false;
    const score = board.getGameState().score;
    const previous = loadBest(BEST_KEY);
    const best = saveBest(BEST_KEY, score);
    if (bestNode) bestNode.textContent = String(best);
    const record = document.getElementById('over-record');
    if (record) record.hidden = !(score > 0 && score >= best && score > previous);
    const overScore = document.getElementById('over-score');
    if (overScore) overScore.textContent = `${score} · mejor ${best}`;
    show(overOverlay);
    renderer.render();
  };

  const act = (fn: () => void): void => {
    if (!started || board.getGameState().isGameOver || board.getGameState().isPaused) return;
    fn();
    renderer.render();
  };

  document.addEventListener('keydown', (event) => {
    if (!started) return;
    if (event.key === 'p' || event.key === 'P') {
      const paused = board.togglePause();
      if (paused) {
        stop();
        show(pauseOverlay);
      } else {
        hide(pauseOverlay);
        lastDrop = performance.now();
        loop = requestAnimationFrame(tick);
      }
      return;
    }
    const map: Record<string, () => void> = {
      ArrowLeft: () => board.movePieceLeft(),
      ArrowRight: () => board.movePieceRight(),
      ArrowDown: () => board.movePieceDown(),
      ArrowUp: () => board.rotatePiece(),
      ' ': () => board.hardDrop(),
    };
    const fn = map[event.key];
    if (!fn) return;
    event.preventDefault();
    act(fn);
  });

  bindHold('btn-left', () => act(() => board.movePieceLeft()));
  bindHold('btn-right', () => act(() => board.movePieceRight()));
  bindHold('btn-down', () => act(() => board.movePieceDown()));
  bindTap('btn-rotate', () => act(() => board.rotatePiece()));
  bindTap('btn-drop', () => act(() => board.hardDrop()));
  bindTap('retry', begin);
  startOverlay?.addEventListener('click', begin);
  pauseOverlay?.addEventListener('click', () => {
    if (!board.getGameState().isPaused) return;
    board.togglePause();
    hide(pauseOverlay);
    lastDrop = performance.now();
    loop = requestAnimationFrame(tick);
  });

  window.addEventListener('resize', () => {
    renderer.resize();
    renderer.render();
  });
  renderer.render();
}

function bindTap(id: string, fn: () => void): void {
  const node = document.getElementById(id);
  node?.addEventListener('click', (event) => {
    event.preventDefault();
    fn();
  });
}

function bindHold(id: string, fn: () => void): void {
  const node = document.getElementById(id);
  if (!node) return;
  let timer = 0;
  const start = (event: Event): void => {
    event.preventDefault();
    fn();
    timer = window.setInterval(fn, 80);
  };
  const stop = (): void => {
    window.clearInterval(timer);
  };
  node.addEventListener('pointerdown', start);
  node.addEventListener('pointerup', stop);
  node.addEventListener('pointerleave', stop);
  node.addEventListener('pointercancel', stop);
}

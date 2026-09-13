import { loadBest, saveBest } from '../persist';
import {
  cloneGrid,
  conflicts,
  generate,
  isComplete,
  type Difficulty,
  type Grid,
} from './engine';

const BEST_KEY = 'alpha11_sudoku_best';

export function startSudoku(): void {
  const boardEl = document.getElementById('sudo-board');
  const bestNode = document.getElementById('best');
  const status = document.getElementById('sudo-status');
  const over = document.getElementById('overlay-over');
  if (!boardEl) return;

  let difficulty: Difficulty = 'easy';
  let given: Grid = [];
  let grid: Grid = [];
  let solution: Grid = [];
  let selected: [number, number] | null = null;
  let solved = loadBest(BEST_KEY);
  if (bestNode) bestNode.textContent = String(solved);

  const setStatus = (text: string): void => {
    if (status) status.textContent = text;
  };

  const paint = (): void => {
    boardEl.replaceChildren();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sudo-cell';
        if (c % 3 === 0) btn.classList.add('sudo-left');
        if (r % 3 === 0) btn.classList.add('sudo-top');
        if (given[r][c] !== 0) btn.classList.add('sudo-given');
        if (selected && selected[0] === r && selected[1] === c) btn.classList.add('sudo-on');
        const value = grid[r][c];
        if (value !== 0 && conflicts(grid, r, c, value) && given[r][c] === 0) {
          btn.classList.add('sudo-bad');
        }
        btn.textContent = value === 0 ? '' : String(value);
        btn.addEventListener('click', () => {
          selected = [r, c];
          paint();
        });
        boardEl.appendChild(btn);
      }
    }
  };

  const deal = (next: Difficulty): void => {
    difficulty = next;
    const pack = generate(difficulty);
    given = cloneGrid(pack.puzzle);
    grid = cloneGrid(pack.puzzle);
    solution = pack.solution;
    selected = null;
    if (over) over.hidden = true;
    const labels: Record<Difficulty, string> = {
      easy: 'fácil',
      medium: 'medio',
      hard: 'difícil',
    };
    setStatus(labels[difficulty]);
    document.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach((btn) => {
      btn.classList.toggle('is-on', btn.dataset.diff === difficulty);
    });
    paint();
  };

  const put = (value: number): void => {
    if (!selected) return;
    const [r, c] = selected;
    if (given[r][c] !== 0) return;
    grid[r][c] = value;
    paint();
    if (isComplete(grid, solution)) {
      solved = saveBest(BEST_KEY, solved + 1);
      if (bestNode) bestNode.textContent = String(solved);
      const overScore = document.getElementById('over-score');
      if (overScore) overScore.textContent = `${solved} resueltos`;
      if (over) over.hidden = false;
    }
  };

  document.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach((btn) => {
    btn.addEventListener('click', () => deal(btn.dataset.diff as Difficulty));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-num]').forEach((btn) => {
    btn.addEventListener('click', () => put(Number(btn.dataset.num)));
  });
  document.getElementById('sudo-clear')?.addEventListener('click', () => put(0));
  document.getElementById('retry')?.addEventListener('click', () => deal(difficulty));
  document.addEventListener('keydown', (event) => {
    if (event.key >= '1' && event.key <= '9') put(Number(event.key));
    if (event.key === 'Backspace' || event.key === '0' || event.key === 'Delete') put(0);
  });

  deal('easy');
}

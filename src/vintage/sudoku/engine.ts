/**
 * Lightweight original Sudoku generator / solver for ALPHA-11.
 * Super Sudoku (tn1ck/super-sudoku, MIT) was evaluated and is too heavy
 * to vendor as a React PWA; this board is a mobile-first original.
 */

export type Grid = number[][];
export type Difficulty = 'easy' | 'medium' | 'hard';

const SIZE = 9;
const HOLES: Record<Difficulty, number> = {
  easy: 40,
  medium: 50,
  hard: 56,
};

export function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice());
}

function shuffle<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function valid(grid: Grid, row: number, col: number, value: number): boolean {
  for (let i = 0; i < SIZE; i++) {
    if (grid[row][i] === value || grid[i][col] === value) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[boxRow + r][boxCol + c] === value) return false;
    }
  }
  return true;
}

function findEmpty(grid: Grid): [number, number] | null {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return [r, c];
    }
  }
  return null;
}

export function solve(grid: Grid): boolean {
  const spot = findEmpty(grid);
  if (!spot) return true;
  const [row, col] = spot;
  for (const value of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (!valid(grid, row, col, value)) continue;
    grid[row][col] = value;
    if (solve(grid)) return true;
    grid[row][col] = 0;
  }
  return false;
}

function countSolutions(grid: Grid, limit = 2): number {
  const spot = findEmpty(grid);
  if (!spot) return 1;
  const [row, col] = spot;
  let found = 0;
  for (let value = 1; value <= 9; value++) {
    if (!valid(grid, row, col, value)) continue;
    grid[row][col] = value;
    found += countSolutions(grid, limit);
    grid[row][col] = 0;
    if (found >= limit) return found;
  }
  return found;
}

export function generate(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
  const solution = emptyGrid();
  solve(solution);
  const puzzle = cloneGrid(solution);
  const cells = shuffle(
    Array.from({ length: SIZE * SIZE }, (_, i) => [Math.floor(i / SIZE), i % SIZE] as [number, number]),
  );
  let removed = 0;
  const target = HOLES[difficulty];
  for (const [row, col] of cells) {
    if (removed >= target) break;
    const keep = puzzle[row][col];
    puzzle[row][col] = 0;
    if (countSolutions(cloneGrid(puzzle)) !== 1) {
      puzzle[row][col] = keep;
      continue;
    }
    removed += 1;
  }
  return { puzzle, solution };
}

export function conflicts(grid: Grid, row: number, col: number, value: number): boolean {
  if (value === 0) return false;
  for (let i = 0; i < SIZE; i++) {
    if (i !== col && grid[row][i] === value) return true;
    if (i !== row && grid[i][col] === value) return true;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rr = boxRow + r;
      const cc = boxCol + c;
      if ((rr !== row || cc !== col) && grid[rr][cc] === value) return true;
    }
  }
  return false;
}

export function isComplete(grid: Grid, solution: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

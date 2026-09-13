/**
 * Piece shapes adapted from lucky845/ts-tetris-game (MIT).
 * UI name is STACK / BLOQUES — do not surface third-party trademarks.
 */

export type PieceKind = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type PieceShape = number[][];
export type Position = { x: number; y: number };
export type RotationState = 0 | 1 | 2 | 3;

const SHAPES: Record<PieceKind, PieceShape[]> = {
  I: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  ],
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  ],
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  ],
  O: [
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  ],
};

const COLORS: Record<PieceKind, string> = {
  I: '#6ee7ff',
  J: '#8b9cff',
  L: '#ffb86b',
  O: '#e8ff47',
  S: '#7dffb3',
  T: '#ff8bd1',
  Z: '#ff6b8a',
};

const KINDS: PieceKind[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export class Piece {
  type: PieceKind;
  position: Position;
  rotationState: RotationState;

  constructor(type: PieceKind, position: Position = { x: 3, y: 0 }) {
    this.type = type;
    this.position = position;
    this.rotationState = 0;
  }

  getShape(): PieceShape {
    return SHAPES[this.type][this.rotationState];
  }

  getColor(): string {
    return COLORS[this.type];
  }

  rotate(): void {
    this.rotationState = ((this.rotationState + 1) % 4) as RotationState;
  }

  moveLeft(): void {
    this.position.x -= 1;
  }

  moveRight(): void {
    this.position.x += 1;
  }

  moveDown(): void {
    this.position.y += 1;
  }

  moveUp(): void {
    this.position.y -= 1;
  }

  static createRandom(position: Position = { x: 3, y: 0 }): Piece {
    return new Piece(KINDS[Math.floor(Math.random() * KINDS.length)], position);
  }
}

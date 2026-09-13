/**
 * Board / scoring adapted from lucky845/ts-tetris-game (MIT).
 */
import { Piece, type Position } from './piece';

export interface StackState {
  score: number;
  level: number;
  lines: number;
  isGameOver: boolean;
  isPaused: boolean;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const WALL_KICKS: Position[] = [
  { x: 0, y: 0 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -2, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
];
const LINE_POINTS = [0, 40, 100, 300, 1200];

export class StackBoard {
  private board: (string | null)[][];
  private currentPiece: Piece | null;
  private nextPiece: Piece;
  private gameState: StackState;

  constructor() {
    this.board = this.empty();
    this.currentPiece = null;
    this.nextPiece = Piece.createRandom();
    this.gameState = {
      score: 0,
      level: 1,
      lines: 0,
      isGameOver: false,
      isPaused: false,
    };
  }

  private empty(): (string | null)[][] {
    return Array.from({ length: BOARD_HEIGHT }, () => Array<string | null>(BOARD_WIDTH).fill(null));
  }

  getBoard(): (string | null)[][] {
    return this.board;
  }

  getCurrentPiece(): Piece | null {
    return this.currentPiece;
  }

  getNextPiece(): Piece {
    return this.nextPiece;
  }

  getGameState(): StackState {
    return this.gameState;
  }

  getBoardWidth(): number {
    return BOARD_WIDTH;
  }

  getBoardHeight(): number {
    return BOARD_HEIGHT;
  }

  resetGame(): void {
    this.board = this.empty();
    this.currentPiece = null;
    this.nextPiece = Piece.createRandom();
    this.gameState = {
      score: 0,
      level: 1,
      lines: 0,
      isGameOver: false,
      isPaused: false,
    };
    this.spawnNewPiece();
  }

  togglePause(): boolean {
    if (this.gameState.isGameOver) return this.gameState.isPaused;
    this.gameState.isPaused = !this.gameState.isPaused;
    return this.gameState.isPaused;
  }

  spawnNewPiece(): boolean {
    this.currentPiece = this.nextPiece;
    this.nextPiece = Piece.createRandom();
    if (this.isCollision()) {
      this.gameState.isGameOver = true;
      return false;
    }
    return true;
  }

  movePieceLeft(): boolean {
    if (!this.canMove()) return false;
    this.currentPiece!.moveLeft();
    if (this.isCollision()) {
      this.currentPiece!.moveRight();
      return false;
    }
    return true;
  }

  movePieceRight(): boolean {
    if (!this.canMove()) return false;
    this.currentPiece!.moveRight();
    if (this.isCollision()) {
      this.currentPiece!.moveLeft();
      return false;
    }
    return true;
  }

  movePieceDown(): boolean {
    if (!this.canMove()) return false;
    this.currentPiece!.moveDown();
    if (this.isCollision()) {
      this.currentPiece!.moveUp();
      this.lockPiece();
      return false;
    }
    return true;
  }

  rotatePiece(): boolean {
    if (!this.canMove()) return false;
    const piece = this.currentPiece!;
    const originalX = piece.position.x;
    const originalY = piece.position.y;
    const originalRotation = piece.rotationState;
    piece.rotate();
    if (!this.isCollision()) return true;
    for (const test of WALL_KICKS) {
      if (test.x === 0 && test.y === 0) continue;
      piece.position.x = originalX + test.x;
      piece.position.y = originalY + test.y;
      if (!this.isCollision()) return true;
    }
    piece.position.x = originalX;
    piece.position.y = originalY;
    piece.rotationState = originalRotation;
    return false;
  }

  hardDrop(): void {
    if (!this.canMove()) return;
    while (this.movePieceDown()) {
      /* drop */
    }
  }

  update(): void {
    if (this.gameState.isGameOver || this.gameState.isPaused) return;
    this.movePieceDown();
  }

  private canMove(): boolean {
    return Boolean(this.currentPiece) && !this.gameState.isGameOver && !this.gameState.isPaused;
  }

  private isCollision(): boolean {
    if (!this.currentPiece) return false;
    const shape = this.currentPiece.getShape();
    const { x: pieceX, y: pieceY } = this.currentPiece.position;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const boardX = pieceX + x;
        const boardY = pieceY + y;
        if (boardX < 0 || boardX >= BOARD_WIDTH || boardY < 0 || boardY >= BOARD_HEIGHT) {
          return true;
        }
        if (this.board[boardY][boardX] !== null) return true;
      }
    }
    return false;
  }

  private lockPiece(): void {
    if (!this.currentPiece) return;
    const shape = this.currentPiece.getShape();
    const { x: pieceX, y: pieceY } = this.currentPiece.position;
    const color = this.currentPiece.getColor();
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const boardX = pieceX + x;
        const boardY = pieceY + y;
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          this.board[boardY][boardX] = color;
        }
      }
    }
    this.clearLines();
    this.spawnNewPiece();
  }

  private clearLines(): void {
    let cleared = 0;
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (this.board[y].every((cell) => cell !== null)) {
        this.board.splice(y, 1);
        this.board.unshift(Array<string | null>(BOARD_WIDTH).fill(null));
        cleared += 1;
        y += 1;
      }
    }
    if (cleared > 0) this.updateScore(cleared);
  }

  private updateScore(linesCleared: number): void {
    this.gameState.score += LINE_POINTS[linesCleared] * this.gameState.level;
    this.gameState.lines += linesCleared;
    this.gameState.level = Math.floor(this.gameState.lines / 10) + 1;
  }
}

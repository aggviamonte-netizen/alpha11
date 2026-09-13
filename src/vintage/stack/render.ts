import { StackBoard } from './board';

export class StackRenderer {
  private readonly board: StackBoard;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly nextCanvas: HTMLCanvasElement;
  private readonly nextCtx: CanvasRenderingContext2D;
  private blockSize = 26;
  private nextBlock = 18;

  constructor(board: StackBoard, canvas: HTMLCanvasElement, nextCanvas: HTMLCanvasElement) {
    this.board = board;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.nextCanvas = nextCanvas;
    this.nextCtx = nextCanvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const width = this.board.getBoardWidth();
    const height = this.board.getBoardHeight();
    const maxW = Math.min(280, Math.floor(window.innerWidth - 48));
    const maxH = Math.min(520, Math.floor(window.innerHeight * 0.58));
    this.blockSize = Math.max(16, Math.min(Math.floor(maxW / width), Math.floor(maxH / height)));
    this.canvas.width = width * this.blockSize;
    this.canvas.height = height * this.blockSize;
    this.nextBlock = 18;
    this.nextCanvas.width = 72;
    this.nextCanvas.height = 72;
  }

  render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#101014';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid();
    const cells = this.board.getBoard();
    for (let y = 0; y < cells.length; y++) {
      for (let x = 0; x < cells[y].length; x++) {
        const color = cells[y][x];
        if (color) this.drawBlock(x, y, color, this.ctx, this.blockSize);
      }
    }
    const piece = this.board.getCurrentPiece();
    if (piece) {
      const shape = piece.getShape();
      const color = piece.getColor();
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (!shape[y][x]) continue;
          const boardY = piece.position.y + y;
          if (boardY >= 0) this.drawBlock(piece.position.x + x, boardY, color, this.ctx, this.blockSize);
        }
      }
    }
    this.drawNext();
    this.syncStats();
  }

  private drawNext(): void {
    this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    const next = this.board.getNextPiece();
    const shape = next.getShape();
    const color = next.getColor();
    const offsetX = (this.nextCanvas.width - shape[0].length * this.nextBlock) / 2;
    const offsetY = (this.nextCanvas.height - shape.length * this.nextBlock) / 2;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        this.drawBlockAt(offsetX + x * this.nextBlock, offsetY + y * this.nextBlock, color, this.nextCtx, this.nextBlock);
      }
    }
  }

  private drawBlock(x: number, y: number, color: string, ctx: CanvasRenderingContext2D, size: number): void {
    this.drawBlockAt(x * size, y * size, color, ctx, size);
  }

  private drawBlockAt(xPos: number, yPos: number, color: string, ctx: CanvasRenderingContext2D, size: number): void {
    ctx.fillStyle = color;
    ctx.fillRect(xPos + 1, yPos + 1, size - 2, size - 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.moveTo(xPos + 1, yPos + 1);
    ctx.lineTo(xPos + size - 1, yPos + 1);
    ctx.lineTo(xPos + 1, yPos + size - 1);
    ctx.closePath();
    ctx.fill();
  }

  private drawGrid(): void {
    const width = this.board.getBoardWidth();
    const height = this.board.getBoardHeight();
    this.ctx.strokeStyle = 'rgba(244, 241, 234, 0.08)';
    this.ctx.lineWidth = 1;
    for (let y = 0; y <= height; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.blockSize);
      this.ctx.lineTo(width * this.blockSize, y * this.blockSize);
      this.ctx.stroke();
    }
    for (let x = 0; x <= width; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.blockSize, 0);
      this.ctx.lineTo(x * this.blockSize, height * this.blockSize);
      this.ctx.stroke();
    }
  }

  private syncStats(): void {
    const state = this.board.getGameState();
    setText('score', String(state.score));
    setText('lines', String(state.lines));
    setText('level', String(state.level));
  }
}

function setText(id: string, value: string): void {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

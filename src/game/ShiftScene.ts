import Phaser from 'phaser';
import { creature } from './canon';
import { el } from './dom';
import { burstDots, floatLabel, screenWash } from './juice';
import { sfxMerge, sfxOver, sfxSlide, sfxWin, unlockSfx } from './sfx';
import { loadShiftBest, resetShiftScore, saveShiftScore, shiftMergePoints } from './shiftScore';
import { drawCreature, paintLabBackdrop } from './sprites';

export const W = 390;
export const H = 844;

const SIZE = 4;
const CELL = 78;
const GAP = 8;
const BOARD = SIZE * CELL + (SIZE - 1) * GAP;
const ORIGIN_X = (W - BOARD) / 2;
const ORIGIN_Y = 214;
const TILE_R = 30;
const SWIPE = 28;
const SLIDE_MS = 118;

type Phase = 'start' | 'play' | 'over' | 'win';
type Dir = 'L' | 'R' | 'U' | 'D';

type Tile = {
  id: number;
  tier: number;
  r: number;
  c: number;
  dead?: boolean;
  merged?: boolean;
};

let skipStart = false;
let nextId = 1;

function cellX(c: number): number {
  return ORIGIN_X + c * (CELL + GAP) + CELL / 2;
}

function cellY(r: number): number {
  return ORIGIN_Y + r * (CELL + GAP) + CELL / 2;
}

function vec(dir: Dir): { dr: number; dc: number } {
  if (dir === 'L') return { dr: 0, dc: -1 };
  if (dir === 'R') return { dr: 0, dc: 1 };
  if (dir === 'U') return { dr: -1, dc: 0 };
  return { dr: 1, dc: 0 };
}

export class ShiftScene extends Phaser.Scene {
  private phase: Phase = 'start';
  private score = 0;
  private best = 0;
  private tiles: Tile[] = [];
  private sprites = new Map<number, Phaser.GameObjects.Container>();
  private busy = false;
  private won = false;
  private swipe: { x: number; y: number } | null = null;
  private boardGlow!: Phaser.GameObjects.Graphics;

  constructor() {
    super('shift');
  }

  create(): void {
    this.phase = 'start';
    this.score = 0;
    this.best = loadShiftBest();
    this.tiles = [];
    this.sprites.forEach((s) => s.destroy(true));
    this.sprites.clear();
    this.busy = false;
    this.won = false;
    this.swipe = null;

    this.paintBoard();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      unlockSfx();
      if (this.phase !== 'play' || this.busy) return;
      this.swipe = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.swipe || this.phase !== 'play' || this.busy) {
        this.swipe = null;
        return;
      }
      const dx = p.x - this.swipe.x;
      const dy = p.y - this.swipe.y;
      this.swipe = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
      if (Math.abs(dx) > Math.abs(dy)) this.tryMove(dx > 0 ? 'R' : 'L');
      else this.tryMove(dy > 0 ? 'D' : 'U');
    });

    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-LEFT', () => this.tryMove('L'));
      kb.on('keydown-RIGHT', () => this.tryMove('R'));
      kb.on('keydown-UP', () => this.tryMove('U'));
      kb.on('keydown-DOWN', () => this.tryMove('D'));
      kb.on('keydown-A', () => this.tryMove('L'));
      kb.on('keydown-D', () => this.tryMove('R'));
      kb.on('keydown-W', () => this.tryMove('U'));
      kb.on('keydown-S', () => this.tryMove('D'));
    }

    el('overlay-over').hidden = true;
    el('keep').hidden = true;
    el('retry').onclick = () => {
      skipStart = true;
      this.scene.restart();
    };
    el('keep').onclick = () => this.resumeAfterWin();

    this.syncHud();
    if (skipStart) {
      skipStart = false;
      this.beginPlay();
    } else {
      el('overlay-start').hidden = false;
      el('overlay-start').onclick = () => this.beginPlay();
    }
  }

  private beginPlay(): void {
    if (this.phase === 'play') return;
    unlockSfx();
    el('overlay-start').hidden = true;
    el('overlay-start').onclick = null;
    this.phase = 'play';
    this.score = 0;
    resetShiftScore();
    saveShiftScore(0);
    this.spawn(2);
    this.syncHud();
  }

  private paintBoard(): void {
    paintLabBackdrop(this);
    const bg = this.add.graphics();
    bg.fillStyle(0x6ee7ff, 0.04);
    bg.fillEllipse(W / 2, ORIGIN_Y + BOARD / 2, 340, 360);
    bg.fillStyle(0x8b9bff, 0.03);
    bg.fillCircle(60, 120, 70);

    const g = this.add.graphics();
    g.fillStyle(0x1a1c22, 1);
    g.fillRoundedRect(ORIGIN_X - 18, ORIGIN_Y - 18, BOARD + 36, BOARD + 36, 26);
    g.fillStyle(0x121318, 1);
    g.fillRoundedRect(ORIGIN_X - 12, ORIGIN_Y - 12, BOARD + 24, BOARD + 24, 22);
    g.lineStyle(2, 0x6ee7ff, 0.45);
    g.strokeRoundedRect(ORIGIN_X - 14, ORIGIN_Y - 14, BOARD + 28, BOARD + 28, 22);
    g.lineStyle(1, 0xf4f1ea, 0.12);
    g.strokeRoundedRect(ORIGIN_X - 8, ORIGIN_Y - 8, BOARD + 16, BOARD + 16, 18);

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = ORIGIN_X + c * (CELL + GAP);
        const y = ORIGIN_Y + r * (CELL + GAP);
        g.fillStyle(0x1c1d24, 1);
        g.fillRoundedRect(x, y, CELL, CELL, 16);
        g.fillStyle(0x000000, 0.18);
        g.fillRoundedRect(x + 4, y + 8, CELL - 8, CELL - 12, 12);
        g.lineStyle(1, 0xffffff, 0.08);
        g.strokeRoundedRect(x + 1, y + 1, CELL - 2, CELL - 2, 15);
      }
    }

    this.boardGlow = this.add.graphics().setDepth(1);
    this.drawBoardGlow(0);

    this.add
      .text(W / 2, ORIGIN_Y + BOARD + 38, 'Desliza · A1 → A11', {
        fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif',
        fontSize: '13px',
        color: '#F4F1EA',
      })
      .setOrigin(0.5)
      .setAlpha(0.4);
  }

  private drawBoardGlow(alpha: number): void {
    this.boardGlow.clear();
    if (alpha <= 0) return;
    this.boardGlow.lineStyle(3, 0xe8ff47, alpha);
    this.boardGlow.strokeRoundedRect(ORIGIN_X - 14, ORIGIN_Y - 14, BOARD + 28, BOARD + 28, 22);
  }

  private flashBoard(): void {
    this.drawBoardGlow(0.55);
    this.tweens.addCounter({
      from: 0.55,
      to: 0,
      duration: 280,
      onUpdate: (tw) => this.drawBoardGlow(tw.getValue() ?? 0),
    });
  }

  private tryMove(dir: Dir): void {
    if (this.phase !== 'play' || this.busy) return;
    const before = this.snapshot();
    const gained = this.apply(dir);
    if (this.snapshot() === before) return;

    const merges = this.tiles.filter((t) => t.merged && !t.dead).length;
    this.score += gained;
    saveShiftScore(this.score);
    this.best = loadShiftBest();
    this.syncHud();
    sfxSlide();
    if (merges) {
      sfxMerge(merges > 1);
      this.flashBoard();
    }
    if (merges > 1) {
      floatLabel(this, W / 2, ORIGIN_Y - 28, `COMBO ×${merges}`, { size: '18px' });
    }

    this.busy = true;
    const run = (): void => {
      this.animate(() => {
        this.purgeDead();
        this.spawn(1);
        this.refreshSprites();
        this.busy = false;
        if (this.tiles.some((t) => t.tier >= 11) && !this.won) {
          this.win();
          return;
        }
        if (!this.canMove()) this.gameOver();
      });
    };
    if (merges) {
      this.tweens.pauseAll();
      this.time.delayedCall(32, () => {
        this.tweens.resumeAll();
        run();
      });
    } else {
      run();
    }
  }

  private snapshot(): string {
    return this.tiles
      .filter((t) => !t.dead)
      .map((t) => `${t.id}:${t.tier}:${t.r}:${t.c}`)
      .sort()
      .join('|');
  }

  private apply(dir: Dir): number {
    const { dr } = vec(dir);
    const lineFirst = dir === 'R' || dir === 'D';
    let gained = 0;

    const groups = new Map<number, Tile[]>();
    for (const t of this.tiles) {
      if (t.dead) continue;
      t.merged = false;
      const key = dr === 0 ? t.r : t.c;
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }

    for (const list of groups.values()) {
      list.sort((a, b) => {
        const aPos = dr === 0 ? a.c : a.r;
        const bPos = dr === 0 ? b.c : b.r;
        return lineFirst ? bPos - aPos : aPos - bPos;
      });

      let slot = lineFirst ? SIZE - 1 : 0;
      let i = 0;
      while (i < list.length) {
        const cur = list[i];
        const nxt = list[i + 1];
        if (cur && nxt && cur.tier === nxt.tier && cur.tier < 11) {
          const nextTier = cur.tier + 1;
          gained += shiftMergePoints(nextTier);
          cur.tier = nextTier;
          cur.merged = true;
          nxt.dead = true;
          if (dr === 0) {
            cur.c = slot;
            nxt.c = slot;
            nxt.r = cur.r;
          } else {
            cur.r = slot;
            nxt.r = slot;
            nxt.c = cur.c;
          }
          i += 2;
        } else if (cur && nxt && cur.tier === 11 && nxt.tier === 11) {
          gained += shiftMergePoints(11);
          cur.merged = true;
          nxt.dead = true;
          if (dr === 0) {
            cur.c = slot;
            nxt.c = slot;
            nxt.r = cur.r;
          } else {
            cur.r = slot;
            nxt.r = slot;
            nxt.c = cur.c;
          }
          i += 2;
        } else if (cur) {
          if (dr === 0) cur.c = slot;
          else cur.r = slot;
          i += 1;
        }
        slot += lineFirst ? -1 : 1;
      }
    }
    return gained;
  }

  private animate(done: () => void): void {
    const live = this.tiles.filter((t) => !t.dead || this.sprites.has(t.id));
    let left = 0;
    const finish = (): void => {
      left -= 1;
      if (left <= 0) done();
    };

    for (const t of live) {
      const spr = this.sprites.get(t.id);
      if (!spr) continue;
      left += 1;
      this.tweens.add({
        targets: spr,
        x: cellX(t.c),
        y: cellY(t.r),
        alpha: t.dead ? 0 : 1,
        scale: t.merged ? 1.08 : t.dead ? 0.7 : 1,
        duration: SLIDE_MS,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          if (t.merged && !t.dead) {
            burstDots(this, cellX(t.c), cellY(t.r), creature(t.tier).color, 8);
            floatLabel(this, cellX(t.c), cellY(t.r) - 8, `+${shiftMergePoints(t.tier)}`, {
              size: '14px',
              lift: 28,
            });
            spr.destroy(true);
            this.sprites.delete(t.id);
            this.makeSprite(t, false);
            const born = this.sprites.get(t.id);
            if (born) {
              born.setScale(1.16);
              this.tweens.add({ targets: born, scale: 1, duration: 110, ease: 'Back.out', onComplete: finish });
              return;
            }
          }
          finish();
        },
      });
    }
    if (left === 0) done();
  }

  private purgeDead(): void {
    for (const t of this.tiles) {
      if (!t.dead) continue;
      this.sprites.get(t.id)?.destroy(true);
      this.sprites.delete(t.id);
    }
    this.tiles = this.tiles.filter((t) => !t.dead);
    for (const t of this.tiles) t.merged = false;
  }

  private spawn(count: number): void {
    const empty = this.emptyCells();
    Phaser.Utils.Array.Shuffle(empty);
    for (let i = 0; i < count && i < empty.length; i++) {
      const spot = empty[i];
      if (!spot) continue;
      const tier = Math.random() < 0.1 ? 2 : 1;
      const tile: Tile = { id: nextId++, tier, r: spot.r, c: spot.c };
      this.tiles.push(tile);
      this.makeSprite(tile, true);
    }
  }

  private emptyCells(): Array<{ r: number; c: number }> {
    const used = new Set(this.tiles.filter((t) => !t.dead).map((t) => `${t.r}:${t.c}`));
    const out: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!used.has(`${r}:${c}`)) out.push({ r, c });
      }
    }
    return out;
  }

  private makeSprite(tile: Tile, pop: boolean): void {
    const spr = drawCreature(this, cellX(tile.c), cellY(tile.r), tile.tier, TILE_R);
    spr.setDepth(10);
    this.sprites.set(tile.id, spr);
    if (pop) {
      spr.setScale(0.18);
      this.tweens.add({ targets: spr, scale: 1, duration: 160, ease: 'Back.easeOut' });
    }
  }

  private refreshSprites(): void {
    for (const t of this.tiles) {
      const spr = this.sprites.get(t.id);
      if (spr) spr.setPosition(cellX(t.c), cellY(t.r));
    }
  }

  private canMove(): boolean {
    if (this.emptyCells().length) return true;
    const at = (r: number, c: number): number | null => {
      const t = this.tiles.find((x) => !x.dead && x.r === r && x.c === c);
      return t ? t.tier : null;
    };
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const t = at(r, c);
        if (t == null) continue;
        if (c + 1 < SIZE && at(r, c + 1) === t) return true;
        if (r + 1 < SIZE && at(r + 1, c) === t) return true;
      }
    }
    return false;
  }

  private win(): void {
    this.won = true;
    this.phase = 'win';
    const prevBest = this.best;
    saveShiftScore(this.score);
    this.best = loadShiftBest();
    this.syncHud();
    const a11 = this.tiles.find((t) => !t.dead && t.tier >= 11);
    if (a11) burstDots(this, cellX(a11.c), cellY(a11.r), 0xf4f1ea, 12);
    screenWash(this, 0xe8ff47, 0.12, 320);
    sfxWin();
    el('over-title').textContent = 'A11';
    el('over-score').textContent = `Puntos ${this.score} · Mejor ${this.best}`;
    const rec = document.getElementById('over-record');
    if (rec) rec.hidden = !(this.score > 0 && this.score >= this.best && this.score > prevBest);
    el('keep').hidden = false;
    el('overlay-over').hidden = false;
  }

  private resumeAfterWin(): void {
    el('overlay-over').hidden = true;
    el('keep').hidden = true;
    this.phase = 'play';
  }

  private gameOver(): void {
    if (this.phase !== 'play') return;
    this.phase = 'over';
    const prevBest = this.best;
    saveShiftScore(this.score);
    this.best = loadShiftBest();
    this.syncHud();
    screenWash(this, 0x6ee7ff, 0.12, 260);
    sfxOver();
    el('over-title').textContent = 'FIN';
    el('over-score').textContent = `Puntos ${this.score} · Mejor ${this.best}`;
    const rec = document.getElementById('over-record');
    if (rec) rec.hidden = !(this.score > 0 && this.score >= this.best && this.score > prevBest);
    el('keep').hidden = true;
    el('overlay-over').hidden = false;
  }

  private syncHud(): void {
    el('score').textContent = String(this.score);
    el('best').textContent = String(this.best);
    const top = this.tiles.reduce((m, t) => Math.max(m, t.dead ? 0 : t.tier), 0);
    const c = creature(Math.max(1, top || 1));
    const chip = document.getElementById('next-chip');
    if (chip) {
      chip.style.background = c.hex;
      chip.textContent = top ? c.emoji : '🫧';
    }
    const code = document.getElementById('next-code');
    if (code) code.textContent = top ? c.code : 'MAX';
  }
}

import Phaser from 'phaser';
import { el } from './dom';
import { burstDots, floatLabel, screenWash } from './juice';
import { sfxCore, sfxMerge, sfxOver, sfxSlide, sfxWin, unlockSfx } from './sfx';
import { drawShiftPiece, shiftPiece } from './shiftPieces';
import {
  HIT_PAUSE_MS,
  SLIDE_MS,
  comboBanner,
  comboWhisper,
  impactShake,
  impactZoom,
  isMergeStreak,
  mergeAccentCount,
  mergeBurstCount,
  mergeImpact,
  mergePunchScale,
  nextMergeStreak,
  streakBanner,
  streakWhisper,
  tierCeremony,
} from './shiftFeel';
import { loadShiftBest, resetShiftScore, saveShiftScore, shiftMergePoints } from './shiftScore';
import { paintLabBackdrop } from './labBackdrop';

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
  private queued: Dir | null = null;
  private mergeStreak = 0;
  private celebrated = new Set<number>();
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
    this.queued = null;
    this.mergeStreak = 0;
    this.celebrated.clear();
    this.cameras.main.resetFX();
    this.cameras.main.setZoom(1);

    this.paintBoard();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      unlockSfx();
      if (this.phase !== 'play') return;
      this.swipe = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.swipe || this.phase !== 'play') {
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
    g.fillStyle(0x2a2d38, 1);
    g.fillRoundedRect(ORIGIN_X - 18, ORIGIN_Y - 18, BOARD + 36, BOARD + 36, 26);
    g.fillStyle(0x1a1c24, 1);
    g.fillRoundedRect(ORIGIN_X - 12, ORIGIN_Y - 12, BOARD + 24, BOARD + 24, 22);
    g.lineStyle(2, 0x6ee7ff, 0.55);
    g.strokeRoundedRect(ORIGIN_X - 14, ORIGIN_Y - 14, BOARD + 28, BOARD + 28, 22);
    g.lineStyle(1, 0xf4f1ea, 0.16);
    g.strokeRoundedRect(ORIGIN_X - 8, ORIGIN_Y - 8, BOARD + 16, BOARD + 16, 18);

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = ORIGIN_X + c * (CELL + GAP);
        const y = ORIGIN_Y + r * (CELL + GAP);
        g.fillStyle(0x2a2c36, 1);
        g.fillRoundedRect(x, y, CELL, CELL, 16);
        g.fillStyle(0x000000, 0.16);
        g.fillRoundedRect(x + 4, y + 8, CELL - 8, CELL - 12, 12);
        g.lineStyle(1, 0xffffff, 0.12);
        g.strokeRoundedRect(x + 1, y + 1, CELL - 2, CELL - 2, 15);
      }
    }

    this.boardGlow = this.add.graphics().setDepth(1);
    this.drawBoardGlow(0);

    this.add
      .text(W / 2, ORIGIN_Y + BOARD + 38, 'Desliza · T1 → T11', {
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
    if (this.phase !== 'play') return;
    if (this.busy) {
      this.queued = dir;
      return;
    }
    const before = this.snapshot();
    const gained = this.apply(dir);
    if (this.snapshot() === before) return;

    const mergedTiles = this.tiles.filter((t) => t.merged && !t.dead);
    const merges = mergedTiles.length;
    const maxTier = mergedTiles.reduce((m, t) => Math.max(m, t.tier), 0);
    this.mergeStreak = nextMergeStreak(this.mergeStreak, merges);
    this.score += gained;
    saveShiftScore(this.score);
    this.best = loadShiftBest();
    this.syncHud();
    sfxSlide();
    if (merges) {
      sfxMerge(merges > 1 || isMergeStreak(this.mergeStreak));
      this.flashBoard();
      this.voice(merges);
    }
    const impact = mergeImpact(maxTier, merges);
    if (impact !== 'none') this.punchBoard(impact);

    this.busy = true;
    const run = (): void => {
      this.animate(() => {
        this.purgeDead();
        this.spawn(1);
        this.refreshSprites();
        this.busy = false;
        if (this.tiles.some((t) => t.tier >= 11) && !this.won) {
          this.queued = null;
          this.win();
          return;
        }
        if (!this.canMove()) {
          this.queued = null;
          this.gameOver();
          return;
        }
        const next = this.queued;
        this.queued = null;
        if (next) this.tryMove(next);
      });
    };
    if (merges) {
      this.tweens.pauseAll();
      this.time.delayedCall(HIT_PAUSE_MS, () => {
        if (!this.sys.isActive()) return;
        this.tweens.resumeAll();
        run();
      });
    } else {
      run();
    }
  }

  private voice(merges: number): void {
    const streakHit = isMergeStreak(this.mergeStreak);
    const combo = comboBanner(merges);
    const primary = combo ?? (streakHit ? streakBanner(this.mergeStreak) : null);
    if (primary) {
      floatLabel(this, W / 2, ORIGIN_Y - 32, primary, {
        size: '20px',
        color: combo ? '#E8FF47' : '#7CFFB2',
        lift: 36,
        duration: 900,
      });
    }
    const whisper = streakHit ? streakWhisper(this.mergeStreak) : merges >= 3 ? comboWhisper(merges) : null;
    if (whisper) {
      floatLabel(this, W / 2, ORIGIN_Y - 4, whisper, {
        size: '13px',
        color: '#7CFFB2',
        lift: 24,
        duration: 860,
      });
    }
  }

  private punchBoard(impact: 'soft' | 'hard'): void {
    const shake = impactShake(impact);
    const zoom = impactZoom(impact);
    if (shake) this.cameras.main.shake(shake.ms, shake.intensity);
    this.tweens.killTweensOf(this.cameras.main);
    this.cameras.main.setZoom(zoom);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1,
      duration: shake?.ms ?? 120,
      ease: 'Quad.out',
    });
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
      this.tweens.killTweensOf(spr);
      this.tweens.add({
        targets: spr,
        x: cellX(t.c),
        y: cellY(t.r),
        alpha: t.dead ? 0 : 1,
        scale: t.merged ? 1.12 : t.dead ? 0.7 : 1,
        duration: SLIDE_MS,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          if (t.merged && !t.dead) this.landMerge(t, spr);
          finish();
        },
      });
    }
    if (left === 0) done();
  }

  private landMerge(tile: Tile, spr: Phaser.GameObjects.Container): void {
    const piece = shiftPiece(tile.tier);
    const x = cellX(tile.c);
    const y = cellY(tile.r);
    burstDots(this, x, y, piece.color, mergeBurstCount(tile.tier));
    const accent = mergeAccentCount(tile.tier);
    if (accent) burstDots(this, x, y - 2, 0xf4f1ea, accent);
    floatLabel(this, x, y - 8, `+${shiftMergePoints(tile.tier)}`, {
      size: '14px',
      lift: 28,
    });
    spr.destroy(true);
    this.sprites.delete(tile.id);
    this.makeSprite(tile, false);
    const born = this.sprites.get(tile.id);
    if (born) {
      born.setScale(mergePunchScale(tile.tier));
      this.tweens.add({
        targets: born,
        scale: 1,
        duration: 130,
        ease: 'Back.out',
      });
    }
    this.celebrateTier(tile, piece.hex);
  }

  private celebrateTier(tile: Tile, color: string): void {
    const ceremony = tierCeremony(tile.tier);
    if (!ceremony || this.celebrated.has(tile.tier)) return;
    this.celebrated.add(tile.tier);
    floatLabel(this, W / 2, ORIGIN_Y + BOARD / 2, ceremony.label, {
      size: '26px',
      color,
      lift: 52,
      duration: 1100,
    });
    screenWash(this, ceremony.wash, ceremony.alpha, 320);
    if (tile.tier < 11) sfxCore();
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
    const x = cellX(tile.c);
    const y = cellY(tile.r);
    const spr = drawShiftPiece(this, x, y, tile.tier, TILE_R);
    spr.setDepth(10);
    this.sprites.set(tile.id, spr);
    if (!pop) return;
    const piece = shiftPiece(tile.tier);
    spr.setScale(0);
    const halo = this.add.circle(x, y, TILE_R * 0.55, piece.color, 0.45).setDepth(9);
    this.tweens.add({
      targets: halo,
      scale: 2.2,
      alpha: 0,
      duration: 220,
      ease: 'Quad.out',
      onComplete: () => halo.destroy(),
    });
    this.tweens.add({
      targets: spr,
      scale: 1,
      duration: 170,
      ease: 'Back.out',
    });
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
    el('over-title').textContent = 'T11';
    el('over-score').textContent = `Puntos ${this.score} · Mejor ${this.best}`;
    const rec = document.getElementById('over-record');
    if (rec) rec.hidden = !(this.score > 0 && this.score >= this.best && this.score > prevBest);
    el('keep').hidden = false;
    el('overlay-over').hidden = true;
    this.time.delayedCall(480, () => {
      if (this.phase !== 'win') return;
      el('overlay-over').hidden = false;
    });
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
    const p = shiftPiece(Math.max(1, top || 1));
    const chip = document.getElementById('next-chip');
    if (chip) {
      chip.style.background = p.hex;
      chip.textContent = top ? p.glyph : '●';
      chip.dataset.kind = 'poly';
    }
    const code = document.getElementById('next-code');
    if (code) code.textContent = top ? p.code : 'MAX';
  }
}

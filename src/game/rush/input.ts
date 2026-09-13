export class RushInput {
  jumpHeld = false;
  jumpPressed = false;
  boostHeld = false;
  steer = 0;

  private steerX = 0.5;
  private pointers = new Map<number, { x: number; y: number; boost: boolean }>();
  private unbind: Array<() => void> = [];

  attach(stage: HTMLElement, jumpBtn: HTMLElement, boostBtn: HTMLElement): void {
    const onDown = (e: PointerEvent) => {
      const node = e.target as HTMLElement | null;
      if (node?.closest?.('.overlay')) return;
      const boost = e.target === boostBtn || boostBtn.contains(e.target as Node);
      const jump = e.target === jumpBtn || jumpBtn.contains(e.target as Node);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, boost });
      if (boost) this.boostHeld = true;
      else {
        this.jumpHeld = true;
        this.jumpPressed = true;
      }
      if (!boost || jump) this.steerX = this.normX(e.clientX, stage);
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onMove = (e: PointerEvent) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (!p.boost) this.steerX = this.normX(e.clientX, stage);
    };
    const onUp = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      this.syncHolds();
    };

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    this.unbind.push(() => {
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
    });

    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!this.jumpHeld) this.jumpPressed = true;
        this.jumpHeld = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') this.boostHeld = true;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.steerX = Math.min(this.steerX, 0.22);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.steerX = Math.max(this.steerX, 0.78);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') this.jumpHeld = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') this.boostHeld = false;
      if (
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'KeyA' ||
        e.code === 'KeyD'
      ) {
        if (this.pointers.size === 0) this.steerX = 0.5;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    this.unbind.push(() => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    });
  }

  endFrame(): void {
    this.jumpPressed = false;
    let steerFromPtr = false;
    for (const p of this.pointers.values()) {
      if (!p.boost) {
        steerFromPtr = true;
        break;
      }
    }
    const target = steerFromPtr || this.jumpHeld ? (this.steerX - 0.5) * 2 : 0;
    this.steer += (target - this.steer) * 0.28;
    if (!steerFromPtr && !this.jumpHeld && this.pointers.size === 0) {
      this.steerX += (0.5 - this.steerX) * 0.08;
    }
  }

  dispose(): void {
    for (const fn of this.unbind) fn();
    this.unbind.length = 0;
    this.pointers.clear();
  }

  private syncHolds(): void {
    let jump = false;
    let boost = false;
    for (const p of this.pointers.values()) {
      if (p.boost) boost = true;
      else jump = true;
    }
    this.jumpHeld = jump;
    this.boostHeld = boost;
  }

  private normX(clientX: number, stage: HTMLElement): number {
    const r = stage.getBoundingClientRect();
    if (r.width <= 0) return 0.5;
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  }
}

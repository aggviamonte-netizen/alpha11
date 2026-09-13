import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const SKIP = new Set(['node_modules', 'dist', '.git', 'public', 'vendor']);

const DRAW_ALLOW = new Set([
  'src/game/sprites.ts',
  'src/game/drawCreature.ts',
  'src/game/veggies.ts',
  'src/game/LabScene.ts',
  'src/game/noVeggieLeak.test.ts',
]);

const CREATURE_ALLOW = new Set([
  'src/game/canon.ts',
  'src/game/veggies.ts',
  'src/game/veggieBody.ts',
  'src/game/sprites.ts',
  'src/game/LabScene.ts',
  'src/hub.ts',
  'src/game/noVeggieLeak.test.ts',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|html|css|js)$/.test(name)) out.push(full);
  }
  return out;
}

describe('LAB produce stays LAB-only', () => {
  const files = walk(ROOT);

  it('does not call drawCreature / drawVeggieArt outside LAB', () => {
    const leaks: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file).replaceAll('\\', '/');
      if (DRAW_ALLOW.has(rel)) continue;
      const text = readFileSync(file, 'utf8');
      if (/\bdrawCreature\b/.test(text) || /\bdrawVeggieArt\b/.test(text)) leaks.push(rel);
    }
    assert.deepEqual(leaks, []);
  });

  it('does not call creature() outside LAB + LAB hub orb', () => {
    const leaks: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file).replaceAll('\\', '/');
      if (CREATURE_ALLOW.has(rel)) continue;
      const text = readFileSync(file, 'utf8');
      if (/\bcreature\s*\(/.test(text)) leaks.push(rel);
    }
    assert.deepEqual(leaks, []);
  });

  it('does not paint CREATURES / produce names on the hub', () => {
    const hub = readFileSync(join(ROOT, 'src/hub.ts'), 'utf8');
    assert.equal(/CREATURES/.test(hub), false);
    assert.equal(/canon-row/.test(hub), false);
    assert.equal(/paintLabOrb/.test(hub), true);

    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    assert.equal(/berenjena/i.test(html), false);
    assert.equal(/tomat/i.test(html), false);
    assert.equal(/🍆|🍅/.test(html), false);
    assert.equal(/Misma familia/i.test(html), false);
    assert.equal(/familia de criaturas/i.test(html), false);
    assert.equal(/id="canon-row"/.test(html), false);
    assert.equal(/id="orb-lab"/.test(html), true);
  });
});

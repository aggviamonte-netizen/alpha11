import { creature, CREATURES } from './game/canon';
import { registerPwa } from './pwa';

registerPwa();

function paintOrb(id: string, tier: number): void {
  const node = document.getElementById(id);
  if (!node) return;
  const c = creature(tier);
  node.style.background = c.hex;
  node.textContent = c.emoji;
  node.title = `${c.code} ${c.name}`;
}

paintOrb('orb-lab', 3);
paintOrb('orb-jump', 5);
paintOrb('orb-shift', 7);

const rush = document.getElementById('orb-rush');
if (rush) {
  rush.textContent = '';
  rush.title = 'BLOK';
}

const row = document.getElementById('canon-row');
if (row) {
  const featured = CREATURES.filter((c) => [1, 3, 5, 7, 11].includes(c.tier));
  for (const c of featured) {
    const dot = document.createElement('span');
    dot.className = 'canon-dot';
    dot.style.background = c.hex;
    dot.textContent = c.emoji;
    dot.title = `${c.code} ${c.name}`;
    row.appendChild(dot);
  }
}

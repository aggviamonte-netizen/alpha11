import { CREATURES } from './game/canon';
import { registerPwa } from './pwa';

registerPwa();

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

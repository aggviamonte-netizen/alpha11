import { creature } from './game/canon';
import { bootStudio } from './studio';

// Inventory placeholders live in HTML as [data-ad-slot] matching worker INVENTORY_SLOTS:
//   hub_banner        — strip under the trust row (320x50 / 320x100)
//   hub_native        — card after Vintage (320x180)
//   interstitial_soft — in-game only; NOT rendered here
// TODO(ads-backend): hydrate those nodes from GET /api/inventory.
// Do not ship ads.js / AdSense / mediation from this file.

bootStudio();

/** Produce art on the hub lives on the LAB card orb only. Never paint CREATURES elsewhere. */
function paintLabOrb(): void {
  const node = document.getElementById('orb-lab');
  if (!node) return;
  const c = creature(3);
  node.style.background = c.hex;
  node.textContent = c.emoji;
  node.title = `LAB ${c.code} ${c.name}`;
}

function titleOrb(id: string, title: string): void {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = '';
  node.title = title;
}

paintLabOrb();
titleOrb('orb-jump', 'PULSO');
titleOrb('orb-shift', 'TESERAS');
titleOrb('orb-rush', 'BLOK');
titleOrb('orb-kick', 'KICK');
titleOrb('orb-sniper', 'MIRA');

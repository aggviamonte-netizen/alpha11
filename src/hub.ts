import { bootStudio } from './studio';

// Inventory placeholders live in HTML as [data-ad-slot] matching worker INVENTORY_SLOTS:
//   hub_banner        — strip under the trust row (320x50 / 320x100)
//   hub_native        — card after Vintage (320x180)
//   interstitial_soft — in-game only; NOT rendered here
// TODO(ads-backend): hydrate those nodes from GET /api/inventory.
// Do not ship ads.js / AdSense / mediation from this file.

bootStudio();

/** LAB card only — hardcoded so the hub bundle never loads the produce ladder. */
const LAB_ORB = { hex: '#FF8A2A', emoji: '🥕', title: 'LAB A3 Zanahoria' };

function paintLabOrb(): void {
  const node = document.getElementById('orb-lab');
  if (!node) return;
  node.style.background = LAB_ORB.hex;
  node.textContent = LAB_ORB.emoji;
  node.title = LAB_ORB.title;
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

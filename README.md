# ALPHA-11

Hub PWA + three lab minigames for [alpha11.app](https://alpha11.app).

Stack: Vite + Phaser 3 + Matter.js. TypeScript. Mobile-first 390×844.

## Local

```bash
npm i
npm run dev
```

Open `/` (hub), `/lab`, `/jump`, `/shift`.

## Build

```bash
npm run build
```

## Deploy

Deploy the `dist` folder to Cloudflare Pages.

- Build command: `npm run build`
- Output directory: `dist`
- Custom domain: `alpha11.app`

Cloudflare Pages `_redirects` maps `/lab`, `/jump`, and `/shift` onto the multi-page folders.

## Play

- Hub cards **LAB**, **JUMP**, **SHIFT** all open playable games. Footer: Gratis · Añade a inicio de pantalla.
- **LAB** (`/lab`): 11 canon creatures A1–A11. Same-tier overlap ~200ms merges up. Keys: `alpha11_lab_score` / `alpha11_lab_best`.
- **JUMP** (`/jump`): one-touch flap runner as A5 Pulse through lab glass / beams. Score = distance. Best: `alpha11_jump_best`.
- **SHIFT** (`/shift`): 4×4 swipe merge, A1 → higher tiers (canon colors/emoji). Keys: `alpha11_shift_score` / `alpha11_shift_best`.

# ALPHA-11

Hub PWA + four lab minigames for [alpha11.app](https://alpha11.app).

Stack: Vite + Phaser 3 + Matter.js. TypeScript. Mobile-first 390×844.

## Local

```bash
npm i
npm run dev
```

Open `/` (hub), `/lab`, `/jump`, `/shift`, `/rush`.

## Build

```bash
npm run build
```

## Deploy

Deploy the `dist` folder to Cloudflare Pages.

- Build command: `npm run build`
- Output directory: `dist`
- Custom domain: `alpha11.app`

Cloudflare Pages `_redirects` maps `/lab`, `/jump`, `/shift`, and `/rush` onto the multi-page folders.

## Play

- Hub cards **LAB**, **JUMP**, **SHIFT**, **RUSH** all open playable games. Footer: Gratis · Añade a inicio de pantalla.
- **LAB** (`/lab`): 11 vegetable tiers (pea → Alpha veggie) with distinct silhouettes. Same-tier overlap ~200ms merges up. Keys: `alpha11_lab_score` / `alpha11_lab_best`.
- **JUMP** (`/jump`): one-touch flap runner as A5 Berenjena through lab glass / beams. Score = distance. Best: `alpha11_jump_best`.
- **SHIFT** (`/shift`): 4×4 swipe merge, A1 → higher vegetable tiers. Keys: `alpha11_shift_score` / `alpha11_shift_best`.
- **RUSH** (`/rush`): BLOK auto-run speed platformer. Hold to jump. Best: `alpha11_rush_best`.

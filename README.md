# ALPHA-11

Hub PWA + LAB merge (Suika-style) for [alpha11.app](https://alpha11.app).

Stack: Vite + Phaser 3 + Matter.js. TypeScript. Mobile-first 390×844.

## Local

```bash
npm i
npm run dev
```

Open `/` (hub) and `/lab` (game).

## Build

```bash
npm run build
```

## Deploy

Deploy the `dist` folder to Cloudflare Pages.

- Build command: `npm run build`
- Output directory: `dist`
- Custom domain: `alpha11.app`

## Play

- Hub card **LAB — merge · JUGAR** opens `/lab`.
- 11 lab creatures A1–A11. Same-tier overlap ~200ms merges up.
- Score keys: `localStorage` `alpha11_lab_score` / `alpha11_lab_best`.

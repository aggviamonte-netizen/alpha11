# ALPHA-11

Hub PWA + lab minigames for [alpha11.app](https://alpha11.app).

Hub cards are a growing column (not a fixed set of four). This tree owns LAB vegetables + RUSH; other PRs append their own cards.

Stack: Vite + Phaser 3 (LAB / JUMP / SHIFT) + Three.js (RUSH). TypeScript. Mobile-first 390×844.

## Local

```bash
npm i
npm run dev
```

Open `/` (hub), `/lab`, `/jump`, `/shift`, `/rush`, `/kick`, `/sniper`, plus Vintage `/vintage/stack`, `/vintage/sudoku`, `/vintage/space`, `/vintage/fight`.

## Build

```bash
npm run build
```

## Deploy

Static hub (unchanged): build `dist` and publish as Workers Assets / Pages.

- Build command: `npm run build`
- Output directory: `dist`
- Custom domain: `alpha11.app`

API: `wrangler deploy` updates the existing Worker named `alpha11`. `run_worker_first` is only `/api/*`, so game routes stay on assets.

Cloudflare Pages `_redirects` maps `/lab`, `/jump`, `/shift`, `/rush`, `/kick`, `/sniper`, Vintage, and `/arcade` onto the multi-page folders.

The same repo also ships a Cloudflare Worker (`name`: `alpha11`, matching the existing account Worker) that owns `/api/*` only. Hub HTML is not rewritten. Production already has KV namespace `alpha11-waitlist` (`86685a78b0e44830be548f12dcba3876`).

```bash
npm run test:api
npm run build
npx wrangler deploy --dry-run
# Production (updates the existing alpha11 Worker + Workers Assets):
npm run deploy
```

`npm run dev` serves the waitlist API from a file mock at `.data/partners-waitlist.json` so `/partners` can POST same-origin. `wrangler dev` uses a local simulation of the KV binding. `npm run build` regenerates `worker/worker-configuration.d.ts` (gitignored) via `wrangler types`. See [Advertisers](#advertisers--backend) for the contract, D1 upgrade path, and secrets.

## Play

- Hub cards **LAB**, **JUMP**, **SHIFT**, **RUSH**, **KICK**, **SNIPER** plus Vintage **STACK / SUDOKU / SPACE / FIGHT**. Footer: Gratis · Añade a inicio de pantalla.
- Vintage games are vendored MIT static files under `public/vintage/` (credits: `/vintage/credits`, `vendor/NOTICE.md`).
- **LAB** (`/lab`): 11 vegetable tiers (pea → Alpha veggie) with distinct silhouettes. Same-tier overlap ~200ms merges up. Keys: `alpha11_lab_score` / `alpha11_lab_best`.
- **JUMP** (`/jump`): one-touch flap runner as A5 Berenjena through lab glass / beams. Score = distance. Best: `alpha11_jump_best`.
- **SHIFT** (`/shift`): 4×4 swipe merge, A1 → higher vegetable tiers. Keys: `alpha11_shift_score` / `alpha11_shift_best`.
- **RUSH** (`/rush`): BLOK 3D speed platformer — chase cam, ramps, núcleos. Touch SALTO / TURBO. Best: `alpha11_rush_best`.
- **KICK** (`/kick`): penalty shootout. Drag to aim, tap to shoot, read the keeper tell. Streak best: `alpha11_kick_best`.
- **SNIPER** (`/sniper`): hold to aim, release to fire. Best: `alpha11_sniper_best`.

## Advertisers / backend

No AdSense, GAM, or other ad-network scripts ship in this repo. No fill, eCPM, or revenue numbers are returned. Ads are **off** (`ADS_LIVE=false`).

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness + storage backend (`kv` / `file` / `memory`) |
| `GET` | `/api/inventory` | Static slot catalog: `hub_banner`, `hub_native`, `interstitial_soft` |
| `GET` | `/api/contract` | Machine-readable contract (same document as `worker/contract.json`) |
| `POST` | `/api/partners/waitlist` | Advertiser waitlist (JSON) |
| `OPTIONS` | `/api/*` | CORS preflight |

Legacy `POST /api/waitlist` stays **410** and points clients at `/api/partners/waitlist`.

Contract for the forthcoming `/partners` form: [`worker/contract.json`](worker/contract.json).

```http
POST /api/partners/waitlist
Content-Type: application/json
Origin: https://alpha11.app

{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "company": "Analytical Engines",
  "budget_band": "undisclosed",
  "message": "Direct IO later; no ad tags yet."
}
```

`budget_band`: `under_1k` | `1k_5k` | `5k_20k` | `20k_plus` | `undisclosed`.

Success: `201 { "ok": true, "id": "<uuid>", "stored": "kv" }`.

CORS allowlist includes `https://alpha11.app`, `https://www.alpha11.app`, local Vite/preview ports, `*.alpha11.pages.dev`, and `alpha11*.workers.dev`.

### Storage

**Today (prod path):** Cloudflare KV binding `WAITLIST` → existing namespace `alpha11-waitlist` (`86685a78b0e44830be548f12dcba3876`). Keys: `partner:<uuid>`.

**Local mock:** `npm run dev` appends JSON rows to `.data/partners-waitlist.json` (gitignored). Same handlers as production.

**D1 (later):** schema is [`worker/schema.sql`](worker/schema.sql). Create with `npx wrangler d1 create alpha11`, execute the file remotely, add a `d1_databases` binding named `DB` in `wrangler.jsonc`, then prefer D1 in `worker/src/store.ts`.

### Secrets

| Name | Required | How |
| --- | --- | --- |
| `PARTNERS_WEBHOOK` | no | `npx wrangler secret put PARTNERS_WEBHOOK` |

If set, each accepted waitlist row is `POST`ed as `{ "type": "partners.waitlist", "record": {…} }` after the store write (`waitUntil`). HTTPS only (localhost allowed for local tests). Copy [`.dev.vars.example`](.dev.vars.example) to `.dev.vars` for `wrangler dev`.

### How advertisers will connect later

1. **Direct IO (first).** Insertion order by email/contract. Creatives reviewed by hand. First-party tags only, mapped to the static slot ids. No third-party scripts in the hub until a later, explicit change.
2. **OpenRTB-ish (placeholder).** Shape reserved in [`worker/schema/openrtb-placeholder.json`](worker/schema/openrtb-placeholder.json). `POST /api/rtb/bid` is **not** routed. No auction, no demand partners, no fake bids.
3. **Marketplace.** Inventory catalog is already enumerable via `GET /api/inventory` (`live: false`). Auction, billing, and payments are out of scope.

### Privacidad (ES)

- La lista de espera de partners es **first-party**: nombre, email, empresa, banda de presupuesto y mensaje. Se guardan para contactar anunciantes, no para perfilar jugadores.
- **No hay redes publicitarias activas.** No se cargan AdSense, GAM ni píxeles de demanda. No hay cookies de terceros de anuncios.
- Cualquier anuncio futuro exigirá aviso y consentimiento **antes** de scripts o identificadores ajenos. IP y User-Agent no se persisten en la waitlist.
- Personas en la UE/EEE: base de interés legítimo / precontrato para responder a la solicitud. Baja: email al operador de alpha11.app.
- El marketplace y OpenRTB siguen apagados; este stub no envía pujas ni datos de dispositivo.

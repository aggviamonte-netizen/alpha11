# ALPHA-11 Vintage — third-party notices

This folder and `public/arcade/`, `public/vintage/`, and `src/vintage/` include
adapted copies of MIT-licensed open-source games. Trademarks of Nintendo,
Sega, Capcom, and The Tetris Company are not used in the player-facing UI.

## STACK (bloques)

- Source: https://github.com/lucky845/ts-tetris-game
- License: MIT (see `lucky845-ts-tetris-game/LICENSE`)
- Copyright (c) 2023 The Tetris Game Author
- Adaptation: rebranded in-game as STACK / BLOQUES. The word “Tetris” does
  not appear in ALPHA-11 UI. Logic ported into `src/vintage/stack/`.

## SUDOKU

- Evaluated: https://github.com/tn1ck/super-sudoku (MIT, Copyright (c) 2023 Tom Nick)
- License copy: `tn1ck-super-sudoku/LICENSE`
- Adaptation: Super Sudoku is a full React PWA. ALPHA-11 ships a lighter
  original TypeScript board in `src/vintage/sudoku/` so the hub build stays
  small. Super Sudoku is credited as the approved reference implementation.

## SPACE (naves)

- Source: https://github.com/BodhiProtocol/space-shooter
- License: MIT (see `bodhiprotocol-space-shooter/LICENSE`)
- Copyright (c) 2026 BodhiProtocol
- Adaptation: single-file canvas shooter ported to `src/vintage/space/`
  with Spanish ALPHA-11 chrome. UI name: SPACE.

## FIGHT (pelea)

- Source: https://github.com/AaronChelvan/stickfighter
- License: MIT (see `aaronchelvan-stickfighter/LICENSE`)
- Copyright (c) 2025 Aaron Chelvan
- Adaptation: stick-figure fighter only. No Capcom names or sprites.
  Runtime assets live in `public/vintage/fight/`. UI name: FIGHT.

## Arcade pack (LittleJS)

- Source: https://github.com/KilledByAPixel/LittleJSArcade
- License: MIT (see `killedbyapixel-littlejs-arcade/LICENSE`)
- Copyright (c) 2026 Frank Force
- Adaptation: a curated static subset is vendored under `public/arcade/`
  (engine + templates + six generic titles). Served only from this repo.
  Launcher: `/arcade`. UI names are generic Spanish labels (SERPIENTE,
  LADRILLOS, MINAS, CAJAS, TRÍO, LUNAR).

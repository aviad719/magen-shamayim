# Handoff Guide for AI Agents — מגן שמיים & חזית לבנון

This repository contains both of Aviad's web games (Hebrew, RTL, mobile-first, zero build dependencies):
1. **מגן שמיים (Tower Defense, v8)** — `tower-defense/site/` (served at the root: `https://aviad719.github.io/magen-shamayim/`)
2. **חזית לבנון (RTS, v6b)** — `rts/` (served at `/rts/`: `https://aviad719.github.io/magen-shamayim/rts/`)

Both games run on the same origin and share a money pool via `localStorage` (`tower-defense/site/shared.js`, `transfer.js`).

## Live Hosting & Auto-Deploy
- **Live URL (TD):** `https://aviad719.github.io/magen-shamayim/`
- **Live URL (RTS):** `https://aviad719.github.io/magen-shamayim/rts/`
- **How deployment works:** Every push to `main` automatically runs `.github/workflows/pages.yml`, which executes `sh build.sh` (assembling `tower-defense/site/` + `rts/` into `dist/`) and publishes `dist/` to GitHub Pages.
- **Important:** Keep all asset and cross-game links **relative** (`rts/`, `../`, `../shared.js`, etc.) because GitHub Pages serves under the `/magen-shamayim/` subpath.

## Repo Layout & Tests
- `tower-defense/site/`: `index.html`, `styles.css`, `game.js`, `geo.js`, `shared.js`, `transfer.js`, `map.jpg`, `og.png`
- `tower-defense/test/`: Node built-in test suite (`node --test tower-defense/test/*.test.js` — 176 tests pass in v8)
- `rts/`: `index.html`, `style.css`, `js/` (`data.js`, `sim.js`, `render.js`, `theater.js`, `main.js`), `test/` (`rts-bot.js`)
- `build.sh`: assembles `dist/` for local preview (`python3 -m http.server -d dist 8000`) and GitHub Pages.

## Current Versions (as of Nov 25, 2026)
- **TD v8:**
  - Radar placement in Israel, Saudi Arabia, UAE, or within 60 km of US bases (Al Asad, Al Udeid, Muwaffaq, Prince Sultan, Al Dhafra); batteries allowed within 120 km of a living radar.
  - Salvos from wave 2 (35% base, rising to 55% after wave 7; 8–25 rockets, 3 s banner, none on boss waves, 0.4 hit weight).
  - Sa'ar 6 naval battery (₪900, max 2, 150 km range, repair ₪400).
  - National interceptor stock (Tamir / Stunner / Arrow / Barak) + upgradeable factory + one-time US C-17 airlift to Nevatim.
- **RTS v6b:**
  - Lebanon front playable, shares funds with TD (`shared.js` / `transfer.js`).
  - Planned campaign progression: Lebanon → Syria → Iraq → Iran.

## Open Items & Ideas (from Aviad)
1. **RTS save-loss issue:** Aviad reported losing RTS saves on iPhone (Chrome home-screen shortcut). Autosave runs every 25 s / pause / hide in `rts/js/main.js`, likely isolated browser storage contexts between Chrome and the shortcut. Next step if it still reproduces: add an explicit manual save button + copyable save-code export/import inside RTS (similar to TD).
2. **Next RTS front:** Syria front (`theater.js` / `data.js`).
3. **TD small polish:**
   - Sa'ar 6 button sits below the radar button and requires scrolling on small mobile screens.
   - Late-wave salvo probability can be tuned down if wave 10+ feels too punishing.
   - Tabuk label slightly clipped on map.
   - Future idea: coalition partners.

## Aviad's Preferences
- Communicate in short, clear Hebrew.
- Always agree on a brief spec before starting a big build round.
- Keep simulation logic (`sim.js`) cleanly decoupled from rendering (`render.js`) so Node tests run headless.
- Also log major updates to Aviad's shared agents dashboard (`http://151.145.94.3:8080`, repo `aviad719/agents-dashboard`).

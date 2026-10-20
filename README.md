# dexmlabs.app

Static site for DEXM Labs: small free browser games and makes from a home lab in the UK.

- `/` homepage: the games, the makes (3D print designs on Cults3D, the band plan desk mat on Fourthwall) and Buy Me a Coffee
- `/skywave/` Skywave, a daily HF propagation puzzle (three.js from jsDelivr)
- `/lorenz/` Lorenz, a daily puzzle on the Lorenz SZ40/42 cipher machine that Bletchley Park called Tunny (three.js from jsDelivr)
- `/tolerance/` Tolerance, a daily engineering puzzle
- `/vector/` Vector, endless air traffic control with daily and sandbox modes
- `/orbit/` Orbit, orbital manoeuvres and procedural satellite deployments
- `/forge/` FORGE, twelve short physics contracts, a daily spring shot and a proving-ground bench (matter.js via jsDelivr)
- `/missions/mmx/` Mission Replays: MMX, a time slider through JAXA's Phobos sample return mission (Canvas 2D). The slider, play and pause, phase list and date read out live in `assets/replay-engine.mjs`; a new replay supplies its own mission data (segments, phases) and a draw function, see `missions/mmx/js/`. Browser test: `node missions/mmx/tests/browser.mjs`
- `/grid/` GRID, a city power desk: wind, sun, a slow nuclear core and coal, saved in the browser
- `/privacy/`, `/cookies/`, `/terms/`, `/disclaimer/`, `/contact/` policy pages
- `/tools/` and `/templates/` only hold redirect pages now. The UK tax calculators and spreadsheet templates moved to https://e13ctr0n1c.github.io/, and each old URL sends visitors to the matching page there (noindex, not in the sitemap)
- Visits are counted with Cloudflare Web Analytics (cookieless, aggregate only). The beacon is on every generated page; the Skywave and Lorenz pages carry it by hand
- Hosted on GitHub Pages from `main` (root) at https://dexmlabs.app/
- IndexNow key file: `deec04819134d490fb0bce54af34ef6d.txt` at the root

## Build

No build step for visitors. The homepage, policy pages, 404, redirect pages, `sitemap.xml`, `robots.txt`, `llms.txt` and the IndexNow key file are generated:

```
python3 build/gen.py
```

It needs only Python 3 and writes into the repo root. `skywave/`, `lorenz/`, `tolerance/`, `vector/`, `orbit/`, `assets/` and `CNAME` are not generated. Check the result with:

```
npm install --no-save jsdom
node build/tests/run.js
```

The games have their own tests, next to their code:

```
node lorenz/tests/run.mjs
node lorenz/tests/practice-hard.mjs
node skywave/tests/run.mjs
```

After changes to the legacy Skywave, Lorenz or site stylesheets, run `python3 build/light.py` to refresh their generated light rules (the site test checks freshness). Vector and Orbit use the shared theme variables and their own hand-written light rules; do not feed those stylesheets to the legacy light-rule generator. `build/chrome.py` updates shared header tools on the legacy game pages, and `build/og-image.html` is the source of `assets/og-image.png`.

Preview with any static server from the repo root, e.g. `python3 -m http.server`.

Content and code (c) 2026 DEXM Labs (Arthur Jones). All rights reserved, unless credited otherwise. Third-party credits: `skywave/CREDITS.md`, `skywave/THIRD_PARTY_LICENSES.txt`, `orbit/CREDITS.md`.

## Vector and Orbit

Both new games use native ES modules and Canvas 2D. No npm install, bundler, server API or build step is needed for visitors. Serve the repository root over HTTP; do not open the HTML with file://.

- Shared game code: `assets/flight-core.mjs` and `assets/flight-ui.css`.
- Per-game physics, renderer and UI: `vector/js/` and `orbit/js/`.
- Each game includes its own on-page flight manual.
- The shared points ledger is preserved; no storage migration is required.
- Scores and settings are local. Live runs are not saved.
- Daily seeds use UTC; both games expose Endless, Daily and Sandbox.

Dependency-free model tests and source audit:

```sh
node --test games-tests/models.test.mjs
python3 games-tests/static_audit.py
```

Optional browser tests use Python Playwright and Chromium:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 games-tests/browser.py
```

The browser harness loads the actual source modules and local assets without contacting analytics or external sites. See `games-tests/QA.md` for the tested scope and any environment limitations.

# dexmlabs.app

Static site for Deus Ex Machina Labs (DEXM LABS): small free browser games and makes from a home lab in the UK.

- `/` homepage: the games, the makes (3D print designs on Cults3D, the band plan desk mat on Fourthwall) and Buy Me a Coffee
- `/skywave/` Skywave, a daily HF propagation puzzle (three.js from jsDelivr)
- `/lorenz/` Lorenz, a daily puzzle on the Lorenz SZ40/42 cipher machine that Bletchley Park called Tunny (three.js from jsDelivr)
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

It needs only Python 3 and writes into the repo root. `skywave/`, `lorenz/`, `assets/` and `CNAME` are not generated. Check the result with:

```
npm install --no-save jsdom
node build/tests/run.js
```

Preview with any static server from the repo root, e.g. `python3 -m http.server`.

Content and code (c) 2026 Deus Ex Machina Labs (Arthur Jones). All rights reserved, unless credited otherwise. Third-party credits: `skywave/CREDITS.md`, `skywave/THIRD_PARTY_LICENSES.txt`.

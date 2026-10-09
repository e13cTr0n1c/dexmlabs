# dexmlabs.app

Static site for Deus Ex Machina Labs (DEXM LABS): small free browser games and tools.

- `/` homepage, `/skywave/` the Skywave HF propagation game (three.js from jsDelivr)
- `/tools/` free UK money tools: `cis-refund-estimator/`, `cis-deduction-calculator/`, `probate-iht-calculator/` (estimates, not advice)
- `/privacy/`, `/cookies/`, `/terms/`, `/disclaimer/`, `/contact/` policy pages
- Visits are counted with Cloudflare Web Analytics (cookieless, aggregate only). The beacon is on every page, added by the generators; the Skywave pages carry it by hand
- Hosted on GitHub Pages from `main` (root) at https://dexmlabs.app/ (HTTPS enforced). The custom domain is set in the repo's Pages settings, and GitHub keeps the `CNAME` file in step with it, so don't delete or edit `CNAME`. The old https://e13ctr0n1c.github.io/dexmlabs/ address redirects to dexmlabs.app
- IndexNow key file: `deec04819134d490fb0bce54af34ef6d.txt` at the root (written by `build/gen.py`)

No build step for visitors. Pages are generated on the build box with `build/gen.py` then `build/tools.py` (tools copied from their own sources with the DEXM chrome added). Serve the folder with any static server, e.g. `python3 -m http.server`.

Content and code (c) 2026 Deus Ex Machina Labs (Arthur Jones). All rights reserved, unless credited otherwise. Third-party credits: `skywave/CREDITS.md`, `skywave/THIRD_PARTY_LICENSES.txt`.

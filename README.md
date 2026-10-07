# dexmlabs.app

Static site for Deus Ex Machina Labs (DEXM LABS): small free browser games and tools.

- `/` homepage, `/skywave/` the Skywave HF propagation game (three.js from jsDelivr)
- `/tools/` free UK money tools: `cis-refund-estimator/`, `cis-deduction-calculator/`, `probate-iht-calculator/` (estimates, not advice)
- `/privacy/`, `/cookies/`, `/terms/`, `/disclaimer/`, `/contact/` policy pages
- Hosted on GitHub Pages from `main` (root), custom domain in `CNAME`

No build step for visitors. Pages are generated on the build box with `build/gen.py` then `build/tools.py` (tools copied from their own sources with the DEXM chrome added). Serve the folder with any static server, e.g. `python3 -m http.server`.

Content and code (c) 2026 Deus Ex Machina Labs (Arthur Jones). All rights reserved, unless credited otherwise. Third-party credits: `skywave/CREDITS.md`, `skywave/THIRD_PARTY_LICENSES.txt`.

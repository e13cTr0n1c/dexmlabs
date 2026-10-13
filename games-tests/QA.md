# VECTOR + ORBIT: QA record

Build date: 13 October 2026. Baseline: the supplied `dexmlabs-main.zip`.

## Executed checks

| Check | Result |
| --- | --- |
| New simulation and points model tests | 56 / 56 passed |
| New Chromium integration checks | 42 / 42 passed |
| Static integration audit, including baseline comparison | 27 / 27 passed |
| Existing Tolerance tests | 9 / 9 passed |
| Existing Skywave pure-model and extended-model subset | 49 / 49 passed |
| Existing generated light-theme freshness check | Passed |

The new browser checks reported no uncaught page errors, missing requested local assets or horizontal overflow in their tested states. All 87 original files under Skywave, Lorenz and Tolerance were compared against the supplied ZIP and remain byte-for-byte unchanged.

## What the checks cover

Models: deterministic random sequences; headings and gradual turns; approach capture, a full first landing and exit handovers; separation grace periods and reset behaviour; weather, fuel emergencies, strike limits, sandbox and daily clocks. Orbital checks cover long coasts and conservation, analytic transfers, fuel accounting, thrust and warp, periapsis/apoapsis matching, repeated deployment, recovery and guidance across eight consecutive contracts for three seeds. Shared points checks cover idempotent daily awards, per-game practice caps and preservation of existing awards.

Browser: launch; pause/resume; help and restart dialogs; focus loss; sound preferences; real pointer-drawn and click-assigned routes; a completed approach; burn-key release and pointer cancellation; pulse control; deployment; result and best-score persistence; clipboard success/fallback; daily replay and reward deduplication; endless milestones; sandbox exclusions; corrupt and blocked storage; phone quick controls, touch routing and reduced motion.

Responsive configurations: 320 px dark, 390 px light, 768 px dark and 1,440 px light; desktop interactions also used 1,440 px dark. Actual rendered screenshots were inspected, including dark and light phone layouts. The phone start action scrolls the radar/telemetry into view, with a fixed quick-control panel.

## Testing environment and limitations

Browser tests use Python Playwright with installed Chromium. Local-page navigation is restricted in this environment, so `browser_fixture.py` mounts the shipped HTML using `set_content`, serves the actual native ES modules and local assets through intercepted subresource requests, and substitutes browser storage for the opaque test origin. Analytics requests are not sent.

The browser fixture removes CSP only in the mounted test HTML; the shipped pages retain their production CSP. The static audit verifies the exact inline-theme hashes and local module paths. This is not a test of the deployed site's response headers, CDN caching or live analytics.

Some long-run and reward UI scenarios inject controlled model states instead of waiting for full five-minute runs. These complement, rather than replace, the separate simulation tests. No real-world navigation accuracy is claimed.

Safari, Firefox and physical mobile hardware were not tested. The original jsdom-dependent whole-site and full legacy-game UI suites could not be run here because jsdom was unavailable and dependency installation was blocked. Their scope is not represented by the passing model subsets above. The existing site test expectations were updated for five homepage games, the new storage keys and 18 sitemap entries.

## Reproduce

From the website root:

```sh
node --test games-tests/models.test.mjs
python3 games-tests/static_audit.py
python3 games-tests/browser.py
node tolerance/tests/run.mjs
python3 build/light.py --check
```

The browser command requires Python Playwright and Chromium; all other new tests use standard Node/Python facilities. Use `python3 games-tests/browser.py --chromium /path/to/chromium` to select a browser. The source comparison is optional: `python3 games-tests/static_audit.py --baseline /path/to/dexmlabs-main.zip`.

Before publishing, preview on the intended host and complete a manual round in each game on the browsers you support. Difficulty and long-session balance remain candidates for player feedback.

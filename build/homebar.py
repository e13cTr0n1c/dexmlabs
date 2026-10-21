"""Puts a slim bar at the top of every hand written game page: the game's name on the left and a link
to https://dexmlabs.app/ beside it. Run from anywhere:  python3 build/homebar.py   (safe to run again)
The generated /puzzle/ page gets the same bar from build/gen.py. Pages that need the bar placed
differently are listed in SPECIAL with their reason.
"""
from pathlib import Path
import re
S = Path(__file__).resolve().parent.parent
# (page, name shown on the left)
PAGES = [('apollo-lunar-landing-game/index.html','Apollo'),('booster-landing-game/index.html','Booster'),
 ('chernobyl-reactor-simulator/index.html','RBMK'),('docking-run-game/index.html','Docking Run'),
 ('enigma-machine/index.html','Enigma'),('flight-path/index.html','Flight Path'),('forge/index.html','FORGE'),('glider-thermals-game/index.html','Glider Thermals'),
 ('grid/index.html','GRID'),('helicopter-sling-load-game/index.html','Sling Load'),('lorenz/index.html','Lorenz'),
 ('mars-base-game/index.html','Mars Base'),('missions/mmx/index.html','MMX Replay'),('orbit/index.html','Orbit'),('play-test-8179d030/game/index.html','Repurposed beta'),
 ('repurposed/index.html','Repurposed'),('rocket-launch-game/index.html','Rocket Launch'),('skywave/index.html','Skywave'),
 ('tesla-roadster-thruster-game/index.html','Roadster Thrusters'),('tolerance/index.html','Tolerance'),('vector/index.html','Vector')]
# Pages that need the bar placed differently, with why.
SPECIAL = {
 'forge/index.html': 'fixed',   # 'back soon' pages centre everything in the body, so the bar is pinned to the top instead
 'grid/index.html': 'fixed', 'mars-base-game/index.html': 'fixed', 'rocket-launch-game/index.html': 'fixed',
 'skywave/index.html': 'fixed dexm-homebar--hdr',  # fixed stages sit at top:var(--header), so --header grows by the bar
 'lorenz/index.html': 'fixed dexm-homebar--hdr',
 'play-test-8179d030/game/index.html': 'fixed dexm-homebar--overlay',  # the canvas fills the window; the HUD moves below the bar
}
def bar(name, mode=''): return f'<nav data-homebar class="dexm-homebar{"".join(" dexm-homebar--"+m if not m.startswith("dexm") else " "+m for m in mode.split())}" aria-label="DEXM Labs"><span class="dexm-homebar-game">{name}</span><a href="https://dexmlabs.app/">dexmlabs.app</a></nav>'
def css(rel): return f'<link data-homebar rel="stylesheet" href="{rel}assets/homebar.css">'
for f, name in PAGES:
  p = S / f; s = p.read_text()
  # no HTML comments as markers (the Lorenz suite forbids them): the two tags carry data-homebar instead
  s = re.sub(r'<link data-homebar [^>]*>|<nav data-homebar .*?</nav>', '', s, flags=re.S)
  s = re.sub(r'<!-- /?dexm homebar -->', '', s)
  rel = '../' * f.count('/')
  s = s.replace('</head>', css(rel) + '</head>', 1)
  # after the skip link when the page starts with one, so Tab still reaches 'skip' first
  s = re.sub(r'(<body[^>]*>\s*(?:<a class="skip[^"]*"[^>]*>.*?</a>)?)', lambda m: m.group(1) + bar(name, SPECIAL.get(f, '')), s, count=1, flags=re.S)
  p.write_text(s); print(f)

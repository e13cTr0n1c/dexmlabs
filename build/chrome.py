"""Puts the shared header bits into the hand written game pages (skywave/*.html and lorenz/*.html).

Run from anywhere:  python3 build/chrome.py   (safe to run again; it replaces what it added before)

Adds, on each page: the theme script as the first script in <head>, the shared stylesheet and scripts,
the points chip and theme toggle in the header, and the theme script's hash in the page's
Content-Security-Policy, if it has one. A CSP with a hash ignores 'unsafe-inline', so any other inline
script (the import map) gets its own hash too.
"""
from pathlib import Path
import re, hashlib, base64, sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from shared import THEME_SCRIPT, THEME_HASH, tools, shared_head
S = Path(__file__).resolve().parent.parent
def h(src): return "'sha256-" + base64.b64encode(hashlib.sha256(src.encode()).digest()).decode() + "'"
def page(path):
  s = path.read_text()
  s = re.sub(r'<script>\(function\(\)\{var d=document\.documentElement.*?</script>\n?', '', s)
  s = re.sub(r'<link rel="stylesheet" href="\.\./assets/dexm-ui\.css"><script src="\.\./assets/points\.js" defer></script><script src="\.\./assets/theme\.js" defer></script>', '', s)
  s = re.sub(r'<div class="dexm-tools">.*?</div>', '', s)
  # theme script straight after the viewport meta, before any other script or stylesheet
  m = re.search(r'<meta name="viewport"[^>]*>', s)
  s = s[:m.end()] + f'<script>{THEME_SCRIPT}</script>' + s[m.end():]
  m = re.search(r'<link rel="stylesheet" href="\./css/style\.css">', s)
  s = s[:m.end()] + shared_head('../') + s[m.end():]
  # header: before the settings button on the game screens, at the end of the nav elsewhere
  t = tools('../')
  if '<button id="settings-open"' in s: s = s.replace('<button id="settings-open"', t + '<button id="settings-open"', 1)
  else: s = re.sub(r'(<header class="site-header">.*?)(\s*</nav>)', lambda m: m.group(1) + t + m.group(2), s, count=1, flags=re.S)
  # CSP
  def csp(m):
    c = m.group(1)
    sources = re.sub(r"\s*'sha256-[^']*'", '', c)
    inline = [x for x in re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, flags=re.S) if x.strip() and not x.lstrip().startswith('{"@context"')]
    hashes = ' '.join(dict.fromkeys(h(x) for x in inline))
    sources = re.sub(r"script-src 'self'( 'unsafe-inline')?", "script-src 'self' " + hashes, sources)
    return f'<meta http-equiv="Content-Security-Policy" content="{sources}">'
  s = re.sub(r'<meta http-equiv="Content-Security-Policy" content="([^"]*)">', csp, s)
  path.write_text(s)
for d in ('skywave', 'lorenz'):
  for f in sorted((S / d).glob('*.html')): page(f); print(f.relative_to(S))

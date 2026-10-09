"""Builds the light theme for each stylesheet from its dark rules.

Run from anywhere:  python3 build/light.py

For every rule that sets a colour, it writes the same rule under :root[data-theme=light] with the colour
swapped for its light twin, and puts the result at the end of the stylesheet between two marker comments.
Every colour declaration is repeated, even unchanged ones and ones like border:0, so the light rules keep the same order and the same
relative specificity as the dark ones. Edit the dark rules, then run this again.

Roles decide the swap:
  surface (backgrounds): dark becomes off white paper, raised panels get lighter. Acid and paper fills stay.
  text (color, fill, stroke, outline): light ink becomes dark ink, made dark enough for AA on the paper.
                                       Dark text stays dark, because in the dark theme it only sits on fills.
  line (borders): dark lines become light grey lines, edges keep 3:1 against the paper.
  shadow: lighter and softer.
Hand written light rules (any selector with data-theme in it) are copied into the block where they stand,
so they still come after, and beat, the generated twin of the rule they adjust.
"""
from pathlib import Path
import colorsys, re, sys
S = Path(__file__).resolve().parent.parent
START, END = '/* light theme: built by build/light.py from the rules above, do not edit by hand */', '/* end light theme */'
P = ':root[data-theme=light]'
PAPER = (0xf3, 0xf2, 0xec)      # light background
TEXT_REF = (0xe6, 0xe7, 0xde)   # the darkest light surface text has to read on
ACID_INK = '#4b5e00'            # acid as text, links and outlines on light
# Light values of the theme variables, per stylesheet. Anything not listed is worked out from its role.
FILES = {
  'assets/site.css': {'bg': '#f3f2ec', 'panel': '#fbfaf6', 'panel2': '#eae9e1', 'ink': '#15170f', 'muted': '#4f5747', 'line': '#d9dacf', 'edge': '#828a78'},
  'skywave/css/style.css': {'bg': '#f3f2ec', 'panel': '#fbfaf6', 'ink': '#15170f', 'muted': '#4f5747', 'line': '#d4d7cb', 'edge': '#828a78', 'red': '#a3261c', 'amber': '#7a4a00'},
  'lorenz/css/style.css': {'bg': '#f3f2ec', 'panel': '#fbfaf6', 'ink': '#15170f', 'muted': '#4f5747', 'line': '#d4d7cb', 'edge': '#828a78', 'red': '#a3261c', 'amber': '#7a4a00'},
}
VAR_ROLE = {'bg': 'surface', 'panel': 'surface', 'panel2': 'surface', 'ink': 'text', 'muted': 'text', 'line': 'line', 'edge': 'line', 'red': 'text', 'amber': 'text'}
KEEP_VARS = {'acid', 'paper', 'paper-ink', 'stl-blue', 'stl-blue-hover', 'stl-ink', 'stripe'}
SURFACE_VARS = {'bg', 'panel', 'panel2'}

def parse_colour(t):
  t = t.strip().lower()
  if t.startswith('#'):
    h = t[1:]
    if len(h) in (3, 4): h = ''.join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4)); a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
    return r, g, b, a
  m = re.match(r'rgba?\(([^)]*)\)', t)
  if m:
    p = [x for x in re.split(r'[\s,/]+', m.group(1).strip()) if x]
    r, g, b = (float(x[:-1]) * 2.55 if x.endswith('%') else float(x) for x in p[:3]); a = float(p[3][:-1]) / 100 if len(p) > 3 and p[3].endswith('%') else float(p[3]) if len(p) > 3 else 1
    return r, g, b, a
  return {'black': (0, 0, 0, 1), 'white': (255, 255, 255, 1)}.get(t)
def fmt(r, g, b, a=1):
  r, g, b = (max(0, min(255, round(x))) for x in (r, g, b))
  return f'#{r:02x}{g:02x}{b:02x}' if a >= .999 else f'rgba({r},{g},{b},{round(a, 3)})'
def lum(c):
  f = lambda v: (v / 255) / 12.92 if v / 255 <= .03928 else ((v / 255 + .055) / 1.055) ** 2.4
  return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2])
def contrast(a, b):
  la, lb = sorted((lum(a), lum(b)), reverse=True); return (la + .05) / (lb + .05)
def hls(c): return colorsys.rgb_to_hls(*(v / 255 for v in c[:3]))
def from_hls(h, l, s, a=1): return tuple(v * 255 for v in colorsys.hls_to_rgb(h, max(0, min(1, l)), max(0, min(1, s)))) + (a,)
def darken_to(h, l, s, a, ref, ratio):
  c = from_hls(h, l, s, a)
  while contrast(c, ref) < ratio and l > 0: l -= .01; c = from_hls(h, l, s, a)
  return c

def light(c, role, sel=''):
  r, g, b, a = c; h, l, s = hls(c)
  bright_sat = s > .5 and l > .4
  if role == 'surface':
    if 'backdrop' in sel: return fmt(20, 22, 15, min(a, .45))
    if l < .5 and not (bright_sat):
      if l > .3 and s > .25: return fmt(*c)       # mid tones (bars, badges) read on both
      return fmt(*from_hls(h, min(.995, .94 + (l - .035) * .55), min(s, .18), a))
    if bright_sat and a < .6:                      # faint acid tints become faint olive tints
      return fmt(*from_hls(h, .3, .9, min(.5, a * 1.6)))
    return fmt(*c)
  if role == 'text':
    if l < .35 and a > .9: return fmt(*c)
    return fmt(*darken_to(h, 1 - l if not bright_sat else .32, min(s, .95), a, TEXT_REF, 4.6))
  if role == 'line':
    if bright_sat or l >= .5: return fmt(*darken_to(h, .4 if bright_sat else 1 - l, min(s, .9), a, PAPER, 3.0))
    nl = 1 - l
    out = from_hls(h, nl, min(s, .2), a)
    return fmt(*(darken_to(h, nl, min(s, .2), a, PAPER, 3.0) if l >= .3 else out))
  if role == 'shadow':
    if bright_sat: return fmt(*from_hls(h, .3, .9, a * .5))
    if l < .2: return fmt(30, 34, 22, a * .3)
    return fmt(*c)
  return fmt(*c)

TOKEN = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\bblack\b|\bwhite\b|var\(--([\w-]+)\)')
COLOUR_VARS = set(VAR_ROLE) | KEEP_VARS | {'acid-ink'}
def role_of(prop):
  p = prop.lower()
  if p.startswith('--'): return None
  if p in ('background', 'background-color', 'background-image'): return 'surface'
  if p in ('box-shadow', 'text-shadow', 'filter'): return 'shadow'
  if p.startswith('border') and not re.search(r'radius|width|style|collapse|spacing|image', p) or p.startswith('-webkit-text-stroke'): return 'line'
  if p in ('color', 'fill', 'stroke', 'caret-color', 'accent-color', 'outline', 'outline-color', 'text-decoration', 'text-decoration-color', 'column-rule', 'column-rule-color'): return 'text'
  return None

def convert_value(val, role, sel, dark_vars):
  hit = False
  def sub(m):
    nonlocal hit
    v = m.group(1)
    if v:
      if v not in COLOUR_VARS: return m.group(0)
      hit = True
      if v == 'acid' and role in ('text', 'line'): return 'var(--acid-ink)'
      if v == 'acid' and role == 'shadow': return 'rgba(75,94,0,.35)'
      if v in SURFACE_VARS and role == 'text': return dark_vars[v]   # dark text on a fill stays dark
      return m.group(0)
    c = parse_colour(m.group(0))
    if not c: return m.group(0)
    hit = True
    return light(c, role, sel)
  out = TOKEN.sub(sub, val)
  return out if hit else None

def split_top(s, ch):
  parts, depth, cur, q = [], 0, '', None
  for x in s:
    if q:
      cur += x
      if x == q: q = None
      continue
    if x in '"\'': q = x
    elif x == '(': depth += 1
    elif x == ')': depth -= 1
    if x == ch and depth == 0: parts.append(cur); cur = ''
    else: cur += x
  parts.append(cur); return parts

def blocks(css):
  """Yields (prelude, body) for each top level statement."""
  i, n = 0, len(css)
  while i < n:
    j = i; depth = 0
    while j < n and css[j] not in '{;': j += 1
    if j >= n: break
    if css[j] == ';': i = j + 1; continue
    pre = css[i:j].strip(); k = j + 1; depth = 1
    while k < n and depth:
      if css[k] == '{': depth += 1
      elif css[k] == '}': depth -= 1
      k += 1
    yield pre, css[j + 1:k - 1]; i = k

def prefix(sel):
  out = []
  for part in split_top(sel, ','):
    p = part.strip()
    if p.startswith(':root'): out.append(P + p[5:])
    elif p.startswith('html'): out.append('html[data-theme=light]' + p[4:])
    else: out.append(P + ' ' + p)
  return ','.join(out)

def walk(css, dark_vars, flags):
  out = []
  for pre, body in blocks(css):
    if pre.startswith('@media') or pre.startswith('@supports'):
      inner = walk(body, dark_vars, flags)
      if inner: out.append(pre + '{' + inner + '}')
      continue
    if pre.startswith('@'): continue
    if 'data-theme' in pre:   # a hand written light rule: keep it as is, in its place
      out.append(pre + '{' + body.strip() + '}'); continue
    decls = []
    for d in split_top(body, ';'):
      if ':' not in d: continue
      prop, val = d.split(':', 1); prop = prop.strip()
      if prop.startswith('--') or prop == 'color-scheme': continue
      role = role_of(prop)
      if not role: continue
      nv = convert_value(val.strip(), role, pre, dark_vars)
      # Rules that clear a colour (border:0, background:none) are repeated too, so they still win where they did.
      decls.append(f'{prop}:{nv if nv is not None else val.strip()}')
    if decls: out.append(prefix(pre) + '{' + ';'.join(decls) + '}')
  return ''.join(out)

def build(rel):
  path = S / rel; css = path.read_text()
  if START in css:   # drop the old light block, keeping any rules written after it
    a, b = css.index(START), css.index(END) + len(END)
    css = css[:a].rstrip() + '\n' + css[b:].lstrip()
  clean = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
  root = re.search(r':root\{([^}]*)\}', clean).group(1)
  dark_vars = {k.strip()[2:]: v.strip() for k, v in (d.split(':', 1) for d in split_top(root, ';') if d.strip().startswith('--'))}
  given = FILES[rel]; lv = []
  for name, val in dark_vars.items():
    if name in given: lv.append(f'--{name}:{given[name]}')
    elif name in VAR_ROLE and parse_colour(val): lv.append(f'--{name}:{light(parse_colour(val), VAR_ROLE[name])}')
  lv.append(f'--acid-ink:{ACID_INK}')
  rules = walk(clean, dark_vars, [])
  block = f'{START}\n{P}{{color-scheme:light;{";".join(lv)}}}\n{rules}\n{END}\n'
  path.write_text(css + block)
  return len(rules), lv

if __name__ == '__main__':
  check = '--check' in sys.argv
  stale = []
  for rel in FILES:
    before = (S / rel).read_text()
    n, lv = build(rel)
    if check:
      if (S / rel).read_text() != before: stale.append(rel)
      (S / rel).write_text(before)
    else: print(rel, n, 'chars;', ' '.join(lv))
  if stale: print('light theme out of date, run python3 build/light.py:', ', '.join(stale)); sys.exit(1)

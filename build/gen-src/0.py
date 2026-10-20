"""Builds the generated pages of dexmlabs.app into the repo root.

Run from anywhere:  python3 build/gen.py

Writes: index.html, the policy pages (privacy, cookies, terms, disclaimer, contact), 404.html,
robots.txt, sitemap.xml, llms.txt, the IndexNow key file, and the redirect pages under tools/ and
templates/ (those pages moved to https://e13ctr0n1c.github.io/).
Not written here: skywave/, lorenz/, tolerance/, vector/, orbit/, assets/, CNAME, README.md, except the new game signup block in
skywave/index.html and lorenz/index.html, in the section marked data-signup.
Every page carries the Cloudflare Web Analytics beacon (CFWA) once, just before </body>.
skywave/*.html and lorenz/*.html carry it by hand.
"""
from pathlib import Path
import shutil
S=Path(__file__).resolve().parent.parent
BMC='https://buymeacoffee.com/arthurdeusexmachina'
MAT='https://arthurdeusexmachina-shop.fourthwall.com/products/uk-ham-radio-band-plan-desk-mat-160m-to-70cm'
EFHW='https://cults3d.com/en/3d-model/tool/toroid-box-for-ft240-and-ft140-cores-efhw-49-1-9-1-unun-choke-so-239-n-or'
DRILL='https://cults3d.com/en/3d-model/tool/rf-connector-panel-drill-guides-so-239-n-4-hole-flange-and-bnc-d-hole-with'
CHI='https://cults3d.com/en/3d-model/gadget/lorenz-cipher-chi-wheel-demonstrator-simplified-sz42-teaching-model'
EMAIL='hello@dexmlabs.app'
# Buttondown username for the 'new game' email list. While it's the placeholder, the signup form is built but hidden.
BUTTONDOWN_USER='dexmlabs'
SIGNUP_LIVE=BUTTONDOWN_USER!='BUTTONDOWN_USER_TBD'
def signup(where):
  """A plain form that posts to Buttondown in a new tab. No script, no pixel."""
  return (f'<section class="dexm-signup" data-signup aria-labelledby="signup-h-{where}"{"" if SIGNUP_LIVE else " hidden"}>'
    f'<h2 id="signup-h-{where}">Email me when a new game comes out</h2><p>One email when a new game is out. Nothing else.</p>'
    f'<form action="https://buttondown.com/api/emails/embed-subscribe/{BUTTONDOWN_USER}" method="post" target="_blank" rel="noopener">'
    f'<label for="signup-email-{where}">Your email address</label><span class="dexm-signup-row">'
    f'<input type="email" name="email" id="signup-email-{where}" required autocomplete="email" spellcheck="false">'
    f'<button type="submit">Email me</button></span>'
    f'<small>You confirm by email first. Unsubscribe any time. Your address is held by Buttondown, never sold.</small></form></section>')
# IndexNow key (public by design). Search engines fetch <key>.txt to check pings for dexmlabs.app.
INDEXNOW_KEY='deec04819134d490fb0bce54af34ef6d'
# Cloudflare Web Analytics beacon (cookieless), exactly as Cloudflare gave it. The token is public.
CFWA="""<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "d2c23a1c7dbd41168e2a3d54c4a4dc40"}'></script><!-- End Cloudflare Web Analytics -->"""
MARK='<svg viewBox="0 0 32 32" aria-hidden="true"><rect class="frame" x="2.5" y="2.5" width="27" height="27" fill="none" stroke="#d6ff00" stroke-width="3"/><path d="M16 8a8 8 0 1 1 0 16a8 8 0 1 1 0-16z" fill="#d6ff00"/><rect x="6" y="15" width="20" height="2.4" fill="#0a0b09"/><rect x="14.8" y="5" width="2.4" height="5" fill="#0a0b09"/></svg>'
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from shared import THEME_SCRIPT,THEME_HASH,tools,shared_head
from makes_data import MODELS as MK_MODELS, C as MK_C
POL=[('privacy','Privacy'),('cookies','Cookies &amp; storage'),('terms','Terms'),('disclaimer','Disclaimer'),('contact','Contact')]
def head(title,desc,path,r,og='https://dexmlabs.app/assets/og-image.png',ogalt='DEXM Labs. Games and makes.'):
  url='https://dexmlabs.app/'+path
  return f'''<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>{THEME_SCRIPT}</script>
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0a0b09">
<meta property="og:type" content="website"><meta property="og:site_name" content="DEXM Labs">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{og}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{ogalt}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title}"><meta name="twitter:description" content="{desc}"><meta name="twitter:image" content="{og}">
<link rel="icon" href="{r}assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="{r}assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="{r}assets/apple-touch-icon.png">
<link rel="stylesheet" href="{r}assets/site.css">
{shared_head(r)}
<script src="{r}assets/storage-note.js" data-cookies="{r}cookies/" defer></script>
</head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap"><a class="brand" href="{r or './'}">{MARK}<span>DEXM LABS</span></a><nav aria-label="Main"><a href="{r or './'}">HOME</a><a href="{r}#games">GAMES</a><a href="{r}#makes">MAKES</a></nav>{tools(r)}</div></header>
<div class="stripe" aria-hidden="true"></div>
'''
def foot(r):
  links=''.join(f'<a href="{r}{p}/">{n}</a>' for p,n in POL)
  return f'''<footer class="foot"><div class="wrap"><nav aria-label="Policies">{links}</nav><div><p><a href="mailto:{EMAIL}">{EMAIL}</a></p><p>&copy; 2026 DEXM Labs</p></div></div></footer>
{CFWA}
</body></html>
'''
def doc(slug,title,label,desc,body,updated='7 October 2026'):
  if slug in ('privacy','cookies','disclaimer','points'): updated='13 October 2026'
  r='../'
  html=head(f'{title} / DEXM Labs',desc,slug+'/',r)+f'''<main id="main" class="doc"><div class="wrap"><article>
<p class="label acid">{label}</p>
<h1>{title}</h1>
<p class="updated">Last updated: {updated}</p>
{body}
</article></div></main>
'''+foot(r)
  (S/slug).mkdir(exist_ok=True);(S/slug/'index.html').write_text(html)


# ---------- homepage ----------
SCOPE='https://cults3d.com/en/3d-model/gadget/radar-scope-desk-console-for-round-raspberry-pi-displays-for-waveshare-5in-and'
# The first entry is the featured make, shown on its own above the rest.
MAKES=[(SCOPE,'Radar Scope Desk Console','3D print housing that turns a round Raspberry Pi display into a retro radar scope for an ADS-B receiver. Fits the Waveshare 5 inch and 4 inch round screens.','Cults3D'),
 (CHI,'Lorenz chi wheel','3D print of a simplified SZ42 chi wheel, for showing how Lorenz works.','Cults3D'),
 (EFHW,'EFHW toroid box','3D print for FT240 and FT140 cores.','Cults3D'),
 (DRILL,'RF panel drill guide','3D print for SO-239, N and BNC holes.','Cults3D'),
 (MAT,'Band plan desk mat','UK ham bands, 160m to 70cm.','Fourthwall')]
LORENZ_LINE='A daily cipher puzzle on the Lorenz SZ40/42 cipher machine that Bletchley Park called Tunny. Find the settings in the key book, set twelve wheels and decode the tape.'

# Homepage game cards, in sections. Strongest first in each section.
# (slug, thumb, tag, title, blurb, button, status) status: 'live' or 'beta'
GAME_SECTIONS=[
 ('physics','SIMULATORS','Physics &amp; Flight',[
  ('booster-landing-game','booster-landing-game','ROCKETRY','Booster','Land a Falcon 9 style booster on a ship at sea, or catch a Super Heavy style booster with the tower arms. Throttle, gimbal, grid fins, wind and swell. Fan-made.','Play Booster','live'),
  ('docking-run-game','docking-run-game','SPACE','Docking Run','Dock a crew capsule to a space station by hand, with real thrusters, real orbital mechanics and real docking limits. From 30 m out to a 2 km rendezvous.','Play Docking Run','live'),
  ('helicopter-sling-load-game','helicopter-sling-load-game','HEAVY LIFT','Sling Load','Fly a heavy lift helicopter with a load swinging on a rope. Set crates on the mark, an AC unit on a roof, a bridge on its piers, and put out a fire. A new job every day.','Play Sling Load','live'),
  ('apollo-lunar-landing-game','apollo-lunar-landing-game','SPACE','Apollo',"Fly the last 200 metres of an Apollo landing with real lunar gravity and a fuel gauge that won't wait. A new site every day.",'Play Apollo','live'),
  ('glider-thermals-game','glider-thermals-game','SOARING','Glider Thermals','Fly a sailplane with no engine on a summer evening. Circle in thermals with the birds, soar a ridge, climb in mountain wave and land out safely. A new task every day.','Play Glider Thermals','live'),
  ('tesla-roadster-thruster-game','tesla-roadster-thruster-game','THRUSTERS','Roadster Thrusters','A fan-made Tesla Roadster game. Drag launch on a cold gas boost, hop between platforms and land flat, then drift past Earth and Mars. A new run every day. Not affiliated with Tesla or SpaceX.','Play Roadster Thrusters','live')]),
 ('daily','ONE A DAY','Daily Puzzles',[
  ('skywave','skywave','HF RADIO','Skywave','A daily ham radio puzzle. Read the sun, pick the band and bounce your signal off the ionosphere to reach ten stations before the day runs out.','Play Skywave','live'),
  ('lorenz','lorenz','CIPHER','Lorenz',LORENZ_LINE,'Play Lorenz','live'),
  ('enigma-machine','enigma','CIPHER','Enigma','A working Enigma I simulator and a daily intercept. Set the rotors from the key sheet, find the smudged cable and read the message.','Play Enigma','live'),
  ('tolerance','tolerance','ENGINEERING','Tolerance','A daily engineering puzzle. One mechanism, six guesses at the output, and each one comes back higher, lower or within 5%.','Play Tolerance','live')]),
 ('labs','WORK IN PROGRESS','Labs / Beta',[
  ('repurposed','repurposed','PUZZLE','Repurposed','A first person puzzle game in a facility that would rather you stayed put. Take over arms, drones, a crane and a wall climbing spider bot to get through. Two facilities so far.','See Repurposed','beta'),
  (None,None,None,'Next game','In development. Nothing to see yet.',None,'sealed')]),
 ('other','ODDS AND ENDS','Other',[
  ('vector','vector','AIR TRAFFIC CONTROL','Vector','An endless air traffic control game. Route arrivals, sequence the runway and keep aircraft safely separated as your sector gets busier.','Play Vector','live'),
  ('orbit','orbit','ORBITAL FLIGHT','Orbit','Fly an orbital tug. Shape your trajectory, match target orbits and deploy satellites before your propellant runs out.','Play Orbit','live'),
  ('chernobyl-reactor-simulator','chernobyl-reactor-simulator','REACTOR','RBMK','A simplified RBMK-1000 control desk. Hold power through a xenon pit or run the rundown test, and know when to press AZ-5.','Play RBMK','live')])]
GAMES=[g for _,_,_,gs in GAME_SECTIONS for g in gs if g[6]!='sealed']
LIVE=len(GAMES)
def game_card(g):
  slug,thumb,tag,title,blurb,btn,status=g
  if status=='sealed':
    return f'''<article class="card sealed">
<div class="plate-head"><span class="label status"><span class="dot off" aria-hidden="true"></span>IN DEVELOPMENT</span></div>
<div class="thumb" aria-hidden="true"><span>SEALED</span></div>
<div class="card-body"><h3>{title}</h3><p>{blurb}</p></div>
</article>
'''
  st='<span class="label acid status" style="border:2px solid var(--acid);padding:3px 8px;letter-spacing:.16em">BETA</span>' if status=='beta' else '<span class="label acid status"><span class="dot" aria-hidden="true"></span>LIVE</span>'
  return f'''<article class="card">
<div class="plate-head">{st}<span class="label">{tag}</span></div>
<a class="thumb" href="{slug}/" tabindex="-1" aria-hidden="true"><img src="assets/{thumb}-thumb.webp" width="480" height="300" alt="" loading="lazy" decoding="async"></a>
<div class="card-body"><h3>{title}</h3><p>{blurb}</p><a class="btn" href="{slug}/">{btn}</a></div>
</article>
'''
def games_html():
  out=[]
  for sid,label,name,gs in GAME_SECTIONS:
    n=sum(1 for g in gs if g[6]!='sealed')
    out.append(f'''<div class="game-sec" id="games-{sid}" role="group" aria-labelledby="games-{sid}-h">
<div class="sec-head"><div><p class="label acid">{label}</p><h3 class="sec-h" id="games-{sid}-h">{name}</h3></div><p class="label">{n} {'GAME' if n==1 else 'GAMES'}</p></div>
<div class="grid">
'''+''.join(game_card(g) for g in gs)+'</div>\n</div>\n')
  return ''.join(out)
GAMES_HTML=games_html()
import json as _json
GAMES_LD=_json.dumps({"@context":"https://schema.org","@type":"ItemList","@id":"https://dexmlabs.app/#games","name":"DEXM Labs games","itemListOrder":"https://schema.org/ItemListOrderAscending","numberOfItems":LIVE,"itemListElement":[{"@type":"ListItem","position":i+1,"name":g[3],"url":f"https://dexmlabs.app/{g[0]}/"} for i,g in enumerate(GAMES)]},separators=(',',':'))
home=head('DEXM Labs / Games and makes','Free browser games from a home lab in the UK: Skywave, Lorenz, Tolerance, Vector, Orbit and Enigma, plus designs for the radio bench.','','').replace('</head>','<script src="assets/puzzle.js" defer></script><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","@id":"https://dexmlabs.app/#site","url":"https://dexmlabs.app/","name":"DEXM Labs","inLanguage":"en-GB"}</script>\n<script type="application/ld+json">'+GAMES_LD+'</script>\n</head>',1)+f'''<main id="main">
<section class="block pz-today" id="puzzle-today" aria-labelledby="pz-today-h"><div class="wrap">
<article class="card pz-card" data-puzzle-card data-src="puzzle/puzzles.json">
<div class="plate-head"><span class="label acid status"><span class="dot" aria-hidden="true"></span>NEW EVERY DAY</span><span class="label" data-pz-type>DAILY</span></div>
<div class="card-body"><h2 id="pz-today-h">Today's Puzzle</h2><p data-pz-line>One small puzzle a day: a rotor cipher, a Morse riddle, an aviation question or a bit of physics and space.</p><p class="label acid" data-pz-streak></p><a class="btn" href="puzzle/" data-pz-go>Play today's puzzle</a></div>
</article>
</div></section>

<section class="hero"><div class="wrap hero-grid">
<div class="plate">
<div class="plate-head"><span class="label acid"><span class="dot blink" aria-hidden="true"></span> ONLINE</span><span class="label">EST. 2026</span></div>
<h1><span>DEXM</span><span>Labs</span></h1>
<p class="tagline">Deus ex machina</p>
<p class="lead">Small free games that run in your browser, and things I design for the radio bench and the 3D printer. I build them in my home lab, one at a time, and put them here when they work.</p>
<div class="meta"><div><strong>{LIVE}</strong><span class="label">GAMES LIVE</span></div><div><strong>{len(MAKES)}</strong><span class="label">MAKES</span></div><div><strong>0</strong><span class="label">ACCOUNTS NEEDED</span></div></div>
</div>
<div class="side">
<div class="plate"><div class="plate-head"><span class="label">GAMES LIVE</span></div><div class="bignum" aria-hidden="true">{LIVE}</div></div>
<div class="warn"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 38 36H2Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="miter"/><rect x="18.4" y="14" width="3.2" height="12" fill="currentColor"/><rect x="18.4" y="29" width="3.2" height="3.2" fill="currentColor"/></svg><p><strong>Work in progress</strong>Things here change. If something breaks, <a href="contact/">tell me</a>.</p></div>
</div>
</div></section>

<section class="block" id="games" aria-labelledby="games-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">TEST CHAMBERS</p><h2 id="games-h">Games</h2></div><p class="label">PLAYS IN THE BROWSER / FREE</p></div>
{GAMES_HTML}
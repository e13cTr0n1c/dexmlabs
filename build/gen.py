"""Builds the generated pages of dexmlabs.app into the repo root.

Run from anywhere:  python3 build/gen.py

Writes: index.html, the policy pages (privacy, cookies, terms, disclaimer, contact), 404.html,
robots.txt, sitemap.xml, llms.txt, the IndexNow key file, and the redirect pages under tools/ and
templates/ (those pages moved to https://e13ctr0n1c.github.io/).
Not written here: skywave/, lorenz/, assets/, CNAME, README.md.
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
# IndexNow key (public by design). Search engines fetch <key>.txt to check pings for dexmlabs.app.
INDEXNOW_KEY='deec04819134d490fb0bce54af34ef6d'
# Cloudflare Web Analytics beacon (cookieless), exactly as Cloudflare gave it. The token is public.
CFWA="""<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "d2c23a1c7dbd41168e2a3d54c4a4dc40"}'></script><!-- End Cloudflare Web Analytics -->"""
MARK='<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2.5" y="2.5" width="27" height="27" fill="none" stroke="#d6ff00" stroke-width="3"/><path d="M16 8a8 8 0 1 1 0 16a8 8 0 1 1 0-16z" fill="#d6ff00"/><rect x="6" y="15" width="20" height="2.4" fill="#0a0b09"/><rect x="14.8" y="5" width="2.4" height="5" fill="#0a0b09"/></svg>'
POL=[('privacy','Privacy'),('cookies','Cookies &amp; storage'),('terms','Terms'),('disclaimer','Disclaimer'),('contact','Contact')]
def head(title,desc,path,r,og='https://dexmlabs.app/assets/og-image.png',ogalt='Deus Ex Machina Labs. God from the lab.'):
  url='https://dexmlabs.app/'+path
  return f'''<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0a0b09">
<meta property="og:type" content="website"><meta property="og:site_name" content="Deus Ex Machina Labs">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{og}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{ogalt}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title}"><meta name="twitter:description" content="{desc}"><meta name="twitter:image" content="{og}">
<link rel="icon" href="{r}assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="{r}assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="{r}assets/apple-touch-icon.png">
<link rel="stylesheet" href="{r}assets/site.css">
<script src="{r}assets/storage-note.js" data-cookies="{r}cookies/" defer></script>
</head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap"><a class="brand" href="{r or './'}">{MARK}<span>DEXM LABS</span></a><nav aria-label="Main"><a href="{r or './'}">HOME</a><a href="{r}#games">GAMES</a><a href="{r}#makes">MAKES</a></nav></div></header>
<div class="stripe" aria-hidden="true"></div>
'''
def foot(r):
  links=''.join(f'<a href="{r}{p}/">{n}</a>' for p,n in POL)
  return f'''<footer class="foot"><div class="wrap"><nav aria-label="Policies">{links}</nav><div><p><a href="mailto:{EMAIL}">{EMAIL}</a></p><p>&copy; 2026 Deus Ex Machina Labs</p></div></div></footer>
{CFWA}
</body></html>
'''
def doc(slug,title,label,desc,body,updated='7 October 2026'):
  r='../'
  html=head(f'{title} / Deus Ex Machina Labs',desc,slug+'/',r)+f'''<main id="main" class="doc"><div class="wrap"><article>
<p class="label acid">{label}</p>
<h1>{title}</h1>
<p class="updated">Last updated: {updated}</p>
{body}
</article></div></main>
'''+foot(r)
  (S/slug).mkdir(exist_ok=True);(S/slug/'index.html').write_text(html)


# ---------- homepage ----------
MAKES=[(CHI,'Lorenz chi wheel','3D print of a simplified SZ42 chi wheel, for showing how Lorenz works.','Cults3D'),
 (EFHW,'EFHW toroid box','3D print for FT240 and FT140 cores.','Cults3D'),
 (DRILL,'RF panel drill guide','3D print for SO-239, N and BNC holes.','Cults3D'),
 (MAT,'Band plan desk mat','UK ham bands, 160m to 70cm.','Fourthwall')]
LORENZ_LINE='A daily cipher puzzle on the Lorenz SZ42 cipher machine that Bletchley Park called Tunny. Find the settings in the key book, set twelve wheels and decode the tape.'
home=head('Deus Ex Machina Labs / God from the lab','Small free browser games and makes from a home lab in the UK: Skywave, a daily ham radio propagation puzzle, Lorenz, a daily puzzle on the cipher machine Bletchley Park called Tunny, and 3D print designs for the radio bench.','','').replace('</head>','<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","@id":"https://dexmlabs.app/#site","url":"https://dexmlabs.app/","name":"Deus Ex Machina Labs","alternateName":"DEXM LABS","inLanguage":"en-GB"}</script>\n</head>',1)+f'''<main id="main">
<section class="hero"><div class="wrap hero-grid">
<div class="plate">
<div class="plate-head"><span class="label acid"><span class="dot blink" aria-hidden="true"></span> ONLINE</span><span class="label">EST. 2026</span></div>
<h1><span>Deus Ex</span><span>Machina</span><span>Labs</span></h1>
<p class="tagline">God from the lab.</p>
<p class="lead">Small free games that run in your browser, and things I design for the radio bench and the 3D printer. I build them in my home lab, one at a time, and put them here when they work.</p>
<div class="meta"><div><strong>2</strong><span class="label">GAMES LIVE</span></div><div><strong>{len(MAKES)}</strong><span class="label">MAKES</span></div><div><strong>0</strong><span class="label">ACCOUNTS NEEDED</span></div></div>
</div>
<div class="side">
<div class="plate"><div class="plate-head"><span class="label">GAMES LIVE</span></div><div class="bignum" aria-hidden="true">2</div></div>
<div class="warn"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 38 36H2Z" fill="none" stroke="#d6ff00" stroke-width="3" stroke-linejoin="miter"/><rect x="18.4" y="14" width="3.2" height="12" fill="#d6ff00"/><rect x="18.4" y="29" width="3.2" height="3.2" fill="#d6ff00"/></svg><p><strong>Work in progress</strong>Things here change. If something breaks, <a href="contact/">tell me</a>.</p></div>
</div>
</div></section>

<section class="block" id="games" aria-labelledby="games-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">TEST CHAMBERS</p><h2 id="games-h">Games</h2></div><p class="label">PLAYS IN THE BROWSER / FREE</p></div>
<div class="grid">
<article class="card">
<div class="plate-head"><span class="label acid status"><span class="dot" aria-hidden="true"></span>LIVE</span><span class="label">HF RADIO</span></div>
<a class="thumb" href="skywave/" tabindex="-1" aria-hidden="true"><img src="assets/skywave-thumb.webp" width="480" height="300" alt="" loading="lazy" decoding="async"></a>
<div class="card-body"><h3>Skywave</h3><p>A daily ham radio puzzle. Read the sun, pick the band and bounce your signal off the ionosphere to reach ten stations before the day runs out.</p>
<a class="btn" href="skywave/">Play Skywave</a></div>
</article>
<article class="card">
<div class="plate-head"><span class="label acid status"><span class="dot" aria-hidden="true"></span>LIVE</span><span class="label">CIPHER</span></div>
<a class="thumb" href="lorenz/" tabindex="-1" aria-hidden="true"><img src="assets/lorenz-thumb.webp" width="480" height="300" alt="" loading="lazy" decoding="async"></a>
<div class="card-body"><h3>Lorenz</h3><p>{LORENZ_LINE}</p>
<a class="btn" href="lorenz/">Play Lorenz</a></div>
</article>
<article class="card sealed">
<div class="plate-head"><span class="label status"><span class="dot off" aria-hidden="true"></span>IN DEVELOPMENT</span></div>
<div class="thumb" aria-hidden="true"><span>SEALED</span></div>
<div class="card-body"><h3>Next game</h3><p>In development. Nothing to see yet.</p></div>
</article>
</div>
</div></section>

<section class="block" id="makes" aria-labelledby="makes-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">WORKBENCH</p><h2 id="makes-h">Makes</h2></div><p class="label">LINKS OPEN OTHER SITES</p></div>
<p class="sec-lead">Printable models and bench gear I've designed. The files and the mat are sold on Cults3D and Fourthwall.</p>
<div class="support">
'''+''.join(f'<a href="{u}" rel="noopener"><span><b>{n}</b><small>{d}</small></span></a>\n' for u,n,d,_ in MAKES)+f'''</div>
</div></section>

<section class="block" id="support" aria-labelledby="support-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">SUPPLY ROOM</p><h2 id="support-h">Support the lab</h2></div><p class="label">LINK OPENS ANOTHER SITE</p></div>
<div class="support">
<a href="{BMC}" rel="noopener"><span><b>Buy me a coffee</b><small>Keeps the bench light on.</small></span></a>
</div>
</div></section>
</main>
'''+foot('')
(S/'index.html').write_text(home)

# ---------- policies ----------
GH='<a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub\'s privacy statement</a>'
JD='<a href="https://www.jsdelivr.com/terms/privacy-policy">jsDelivr\'s privacy policy</a>'
CF='<a href="https://www.cloudflare.com/privacypolicy/">Cloudflare\'s privacy policy</a>'
ICO='<a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>'
ML=f'<a href="mailto:{EMAIL}">{EMAIL}</a>'
doc('privacy','Privacy notice','PRIVACY','How dexmlabs.app handles personal data. Short version: no accounts, no ads, no cookies, and only cookieless visit counts from Cloudflare Web Analytics.',f'''
<h2>Who I am</h2>
<p>Deus Ex Machina Labs is the trading name of Arthur Jones, an individual based in the UK. I run dexmlabs.app and I am the controller of any personal data handled through it under the UK GDPR and the Data Protection Act 2018. You can reach me at {ML}.</p>
<h2>The short version</h2>
<p>There are no accounts, no sign-up and no ads, and no cookies are set. I count visits with Cloudflare Web Analytics, which gives me totals, not a record of you. Nothing you do in the games is sent to me.</p>
<h2>What stays in your browser</h2>
<p>Skywave and Lorenz save your progress, settings, best scores and streak in your browser's localStorage, so you can pick up where you left off. The site also remembers that you closed the storage notice. This data stays on your device and is never sent to me. See <a href="../cookies/">cookies and storage</a> for the details and how to clear it.</p>
<h2>Hosting: GitHub Pages</h2>
<p>The site is hosted on GitHub Pages, run by GitHub, Inc. When your browser asks for a page, GitHub receives your IP address and standard request details (such as browser type and the page requested), and may log them for security and to keep the service running. I don't get access to those logs. See {GH}.</p>
<h2>Visit counts: Cloudflare Web Analytics</h2>
<p>I use Cloudflare Web Analytics to see how many people visit and which pages they read. When a page loads, a small script from Cloudflare sends it the page address, the site you came from, basic browser details and how long the page took to load. It sets no cookies, doesn't use local storage and doesn't fingerprint your device, so it can't follow you between visits or across sites.</p>
<p>All I see are totals: page views, referring sites, country and browser or device type. Cloudflare, Inc. handles the request data, including your IP address, as my processor. The lawful basis is legitimate interests: knowing which pages get used so I can improve them. If your browser or an ad blocker stops the script, the site works the same. See {CF}.</p>
<h2>three.js from jsDelivr</h2>
<p>Skywave and Lorenz load the three.js 3D library from the jsDelivr public CDN (cdn.jsdelivr.net). Your browser connects to it directly, so the CDN provider sees your IP address and request details in the normal way, as any website you load files from would. See {JD}.</p>
<h2>If you email me</h2>
<p>If you write to {ML}, I use your email address and message only to reply to you, and I delete them once they're no longer needed for that. The lawful basis is legitimate interests: answering the message you sent.</p>
<h2>Links to other sites</h2>
<p>Support and makes links go to Buy Me a Coffee, Fourthwall and Cults3D. These links only open when you click them, and once you're there their own privacy policies apply.</p>
<h2>Transfers outside the UK</h2>
<p>GitHub, jsDelivr and Cloudflare may process request data outside the UK, including in the United States, under their own safeguards.</p>
<h2>Your rights</h2>
<p>You have the right to ask for access to, correction of or deletion of your personal data, and to object to or restrict how it's used. As I hold almost nothing, the main case is email. Write to {ML}. If you're unhappy with how I've handled your data, you can complain to the Information Commissioner's Office at {ICO}.</p>
<h2>Changes</h2>
<p>If the site starts handling data in a new way, I'll update this notice and the cookies page first.</p>
''',updated='9 October 2026')
doc('cookies','Cookies &amp; storage','COOKIES AND STORAGE','dexmlabs.app sets no cookies. Skywave and Lorenz keep progress and settings in your browser\'s localStorage. Here is what is stored and how to clear it.',f'''
<h2>No cookies</h2>
<p>No cookies are set on dexmlabs.app, by me or anyone else. There are no ad or tracking cookies. The visit counter, Cloudflare Web Analytics, works without cookies or browser storage.</p>
<h2>What is stored in your browser</h2>
<p>The site uses your browser's localStorage. It stays on your device and isn't sent to me.</p>
<table><thead><tr><th>Key</th><th>What it does</th><th>How long</th></tr></thead><tbody>
<tr><td><code>skywave:settings</code></td><td>Graphics, units, sound and motion settings</td><td>Until you clear it</td></tr>
<tr><td><code>skywave:round:&lt;date&gt;</code></td><td>Your progress in a daily round</td><td>The last 7 days are kept</td></tr>
<tr><td><code>skywave:stats</code></td><td>Best scores and streak</td><td>Until you clear it</td></tr>
<tr><td><code>skywave:tutorial</code></td><td>Whether you've seen the tutorial</td><td>Until you clear it</td></tr>
<tr><td><code>lorenz:settings</code></td><td>Lorenz motion and 3D view settings</td><td>Until you clear it</td></tr>
<tr><td><code>lorenz:round:&lt;date&gt;</code></td><td>Your progress in a daily Lorenz round</td><td>The last 7 days are kept</td></tr>
<tr><td><code>lorenz:stats</code></td><td>Lorenz best score and streak</td><td>Until you clear it</td></tr>
<tr><td><code>lorenz:difficulty</code></td><td>Whether you play Lorenz in normal or hard mode</td><td>Until you clear it</td></tr>
<tr><td><code>lorenz:hard:round:&lt;date&gt;</code></td><td>Your progress in a daily Lorenz hard mode round</td><td>The last 7 days are kept</td></tr>
<tr><td><code>lorenz:hard:stats</code></td><td>Lorenz hard mode best score and streak</td><td>Until you clear it</td></tr>
<tr><td><code>dexm:storage-note-dismissed</code></td><td>Hides the storage notice once you close it</td><td>Until you clear it</td></tr>
</tbody></table>
<h2>Why there's no consent banner</h2>
<p>Under the Privacy and Electronic Communications Regulations (PECR), storage that is strictly necessary to give you a service you've asked for doesn't need consent. Saving your game and settings is part of the game you chose to play, so I just tell you about it here instead of asking. Cloudflare Web Analytics sets no cookies and stores nothing on your device, so it doesn't need a banner either.</p>
<h2>How to clear it</h2>
<p>In your browser's settings, look for site data (often under Privacy, or "Cookies and site data"), find dexmlabs.app and delete it. This resets your Skywave and Lorenz progress, streaks and settings. Private or incognito windows clear it when you close them.</p>
<h2>Third parties</h2>
<p>GitHub Pages (hosting), jsDelivr (which serves three.js) and Cloudflare (which counts visits) see your IP address when your browser fetches files from them or sends them data. See the <a href="../privacy/">privacy notice</a>. Sites you visit through the support and makes links set their own cookies under their own policies.</p>
''',updated='9 October 2026')
doc('terms','Terms of use','TERMS','Terms for using dexmlabs.app and its games.',f'''
<h2>The deal</h2>
<p>dexmlabs.app is run by Arthur Jones, trading as Deus Ex Machina Labs. The games here are free for personal, non-commercial use. By using the site you agree to these terms.</p>
<h2>As is</h2>
<p>Everything is provided as it is, with no warranty of any kind. Games may change, break or be taken down at any time. See the <a href="../disclaimer/">disclaimer</a>.</p>
<h2>Liability</h2>
<p>As far as the law allows, I'm not liable for any loss or damage from using the site or relying on anything on it. Nothing here limits liability that can't legally be limited, such as for death or personal injury caused by negligence, or fraud.</p>
<h2>Fair use</h2>
<p>Don't try to break, overload or misuse the site.</p>
<h2>Ownership</h2>
<p>The content and code on this site are &copy; 2026 Deus Ex Machina Labs (Arthur Jones). All rights reserved, unless credited otherwise. Third-party material keeps its own licence. Skywave and Lorenz use <a href="https://threejs.org/">three.js</a> under the MIT licence. Skywave uses NASA Blue Marble imagery under NASA's media guidelines; NASA does not endorse it. Full credits are on the <a href="../skywave/about.html">Skywave about page</a> and the <a href="../lorenz/help.html#sources">Lorenz guide</a>.</p>
<h2>Other sites</h2>
<p>Links to Buy Me a Coffee, Fourthwall and Cults3D go to sites I don't control. Their terms apply there.</p>
<h2>Law</h2>
<p>These terms are governed by the law of England and Wales, and its courts have jurisdiction.</p>
<p>Questions: {ML}.</p>
''',updated='9 October 2026')
doc('disclaimer','Disclaimer','DISCLAIMER','Skywave and Lorenz are games. Skywave is not a propagation prediction tool, and the Lorenz messages are made up.',f'''
<h2>Skywave is a game</h2>
<p>Skywave's radio propagation model is deliberately simplified to make a fair, playable puzzle. It is not a prediction or planning tool. Don't use it to plan real contacts, emergency communications or anything that matters. For real conditions, use VOACAP or live propagation data.</p>
<p>All stations and callsigns in the game are fictional. Any match with a real station is a coincidence.</p>
<h2>Lorenz is a game</h2>
<p>Lorenz follows how the Lorenz SZ42 cipher machine worked, but the wheel patterns and messages are made up for the game. Nothing in it is a real intercept.</p>
<h2>No warranty</h2>
<p>Everything on this site is provided as is, with no warranty that it is accurate, complete or available. See the <a href="../terms/">terms</a>.</p>
<h2>Makes</h2>
<p>The desk mat and 3D print designs are sold through Fourthwall and Cults3D. Check that any build suits your own equipment and power levels before you use it.</p>
''',updated='9 October 2026')
doc('contact','Contact','CONTACT','How to contact Deus Ex Machina Labs.',f'''
<p>Bug reports, ideas and questions are all welcome. Email is the only way in for now.</p>
<p class="mail"><a href="mailto:{EMAIL}">{EMAIL}</a></p>
<p>It's a one-person lab, so replies can take a few days. See the <a href="../privacy/">privacy notice</a> for how I handle your email.</p>
''')

# ---------- 404 ----------
(S/'404.html').write_text(head('Not found / Deus Ex Machina Labs','Page not found.','404.html','/').replace('<link rel="canonical" href="https://dexmlabs.app/404.html">','<meta name="robots" content="noindex">')+'''<main id="main" class="doc"><div class="wrap"><article>
<p class="label acid">ERROR 404 / CHAMBER NOT FOUND</p>
<h1>Nothing in this chamber.</h1>
<p>The page you asked for isn't here. It may have moved, or it never existed.</p>
<p><a class="btn" id="home" href="/">Back to the lab</a></p>
</article></div></main>
<script>(function(){var b=location.pathname.indexOf('/dexmlabs/')===0?'/dexmlabs/':'/';document.querySelectorAll('a[href^="/"],link[href^="/"],script[src^="/"]').forEach(function(e){var a=e.hasAttribute('src')?'src':'href';var v=e.getAttribute(a);if(v.indexOf('//')!==0)e.setAttribute(a,b+v.slice(1));});})();</script>
'''+foot('/'))
# ---------- moved pages ----------
# The tax calculators and spreadsheet templates live on https://e13ctr0n1c.github.io/ now.
# Each old URL keeps a bare redirect page: no branding, noindex, not in the sitemap.
NEW='https://e13ctr0n1c.github.io/'
MOVED_TOOLS=['cis-refund-estimator','cis-deduction-calculator','probate-iht-calculator',
 'late-payment-interest-calculator','gift-iht-taper-checker','vat-threshold-checker']
MOVED_TEMPLATES=['cis-subcontractor-tracker','cis-contractor-tracker','cis-mileage-lite','cis-bundle',
 'probate-tracker','gifts-iht-tracker','freelancer-late-payment-tracker','sales-dashboard-vat-watch']
def redirect(to):
  return f'''<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Moved</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="{to}">
<meta http-equiv="refresh" content="0; url={to}">
<script>location.replace("{to}"+location.search+location.hash);</script>
</head><body>
<p>This page has moved to <a href="{to}">{to}</a>.</p>
</body></html>
'''
MOVED=['tools/']+[f'tools/{s}/' for s in MOVED_TOOLS]+['templates/']+[f'templates/{s}/' for s in MOVED_TEMPLATES]
for sec in ('tools','templates'):
  if (S/sec).exists(): shutil.rmtree(S/sec)
for u in MOVED:
  (S/u).mkdir(parents=True,exist_ok=True); (S/u/'index.html').write_text(redirect(NEW+u))
for old in ['assets/templates','assets/tool-chrome.css']+[f'assets/tool-{s}.webp' for s in MOVED_TOOLS]:
  p=S/old
  if p.is_dir(): shutil.rmtree(p)
  elif p.exists(): p.unlink()

# ---------- sitemap, robots.txt, llms.txt (every public page) ----------
GAME_PAGES=[('skywave/','Skywave','A daily HF propagation puzzle on a 3D globe. Work ten made up stations in one UTC day. Free, no account, no cookies.'),
 ('skywave/help.html','How to play Skywave','The rules of the daily Skywave puzzle.'),
 ('skywave/about.html','Who made Skywave','Who made Skywave and why.'),
 ('skywave/log.html',"What's changed in Skywave",'The Skywave change log.'),
 ('lorenz/','Lorenz','A daily puzzle on the Lorenz SZ42 cipher machine that Bletchley Park called Tunny. Set the twelve wheels and read the intercept. Free, no account, no cookies.'),
 ('lorenz/help.html','How to play Lorenz','The rules of the daily Lorenz puzzle.'),
 ('lorenz/about.html','Why I built Lorenz','Why I built Lorenz.'),
 ('lorenz/log.html',"What's changed in Lorenz",'The Lorenz change log.')]
POL_DESC={'privacy':'What data the site keeps and why.','cookies':'Cookies and local storage used on the site.','terms':'Terms of use.','disclaimer':'What the games are and are not.','contact':'How to get in touch.'}
urls=['']+[u for u,_,_ in GAME_PAGES]+[f'{p}/' for p,_ in POL]
(S/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>https://dexmlabs.app/{u}</loc><lastmod>2026-10-09</lastmod></url>\n' for u in urls)+'</urlset>\n')
print('sitemap',len(urls))
(S/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: https://dexmlabs.app/sitemap.xml\n')
A='https://dexmlabs.app/'
L=['# Deus Ex Machina Labs','','> Small free browser games and makes from a home lab in the UK: Skywave, a daily ham radio propagation puzzle, Lorenz, a daily cipher machine puzzle, and 3D print designs for the radio bench.','',
 '## Home','',f'- [Deus Ex Machina Labs]({A}): Homepage with the games and the makes.','',
 '## Games','']+[f'- [{n}]({A}{u}): {d}' for u,n,d in GAME_PAGES]+['',
 '## Makes','']+[f'- [{n}]({u}): {d} On {w}.' for u,n,d,w in MAKES]+[f'- [Buy me a coffee]({BMC}): Support the lab.','',
 '## Policies','']+[f'- [{n.replace("&amp;","and")}]({A}{p}/): {POL_DESC[p]}' for p,n in POL]
(S/'llms.txt').write_text('\n'.join(L)+'\n')
(S/f'{INDEXNOW_KEY}.txt').write_text(INDEXNOW_KEY)
print('ok')

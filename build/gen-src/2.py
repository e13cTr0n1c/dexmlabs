<p>Under the Privacy and Electronic Communications Regulations (PECR), storage that is strictly necessary to give you a service you've asked for doesn't need consent. Saving your game and settings is part of the game you chose to play, so I just tell you about it here instead of asking. Cloudflare Web Analytics sets no cookies and stores nothing on your device, so it doesn't need a banner either.</p>
<h2>How to clear it</h2>
<p>In your browser's settings, look for site data (often under Privacy, or "Cookies and site data"), find dexmlabs.app and delete it. This resets game progress, streaks, settings, points and best scores, including Vector, Orbit and FORGE records. Private or incognito windows clear it when you close them.</p>
<h2>Third parties</h2>
<p>GitHub Pages (hosting), jsDelivr (which serves three.js and matter.js) and Cloudflare (which counts visits) see your IP address when your browser fetches files from them or sends them data. See the <a href="../privacy/">privacy notice</a>. Sites you visit through the support and makes links set their own cookies under their own policies.</p>
''',updated='9 October 2026')
doc('terms','Terms of use','TERMS','Terms for using dexmlabs.app and its games.',f'''
<h2>The deal</h2>
<p>dexmlabs.app is run by Arthur Jones, trading as DEXM Labs. The games here are free for personal, non-commercial use. By using the site you agree to these terms.</p>
<h2>As is</h2>
<p>Everything is provided as it is, with no warranty of any kind. Games may change, break or be taken down at any time. See the <a href="../disclaimer/">disclaimer</a>.</p>
<h2>Liability</h2>
<p>As far as the law allows, I'm not liable for any loss or damage from using the site or relying on anything on it. Nothing here limits liability that can't legally be limited, such as for death or personal injury caused by negligence, or fraud.</p>
<h2>Fair use</h2>
<p>Don't try to break, overload or misuse the site.</p>
<h2>Ownership</h2>
<p>The content and code on this site are &copy; 2026 DEXM Labs (Arthur Jones). All rights reserved, unless credited otherwise. Third-party material keeps its own licence. Skywave and Lorenz use <a href="https://threejs.org/">three.js</a> under the MIT licence. FORGE loads <a href="https://github.com/liabru/matter-js">matter.js</a> from jsDelivr under the MIT licence. Skywave uses NASA Blue Marble imagery under NASA's media guidelines; NASA does not endorse it. Full credits are on the <a href="../skywave/about.html">Skywave about page</a> and the <a href="../lorenz/help.html#sources">Lorenz guide</a>.</p>
<h2>Other sites</h2>
<p>Links to Buy Me a Coffee, Fourthwall and Cults3D go to sites I don't control. Their terms apply there.</p>
<h2>Law</h2>
<p>These terms are governed by the law of England and Wales, and its courts have jurisdiction.</p>
<p>Questions: {ML}.</p>
''',updated='9 October 2026')
doc('disclaimer','Disclaimer','DISCLAIMER','Skywave, Lorenz, Tolerance, Vector, Orbit and FORGE are games, not tools for real-world prediction, navigation, training or design.',f'''
<h2>Skywave is a game</h2>
<p>Skywave's radio propagation model is deliberately simplified to make a fair, playable puzzle. It is not a prediction or planning tool. Don't use it to plan real contacts, emergency communications or anything that matters. For real conditions, use VOACAP or live propagation data.</p>
<p>All stations and callsigns in the game are fictional. Any match with a real station is a coincidence.</p>
<h2>Lorenz is a game</h2>
<p>Lorenz follows how the Lorenz SZ40/42 cipher machine worked, but the wheel patterns and messages are made up for the game. Nothing in it is a real intercept.</p>
<h2>Vector and Orbit are games</h2>
<p>Vector uses fictional airspace, accelerated aircraft and simplified separation rules. It is not an air traffic control training or navigation tool. Orbit uses a two-dimensional, two-body gravity model with accelerated time and simplified propulsion. It is not suitable for real navigation or mission planning.</p>
<p>Orbit adapts the NASA Blue Marble day texture already used by Skywave. NASA does not endorse the game.</p>
<h2>Tolerance is a game</h2>
<p>Tolerance uses ideal textbook mechanisms: no friction, no slip, no losses. Real machines need real margins. Don't use it to size or check anything that will carry a load. I'm not an engineer by profession.</p>
<h2>FORGE is a game</h2>
<p>FORGE is a side-view textbook model: slopes, friction, projectiles, levers and the rest, with the awkward bits of a real workshop left out. The numbers are there to teach the rule, not to size a real part.</p>
<h2>No warranty</h2>
<p>Everything on this site is provided as is, with no warranty that it is accurate, complete or available. See the <a href="../terms/">terms</a>.</p>
<h2>Makes</h2>
<p>The desk mat and 3D print designs are sold through Fourthwall and Cults3D. Check that any build suits your own equipment and power levels before you use it.</p>
''',updated='9 October 2026')
doc('contact','Contact','CONTACT','How to contact DEXM Labs.',f'''
<p>Bug reports, ideas and questions are all welcome. Email is the only way in for now.</p>
<p class="mail"><a href="mailto:{EMAIL}">{EMAIL}</a></p>
<p>It's a one-person lab, so replies can take a few days. See the <a href="../privacy/">privacy notice</a> for how I handle your email.</p>
''')

# ---------- points ----------
PTS={'vector':100,'orbit':100,'tolerance':100,'skywave':100,'lorenz':100,'hard':250,'real':400,'reply':100,'practice':20,'per_day':3,'welcome':150}
doc('points','How points work','POINTS','Points on dexmlabs.app: you earn them by finishing the daily games and spend them on hints. They stay in your browser.',f'''
<p>Points are shared by every game on the site. You earn them by playing and spend them on hints. They live in this browser, so there's no account and nothing to buy.</p>
<div class="points-now" data-points-ledger><p>Your points show here when JavaScript is on.</p></div>
<h2>Earning</h2>
<table><thead><tr><th>What</th><th>Points</th></tr></thead><tbody>
<tr><td>Finish today's Skywave round with at least one contact</td><td>{PTS['skywave']}</td></tr>
<tr><td>Decode today's Lorenz</td><td>{PTS['lorenz']}</td></tr>
<tr><td>Solve today's Tolerance</td><td>{PTS['tolerance']}</td></tr>
<tr><td>Read today's Lorenz in hard mode</td><td>{PTS['hard']}</td></tr>
<tr><td>Read today's Lorenz in realistic mode</td><td>{PTS['real']}</td></tr>
<tr><td>Send the hard or realistic mode reply back</td><td>{PTS['reply']}</td></tr>
<tr><td>Finish a practice round in Skywave or Lorenz</td><td>{PTS['practice']}, up to {PTS['per_day']} a day in each game</td></tr>
<tr><td>Complete the five-minute daily Vector shift with at least five aircraft cleared</td><td>{PTS['vector']}</td></tr>
<tr><td>Complete the five-minute daily Orbit shift with at least three satellites deployed</td><td>{PTS['orbit']}</td></tr>
<tr><td>Clear five aircraft in one endless Vector run, or deploy three satellites in one endless Orbit run</td><td>{PTS['practice']}, up to {PTS['per_day']} qualifying runs a day per game</td></tr>
<tr><td>Finish a FORGE contract</td><td>No site points. Stars stay in the game.</td></tr>
<tr><td>Your first visit</td><td>{PTS['welcome']} to start with</td></tr>
</tbody></table>
<p>Vector and Orbit sandbox modes do not award points. FORGE keeps its own stars in this browser and does not pay site points. Vector and Orbit daily seeds and point limits use UTC days. You can replay a daily shift, but its points are awarded only once.</p>
<p>Each daily round pays once. If you'd already finished today's round before points arrived, you get them the next time you open that game.</p>
<h2>Spending</h2>
<table><thead><tr><th>Hint</th><th>Points</th></tr></thead><tbody>
<tr><td>Skywave: MUF or D loss, for one station</td><td>10</td></tr>
<tr><td>Skywave: band scope, for one station</td><td>20</td></tr>
<tr><td>Lorenz: check a wheel</td><td>20</td></tr>
<tr><td>Lorenz: read the smudge</td><td>50</td></tr>
<tr><td>Lorenz hard mode: reveal the QEP</td><td>40</td></tr>
<tr><td>Lorenz hard mode: reveal a character</td><td>10</td></tr>
</tbody></table>
<p>Each hint button shows its price. If you don't have enough, the button says so and stays off until you've earned more. Hints don't take anything off your game score any more, so the score is just how you played. Wrong answers still cost score, as before.</p>
<h2>Keeping it fair</h2>
<p>Your points are a short list of what you earned and spent, with a check on each line. If the list gets edited, I keep the lines that still check out and drop the rest. If nothing checks out, you start again with {PTS['welcome']}. Only the last 200 lines are kept, and older ones are added up into a starting total.</p>
<h2>Clearing them</h2>
<p>Points are stored under <code>dexm:points</code> in your browser's localStorage. Clearing the site data for dexmlabs.app resets them. See <a href="../cookies/">cookies and storage</a>.</p>
''',updated='9 October 2026')

# ---------- 404 ----------
(S/'404.html').write_text(head('Not found / DEXM Labs','Page not found.','404.html','/').replace('<link rel="canonical" href="https://dexmlabs.app/404.html">','<meta name="robots" content="noindex">')+'''<main id="main" class="doc"><div class="wrap"><article>
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

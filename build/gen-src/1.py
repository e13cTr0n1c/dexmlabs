'''+signup('home')+f'''
</div></section>

<section class="block" id="makes" aria-labelledby="makes-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">WORKBENCH</p><h2 id="makes-h">Makes</h2></div><p class="label">LINKS OPEN OTHER SITES</p></div>
<p class="sec-lead">Printable models and bench gear I've designed. The files and the mat are sold on Cults3D and Fourthwall.</p>
<article class="card make-hero" id="make-featured">
<div class="plate-head"><span class="label acid status" style="border:2px solid var(--acid);padding:3px 8px;letter-spacing:.16em">FIRST SALE</span><span class="label">RADIO AND RADAR</span></div>
<div class="card-body"><h3>{MAKES[0][1]}</h3><p>{MAKES[0][2]}</p><a class="btn" href="{MAKES[0][0]}" rel="noopener">See it on {MAKES[0][3]}</a></div>
</article>
<div class="support">
'''+''.join(f'<a href="{u}" rel="noopener"><span><b>{n}</b><small>{d}</small></span></a>\n' for u,n,d,_ in MAKES[1:])+f'''</div>
<p class="mk-more"><a class="btn" href="makes/">See all {len(__import__('makes_data').MODELS)} 3D models</a></p>
</div></section>

<section class="block" id="hire" aria-labelledby="hire-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">FOR HIRE</p><h2 id="hire-h">Hire me</h2></div><p class="label">CV AVAILABLE ON REQUEST</p></div>
<p class="sec-lead">I build software from first idea to live release: full stack React, C#, Python and SQL, APIs, automation and AI integrations, Power Platform and Dynamics 365, websites and custom web apps, and 3D models for printing. Everything on this site is my own work.</p>
<p class="hire-cta"><a class="btn" href="hire/">See what I can do</a><a class="btn ghost" href="mailto:{HIRE_EMAIL}?subject=Work%20enquiry">Email me</a></p>
</div></section>

<section class="block" id="support" aria-labelledby="support-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">SUPPLY ROOM</p><h2 id="support-h">Support the lab</h2></div><p class="label">LINK OPENS ANOTHER SITE</p></div>
<div class="support">
<a href="{BMC}" rel="noopener"><span><b>Buy me a coffee</b><small>Keeps the bench light on.</small></span></a>
</div>
</div></section>
</main>
'''+foot('')
(S/'index.html').write_text(home.replace('</body>','<script src="assets/reveal.js" defer></script>\n</body>',1))
# ---------- hire me ----------
HIRE_SKILLS=[('Full stack development','React, C#, Python, SQL and JavaScript. Front ends, back ends and the database between them.'),
 ('APIs and automation','REST APIs, system integrations, scheduled jobs and the scripts that save people hours.'),
 ('AI integrations','Practical AI features wired into real products and business processes.'),
 ('Power Platform and Dynamics 365','Power Apps, Power Automate and Power BI, with Dataverse and Dynamics 365 behind them.'),
 ('Websites and web apps','Fast, accessible sites and custom web apps, built, tested and hosted.'),
 ('3D design for printing','Functional models designed to print cleanly first time, from enclosures to bench tools.')]
HIRE_WORK=[('booster-landing-game/','Booster','A 3D rocket landing game with throttle, gimbal, grid fins, wind and a moving deck.'),
 ('enigma-machine/','Enigma','A faithful Enigma I simulator with rotor stepping, rings, plugboard and a daily codebreaking puzzle.'),
 ('skywave/','Skywave','A daily radio propagation puzzle on a 3D globe, driven by a model of the ionosphere.'),
 ('missions/mmx/','MMX mission replay','A time slider through a Mars moon sample return mission, with real planet orbits.'),
 ('https://e13ctr0n1c.github.io/','Plain Sums','UK tax and money calculators: CIS refunds, probate IHT, gift taper, late payment interest and the VAT threshold.'),
 ('makes/','3D models',f'{len(MK_MODELS)} printable models designed by me and sold on Cults3D.')]
def _href(u,r): return u if u.startswith('http') else r+u
hire=head('Hire me / Arthur Jones / DEXM Labs','Hire Arthur Jones for software development: full stack React, C#, Python, SQL, APIs, automation, AI integrations, Power Platform, Dynamics 365, websites and 3D design for printing.','hire/','../')+f'''<main id="main" class="hire">
<section class="block" aria-labelledby="hire-h"><div class="wrap">
<p class="label acid">FOR HIRE</p>
<h1 id="hire-h" class="hire-h">I build software that works.</h1>
<p class="sec-lead hire-lead">I'm Arthur Jones, a software developer. I take ideas from first sketch to live release, and I test what I ship. Every game and tool on this site is my own work, so you can try it before you get in touch.</p>
<p class="hire-cta"><a class="btn" href="mailto:{HIRE_EMAIL}?subject=Work%20enquiry">Email me</a></p>
</div></section>
<section class="block" aria-labelledby="hire-skills-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">WHAT I DO</p><h2 id="hire-skills-h">Skills</h2></div></div>
<div class="support hire-grid">
'''+''.join(f'<div class="hire-item"><b>{n}</b><small>{d}</small></div>\n' for n,d in HIRE_SKILLS)+f'''</div>
</div></section>
<section class="block" aria-labelledby="hire-work-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">REAL WORK</p><h2 id="hire-work-h">Examples</h2></div><p class="label">ALL LIVE, TRY THEM</p></div>
<div class="support hire-grid">
'''+''.join(f'<a href="{_href(u,"../")}"{" rel=\"noopener\"" if u.startswith("http") else ""}><span><b>{n}</b><small>{d}</small></span></a>\n' for u,n,d in HIRE_WORK)+f'''</div>
</div></section>
<section class="block" aria-labelledby="hire-contact-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">CONTACT</p><h2 id="hire-contact-h">Let's talk</h2></div></div>
<p class="sec-lead">CV available on request. Tell me what you need and I'll come back to you.</p>
<p class="hire-cta"><a class="btn" href="mailto:{HIRE_EMAIL}?subject=Work%20enquiry">Email {HIRE_EMAIL}</a></p>
</div></section>
</main>
'''+foot('../')
(S/'hire').mkdir(exist_ok=True);(S/'hire'/'index.html').write_text(hire.replace('</body>','<script src="../assets/reveal.js" defer></script>\n</body>',1))
# the same block on the game title screens
import re as _re
_F='<footer class="site-footer"'
for game,before in (('skywave','<details class="dexm-more signed-wrap">'),('lorenz','<p class="disclaimer">'),('tolerance',_F),('vector','<footer class="foot">'),('orbit','<footer class="foot">'),('enigma-machine',_F),('chernobyl-reactor-simulator',_F),('apollo-lunar-landing-game',_F)):
  f=S/game/'index.html'; t=f.read_text()
  t=_re.sub(r'<section class="dexm-signup" data-signup.*?</form></section>','',t,flags=_re.S)
  assert before in t, game
  if SIGNUP_LIVE: t=t.replace("form-action 'none'","form-action https://buttondown.com")
  f.write_text(t.replace(before,signup(game)+before,1))

# ---------- policies ----------
GH='<a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub\'s privacy statement</a>'
JD='<a href="https://www.jsdelivr.com/terms/privacy-policy">jsDelivr\'s privacy policy</a>'
CF='<a href="https://www.cloudflare.com/privacypolicy/">Cloudflare\'s privacy policy</a>'
ICO='<a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>'
ML=f'<a href="mailto:{EMAIL}">{EMAIL}</a>'
doc('privacy','Privacy notice','PRIVACY','How dexmlabs.app handles personal data. Short version: no accounts, no ads, no cookies, and only cookieless visit counts from Cloudflare Web Analytics.',f'''
<h2>Who I am</h2>
<p>DEXM Labs is the trading name of Arthur Jones, an individual based in the UK. I run dexmlabs.app and I am the controller of any personal data handled through it under the UK GDPR and the Data Protection Act 2018. You can reach me at {ML}.</p>
<h2>The short version</h2>
<p>There are no accounts and no ads, and no cookies are set. The only sign-up is an optional email for when a new game comes out. I count visits with Cloudflare Web Analytics, which gives me totals, not a record of you. Nothing you do in the games is sent to me.</p>
<h2>What stays in your browser</h2>
<p>Skywave, Lorenz and Tolerance save your progress, settings, best scores and streak in your browser's localStorage, so you can pick up where you left off. Your <a href="../points/">points</a> are kept there too, and so is light or dark mode if you pick one. The site also remembers that you closed the storage notice. This data stays on your device and is never sent to me. See <a href="../cookies/">cookies and storage</a> for the details and how to clear it.</p>
<p>Vector and Orbit store completed-run best scores, the selected mode and sound settings in your browser. They do not save unfinished runs. GRID stores the city you are running, and whether its sound is on. No game requires an account.</p>
<h2>Hosting: GitHub Pages</h2>
<p>The site is hosted on GitHub Pages, run by GitHub, Inc. When your browser asks for a page, GitHub receives your IP address and standard request details (such as browser type and the page requested), and may log them for security and to keep the service running. I don't get access to those logs. See {GH}.</p>
<h2>Visit counts: Cloudflare Web Analytics</h2>
<p>I use Cloudflare Web Analytics to see how many people visit and which pages they read. When a page loads, a small script from Cloudflare sends it the page address, the site you came from, basic browser details and how long the page took to load. It sets no cookies, doesn't use local storage and doesn't fingerprint your device, so it can't follow you between visits or across sites.</p>
<p>All I see are totals: page views, referring sites, country and browser or device type. Cloudflare, Inc. handles the request data, including your IP address, as my processor. The lawful basis is legitimate interests: knowing which pages get used so I can improve them. If your browser or an ad blocker stops the script, the site works the same. See {CF}.</p>
<h2>three.js from jsDelivr</h2>
<p>Skywave and Lorenz load the three.js 3D library from the jsDelivr public CDN (cdn.jsdelivr.net). Your browser connects to it directly, so the CDN provider sees your IP address and request details in the normal way, as any website you load files from would. See {JD}.</p>
<h2>New game emails: Buttondown</h2>
<p>If you ask to be emailed when a new game comes out, the form sends your email address straight to Buttondown, which runs the list for me as my processor. You confirm by email before anything else is sent, and every email has an unsubscribe link. I use the list only to send one email when a new game is out, and the address is never sold or shared for anything else. The lawful basis is your consent, which you can withdraw at any time by unsubscribing or by writing to {ML}. Buttondown's own <a href="https://buttondown.com/legal/privacy">privacy policy</a> covers how it holds the list. The form is a plain web form: no Buttondown script runs on this site.</p>
<h2>If you email me</h2>
<p>If you write to {ML}, I use your email address and message only to reply to you, and I delete them once they're no longer needed for that. The lawful basis is legitimate interests: answering the message you sent.</p>
<h2>Links to other sites</h2>
<p>Support and makes links go to Buy Me a Coffee, Fourthwall and Cults3D. These links only open when you click them, and once you're there their own privacy policies apply.</p>
<h2>Transfers outside the UK</h2>
<p>GitHub, jsDelivr, Cloudflare and Buttondown may process request data outside the UK, including in the United States, under their own safeguards.</p>
<h2>Your rights</h2>
<p>You have the right to ask for access to, correction of or deletion of your personal data, and to object to or restrict how it's used. As I hold almost nothing, the main cases are email and the new game list. Write to {ML}. If you're unhappy with how I've handled your data, you can complain to the Information Commissioner's Office at {ICO}.</p>
<h2>Changes</h2>
<p>If the site starts handling data in a new way, I'll update this notice and the cookies page first.</p>
''',updated='13 October 2026')
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
<tr><td><code>lorenz:difficulty</code></td><td>Whether you play Lorenz in normal, hard or realistic mode</td><td>Until you clear it</td></tr>
<tr><td><code>lorenz:hard:round:&lt;date&gt;</code></td><td>Your progress in a daily Lorenz hard mode round, with your pins</td><td>The last 7 days are kept</td></tr>
<tr><td><code>lorenz:hard:stats</code></td><td>Lorenz hard mode best score and streak</td><td>Until you clear it</td></tr>
<tr><td><code>lorenz:real:round:&lt;date&gt;</code></td><td>Your progress in a daily Lorenz realistic mode round, with your pins</td><td>The last 7 days are kept</td></tr>
<tr><td><code>lorenz:real:stats</code></td><td>Lorenz realistic mode best score and streak</td><td>Until you clear it</td></tr>
<tr><td><code>lorenz:panels</code></td><td>Which Lorenz panels you've hidden</td><td>Until you clear it</td></tr>
<tr><td><code>tolerance:round:&lt;date&gt;</code></td><td>Your guesses in a daily Tolerance puzzle</td><td>Until you clear it</td></tr>
<tr><td><code>tolerance:stats</code></td><td>Your Tolerance results and streak</td><td>Until you clear it</td></tr>
<tr><td><code>vector:settings</code></td><td>Your selected game mode and sound setting</td><td>Until you clear it</td></tr>
<tr><td><code>vector:stats</code></td><td>Completed-run best scores by mode, the most recent daily score and the number of completed runs</td><td>Until you clear it</td></tr>
<tr><td><code>orbit:settings</code></td><td>Your selected game mode and sound setting</td><td>Until you clear it</td></tr>
<tr><td><code>orbit:stats</code></td><td>Completed-run best scores by mode, the most recent daily score and the number of completed runs</td><td>Until you clear it</td></tr>
<tr><td><code>forge-shift-v1</code></td><td>FORGE stars, daily result, sound and proving-ground records</td><td>Until you clear it</td></tr>
<tr><td><code>grid:power:v2</code></td><td>The city you are running in GRID: seed, day, policy and trust</td><td>Until you clear it</td></tr>
<tr><td><code>grid:sound</code></td><td>Whether GRID sound is on</td><td>Until you clear it</td></tr>
<tr><td><code>enigma:round:&lt;date&gt;</code></td><td>Your tries at a daily Enigma intercept</td><td>Until you clear it</td></tr>
<tr><td><code>enigma:stats</code></td><td>Your Enigma results and streak</td><td>Until you clear it</td></tr>
<tr><td><code>rbmk:stats</code></td><td>Your RBMK results and streak</td><td>Until you clear it</td></tr>
<tr><td><code>apollo:stats</code></td><td>Your Apollo results and streak</td><td>Until you clear it</td></tr>
<tr><td><code>booster:stats</code></td><td>Your Booster best scores and landings by level, the last level you picked and whether sound is on</td><td>Until you clear it</td></tr>
<tr><td><code>docking:stats</code></td><td>Your Docking Run best scores and dockings by run, the last run you picked, and whether sound, kill rotation and the keys overlay are on</td><td>Until you clear it</td></tr>
<tr><td><code>glider:stats</code></td><td>Your Glider Thermals best scores and grades by flight, the last flight you picked, the time speed, and whether sound and the autotrim are on</td><td>Until you clear it</td></tr>
<tr><td><code>glider:daily</code></td><td>Your one scored Glider Thermals Daily Drop result for each day</td><td>Until you clear it</td></tr>
<tr><td><code>sling:stats</code></td><td>Your Sling Load best scores and grades by job, the last job you picked, and whether sound, hover hold and the swing damper are on</td><td>Until you clear it</td></tr>
<tr><td><code>sling:daily</code></td><td>Your one scored Sling Load Daily Drop result for each day</td><td>Until you clear it</td></tr>
<tr><td><code>roadster:stats</code></td><td>Your Roadster Thrusters best scores and grades by level, the last level you picked, and whether sound is on</td><td>Until you clear it</td></tr>
<tr><td><code>roadster:daily</code></td><td>Your one scored Roadster Thrusters Daily Drop result for each day</td><td>Until you clear it</td></tr>
<tr><td><code>rocket:stats</code></td><td>Your Rocket Launch results and streak</td><td>Until you clear it</td></tr>
<tr><td><code>puzzle:stats</code></td><td>Your Today's Puzzle points, streak and history of solved days</td><td>Until you clear it</td></tr>
<tr><td><code>puzzle:nick</code></td><td>The nickname you chose for the Today's Puzzle top 10, if you sent a time</td><td>Until you clear it</td></tr>
<tr><td><code>dexm:storage-note-dismissed</code></td><td>Hides the storage notice once you close it</td><td>Until you clear it</td></tr>
<tr><td><code>dexm:points</code></td><td>Your points: what you earned and spent, shared by every game</td><td>Until you clear it, last 200 lines</td></tr>
<tr><td><code>dexm:theme</code></td><td>Light or dark mode, if you picked one</td><td>Until you clear it</td></tr>
</tbody></table>
<h2>Why there's no consent banner</h2>

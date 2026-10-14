<a class="thumb" href="orbit/" tabindex="-1" aria-hidden="true"><img src="assets/orbit-thumb.webp" width="480" height="300" alt="" loading="lazy" decoding="async"></a>
<div class="card-body"><h3>Orbit</h3><p>Fly an orbital tug. Shape your trajectory, match target orbits and deploy satellites before your propellant runs out.</p><a class="btn" href="orbit/">Play Orbit</a></div>
</article>
<article class="card">
<div class="plate-head"><span class="label acid status"><span class="dot" aria-hidden="true"></span>LIVE</span><span class="label">CIPHER</span></div>
<a class="thumb" href="enigma-machine/" tabindex="-1" aria-hidden="true"><img src="assets/enigma-thumb.webp" width="480" height="300" alt="" loading="lazy" decoding="async"></a>
<div class="card-body"><h3>Enigma</h3><p>A working Enigma I simulator and a daily intercept. Set the rotors from the key sheet, find the smudged cable and read the message.</p><a class="btn" href="enigma-machine/">Play Enigma</a></div>
</article>
<article class="card">
<div class="plate-head"><span class="label acid status"><span class="dot" aria-hidden="true"></span>LIVE</span><span class="label">REACTOR</span></div>
<a class="thumb" href="chernobyl-reactor-simulator/" tabindex="-1" aria-hidden="true"><img src="assets/chernobyl-reactor-simulator-thumb.webp" width="480" height="300" alt="" loading="lazy" decoding="async"></a>
<div class="card-body"><h3>RBMK</h3><p>A simplified RBMK-1000 control desk. Hold power through a xenon pit or run the rundown test, and know when to press AZ-5.</p><a class="btn" href="chernobyl-reactor-simulator/">Play RBMK</a></div>
</article>
<article class="card">
<div class="plate-head"><span class="label acid status"><span class="dot" aria-hidden="true"></span>LIVE</span><span class="label">SPACE</span></div>
<a class="thumb" href="apollo-lunar-landing-game/" tabindex="-1" aria-hidden="true"><img src="assets/apollo-lunar-landing-game-thumb.webp" width="480" height="300" alt="" loading="lazy" decoding="async"></a>
<div class="card-body"><h3>Apollo</h3><p>Fly the last 200 metres of an Apollo landing with real lunar gravity and a fuel gauge that won't wait. A new site every day.</p><a class="btn" href="apollo-lunar-landing-game/">Play Apollo</a></div>
</article>
<article class="card sealed">
<div class="plate-head"><span class="label status"><span class="dot off" aria-hidden="true"></span>IN DEVELOPMENT</span></div>
<div class="thumb" aria-hidden="true"><span>SEALED</span></div>
<div class="card-body"><h3>Next game</h3><p>In development. Nothing to see yet.</p></div>
</article>
</div>
'''+signup('home')+f'''
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
# the same block on the game title screens
import re as _re
_F='<footer class="site-footer"'
for game,before in (('skywave','<div class="signed-note">'),('lorenz','<p class="disclaimer">'),('tolerance',_F),('vector','<footer class="foot">'),('orbit','<footer class="foot">'),('enigma-machine',_F),('chernobyl-reactor-simulator',_F),('apollo-lunar-landing-game',_F)):
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
<tr><td><code>rocket:stats</code></td><td>Your Rocket Launch results and streak</td><td>Until you clear it</td></tr>
<tr><td><code>dexm:storage-note-dismissed</code></td><td>Hides the storage notice once you close it</td><td>Until you clear it</td></tr>
<tr><td><code>dexm:points</code></td><td>Your points: what you earned and spent, shared by every game</td><td>Until you clear it, last 200 lines</td></tr>
<tr><td><code>dexm:theme</code></td><td>Light or dark mode, if you picked one</td><td>Until you clear it</td></tr>
</tbody></table>
<h2>Why there's no consent banner</h2>

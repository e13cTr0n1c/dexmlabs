 ('skywave/about.html','Who made Skywave','Who made Skywave and why.'),
 ('skywave/log.html',"What's changed in Skywave",'The Skywave change log.'),
 ('lorenz/','Lorenz','A daily puzzle on the Lorenz SZ40/42 cipher machine that Bletchley Park called Tunny. Set the twelve wheels and read the intercept. Free, no account, no cookies.'),
 ('lorenz/help.html','How to play Lorenz','The rules of the daily Lorenz puzzle.'),
 ('lorenz/about.html','Why I built Lorenz','Why I built Lorenz.'),
 ('lorenz/log.html',"What's changed in Lorenz",'The Lorenz change log.'),
 ('enigma-machine/','Enigma Machine Simulator','A historically accurate Enigma I simulator with a daily code breaking puzzle. Rotors I to V, reflector B, rings, plugboard and double stepping. Free, no account, no cookies.'),
 ('chernobyl-reactor-simulator/','Chernobyl Reactor Simulator','A simplified RBMK-1000 reactor simulator game with daily scenarios: control rods, graphite tips, the void coefficient, xenon and AZ-5. A game, not a training tool.'),
 ('apollo-lunar-landing-game/','Apollo Lunar Landing Game','Land the Apollo lunar module with real lunar gravity, engine thrust and fuel use. A new landing site every day. Free, no account, no cookies.'),
 ('booster-landing-game/','Booster Landing Game','A fan-made game. Land a slim DEXM Labs booster on a drone ship at sea with throttle, engine gimbal, thrusters, grid fins and landing legs, through wind gusts and a pitching, heaving deck, or catch a giant stainless steel booster with the launch tower arms. Seven levels, a five second replay. Independent and fan-made. Free, no account, no cookies.'),
 ('docking-run-game/','Docking Run','A space station docking game. Fly a crew capsule onto a docking port with 6DOF rigid body physics, RCS thrusters at real positions, Clohessy-Wiltshire orbital mechanics, time warp and real docking limits. Five runs from a 30 m final approach to a 2 km rendezvous and a night pass. Free, no account, no cookies.'),
 ('glider-thermals-game/','Glider Thermals Game','Fly a sailplane with a realistic glide polar, stall and speed to fly. Thermals under cumulus with circling birds, ridge lift and mountain wave, a vario that beeps as you climb, cross country routes with turnpoints and landing out in a field. Seven flights, autotrim assist, and a Daily Drop task.'),
 ('helicopter-sling-load-game/','Helicopter Sling Load Game','Fly a heavy lift helicopter with a load on a rope, with real pendulum physics, downwash and wind. Seven jobs from a first crate to a rooftop AC unit, a forest log, a fire bucket and a bridge span, graded S to D, plus a Daily Drop. Free, no account.'),
 ('callsign-catch/','Callsign Catch','A free plane spotting card game. Type the callsign, registration or hex code of a plane on a flight tracker or overhead; if the live adsb.lol feed shows it flying right now you catch a card for its aircraft type, logged with time, altitude and speed. Rarity by type, sets, a daily wanted plane, export and import. No account.'),
 ('tolerance/','Tolerance','A daily engineering puzzle. One mechanism, six guesses at the output, each one higher, lower or within 5%. Free, no account, no cookies.'),
 ('flight-path/','Flight Path','A daily path puzzle on a radar grid. Draw one path through every square, past the numbered beacons in order. One answer per puzzle, a new one every UTC day, plus endless practice. Free, no account, no cookies.'),
 ('missions/mmx/','MMX mission explained: interactive simulation','Mission Replays: a time slider through JAXA\'s MMX mission to Phobos, from the H3 launch on 20 October 2026 to the planned sample return in 2031, with a heliocentric view and a Mars and Phobos close view.')]
POL_DESC={'privacy':'What data the site keeps and why.','cookies':'Cookies and local storage used on the site.','terms':'Terms of use.','disclaimer':'What the games are and are not.','contact':'How to get in touch.'}
# Pages added since 13 October, with their own lastmod, listed first.
NEW_PAGES=[('callsign-catch/','2026-10-21'),('flight-path/','2026-10-21'),('flying-over-me/','2026-10-21'),('hire/','2026-10-20'),('missions/mmx/','2026-10-20'),('puzzle/','2026-10-20'),('makes/','2026-10-20'),('repurposed/','2026-10-20'),('booster-landing-game/','2026-10-20'),('glider-thermals-game/','2026-10-20'),('helicopter-sling-load-game/','2026-10-20'),('docking-run-game/','2026-10-20'),('vector/','2026-10-20'),('orbit/','2026-10-20')]
# Game pages that changed in the 20 October tidy, so their lastmod moves on.
TIDIED={'skywave/','lorenz/','enigma-machine/','chernobyl-reactor-simulator/','apollo-lunar-landing-game/','tolerance/'}
NEW_URLS={u for u,_ in NEW_PAGES}
urls=[('','2026-10-13')]+NEW_PAGES+[(u,'2026-10-20' if u in TIDIED else '2026-10-13') for u,_,_ in GAME_PAGES if u not in NEW_URLS]+[(u,'2026-10-13') for u in ['points/']+[f'{p}/' for p,_ in POL]]
(S/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>https://dexmlabs.app/{u}</loc><lastmod>{d}</lastmod></url>\n' for u,d in urls)+'</urlset>\n')
print('sitemap',len(urls))
(S/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: https://dexmlabs.app/sitemap.xml\n')
A='https://dexmlabs.app/'
L=['# DEXM Labs','','> Small free browser games and makes from a home lab in the UK: Skywave, a daily ham radio propagation puzzle, Lorenz, a daily cipher machine puzzle, Tolerance, a daily engineering puzzle, Flight Path, a daily path puzzle on a radar grid, Vector air traffic control, Orbit satellite missions, an Enigma machine simulator, a Chernobyl RBMK reactor simulator, an Apollo lunar landing game, and 3D print designs for the radio bench.','',
 '## Home','',f'- [DEXM Labs]({A}): Homepage with the games and the makes.','',
 '## Games','']+[f'- [{n}]({A}{u}): {d}' for u,n,d in GAME_PAGES]+['',
 '## Makes','',f'- [3D models]({A}makes/): Gallery of my {len(MK_MODELS)} printable 3D models, grouped by collection, each linking to its Cults3D page.']+[f'- [{m[2]}]({MK_C}{m[4]}): {m[6]} On Cults3D.' for m in MK_MODELS if MK_C+m[4] not in {u for u,*_ in MAKES}]+[f'- [{n}]({u}): {d} On {w}.' for u,n,d,w in MAKES]+[f'- [Buy me a coffee]({BMC}): Support the lab.','',
 '## Daily puzzle','',f'- [Today\'s Puzzle]({A}puzzle/): One small puzzle a day, by UK date: a rotor cipher, a Morse riddle, an aviation question or a physics and space question. Points and streak stay in your browser.','',
 '## Hire me','',f'- [Hire me]({A}hire/): Software development for hire: full stack React, C#, Python, SQL, APIs, automation, AI integrations, Power Platform, Dynamics 365, websites and 3D design for printing.','',
 '## Points','',f'- [How points work]({A}points/): Points are earned in the daily games and spent on hints. They stay in your browser.','',
 '## Policies','']+[f'- [{n.replace("&amp;","and")}]({A}{p}/): {POL_DESC[p]}' for p,n in POL]
(S/'llms.txt').write_text('\n'.join(L)+'\n')
(S/f'{INDEXNOW_KEY}.txt').write_text(INDEXNOW_KEY)
print('ok')

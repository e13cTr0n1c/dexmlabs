 ('skywave/about.html','Who made Skywave','Who made Skywave and why.'),
 ('skywave/log.html',"What's changed in Skywave",'The Skywave change log.'),
 ('lorenz/','Lorenz','A daily puzzle on the Lorenz SZ40/42 cipher machine that Bletchley Park called Tunny. Set the twelve wheels and read the intercept. Free, no account, no cookies.'),
 ('lorenz/help.html','How to play Lorenz','The rules of the daily Lorenz puzzle.'),
 ('lorenz/about.html','Why I built Lorenz','Why I built Lorenz.'),
 ('lorenz/log.html',"What's changed in Lorenz",'The Lorenz change log.'),
 ('enigma-machine/','Enigma Machine Simulator','A historically accurate Enigma I simulator with a daily code breaking puzzle. Rotors I to V, reflector B, rings, plugboard and double stepping. Free, no account, no cookies.'),
 ('chernobyl-reactor-simulator/','Chernobyl Reactor Simulator','A simplified RBMK-1000 reactor simulator game with daily scenarios: control rods, graphite tips, the void coefficient, xenon and AZ-5. A game, not a training tool.'),
 ('apollo-lunar-landing-game/','Apollo Lunar Landing Game','Land the Apollo lunar module with real lunar gravity, engine thrust and fuel use. A new landing site every day. Free, no account, no cookies.'),
 ('mars-base-game/','Mars Base Game','Keep a crew of four alive on Mars for 30 sols: oxygen, water, food and solar power.'),
 ('tolerance/','Tolerance','A daily engineering puzzle. One mechanism, six guesses at the output, each one higher, lower or within 5%. Free, no account, no cookies.')]
POL_DESC={'privacy':'What data the site keeps and why.','cookies':'Cookies and local storage used on the site.','terms':'Terms of use.','disclaimer':'What the games are and are not.','contact':'How to get in touch.'}
urls=['']+[u for u,_,_ in GAME_PAGES]+['points/']+[f'{p}/' for p,_ in POL]
(S/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>https://dexmlabs.app/{u}</loc><lastmod>2026-10-13</lastmod></url>\n' for u in urls)+'</urlset>\n')
print('sitemap',len(urls))
(S/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: https://dexmlabs.app/sitemap.xml\n')
A='https://dexmlabs.app/'
L=['# DEXM Labs','','> Small free browser games and makes from a home lab in the UK: Skywave, a daily ham radio propagation puzzle, Lorenz, a daily cipher machine puzzle, Tolerance, a daily engineering puzzle, Vector air traffic control, Orbit satellite missions, an Enigma machine simulator, a Chernobyl RBMK reactor simulator, an Apollo lunar landing game, a Mars base game, and 3D print designs for the radio bench.','',
 '## Home','',f'- [DEXM Labs]({A}): Homepage with the games and the makes.','',
 '## Games','']+[f'- [{n}]({A}{u}): {d}' for u,n,d in GAME_PAGES]+['',
 '## Makes','']+[f'- [{n}]({u}): {d} On {w}.' for u,n,d,w in MAKES]+[f'- [Buy me a coffee]({BMC}): Support the lab.','',
 '## Points','',f'- [How points work]({A}points/): Points are earned in the daily games and spent on hints. They stay in your browser.','',
 '## Policies','']+[f'- [{n.replace("&amp;","and")}]({A}{p}/): {POL_DESC[p]}' for p,n in POL]
(S/'llms.txt').write_text('\n'.join(L)+'\n')
(S/f'{INDEXNOW_KEY}.txt').write_text(INDEXNOW_KEY)
print('ok')

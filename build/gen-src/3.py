 ('skywave/about.html','Who made Skywave','Who made Skywave and why.'),
 ('skywave/log.html',"What's changed in Skywave",'The Skywave change log.'),
 ('lorenz/','Lorenz','A daily puzzle on the Lorenz SZ40/42 cipher machine that Bletchley Park called Tunny. Set the twelve wheels and read the intercept. Free, no account, no cookies.'),
 ('lorenz/help.html','How to play Lorenz','The rules of the daily Lorenz puzzle.'),
 ('lorenz/about.html','Why I built Lorenz','Why I built Lorenz.'),
 ('lorenz/log.html',"What's changed in Lorenz",'The Lorenz change log.'),
 ('tolerance/','Tolerance','A daily engineering puzzle. One mechanism, six guesses at the output, each one higher, lower or within 5%. Free, no account, no cookies.')]
GAME_PAGES += [('forge/','FORGE','Twelve short physics contracts, a daily spring shot and a proving-ground bench. Stars stay in the browser. Free, no account, no cookies.'), ('vector/','Vector','Endless air traffic control, a seeded daily shift and a sandbox. Route arrivals, avoid conflicts and earn local best scores.'), ('orbit/','Orbit','Fuel-limited orbital manoeuvres and procedural satellite deployments. Endless, daily and sandbox modes.')]
POL_DESC={'privacy':'What data the site keeps and why.','cookies':'Cookies and local storage used on the site.','terms':'Terms of use.','disclaimer':'What the games are and are not.','contact':'How to get in touch.'}
urls=['']+[u for u,_,_ in GAME_PAGES]+['points/']+[f'{p}/' for p,_ in POL]
(S/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>https://dexmlabs.app/{u}</loc><lastmod>2026-10-13</lastmod></url>\n' for u in urls)+'</urlset>\n')
print('sitemap',len(urls))
(S/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: https://dexmlabs.app/sitemap.xml\n')
A='https://dexmlabs.app/'
L=['# DEXM Labs','','> Small free browser games and makes from a home lab in the UK: Skywave, a daily ham radio propagation puzzle, Lorenz, a daily cipher machine puzzle, Tolerance, a daily engineering puzzle, Vector air traffic control, Orbit satellite missions, FORGE physics experiments, and 3D print designs for the radio bench.','',
 '## Home','',f'- [DEXM Labs]({A}): Homepage with the games and the makes.','',
 '## Games','']+[f'- [{n}]({A}{u}): {d}' for u,n,d in GAME_PAGES]+['',
 '## Makes','']+[f'- [{n}]({u}): {d} On {w}.' for u,n,d,w in MAKES]+[f'- [Buy me a coffee]({BMC}): Support the lab.','',
 '## Points','',f'- [How points work]({A}points/): Points are earned in the daily games and spent on hints. They stay in your browser.','',
 '## Policies','']+[f'- [{n.replace("&amp;","and")}]({A}{p}/): {POL_DESC[p]}' for p,n in POL]
(S/'llms.txt').write_text('\n'.join(L)+'\n')
(S/f'{INDEXNOW_KEY}.txt').write_text(INDEXNOW_KEY)
print('ok')

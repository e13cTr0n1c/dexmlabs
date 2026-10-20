
# ---------- /makes/ gallery (models and captions in build/makes_data.py, renders from build/makes_images.py) ----------
from makes_data import MODELS as MK_MODELS, COLLECTIONS as MK_COLL, FEATURED as MK_FEAT, C as MK_C
from html import escape as _esc
def mk_badges(m):
  key,_,_,coll,_,free,*_=m
  b=[]
  if key=='radar-scope': b.append('<span class="label acid status mk-badge">FIRST SALE</span>')
  if free: b.append('<span class="label acid status mk-badge">FREE</span>')
  return ''.join(b) or '<span class="label acid status"><span class="dot" aria-hidden="true"></span>LIVE</span>'
def mk_card(m,feat=False):
  key,_,name,coll,path,free,cap,*_=m
  url=MK_C+path
  img=(f'<img src="../assets/makes/{key}-1200.webp" srcset="../assets/makes/{key}-600.webp 600w, ../assets/makes/{key}-1200.webp 1200w" sizes="(min-width:1040px) 760px, 100vw" width="1200" height="900"' if feat else
       f'<img src="../assets/makes/{key}-600.webp" srcset="../assets/makes/{key}-600.webp 600w, ../assets/makes/{key}-1200.webp 1200w" sizes="(min-width:1040px) 380px, (min-width:760px) 50vw, 100vw" width="600" height="450"')
  img+=f' alt="Render of my {_esc(name)} 3D print model" loading="lazy" decoding="async">'
  detail=f'<img class="mk-detail" src="../assets/makes/{key}-detail-600.webp" width="600" height="450" alt="Detail render of the {_esc(name)}" loading="lazy" decoding="async">' if feat else ''
  return f'''<article class="card mk-card{' mk-feat' if feat else ''}" id="m-{key}">
<div class="plate-head">{mk_badges(m)}<span class="label">{coll.upper()}</span></div>
<a class="mk-img" href="{url}" rel="noopener" tabindex="-1" aria-hidden="true">{img}</a>{detail}
<div class="card-body"><h3>{_esc(name)}</h3><p>{_esc(cap)}</p><a class="btn" href="{url}" rel="noopener">See it on Cults3D</a></div>
</article>
'''
_bykey={m[0]:m for m in MK_MODELS}
_feat_html=''.join(mk_card(_bykey[k],True) for k in MK_FEAT)
_sec_html=''
for c in MK_COLL:
  ms=[m for m in MK_MODELS if m[3]==c and m[0] not in MK_FEAT]
  if not ms: continue
  sid='mk-'+c.lower().replace(' ','-')
  _sec_html+=f'''<section class="block mk-sec" id="{sid}" aria-labelledby="{sid}-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">COLLECTION</p><h2 id="{sid}-h">{c}</h2></div><p class="label">{len(ms)} MORE</p></div>
<div class="mk-grid">
'''+''.join(mk_card(m) for m in ms)+'</div>\n</div></section>\n'
MAKES_LD=_json.dumps({"@context":"https://schema.org","@type":"CollectionPage","@id":"https://dexmlabs.app/makes/#page","url":"https://dexmlabs.app/makes/","name":"3D models by DEXM Labs","inLanguage":"en-GB","isPartOf":{"@id":"https://dexmlabs.app/#site"},
 "mainEntity":{"@type":"ItemList","name":"DEXM Labs 3D models","numberOfItems":len(MK_MODELS),"itemListElement":[{"@type":"ListItem","position":i+1,"item":{"@type":"3DModel","name":m[2],"url":MK_C+m[4],"image":f"https://dexmlabs.app/assets/makes/{m[0]}-1200.webp","description":m[6],"isAccessibleForFree":m[5]}} for i,m in enumerate([_bykey[k] for k in MK_FEAT]+[m for m in MK_MODELS if m[0] not in MK_FEAT])]}},separators=(',',':'))
MAKES_DESC=f'{len(MK_MODELS)} printable 3D models I designed: a Saturn V style rocket cutaway, a space shuttle stack, a radar scope console, cipher machines and bench gear. Files on Cults3D.'
makes_page=head('3D models / DEXM Labs',MAKES_DESC,'makes/','../',og='https://dexmlabs.app/assets/makes/moon-rocket-1200.webp',ogalt='Render of my Moon Rocket Cutaway desk model.').replace('</head>','<script type="application/ld+json">'+MAKES_LD+'</script>\n</head>',1)+f'''<main id="main">
<section class="block mk-top" aria-labelledby="mk-h"><div class="wrap">
<div class="sec-head"><div><p class="label acid">WORKBENCH</p><h1 id="mk-h">3D models</h1></div><p class="label">{len(MK_MODELS)} MODELS / LINKS OPEN CULTS3D</p></div>
<p class="sec-lead">Printable models I've designed, from rockets you can see inside to gear for the radio bench. Every picture is a render. The files are on Cults3D.</p>
<div class="mk-feats">
{_feat_html}</div>
</div></section>
{_sec_html}</main>
'''+foot('../')
(S/'makes').mkdir(exist_ok=True); (S/'makes'/'index.html').write_text(makes_page)
print('makes',len(MK_MODELS))

# ---------- /puzzle/ Today's Puzzle (puzzles in build/puzzles.json, format in build/PUZZLES.md; script in assets/puzzle.js) ----------
from makes_data import MODELS as _PZM
PZ_CIPHER_SET=MK_C+[m for m in _PZM if m[0]=='cipher-set'][0][4]
PZ_LIST=_json.loads((S/'build'/'puzzles.json').read_text())
PZ_KEYS={'date','id','type','title','prompt','hint','hash','cipher','rings','start','morse'}
for _p in PZ_LIST:
  assert set(_p)<=PZ_KEYS and _p['type'] in ('cipher','morse','aviation','physics'), _p.get('id')
  assert len(_p['hash'])==64 and all(c in '0123456789abcdef' for c in _p['hash']), _p['id']
assert len({_p['date'] for _p in PZ_LIST})==len(PZ_LIST), 'one puzzle per date'
(S/'puzzle').mkdir(exist_ok=True)
(S/'puzzle'/'puzzles.json').write_text(_json.dumps(sorted(PZ_LIST,key=lambda p:p['date']),separators=(',',':'))+'\n')
PZ_DESC="One small puzzle a day, by UK date: a rotor cipher, a Morse riddle, an aviation question or a physics and space question. Points and streaks stay in your browser."
PZ_LD=_json.dumps({"@context":"https://schema.org","@type":"WebPage","@id":"https://dexmlabs.app/puzzle/#page","url":"https://dexmlabs.app/puzzle/","name":"Today's Puzzle","description":PZ_DESC,"inLanguage":"en-GB","isPartOf":{"@id":"https://dexmlabs.app/#site"},"isAccessibleForFree":True},separators=(',',':'))
puzzle_page=head("Today's Puzzle / DEXM Labs",PZ_DESC,'puzzle/','../').replace('</head>',f'<script src="../assets/puzzle.js" defer></script><script type="application/ld+json">{PZ_LD}</script>\n</head>',1)+f'''<main id="main">
<section class="block" aria-labelledby="pz-h"><div class="wrap pz-page" data-puzzle-page data-src="puzzles.json" data-cipher-set="{PZ_CIPHER_SET}">
<div class="sec-head"><div><p class="label acid" data-pz-kind>DAILY</p><h1 id="pz-h">Today's Puzzle</h1></div><p class="label" data-pz-date></p></div>
<div data-pz-body><p>Loading today's puzzle.</p></div>
<form class="pz-form" data-pz-form autocomplete="off"><label class="dexm-sr" for="pz-answer">Your answer</label><input id="pz-answer" spellcheck="false" placeholder="Your answer" maxlength="60"><button type="submit">Check</button></form>
<p class="pz-msg" data-pz-msg aria-live="polite"></p>
<button type="button" class="pz-ghost" data-pz-hint>Show a hint (costs 10 points)</button><p data-pz-hinttext hidden></p>
<div data-pz-result hidden>
<h2>Solved</h2>
<p data-pz-stats></p>
<pre class="pz-share" data-pz-share></pre>
<p><button type="button" class="pz-ghost" data-pz-copy>Copy my result</button></p>
<p class="pz-upsell" data-pz-upsell hidden>Enjoyed the rotor cipher? I designed a <a href="{PZ_CIPHER_SET}" rel="noopener">Cipher Set</a> you can print: my field cipher machine, the rotor demonstrator and the Lorenz wheel on one plinth.</p>
<form class="pz-nick" data-pz-nickform data-pz-nickrow hidden><label for="pz-nick">Put my time on the top 10 as</label><span class="dexm-signup-row"><input id="pz-nick" maxlength="16" placeholder="Nickname, 3 to 16 letters"><button type="submit">Send my time</button></span><small data-pz-sent aria-live="polite"></small></form>
</div>
<div class="pz-board" data-pz-board hidden><h2>Today</h2><p data-pz-count></p><ol data-pz-top></ol></div>
<h2>How it works</h2>
<p>A new puzzle goes up at midnight UK time. They take turns: a word on my three rotor machine, a riddle in Morse, an aviation question, then one on physics or space. Type your answer and press Check. Capitals and spaces at the ends don't matter.</p>
<p>A first try solve is worth 50 points, then 10 fewer per extra try, down to 10. A hint takes 10 off. Solve on days in a row to build a streak. Your points, streak and history stay in this browser only.</p>
<p>Your answer is checked in your browser against a fingerprint, so the answers are never in the page. If you send your time, only your nickname, the time and that fingerprint go to my counter.</p>
</div></section>
</main>
'''+foot('../')
# The same slim home bar as the hand written game pages (build/homebar.py).
puzzle_page=puzzle_page.replace('</head>','<link rel="stylesheet" href="../assets/homebar.css"></head>',1).replace('<a class="skip" href="#main">Skip to content</a>','<a class="skip" href="#main">Skip to content</a><nav class="dexm-homebar" aria-label="DEXM Labs"><span class="dexm-homebar-game">Today\'s Puzzle</span><a href="https://dexmlabs.app/">dexmlabs.app</a></nav>',1)
(S/'puzzle'/'index.html').write_text(puzzle_page)
print('puzzle',len(PZ_LIST))

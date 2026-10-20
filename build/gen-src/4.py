
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

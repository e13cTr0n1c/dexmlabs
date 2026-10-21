"""Dependency-free audit of the two games and their site integration.
Run from any directory: python games-tests/static_audit.py
Optional source comparison: --baseline path/to/dexmlabs-main.zip
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
from collections import Counter
import argparse, base64, hashlib, re, subprocess, sys, zipfile
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent
results=[]
def check(condition,message):
    if not condition:raise AssertionError(message)
    results.append(message);print('PASS',message)
class Page(HTMLParser):
    def __init__(self,text):
        super().__init__(convert_charrefs=True);self.tags=[];self.inline=[];self.capture=None;self.label_depth=0;self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='label':self.label_depth+=1
        if tag in ['input','select']:a['_wrapped_label']=self.label_depth>0
        self.tags.append((tag,a))
        if tag=='script' and 'src' not in a and a.get('type')!='application/ld+json':self.capture=[]  # JSON-LD is data, the browser never runs it
    def handle_data(self,data):
        if self.capture is not None:self.capture.append(data)
    def handle_endtag(self,tag):
        if tag=='label':self.label_depth=max(0,self.label_depth-1)
        if tag=='script' and self.capture is not None:self.inline.append(''.join(self.capture));self.capture=None

def resolve_file(file,url):
    parsed=urlparse(url)
    if parsed.scheme or parsed.netloc:
        if parsed.netloc!='dexmlabs.app':return None
        target=ROOT/unquote(parsed.path).lstrip('/')
    else:
        if not parsed.path:return None
        target=(ROOT/unquote(parsed.path).lstrip('/')) if parsed.path.startswith('/') else file.parent/unquote(parsed.path)
    target=target.resolve()
    if target.is_dir():target=target/'index.html'
    return target
for game in ['vector','orbit']:
    file=ROOT/game/'index.html';text=file.read_text();page=Page(text)
    ids=[a['id'] for _,a in page.tags if 'id' in a]
    check(not [k for k,n in Counter(ids).items() if n>1],f'{game}: unique HTML IDs')
    urls=[]
    for tag,a in page.tags:
        for key in ['src','href']:
            if key in a:urls.append(a[key])
        if tag=='meta' and (a.get('property','').endswith(':image') or a.get('name')=='twitter:image'):urls.append(a.get('content',''))
    missing=[str(t.relative_to(ROOT)) for u in urls if (t:=resolve_file(file,u)) and not t.is_file()]
    check(not missing,f'{game}: all local links, scripts, styles, images and social preview files resolve'+str(missing))
    csp=next(a['content'] for t,a in page.tags if t=='meta' and a.get('http-equiv')=='Content-Security-Policy')
    allowed=csp.split('script-src ',1)[1].split(';',1)[0]
    hashes=["'sha256-"+base64.b64encode(hashlib.sha256(s.encode()).digest()).decode()+"'" for s in page.inline]
    check(bool(hashes) and all(h in allowed for h in hashes) and "'unsafe-inline'" not in allowed,f'{game}: production CSP authorizes exact theme script hash, not arbitrary inline JavaScript')
    check('object-src \'none\'' in csp and 'base-uri \'self\'' in csp,f'{game}: restrictive object and base URI policy retained')
    check(not any(k.startswith('on') for _,a in page.tags for k in a),f'{game}: no inline event handlers')
    check(all(('aria-label' in a or a.get('_wrapped_label') or ('for="'+a.get('id','__missing__')+'"') in text) for tag,a in page.tags if tag in ['input','select']),f'{game}: form controls have associated labels')
    modules=list((ROOT/game/'js').glob('*.mjs'))+[ROOT/'assets/flight-core.mjs']
    imports=[]
    for module in modules:
        imports += [(module.parent/u).resolve() for u in re.findall(r'from\s+[\'\"]([^\'\"]+)[\'\"]',module.read_text())]
    check(all(p.is_file() and p.is_relative_to(ROOT) for p in imports),f'{game}: all ES module imports are local and resolve')
    check(sum(p.stat().st_size for p in (ROOT/game).rglob('*') if p.is_file())<1_100_000,f'{game}: complete game folder below 1.1 MB including social artwork')
# Callsign Catch: live lookups only to the hosts in its CSP, the theme script hash, local files resolve.
cc=ROOT/'callsign-catch/index.html';ct=cc.read_text();cp=Page(ct)
ccsp=next(a['content'] for t,a in cp.tags if t=='meta' and a.get('http-equiv')=='Content-Security-Policy')
cconnect=ccsp.split('connect-src ',1)[1].split(';',1)[0].split()
check(all(h in cconnect for h in ['https://api.adsb.lol','https://api.airplanes.live']) and "'unsafe-inline'" not in ccsp.split('script-src ',1)[1].split(';',1)[0],'callsign-catch: CSP allows the adsb.lol and airplanes.live API hosts and no inline script')
chashes=["'sha256-"+base64.b64encode(hashlib.sha256(x.encode()).digest()).decode()+"'" for x in cp.inline]
check(bool(chashes) and all(h in ccsp for h in chashes),'callsign-catch: CSP authorizes the exact theme script hash')
ccfg=(ROOT/'callsign-catch/js/config.mjs').read_text();capi=(ROOT/'callsign-catch/js/api.mjs').read_text()
hosts=set(re.findall(r"https://[a-z0-9.-]+",ccfg+capi))
check(hosts<=set(cconnect),'callsign-catch: every API host in the code is in connect-src '+str(hosts))
cmiss=[str(t.relative_to(ROOT)) for _,a in cp.tags for k in ['src','href'] if k in a and (t:=resolve_file(cc,a[k])) and not t.is_file()]
check(not cmiss,'callsign-catch: local links resolve'+str(cmiss))
check('adsb.lol' in ct and 'gumroad' not in ct.lower(),'callsign-catch: credits adsb.lol, no Gumroad')
# What's flying over me?: the CSP lets the page reach exactly the data services its code calls, nothing more.
fom=ROOT/'flying-over-me';fpage=Page((fom/'index.html').read_text())
fcsp=next(a['content'] for t,a in fpage.tags if t=='meta' and a.get('http-equiv')=='Content-Security-Policy')
fconnect=set(fcsp.split('connect-src ',1)[1].split(';',1)[0].split())
flinks={'https://globe.adsb.lol','https://airplanes.live','https://adsb.lol'}  # hosts the code only links to, never fetches
fhosts={'https://'+h for h in re.findall(r'https://([a-z0-9.-]+)/',(fom/'js/main.mjs').read_text())}-flinks
check(fconnect=={"'self'",'https://cloudflareinsights.com'}|fhosts,f'flying-over-me: connect-src lists exactly the API hosts the code fetches {sorted(fhosts)}')
fproxy=re.search(r"export const PROXY_API = '([^']*)'",(fom/'js/main.mjs').read_text()).group(1)
check(not fproxy or 'https://'+urlparse(fproxy).netloc in fconnect,'flying-over-me: the relay host, once set, is allowed in connect-src')
fhash="'sha256-"+base64.b64encode(hashlib.sha256(fpage.inline[0].encode()).digest()).decode()+"'"
check(len(fpage.inline)==1 and fhash in fcsp and "'unsafe-inline'" not in fcsp.split('script-src ',1)[1].split(';',1)[0],'flying-over-me: CSP allows only the theme script by hash')
check((fom/'js/vendor/satellite.js-LICENSE.md').is_file() and 'MIT License' in (fom/'js/vendor/satellite.js-LICENSE.md').read_text(),'flying-over-me: vendored satellite.js ships with its licence')
home=(ROOT/'index.html').read_text();hp=Page(home)
for game in ['vector','orbit']:
    check(f'href="{game}/"' in home and f'assets/{game}-thumb.webp' in home and (ROOT/'assets'/f'{game}-thumb.webp').is_file(),f'homepage: {game} card and screenshot thumbnail present')
    check(game+':settings' in (ROOT/'cookies/index.html').read_text() and game+':stats' in (ROOT/'cookies/index.html').read_text(),f'storage notice: {game} keys documented')
    check(f'{game}: 100' in (ROOT/'assets/points.js').read_text(),f'points: {game} daily reward configured')
    check(f'/{game}/' in (ROOT/'llms.txt').read_text(),f'llms: {game} discovery entry present')
locs=[e.text for e in ET.parse(ROOT/'sitemap.xml').iter() if e.tag.endswith('loc')]
check(len(locs)==20 and all(f'https://dexmlabs.app/{g}/' in locs for g in ['vector','orbit','grid']),'sitemap: vector, orbit and grid included in 20 canonical pages')
# Run the real generator twice-equivalent: output before/after must be identical.
paths=[p for p in ROOT.rglob('*') if p.is_file() and p.suffix in ['.html','.txt','.xml','.css','.js','.mjs']]
before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
subprocess.run([sys.executable,str(ROOT/'build/gen.py')],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
check(all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in before.items()),'site generator is idempotent; rebuilding preserves both game integrations')
parser=argparse.ArgumentParser();parser.add_argument('--baseline');args=parser.parse_args()
if args.baseline:
    changed=[];total=0
    with zipfile.ZipFile(args.baseline) as z:
        for name in z.namelist():
            rel=name.split('/',1)[1] if '/' in name else ''
            if rel.startswith(('skywave/','lorenz/','tolerance/')) and not name.endswith('/'):
                total+=1
                if not (ROOT/rel).exists() or z.read(name)!=(ROOT/rel).read_bytes():changed.append(rel)
    check(not changed,f'baseline: all {total} original Skywave, Lorenz and Tolerance files remain byte-for-byte unchanged'+str(changed))
print(f'\n{len(results)} static integration checks passed.')

"""Offline Chromium fixture: serves the actual ES modules and assets via Playwright.
No external network or analytics. Navigation policies may forbid local URLs, so the
HTML is mounted with set_content and a base URL. CSP is separately statically audited.
A Storage-compatible shim gives the opaque fixture origin persistent test records.
"""
from pathlib import Path
from urllib.parse import urlparse
import mimetypes, json, re
ROOT=Path(__file__).resolve().parent.parent
BASE='http://dexm.test'
def mount(context,game,storage=None,blocked_storage=False):
    page=context.new_page()
    errors=[];missing=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    def local(route):
        path=(ROOT/urlparse(route.request.url).path.lstrip('/')).resolve()
        if not path.is_relative_to(ROOT): return route.fulfill(status=403,body='Forbidden')
        if path.is_dir():path=path/'index.html'
        if not path.is_file():
            missing.append(str(path.relative_to(ROOT)))
            return route.fulfill(status=404,body='Not found')
        mime=mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
        route.fulfill(body=path.read_bytes(),content_type=mime,headers={'Access-Control-Allow-Origin':'*'})
    page.route(BASE+'/**',local)
    page.route('https://**',lambda route:route.fulfill(status=200,content_type='application/javascript',body=''))
    html=(ROOT/game/'index.html').read_text()
    html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
    html=re.sub(r'<script[^>]+src="https://[^>]+></script>','',html)
    if storage is None:storage={'dexm:theme':'dark','dexm:storage-note-dismissed':'1'}
    seed=json.dumps(storage)
    if blocked_storage:
        shim="Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Blocked','SecurityError')}});"
    else:
        shim="""window.__testStore=%s;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return Object.hasOwn(__testStore,k)?__testStore[k]:null},setItem(k,v){__testStore[k]=String(v)},removeItem(k){delete __testStore[k]},clear(){window.__testStore={}}}});"""%seed
    html=html.replace('<head>',f'<head><base href="{BASE}/{game}/"><script>{shim}</script>')
    page.set_content(html,wait_until='load')
    page.wait_for_function("document.querySelector('#mode-description').textContent.length>0")
    page.wait_for_timeout(200)
    return page,errors,missing

def simulation(page,game,body):
    return page.evaluate(f"async () => {{const {{getSimulation}}=await import('{BASE}/{game}/js/main.mjs');const sim=getSimulation();{body}}}")

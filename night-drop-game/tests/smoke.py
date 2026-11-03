"""Playwright smoke test for Night Drop at 390px and 1440px, base and ?xmas=1.
Run from the repo root: python3 night-drop-game/tests/smoke.py"""
import http.server, threading, functools, os, sys
from playwright.sync_api import sync_playwright
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=root))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_port}/night-drop-game/index.html'
fails = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(390, 844), (1440, 900)]:
        for q in ['?xmas=0', '?xmas=1']:
            pg = b.new_page(viewport={'width': w, 'height': h}, has_touch=(w < 500))
            pg.route('**/cloudflareinsights.com/**', lambda r: r.abort())
            errs = []
            pg.on('console', lambda m: m.type == 'error' and 'cloudflareinsights' not in m.text and 'ERR_FAILED' not in m.text and errs.append(m.text))
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(base + q); pg.wait_for_timeout(300)
            pg.click('#play'); pg.wait_for_timeout(400)
            for _ in range(8):
                pg.keyboard.press('Space'); pg.wait_for_timeout(250)
            pg.keyboard.down('ArrowDown'); pg.wait_for_timeout(400); pg.keyboard.up('ArrowDown')
            pg.wait_for_timeout(1500)
            t = int(pg.text_content('#time'))
            festive = pg.evaluate("document.documentElement.classList.contains('festive')")
            overflow = pg.evaluate('document.documentElement.scrollWidth > innerWidth')
            ok = not errs and t < 75 and festive == (q == '?xmas=1') and not overflow and pg.is_hidden('#overlay')
            print(f'{w}px {q}: time={t} festive={festive} overflow={overflow} errors={errs} -> {"PASS" if ok else "FAIL"}')
            if not ok: fails.append((w, q))
            pg.close()
    b.close()
sys.exit(1 if fails else 0)

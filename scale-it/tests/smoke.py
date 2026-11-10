"""Playwright smoke test for Scale It at phone and desktop width.
Run from the repo root: python3 scale-it/tests/smoke.py"""
import http.server, threading, functools, os, sys
from playwright.sync_api import sync_playwright
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=root))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_port}/scale-it/index.html'
fails = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'))
    for w, h in [(390, 844), (1440, 900)]:
        pg = b.new_page(viewport={'width': w, 'height': h}, has_touch=(w < 500))
        pg.route('**/cloudflareinsights.com/**', lambda r: r.abort())
        errs = []
        pg.on('console', lambda m: m.type == 'error' and 'cloudflareinsights' not in m.text and 'ERR_FAILED' not in m.text and errs.append(m.text))
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(base + '?date=2026-11-10')
        pg.wait_for_function('window.ScaleIt && window.ScaleIt.puzzle')
        pg.click('#play')
        pg.wait_for_selector('#round:not([hidden])')
        pg.click('.choice')
        pg.wait_for_timeout(400)
        stage = pg.locator('#stage .sil')
        n = stage.count()
        overflow = pg.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
        verdict = pg.text_content('#verdict') or ''
        ok = not errs and n >= 2 and not overflow and 'points' in verdict and pg.is_visible('#stage')
        print(f'{w}px: silhouettes={n} overflow={overflow} verdict={verdict!r} errors={errs} -> {"PASS" if ok else "FAIL"}')
        if not ok: fails.append(w)
        pg.close()
    b.close()
sys.exit(1 if fails else 0)

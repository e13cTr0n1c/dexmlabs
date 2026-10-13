"""Chromium integration tests using the actual source modules, offline.
Run: python games-tests/browser.py [--chromium /path/to/chromium]
Requires Python Playwright; no Node dependencies. See browser_fixture.py.
Tests deliberately inject model states for long-run/reward edge cases.
"""
from pathlib import Path
import argparse, json, sys
from playwright.sync_api import sync_playwright, expect
from browser_fixture import mount, simulation, BASE
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--chromium');args=parser.parse_args()
results=[]
def ok(name):
    results.append(name);print('PASS',name,flush=True)
def wait(page):page.wait_for_timeout(220)
def clean(page,errors,missing):
    assert not errors,errors
    assert not missing,missing
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),'Horizontal overflow'
def end(page,game,score=500,count=0,daily=False):
    field='cleared' if game=='vector' else 'deployed'
    simulation(page,game,f"sim.score={score};sim.{field}={count};sim.time={300 if daily else 60};sim.over=true;sim.reason={json.dumps('Shift complete' if daily else 'Test run complete')};")
    expect(page.locator('#result-overlay')).to_be_visible()
def radar_point(page,x,y):
    box=page.locator('#scope').bounding_box()
    size=min(box['width']-46,box['height']-40)
    return (box['x']+(box['width']-size)/2+x*size/100,box['y']+(box['height']-size)/2+y*size/100)
def start(page,mode=None):
    if mode:page.locator(f'input[name=mode][value={mode}]').check()
    page.click('#start-run');wait(page)
    expect(page.locator('#lobby')).to_be_hidden()

def common(context,game):
    page,errors,missing=mount(context,game)
    expect(page.locator('#lobby')).to_be_visible();assert page.locator('#pause-run').is_disabled()
    start(page);assert simulation(page,game,'return sim.time;')>0
    ok(f'{game}: native modules, canvas and launch')
    page.keyboard.press('p');expect(page.locator('#pause-overlay')).to_be_visible()
    before=simulation(page,game,'return sim.time;');wait(page)
    assert before==simulation(page,game,'return sim.time;')
    page.click('#resume-run');expect(page.locator('#pause-overlay')).to_be_hidden()
    ok(f'{game}: keyboard pause freezes simulation; explicit resume')
    page.locator('[data-help]').first.click();expect(page.locator('#help-dialog')).to_be_visible()
    assert page.locator('#pause-overlay').is_visible()
    page.locator('#help-dialog [data-close-dialog]').click()
    expect(page.locator('#pause-overlay')).to_be_hidden()
    ok(f'{game}: manual dialog pauses and resumes')
    page.click('#new-run');expect(page.locator('#restart-dialog')).to_be_visible()
    page.locator('#restart-dialog [data-close-dialog]').click();expect(page.locator('#pause-overlay')).to_be_hidden()
    page.click('#new-run');page.click('#confirm-new');expect(page.locator('#lobby')).to_be_visible()
    ok(f'{game}: restart confirmation, cancellation and abandonment')
    start(page);page.evaluate("window.dispatchEvent(new Event('blur'))")
    expect(page.locator('#pause-overlay')).to_be_visible()
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    expect(page.locator('#pause-overlay')).to_be_visible();page.click('#resume-run')
    ok(f'{game}: focus loss pauses; no unsafe automatic resume')
    page.click('#sound-toggle');assert page.locator('#sound-toggle').get_attribute('aria-pressed')=='true'
    assert page.evaluate(f"JSON.parse(localStorage.getItem('{game}:settings')).sound") is True
    page.click('#sound-toggle')
    ok(f'{game}: optional audio setting persists')
    if game=='vector':
        page.locator('#scope').scroll_into_view_if_needed()
        pos=simulation(page,game,'return {x:sim.aircraft[0].x,y:sim.aircraft[0].y};')
        x,y=radar_point(page,pos['x'],pos['y']);tx,ty=radar_point(page,67,70)
        page.mouse.move(x,y);page.mouse.down();page.mouse.move(tx,ty,steps=12);page.mouse.up()
        assert simulation(page,game,'return sim.aircraft[0].route.length;')>1
        page.mouse.click(*radar_point(page,74,76))
        assert simulation(page,game,'return sim.aircraft[0].route.length;')==1
        ok('vector: real pointer-drag route and select/click destination')
        page.fill('#heading-input','310');page.locator('#heading-form button').click()
        assert simulation(page,game,'return sim.aircraft[0].targetHeading;')==310
        page.click('[data-alt="2000"]');page.click('[data-speed="180"]');page.click('#route-gate');page.click('#approach-btn')
        assert simulation(page,game,'const a=sim.aircraft[0];return a.targetAlt===2000&&a.targetSpeed===180&&a.armed&&a.route.length===2;')
        # Start the real approach from the known opening state; only isolate other traffic.
        simulation(page,game,"const a=sim.aircraft[0];a.x=88;a.y=39;a.heading=245;a.alt=3000;a.speed=220;sim.aircraft=[a];sim.nextSpawn=Infinity;for(let i=0;i<2100&&!sim.cleared;i++)sim.step(1/30);return sim.cleared;")
        wait(page);assert simulation(page,game,'return sim.cleared;')==1
        assert simulation(page,game,'return sim.strikes;')==0
        assert page.locator('#metric-cleared').inner_text()=='1'
        ok('vector: heading, altitude, speed, gate and armed approach lead to a safe landing')
    else:
        page.click('[data-warp="3"]');assert simulation(page,game,'return sim.warp;')==3
        page.locator('#scope').focus();fuel=simulation(page,game,'return sim.fuel;')
        page.keyboard.down('w');page.wait_for_timeout(350)
        assert simulation(page,game,"return sim.burn==='prograde'&&sim.warp===1;")
        page.keyboard.up('w');assert simulation(page,game,'return sim.burn;') is None
        assert simulation(page,game,'return sim.fuel;')<fuel
        after=simulation(page,game,'return sim.fuel;');wait(page);assert abs(simulation(page,game,'return sim.fuel;')-after)<1e-8
        ok('orbit: keyboard thrust consumes fuel, overrides warp and stops on release')
        page.click('#pulse-burn');assert abs(simulation(page,game,'return sim.fuel;')-(after-20))<1e-6
        page.locator('#scope').focus();page.keyboard.down('w');wait(page);page.keyboard.press('p');page.keyboard.up('w')
        assert simulation(page,game,'return sim.burn;') is None
        expect(page.locator('#pause-overlay')).to_be_visible();page.click('#resume-run')
        ok('orbit: precise pulse and pause-safe engine cutoff')
        page.locator('#burn-button').scroll_into_view_if_needed()
        box=page.locator('#burn-button').bounding_box()
        page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();wait(page)
        assert simulation(page,game,'return sim.burn;')=='prograde'
        page.dispatch_event('#burn-button','pointercancel',{'pointerId':1,'isPrimary':True,'pointerType':'mouse'})
        assert simulation(page,game,'return sim.burn;') is None
        page.mouse.up();ok('orbit: pointer cancellation cuts thrust even before release')
        simulation(page,game,'sim.setBurn(null);sim.ship={x:sim.target.pe,y:0,vx:0,vy:Math.sqrt(1/sim.target.pe)};sim.fuel=1000;for(let i=0;i<100;i++)sim.step(1/30);')
        wait(page);assert simulation(page,game,'return sim.deployed;')==1
        assert simulation(page,game,'return sim.fuel;')==2500
        assert page.locator('#metric-cleared').inner_text()=='1'
        ok('orbit: matching orbit coasts, deploys, replenishes fuel and issues next contract')
    end(page,game,1234)
    assert page.locator('#result-score').inner_text()=='1,234'
    assert page.locator('#metric-best').inner_text()=='1,234'
    records=page.evaluate(f"JSON.parse(localStorage.getItem('{game}:stats'))")
    assert records['endless']['score']==1234 and records['plays']==1
    page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined})")
    page.click('#share-run');expect(page.locator('#share-text')).to_be_visible()
    assert game.upper() in page.locator('#share-text').input_value()
    page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__copy=t}}})")
    page.click('#share-run');expect(page.locator('#share-run')).to_have_text('Copied')
    assert '1,234' in page.evaluate('window.__copy')
    ok(f'{game}: result, best record and clipboard/fallback sharing')
    store=page.evaluate('window.__testStore')
    clean(page,errors,missing);page.close()
    page,errors,missing=mount(context,game,storage=store)
    assert page.locator('#metric-best').inner_text()=='1,234'
    start(page);assert simulation(page,game,'return sim.time;')<3
    ok(f'{game}: records survive a new page; live runs intentionally do not')
    clean(page,errors,missing);page.close()

def rewards(context,game):
    page,errors,missing=mount(context,game);threshold=5 if game=='vector' else 3;field='cleared' if game=='vector' else 'deployed'
    start(page,'daily');seed=simulation(page,game,'return sim.seed;')
    end(page,game,1500,threshold,True)
    assert page.evaluate('DexmPoints.balance()')==250
    assert '+100 DEXM' in page.locator('#result-detail').inner_text()
    page.click('#play-again');wait(page);assert seed==simulation(page,game,'return sim.seed;')
    end(page,game,1600,threshold,True);assert page.evaluate('DexmPoints.balance()')==250
    ok(f'{game}: daily seeded replay awards once, not once per attempt')
    page.click('#change-mode');start(page,'endless')
    simulation(page,game,f'sim.{field}={threshold};');wait(page)
    assert page.evaluate('DexmPoints.balance()')==270
    wait(page);assert page.evaluate('DexmPoints.balance()')==270
    end(page,game,1700,threshold)
    assert page.evaluate('DexmPoints.balance()')==270
    ok(f'{game}: endless milestone awards exactly once per run')
    page.click('#change-mode');start(page,'sandbox')
    if game=='vector':
        initial=simulation(page,game,'return sim.aircraft.length;')
        page.click('#add-traffic');assert simulation(page,game,'return sim.aircraft.length;')==initial+1
        simulation(page,game,'sim.strike("training");sim.strike("training");sim.strike("training");sim.strike("training");')
        assert not simulation(page,game,'return sim.over;')
    else:
        fuel=simulation(page,game,'return sim.fuel;');page.click('#pulse-burn')
        assert simulation(page,game,'return sim.fuel;')==fuel
        page.click('#reset-orbit');assert not simulation(page,game,'return sim.over;')
    before=page.evaluate(f"localStorage.getItem('{game}:stats')")
    end(page,game,0,threshold,True)
    assert page.evaluate('DexmPoints.balance()')==270
    assert page.evaluate(f"localStorage.getItem('{game}:stats')")==before
    ok(f'{game}: sandbox training controls; no score records or points')
    clean(page,errors,missing);page.close()

def resilience(context,game):
    page,errors,missing=mount(context,game,storage={f'{game}:stats':'bad JSON',f'{game}:settings':'{"mode":"bogus"}','dexm:theme':'dark'})
    assert page.locator('#metric-best').inner_text()=='0';start(page)
    clean(page,errors,missing);page.close();ok(f'{game}: corrupt settings/records recover safely')
    page,errors,missing=mount(context,game,blocked_storage=True)
    expect(page.locator('#storage-warning')).to_be_visible();start(page);end(page,game,123)
    clean(page,errors,missing);page.close();ok(f'{game}: blocked storage does not stop play or results')

def responsive(browser,width,theme):
    mobile=width<761
    context=browser.new_context(viewport={'width':width,'height':844 if mobile else 1000},is_mobile=mobile,has_touch=mobile,color_scheme=theme,reduced_motion='reduce')
    for game in ['vector','orbit']:
        page,errors,missing=mount(context,game,storage={'dexm:theme':theme,'dexm:storage-note-dismissed':'1'})
        assert page.evaluate('document.documentElement.dataset.theme')==theme
        clean(page,errors,missing)
        start(page)
        if mobile:
            expect(page.locator('#mobile-flightbar')).to_be_visible()
            if game=='vector':
                pos=simulation(page,game,'return {x:sim.aircraft[0].x,y:sim.aircraft[0].y};')
                page.touchscreen.tap(*radar_point(page,pos['x'],pos['y']))
                page.touchscreen.tap(*radar_point(page,75,75))
                assert simulation(page,game,'return sim.aircraft[0].route.length;')==1
                ok(f'vector: {width}px native touch contact selection and route command')
                page.click('#mobile-gate');page.select_option('#mobile-alt','2000');page.click('#mobile-speed');page.click('#mobile-arm')
                assert simulation(page,game,'return sim.aircraft[0].targetAlt===2000&&sim.aircraft[0].targetSpeed===180&&sim.aircraft[0].armed;')
            else:
                box=page.locator('[data-mobile-burn="prograde"]').bounding_box()
                page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_timeout(160)
                assert simulation(page,game,'return sim.burn;')=='prograde'
                page.mouse.up();assert simulation(page,game,'return sim.burn;') is None
                page.locator('[data-mobile-burn="retrograde"]').focus();page.keyboard.down('Space');page.wait_for_timeout(100)
                assert simulation(page,game,'return sim.burn;')=='retrograde'
                page.keyboard.up('Space');assert simulation(page,game,'return sim.burn;') is None
                assert '/' in page.locator('#mobile-ap').inner_text()
        else:expect(page.locator('#mobile-flightbar')).to_be_hidden()
        page.locator('[data-help]').first.click();expect(page.locator('#help-dialog')).to_be_visible()
        box=page.locator('#help-dialog').bounding_box();assert box['x']>=0 and box['width']<=width
        page.locator('#help-dialog [data-close-dialog]').click()
        clean(page,errors,missing);page.close()
        ok(f'{game}: {width}px {theme}, reduced motion, responsive controls and dialog bounds')
    context.close()

with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    executable=args.chromium or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
    if executable:launch['executable_path']=executable
    browser=p.chromium.launch(**launch)
    context=browser.new_context(viewport={'width':1440,'height':1000},color_scheme='dark')
    for game in ['vector','orbit']:
        common(context,game);rewards(context,game);resilience(context,game)
    context.close()
    for width,theme in [(320,'dark'),(390,'light'),(768,'dark'),(1440,'light')]:responsive(browser,width,theme)
    browser.close()
print(f'\n{len(results)} browser integration checks passed. No page errors or missing requested local assets.')

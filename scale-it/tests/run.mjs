// Scale It: seeding, scoring and the puzzle bank. Run: node scale-it/tests/run.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ITEMS, DAYS, LAUNCH } from '../js/bank.mjs';
import { ukDate, puzzleFor, puzzleNumber, scoreRound, scoreSlider, shareText, streak, summarise, truthOf, addDays, metricOf } from '../js/logic.mjs';

const day = i => addDays(LAUNCH, i);

test('UK date follows London, including the summer offset', () => {
  assert.equal(ukDate(new Date('2026-07-01T23:30:00Z')), '2026-07-02');
  assert.equal(ukDate(new Date('2026-01-15T00:30:00Z')), '2026-01-15');
  assert.equal(ukDate(new Date('2026-03-29T00:30:00Z')), '2026-03-29');
  assert.equal(puzzleNumber(LAUNCH), 1);
  assert.equal(puzzleNumber('2026-11-10'), 41);
});

test('the same UK date always deals the same five rounds', () => {
  const a = puzzleFor('2026-11-10');
  const b = puzzleFor('2026-11-10');
  assert.equal(a.status, 'ok');
  assert.deepEqual(a.rounds, b.rounds);
  assert.equal(a.rounds.length, 5);
  assert.notDeepEqual(puzzleFor('2026-11-10').rounds, puzzleFor('2026-11-11').rounds);
});

test('the bank is 48 days and every day mixes the round types', () => {
  assert.equal(DAYS.length, 48);
  const types = new Set();
  for (let i = 0; i < DAYS.length; i++) {
    const p = puzzleFor(day(i));
    assert.equal(p.number, i + 1);
    assert.equal(p.rounds.length, 5);
    const kinds = new Set(p.rounds.map(r => r.type));
    assert.ok(kinds.has('bigger') && kinds.has('order') && (kinds.has('slider') || kinds.has('stack')), day(i));
    p.rounds.forEach(r => types.add(r.type));
    const seen = new Set();
    for (const r of p.rounds) {
      const ids = r.type === 'bigger' ? [r.a, r.b] : r.type === 'order' ? r.items : r.type === 'slider' ? [r.item] : [r.subject, r.unit];
      for (const id of ids) {
        const mark = id + ':' + r.metric;
        assert.ok(!seen.has(mark), day(i) + ' repeats ' + mark);
        seen.add(mark);
      }
    }
  }
  assert.deepEqual([...types].sort(), ['bigger', 'order', 'slider', 'stack']);
});

test('every figure in the bank has a public source, and the value is a real number', () => {
  for (const it of Object.values(ITEMS)) {
    assert.ok(it.name && it.art && it.metrics && Object.keys(it.metrics).length);
    for (const [key, m] of Object.entries(it.metrics)) {
      assert.ok(m.value > 0 && Number.isFinite(m.value), it.id + ' ' + key);
      assert.match(m.source, /^https:\/\/.+/);
      assert.ok(m.published && m.unit);
      if (m.alt) assert.match(m.alt.source, /^https:\/\/.+/);
    }
  }
  for (const round of DAYS.flat()) {
    const ids = round.type === 'bigger' ? [round.a, round.b] : round.type === 'order' ? round.items : round.type === 'slider' ? [round.item] : [round.subject, round.unit];
    for (const id of ids) metricOf(id, round.metric);
    assert.ok(!/[\u2013\u2014]|\s-\s/.test(round.prompt), round.prompt);
  }
});

test('slider bounds contain the truth and do not sit on it', () => {
  for (const round of DAYS.flat()) {
    if (round.type !== 'slider' && round.type !== 'stack') continue;
    const truth = truthOf(round).value;
    assert.ok(round.min < truth && truth < round.max, round.prompt + ' ' + truth);
    const mid = (round.min + round.max) / 2;
    assert.ok(Math.abs(mid - truth) / truth > 0.04, round.prompt);
  }
});

test('bigger, order and slider scores', () => {
  const bigger = DAYS.flat().find(r => r.type === 'bigger');
  const truth = truthOf(bigger);
  assert.equal(scoreRound(bigger, truth.winner).score, 1000);
  assert.equal(scoreRound(bigger, truth.winner === bigger.a ? bigger.b : bigger.a).score, 0);
  const order = DAYS.flat().find(r => r.type === 'order');
  const right = truthOf(order).order;
  assert.equal(scoreRound(order, right).score, 1000);
  const swap = right.slice();
  [swap[0], swap[1]] = [swap[1], swap[0]];
  assert.equal(scoreRound(order, swap).score, 600);
  const cyc = [right[1], right[2], right[0]];
  assert.equal(scoreRound(order, cyc).score, 200);
  assert.equal(scoreSlider(100, 100), 1000);
  assert.equal(scoreSlider(102, 100), 1000);
  assert.equal(scoreSlider(150, 100), 0);
  assert.equal(scoreSlider(50, 100), 0);
  const mid = scoreSlider(110, 100);
  assert.ok(mid > 700 && mid < 900, mid);
  const stack = DAYS.find(d => d.some(r => r.type === 'stack')).find(r => r.type === 'stack');
  assert.equal(scoreRound(stack, truthOf(stack).value).score, 1000);
});

test('the share card is a score and five squares, with no names', () => {
  const p = puzzleFor('2026-11-10');
  const scores = p.rounds.map(r => scoreRound(r, r.type === 'bigger' ? truthOf(r).winner : r.type === 'order' ? truthOf(r).order : truthOf(r).value).score);
  const text = shareText({number: p.number, scores});
  assert.equal(text, 'Scale It #41\n' + '🟩'.repeat(5) + '\n5,000\ndexmlabs.app/scale-it/');
  for (const it of Object.values(ITEMS)) assert.ok(!text.includes(it.name));
});

test('streak, average and best come from finished days', () => {
  const today = '2026-11-10';
  const played = {
    [addDays(today, -2)]: {score: 1000, rounds: [1000, 0, 0, 0, 0]},
    [addDays(today, -1)]: {score: 4000, rounds: [1000, 1000, 1000, 1000, 0]}
  };
  assert.equal(streak(played, today), 2);
  played[today] = {score: 5000, rounds: [1000, 1000, 1000, 1000, 1000]};
  assert.equal(streak(played, today), 3);
  delete played[addDays(today, -1)];
  assert.equal(streak(played, today), 1);
  const s = summarise({a: {score: 1000}, b: {score: 3000}}, today);
  assert.equal(s.played, 2);
  assert.equal(s.avg, 2000);
  assert.equal(s.best, 3000);
});

test('the page has canonical, social tags, the beacon, and no brand in the title', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /rel="canonical" href="https:\/\/dexmlabs\.app\/scale-it\/"/);
  assert.match(html, /property="og:image" content="https:\/\/dexmlabs\.app\/scale-it\/img\/og\.png"/);
  assert.match(html, /og:image:width" content="1200"/);
  assert.match(html, /static\.cloudflareinsights\.com\/beacon\.min\.js/);
  assert.match(html, /d2c23a1c7dbd41168e2a3d54c4a4dc40/);
  assert.match(html, /lang="en-GB"/);
  const title = html.match(/<title>([^<]+)<\/title>/)[1];
  const desc = html.match(/name="description" content="([^"]+)"/)[1];
  for (const blob of [title, desc]) assert.ok(!/boeing|airbus|cessna|spacex|lockheed|nasa/i.test(blob), blob);
  assert.ok(!/[\u2013\u2014]/.test(html.replace(/<script[\s\S]*?<\/script>/g, '')));
  assert.ok(fs.existsSync(new URL('../img/og.png', import.meta.url)));
  assert.ok(fs.existsSync(new URL('../img/og.svg', import.meta.url)));
});

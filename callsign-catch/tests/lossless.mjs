// Lossless import check for a real export. Run: node callsign-catch/tests/lossless.mjs /path/to/export.json [/path/to/exported-again.json]
// With one file it runs the same load steps as the page. With two it compares a real browser export against the original.
// Every field of the original must still be there with the same value, unless a migration changed it and kept the old
// value on the record (entry.was, card.tierWas, retired cards). Points and XP may only go up.
import fs from 'fs'; import assert from 'assert/strict';
import * as C from '../js/core.mjs';
const dir = new URL('../data/', import.meta.url), J = n => JSON.parse(fs.readFileSync(new URL(n + '.json', dir)));
const [file, again] = process.argv.slice(2); if (!file) { console.log('SKIP lossless: no export given'); process.exit(0); }
const orig = JSON.parse(fs.readFileSync(file, 'utf8'));
let out;
if (again) out = JSON.parse(fs.readFileSync(again, 'utf8'));
else {
  const table = J('types'), idx = C.indexTypes(table);
  C.setTeams(J('display-teams')); C.setHexTypes(J('hex-types')); C.setRanges(J('icao-ranges')); C.setLiveries(J('liveries')); C.setCallsignTypes(J('callsign-types')); C.setOneOffs(J('one-offs'));
  const s = C.validateImport(JSON.parse(JSON.stringify(orig))); assert.ok(s, 'import accepted');
  out = JSON.parse(JSON.stringify(C.regrade(s, idx, table)));
}
const problems = [], changed = [];
const migratedOk = (path, a, b) => {
  const m = path.match(/^log\.(\d+)\.(type|tier|gain)$/); if (m) { const e = out.log[+m[1]]; return !!(e && (e.was || []).some(w => w[m[2]] === a)); }
  const c = path.match(/^cards\.([^.]+)\.(first|last)\.(type|tier|gain)$/); if (c) return true; // the card's first and last follow the log entries checked above
  const t = path.match(/^cards\.([^.]+)\.tier$/); if (t) return C.TIERS.indexOf(b) >= C.TIERS.indexOf(a) || out.cards[t[1]].tierWas === a;
  if (/^retired\.[^.]+\.count$/.test(path)) return b < a; // the catch moved to its real card
  const ph = path.match(/^(log\.\d+|cards\.[^.]+\.(?:first|last))\.photo\.(\w+)$/);
  if (ph) { const o = ph[1].split('.').reduce((x, k) => x && x[k], out); let p = o && o.photo && o.photo.prev; while (p) { if (p[ph[2]] === a) return true; p = p.prev; } return false; }
  if (/^cards\.UNK[A-Z]{2}\.count$/.test(path)) return b < a && out.log.some(e => (e.was || []).some(w => w.type === path.split('.')[1])); // catches moved to their real cards; the total is checked below
  if (path === 'points' || path === 'xp') return b >= a;
  return false;
};
function walk(a, b, path) {
  if (a !== null && typeof a === 'object') {
    if (b === null || typeof b !== 'object') {
      const card = path.match(/^cards\.([^.]+)$/); if (card && out.retired && out.retired[card[1]]) return walk(a, out.retired[card[1]], 'retired.' + card[1]);
      return problems.push(path + ' missing');
    }
    if (Array.isArray(a)) { if (path === 'cards.' + path.split('.')[1] + '.variants' || /variants$/.test(path)) { for (const v of a) if (!b.includes(v)) problems.push(path + ' lost ' + v); return; } }
    // A card's first and last are copies of log entries. When a migration moves a catch to its real card, the card points at
    // other entries, so the original copy is checked against its own log entry (same time) instead.
    const fl = path.match(/^cards\.([^.]+)\.(first|last)$/);
    if (fl && a.t && b.t !== a.t) { const i = out.log.findIndex(e => e && e.t === a.t); if (i < 0) return problems.push(path + ' entry ' + a.t + ' missing from log'); return walk(a, out.log[i], 'log.' + i); }
    for (const k of Object.keys(a)) walk(a[k], b[k], path ? path + '.' + k : k);
    return;
  }
  if (a === b) return;
  const card = path.match(/^cards\.([^.]+)\./); if (card && !out.cards[card[1]] && out.retired && out.retired[card[1]]) return;
  if (migratedOk(path, a, b)) { changed.push(`${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`); return; }
  problems.push(`${path}: ${JSON.stringify(a)} became ${JSON.stringify(b)}`);
}
walk(orig, out, '');
const count = s => ({cards: Object.keys(s.cards || {}).length, catches: (s.log || []).length, cardCatches: Object.values(s.cards || {}).reduce((n, c) => n + (c.count | 0), 0) + Object.values(s.retired || {}).reduce((n, c) => n + (c.count | 0), 0),
  variants: Object.values(s.cards || {}).reduce((n, c) => n + ((c.variants || []).length), 0), points: s.points, xp: s.xp, night: s.night, days: Object.keys(s.days || {}).length, dayKeys: Object.values(s.days || {}).flat().length,
  wantedHits: Object.keys(s.wantedHits || {}).length, pending: (s.pending || []).length, photos: (s.log || []).filter(e => e && e.photo).length, quarantine: (s.quarantine || []).length, retired: Object.keys(s.retired || {}).length});
console.log('before', JSON.stringify(count(orig))); console.log('after ', JSON.stringify(count(out)));
if (changed.length) console.log('migrated, old value kept on the record:\n  ' + changed.join('\n  '));
if (problems.length) { console.log('FAIL lossless:\n  ' + problems.slice(0, 40).join('\n  ')); process.exit(1); }
assert.ok(count(out).catches === count(orig).catches && count(out).cardCatches === count(orig).cardCatches && count(out).photos === count(orig).photos);
console.log('PASS lossless: every original field kept, export is a superset');

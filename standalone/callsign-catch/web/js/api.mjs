// One submit asks the main feed for every kind of lookup the input could be, keeping only exact matches.
// If nothing matches there, the fallback feeds in config are asked before I say not found.
import {LOOKUP_API, FALLBACK_APIS} from './config.mjs';
import {queryValue, exactMatches} from './core.mjs';
// airplanes.live is only tried when the main feed cannot be reached at all.
export const PRIMARY = [{base: LOOKUP_API || 'https://api.adsb.lol', name: 'adsb.lol'}, {base: 'https://api.airplanes.live', name: 'airplanes.live'}];
const PATH = {hex: 'hex', reg: 'reg', callsign: 'callsign'};
async function ask(src, q, f) {
  const ac = [];
  for (const kind of q.kinds || [q.kind]) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await f(`${src.base}/v2/${(src.paths || PATH)[kind]}/${encodeURIComponent(queryValue(q, kind))}`, {signal: ctl.signal, cache: 'no-store'});
      if (r.status === 429) return {error: 'busy'};
      if (!r.ok) return {error: 'http ' + r.status};
      const j = await r.json(); ac.push(...((j && (j.ac || j.aircraft)) || []));
    } finally { clearTimeout(timer); }
  }
  return {ac};
}
export async function lookup(q, f = fetch, fallbacks = FALLBACK_APIS) {
  let got = null, lastErr;
  for (const src of PRIMARY) {
    try { const r = await ask(src, q, f); if (r.error === 'busy') return r; if (r.error) { lastErr = r.error; continue; } got = {data: {ac: r.ac}, source: src.name}; break; }
    catch (e) { lastErr = String(e); }
  }
  if (got && exactMatches(q, got.data.ac).length) return got;
  for (const src of fallbacks || []) {
    try { const r = await ask(src, q, f); if (!r.error && exactMatches(q, r.ac).length) return {data: {ac: r.ac}, source: src.name}; }
    catch {}
  }
  return got || {error: 'offline', detail: lastErr};
}

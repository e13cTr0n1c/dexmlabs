// One lookup per submit. adsb.lol first, airplanes.live only if adsb.lol cannot be reached.
import {LOOKUP_API} from './config.mjs';
export const PROVIDERS = [LOOKUP_API || 'https://api.adsb.lol', 'https://api.airplanes.live'];
export async function lookup(q, f = fetch) {
  let lastErr;
  for (const base of PROVIDERS) {
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 9000);
      const r = await f(`${base}/v2/${q.kind}/${encodeURIComponent(q.value)}`, {signal: ctl.signal, cache: 'no-store'});
      clearTimeout(timer);
      if (r.status === 429) return {error: 'busy'};
      if (!r.ok) { lastErr = 'http ' + r.status; continue; }
      return {data: await r.json(), source: base};
    } catch (e) { lastErr = String(e); }
  }
  return {error: 'offline', detail: lastErr};
}

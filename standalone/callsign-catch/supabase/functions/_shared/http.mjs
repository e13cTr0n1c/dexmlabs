// HTTP shell for the catch and migrate functions.
// Tests pass deps so adsb.lol and Postgres stay out of the unit tests.
import {planCatch, reviewSave, prepare} from '../../../shared/engine.mjs';
import {memoryRepo} from '../../../shared/repo.mjs';

export const adsbUrl = callsign => 'https://api.adsb.lol/v2/callsign/' + encodeURIComponent(callsign);

export async function fetchAdsb(callsign, fetchImpl = fetch) {
  const url = adsbUrl(callsign);
  const res = await fetchImpl(url, {headers: {accept: 'application/json'}});
  if (res.status === 429) return {error: 'busy', url};
  if (!res.ok) return {error: 'offline', url};
  return {body: await res.json(), url};
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-max-age': '86400',
};

function json(status, body) {
  return new Response(JSON.stringify(body), {status, headers: {...CORS, 'content-type': 'application/json'}});
}

export async function readBody(req) {
  try { return await req.json(); } catch { return null; }
}

export async function handleCatch(req, deps) {
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});
  if (req.method !== 'POST') return json(405, {ok: false, error: 'bad', message: 'Send a callsign to catch it.'});
  const user = await deps.getUser(req);
  if (!user) return json(401, {ok: false, error: 'auth', message: 'Sign in again to catch a plane.'});
  const body = await readBody(req);
  const callsign = body && (body.callsign || body.cs);
  const now = deps.now ? deps.now() : Date.now();
  const ctx = await deps.ctx();
  const since = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const recent = await deps.repo.recent(user.id, since);
  let feedBody = null, feedError = null;
  const typed = String(callsign || '').trim().toUpperCase().replace(/[\s-]+/g, '');
  // Ask the feed only after the callsign looks real and the rate limit still has room.
  // planCatch applies the limit again so a racing pair cannot sneak past it.
  const gate = planCatch({callsign: typed, feedBody: {ac: []}, recent, now, ctx});
  const skipFeed = gate.error === 'bad' || gate.error === 'rate';
  if (!skipFeed) {
    try {
      const got = await deps.fetchFeed(typed);
      if (got && got.error) feedError = got.error;
      else feedBody = got && got.body;
    } catch {
      feedError = 'offline';
    }
  }
  const plan = skipFeed ? gate : planCatch({callsign: typed, feedBody, feedError, recent, now, ctx});
  await deps.repo.insertLog({user_id: user.id, ...plan.log});
  if (!plan.ok) {
    const status = plan.error === 'rate' ? 429 : plan.error === 'dupe' ? 409 : plan.error === 'bad' ? 400 : 404;
    return json(status, {ok: false, error: plan.error, message: plan.message});
  }
  const card = await deps.repo.insertCard({user_id: user.id, ...plan.card});
  return json(200, {ok: true, card});
}

export async function handleMigrate(req, deps) {
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});
  if (req.method !== 'POST') return json(405, {ok: false, error: 'bad', message: 'Send your saved hangar to bring it across.'});
  const user = await deps.getUser(req);
  if (!user) return json(401, {ok: false, error: 'auth', message: 'Sign in again to bring your hangar across.'});
  const body = await readBody(req);
  const save = body && body.save ? body.save : body;
  const now = deps.now ? deps.now() : Date.now();
  const ctx = await deps.ctx();
  const review = reviewSave(save, ctx, now);
  if (!review.ok) return json(400, {ok: false, error: review.error, message: review.message, imported: [], rejected: review.rejected});
  const claim = await deps.repo.claimMigration(user.id, new Date(now).toISOString());
  if (!claim.claimed) {
    return json(409, {ok: false, error: 'already', message: 'This account has already brought a hangar across. That can only happen once.', imported: [], rejected: []});
  }
  const imported = await deps.repo.insertCards(review.accepted.map(c => ({user_id: user.id, ...c})));
  return json(200, {ok: true, imported, rejected: review.rejected, already: false});
}

let tablesPromise = null;

export function loadTablesFromDisk() {
  if (!tablesPromise) {
    tablesPromise = (async () => {
      const root = new URL('../../../', import.meta.url);
      const read = async rel => JSON.parse(await Deno.readTextFile(new URL(rel, root)));
      return prepare({
        table: await read('shared/types.json'),
        teams: await read('web/data/display-teams.json'),
        hexTypes: await read('web/data/hex-types.json'),
        liveries: await read('web/data/liveries.json'),
        oneOffs: await read('web/data/one-offs.json'),
        csTypes: await read('web/data/callsign-types.json'),
        ranges: await read('web/data/icao-ranges.json'),
      });
    })();
  }
  return tablesPromise;
}

export async function liveDeps() {
  const {createClient} = await import('npm:@supabase/supabase-js@2');
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authClient = createClient(url, anon, {auth: {persistSession: false}});
  const admin = createClient(url, service, {auth: {persistSession: false}});
  return {
    now: () => Date.now(),
    ctx: () => loadTablesFromDisk(),
    async getUser(req) {
      const header = req.headers.get('Authorization') || '';
      const token = /^Bearer\s+/i.test(header) ? header.replace(/^Bearer\s+/i, '').trim() : '';
      if (!token) return null;
      const {data, error} = await authClient.auth.getUser(token);
      if (error || !data.user) return null;
      return {id: data.user.id};
    },
    fetchFeed: fetchAdsb,
    repo: supabaseRepo(admin),
  };
}

export function supabaseRepo(admin) {
  return {
    async recent(userId, sinceIso) {
      const {data, error} = await admin.from('catches_log').select('callsign,icao24,caught_at,accepted').eq('user_id', userId).gte('caught_at', sinceIso);
      if (error) throw error;
      return data || [];
    },
    async insertLog(row) {
      const {error} = await admin.from('catches_log').insert(row);
      if (error) throw error;
    },
    async insertCard(row) {
      const keep = pick(row);
      const {data, error} = await admin.from('cards').insert(keep).select('id,user_id,aircraft_type,rarity,callsign,icao24,caught_at,source').single();
      if (error) throw error;
      return {...row, ...data};
    },
    async insertCards(rows) {
      if (!rows.length) return [];
      const keep = rows.map(pick);
      const {data, error} = await admin.from('cards').insert(keep).select('id,user_id,aircraft_type,rarity,callsign,icao24,caught_at,source');
      if (error) throw error;
      return (data || []).map((row, i) => ({...rows[i], ...row}));
    },
    async cards(userId) {
      const {data, error} = await admin.from('cards').select('id,user_id,aircraft_type,rarity,callsign,icao24,caught_at,source').eq('user_id', userId);
      if (error) throw error;
      return data || [];
    },
    async claimMigration(userId, at) {
      const {data, error} = await admin.from('profiles').update({migrated_at: at}).eq('id', userId).is('migrated_at', null).select('id,migrated_at');
      if (error) throw error;
      if (data && data.length) return {claimed: true, migrated_at: data[0].migrated_at};
      return {claimed: false, migrated_at: at};
    },
  };
}

function pick(row) {
  return {
    user_id: row.user_id,
    aircraft_type: row.aircraft_type,
    rarity: row.rarity,
    callsign: row.callsign,
    icao24: row.icao24,
    caught_at: row.caught_at,
    source: row.source,
  };
}

export function handle(req, kind) {
  const run = kind === 'migrate' ? handleMigrate : handleCatch;
  return liveDeps().then(deps => run(req, deps)).catch(err => {
    console.error(err);
    return json(500, {ok: false, error: 'offline', message: 'Something went wrong on the server. Try again in a moment.'});
  });
}

export {memoryRepo};

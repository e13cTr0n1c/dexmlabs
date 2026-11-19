// The practice backend. Same decisions as the Edge Functions, with a feed you pass in.
import {planCatch, reviewSave} from './engine.mjs';
import {memoryRepo} from './repo.mjs';

export function createPreview({ctx, feed, now, repo} = {}) {
  if (!ctx) throw new Error('type tables required');
  const store = repo || memoryRepo();
  const clock = typeof now === 'function' ? now : () => Date.now();
  const aircraft = () => (feed || []).map(a => ({...a}));

  async function catchCall(userId, callsign) {
    const t = clock();
    const since = new Date(t - 24 * 60 * 60 * 1000).toISOString();
    const recent = await store.recent(userId, since);
    const plan = planCatch({callsign, feedBody: {ac: aircraft()}, recent, now: t, ctx});
    await store.insertLog({user_id: userId, ...plan.log});
    if (!plan.ok) return {ok: false, error: plan.error, message: plan.message};
    const card = await store.insertCard({user_id: userId, ...plan.card});
    return {ok: true, card};
  }

  async function migrate(userId, save) {
    const review = reviewSave(save, ctx, clock());
    if (!review.ok) return {ok: false, error: review.error, message: review.message, imported: [], rejected: review.rejected};
    const claim = await store.claimMigration(userId, new Date(clock()).toISOString());
    if (!claim.claimed) {
      return {ok: false, error: 'already', message: 'This account has already brought a hangar across. That can only happen once.', imported: [], rejected: []};
    }
    const imported = await store.insertCards(review.accepted.map(c => ({user_id: userId, ...c})));
    return {ok: true, imported, rejected: review.rejected, already: false};
  }

  return {repo: store, catch: catchCall, migrate, cards: userId => store.cards(userId)};
}

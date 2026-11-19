// An in memory stand in for the tables the Edge Functions write.
// The browser preview and the tests both use it. The hosted functions use Postgres.
export function memoryRepo(seed = {}) {
  const state = {
    cards: seed.cards ? seed.cards.map(c => ({...c})) : [],
    log: seed.log ? seed.log.map(r => ({...r})) : [],
    profiles: {...(seed.profiles || {})},
    seq: seed.seq || 1,
  };
  return {
    state,
    async recent(userId, sinceIso) {
      const t = Date.parse(sinceIso);
      return state.log.filter(r => r.user_id === userId && Date.parse(r.caught_at) >= t);
    },
    async insertLog(row) {
      state.log.push({id: state.seq++, ...row});
    },
    async insertCard(row) {
      const card = {id: 'card-' + state.seq++, ...row};
      state.cards.push(card);
      return card;
    },
    async insertCards(rows) {
      const out = [];
      for (const row of rows) out.push(await this.insertCard(row));
      return out;
    },
    async cards(userId) {
      return state.cards.filter(c => c.user_id === userId);
    },
    async claimMigration(userId, at) {
      const p = state.profiles[userId] || {migrated_at: null};
      state.profiles[userId] = p;
      if (p.migrated_at) return {claimed: false, migrated_at: p.migrated_at};
      p.migrated_at = at;
      return {claimed: true, migrated_at: at};
    },
  };
}

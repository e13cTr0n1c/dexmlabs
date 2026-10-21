// Everything worth retuning lives here.
export const POINTS = {common: 10, uncommon: 25, rare: 60, legendary: 150};
export const DUPLICATE_XP = {common: 2, uncommon: 5, rare: 12, legendary: 30};
// A relay that adds the CORS header adsb.lol does not send (see callsign-worker). Empty means ask adsb.lol directly.
export const LOOKUP_API = '';
// The optional leaderboard Worker. Empty keeps the board hidden.
export const LEADERBOARD_API = '';
export const SUBMIT_GAP_MS = 6000;     // at least this long between lookups
export const SUBMITS_PER_HOUR = 40;
export const NIGHT_FROM = 0, NIGHT_TO = 5; // Night owl hours, on the player's clock

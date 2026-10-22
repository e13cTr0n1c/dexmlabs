// Everything worth retuning lives here.
export const POINTS = {common: 10, uncommon: 25, rare: 60, legendary: 150};
export const DUPLICATE_XP = {common: 2, uncommon: 5, rare: 12, legendary: 30};
// A relay that adds the CORS header adsb.lol does not send (see callsign-worker). Empty means ask adsb.lol directly.
export const LOOKUP_API = 'https://callsign-catch.thearthurjones.workers.dev';
// The optional leaderboard Worker. Empty keeps the board hidden.
export const LEADERBOARD_API = 'https://callsign-catch.thearthurjones.workers.dev';
export const SUBMIT_GAP_MS = 6000;     // at least this long between lookups
export const SUBMITS_PER_HOUR = 40;
export const NIGHT_FROM = 0, NIGHT_TO = 5; // Night owl hours, on the player's clock
// Photos of the exact airframe caught, from the Planespotters.net photo API, asked straight from the browser (it is
// CORS enabled). Their terms: free for everyone to see, photographer credited next to the image, the thumbnail links
// to the photo page, images loaded straight from their CDN and never stored, answers kept 24 hours at most, and the
// API not re-exposed through our own (so it no longer goes through the Worker).
export const SPOT_API = 'https://api.planespotters.net/pub/photos';
// A one off bonus the first time you catch a type that is not in the table yet.
export const NEW_TYPE_BONUS = 25;
// A small bonus the first time you catch a new variant of a type you already own, such as a Firehawk after a Black Hawk.
export const NEW_VARIANT_BONUS = 10;
// Second feeds asked when the main one has never heard of the aircraft. Each is {base, name, paths?}. Empty for now:
// adsb.fi, airplanes.live and adsb.lol itself send no CORS header, so a browser cannot read them directly. A relay
// route on the Worker, such as {base: LOOKUP_API + '/fi', name: 'adsb.fi', paths: {hex: 'hex', reg: 'registration', callsign: 'callsign'}}, would switch adsb.fi on.
export const FALLBACK_APIS = [];
// How often pending sightings are rechecked while the page is open.
export const PENDING_EVERY_MS = 60000;

// Seal a gift for data/gifts.json. The code comes from the GIFT_CODE environment variable and the payload from a file
// outside the repo, so neither is ever written into the source.
// Run: GIFT_CODE=... node callsign-catch/tools/make-gift.mjs <id> <payload.json> >> gifts entry
import fs from 'fs'; import {sealGift} from '../js/core.mjs';
const [id, file] = process.argv.slice(2), code = process.env.GIFT_CODE;
if (!id || !file || !code) { console.error('usage: GIFT_CODE=... node make-gift.mjs <id> <payload.json>'); process.exit(1); }
console.log(JSON.stringify(await sealGift(id, code, JSON.parse(fs.readFileSync(file, 'utf8')))));

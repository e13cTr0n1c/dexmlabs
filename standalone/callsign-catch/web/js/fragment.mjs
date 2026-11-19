// Carry a guest hangar in the address fragment, once, then strip it.
const STORE_KEY = 'callsign:collection';

export function bytesToB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

export function b64urlToBytes(text) {
  const s = String(text || '').replaceAll('-', '+').replaceAll('_', '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeImport(jsonText) {
  return bytesToB64url(new TextEncoder().encode(String(jsonText)));
}

export function decodeImport(fragment) {
  const raw = String(fragment || '');
  const body = raw.startsWith('#import=') ? raw.slice('#import='.length) : raw.startsWith('import=') ? raw.slice('import='.length) : raw;
  const obj = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
  if (!obj || obj.v !== 1 || typeof obj.cards !== 'object' || obj.cards === null || !Array.isArray(obj.log)) {
    throw new Error('format');
  }
  return obj;
}

// Read #import= once into localStorage and remove it from the address.
export function consumeFragment(storage, loc, hist) {
  const hash = (loc && loc.hash) || '';
  if (!hash.startsWith('#import=')) return {taken: false, stored: false};
  let stored = false;
  let error = '';
  try {
    const obj = decodeImport(hash);
    storage.setItem(STORE_KEY, JSON.stringify(obj));
    stored = true;
  } catch {
    error = 'I could not read the carried hangar, so I left the one on this device as it was.';
  }
  try { hist.replaceState(null, '', (loc.pathname || '') + (loc.search || '')); } catch { /* some previews block this */ }
  return {taken: true, stored, error};
}

export {STORE_KEY};

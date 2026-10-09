/** The "Print your own" box on the title screen. It stays hidden until PRINT_URL is set.
 *  To switch it on, put the model's address in PRINT_URL. Empty means hidden. */
export const PRINT_URL = '';

export function applyPrintLink(doc, url = PRINT_URL) {
  const slot = doc.getElementById('print-slot'), link = doc.getElementById('print-link');
  if (!slot || !link) return false;
  const on = typeof url === 'string' && /^https:\/\//.test(url.trim());
  slot.hidden = !on;
  if (on) { link.href = url.trim(); link.target = '_blank'; link.rel = 'noopener'; } else link.removeAttribute('href');
  return on;
}

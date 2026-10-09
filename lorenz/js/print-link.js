/** The STL download button: on the title screen, on the decoded card and on the about page.
 *  It stays hidden everywhere until CULTS_URL is set. The "Also on Printables" link shows only when
 *  PRINTABLES_URL is set too. Both open in a new tab. Empty means hidden. */
export const CULTS_URL = 'https://cults3d.com/en/3d-model/gadget/lorenz-cipher-chi-wheel-demonstrator-simplified-sz42-teaching-model';
export const PRINTABLES_URL = 'https://www.printables.com/model/1870782-lorenz-cipher-chi-wheel-demonstrator-simplified-sz';

const isUrl = u => typeof u === 'string' && /^https:\/\/\S+$/.test(u.trim());
export const STL_LABEL = 'Support me by downloading the Lorenz machine STL';
export const STL_SUB = 'Free to download, tip if you like.';

/** The slot's markup. `size` is 'large' (title screen, card) or 'small' (about page). */
export const stlSlotHTML = (place, size = 'large') => `<div class="stl-slot stl-${size}" data-stl="${place}" hidden><a class="stl-button"><span class="stl-label">${STL_LABEL}</span><span class="stl-sub">${STL_SUB}</span></a><a class="stl-alt" hidden>Also on Printables</a></div>`;

function setLink(a, url) { a.href = url.trim(); a.target = '_blank'; a.rel = 'noopener'; }
/** Show or hide every STL slot under `root`. Returns true when the button is showing. */
export function applyPrintLink(root, {cults = CULTS_URL, printables = PRINTABLES_URL} = {}) {
  const on = isUrl(cults), alt = on && isUrl(printables);
  for (const slot of root.querySelectorAll('[data-stl]')) {
    const a = slot.querySelector('.stl-button'), p = slot.querySelector('.stl-alt');
    slot.hidden = !on;
    if (on) setLink(a, cults); else { a.removeAttribute('href'); a.removeAttribute('target'); }
    if (p) { p.hidden = !alt; if (alt) setLink(p, printables); else { p.removeAttribute('href'); p.removeAttribute('target'); } }
  }
  return on;
}

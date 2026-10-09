/** Punched tape as HTML: one frame per character, five holes with the small sprocket hole between 2 and 3,
 *  impulse 1 at the top, the same layout as the tape canvas. Pure strings, so the tests can check them. */
import {bitsOf} from './lorenz.js';

/** "holes 1, 3 and 4", or "no holes". */
export function holesText(code) {
  const on = bitsOf(code).map((b, i) => b ? i + 1 : 0).filter(Boolean);
  if (!on.length) return 'no holes';
  return `hole${on.length > 1 ? 's' : ''} ${on.length > 1 ? `${on.slice(0, -1).join(', ')} and ${on.at(-1)}` : on[0]}`;
}
/** The holes of one frame. */
export function holesHTML(code) {
  const b = bitsOf(code);
  return `<i class="h${b[0] ? ' on' : ''}"></i><i class="h${b[1] ? ' on' : ''}"></i><i class="sp"></i><i class="h${b[2] ? ' on' : ''}"></i><i class="h${b[3] ? ' on' : ''}"></i><i class="h${b[4] ? ' on' : ''}"></i>`;
}
/** A strip of frames. With `buttons`, each frame is a toggle the player can tap to mark as read. */
export function tapeHTML(codes, {buttons = false, marked = new Set()} = {}) {
  return codes.map((c, i) => {
    const n = i + 1, num = n % 10 === 0 ? `<b class="frame-num" aria-hidden="true">${n}</b>` : '';
    if (!buttons) return `<span class="frame" aria-hidden="true">${holesHTML(c)}</span>`;
    const m = marked.has(i);
    return `<button type="button" class="frame${m ? ' read' : ''}" data-frame="${i}" aria-pressed="${m}" aria-label="Row ${n}, ${holesText(c)}">${holesHTML(c)}${num}</button>`;
  }).join('');
}

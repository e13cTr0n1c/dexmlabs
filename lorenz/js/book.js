/** The QEP book page as HTML, from the round alone, so it is the same on every load, viewport and re-render.
 *  The line for the round's QEP number is highlighted and marked aria-current for screen readers. */
import {WHEELS} from './lorenz.js';
import {pad2, bookCell, answerLine, revealText} from './game.js';

export const SMUDGE_NOTE = 'The book got damp in the truck. Where a tens figure is smudged, only the last figure is readable, so try each position that ends in it.';

export const bookHeadHTML = () => `<tr><th scope="col">QEP</th>${WHEELS.map(w => `<th scope="col" class="grp-${w.group}"><abbr title="${w.label}, ${w.size} cams">${w.label}</abbr></th>`).join('')}</tr>`;

export function bookBodyHTML(round, revealed = false) {
  return round.book.map(e => { const mine = e.qep === round.qep;
    return `<tr data-qep="${pad2(e.qep)}"${mine ? ' class="today-line" aria-current="true"' : ''}><td>${pad2(e.qep)}${mine ? `<span class="sr-only">, ${round.mode === 'daily' ? "today's line" : 'your line'}</span>` : ''}</td>${WHEELS.map(w => {
    const c = bookCell(round, e, w.id, revealed);
    if (!c.smudged) return `<td class="grp-${w.group}">${c.text}</td>`;
    const units = c.text.slice(1);
    return `<td class="grp-${w.group} smudge" data-wheel="${w.id}"><span aria-hidden="true">${c.text}</span>${c.read ? `<small class="smudge-read" aria-hidden="true">${c.read}</small>` : ''}<span class="sr-only">smudged, ends in ${units}${c.read ? `, read as ${c.read}` : ''}</span></td>`;
  }).join('')}</tr>`; }).join('');
}

/** The note under the book. Once the smudge has been read it repeats the hint, so a reload doesn't lose it. */
export function smudgeNote(round, revealed = false) {
  const said = revealed && answerLine(round)?.smudge ? revealText(round) : null;
  return said ? `${SMUDGE_NOTE} ${said}` : SMUDGE_NOTE;
}

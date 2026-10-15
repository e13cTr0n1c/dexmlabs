/* Walkthrough: a plain language tour of the machine in an accessible modal. No tracking, no network, nothing stored. */
(function () {
  var STEPS = [
    {t: 'Pick a mode and start', p: [
      'Normal gives you the QEP number and prints the message on the teleprinter for you. Hard and Realistic make you do more of the work by hand.',
      'Choose a mode under Mode, then press Play today\u2019s round for the daily puzzle, or Practice to try as many as you like.']},
    {t: 'Find the QEP number', p: [
      'The QEP number says which line of the book to use. In Normal it is shown at the top of the round.',
      'In Hard and Realistic it comes as a punched tape, sent in clear. Press Show telecode cheat sheet, read the holes (hole 1 is the top one), type the two digit number into The QEP number you read, then press Check it.']},
    {t: 'Set the pins (Hard and Realistic)', p: [
      'Normal skips this stage. In the other two modes, open Wheel pattern sheet. There is one row for each wheel, and each pin is a big button you can tap.',
      'Above each group of five pins is today\u2019s pattern: x means raised and a dot means lowered. Tap a pin to raise it and tap again to lower it. Use Open all rows or Close all rows to tidy up, and Clear on a row to start that wheel again.',
      'In Hard you set only the wheels you choose, and the rest are set for you once yours match. In Realistic you set every wheel and nothing tells you if a pin is wrong; the tape does that later.']},
    {t: 'Look up the start positions', p: [
      'Open the QEP book and find the line with your QEP number. That line gives twelve numbers, one for each wheel. Use the page arrows if today\u2019s page is not showing.',
      'Keep that line in view. You will copy it onto the wheels next.']},
    {t: 'Set the twelve wheels', p: [
      'Under Wheel settings, each wheel has a number. Tap the arrows, drag the number up or down, or type it in.',
      'They run left to right as on the real machine: the psi wheels, then the motor wheels, then the chi wheels. All to 01 puts every wheel back to the start.']},
    {t: 'Run the tape', p: [
      'Press Decode the tape (or press D). The tape runs through the machine at the speed you picked, and Skip jumps to the end.',
      'If every wheel is right, Normal prints the message on the teleprinter. If even one wheel is wrong you get nonsense, so check the wheels and run it again.']},
    {t: 'Read it, use hints and score', p: [
      'In Hard and Realistic the machine punches a tape instead. Read it with the cheat sheet, type what it says under What the tape says, then press Check my reading.',
      'You start with 1,000 points. Hints are there if you are stuck and each one costs points: reveal the QEP, reveal a character, check a wheel, or read the smudge. The price is on each button.',
      'This guide is free and has no adverts. You can reopen it any time with the Walkthrough button.']}
  ];
  var dlg, i = 0, opener = null, built = false;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  function build() {
    dlg = el('dialog', 'walk-dialog'); dlg.id = 'walk-dialog'; dlg.setAttribute('aria-labelledby', 'walk-title'); dlg.setAttribute('aria-describedby', 'walk-body');
    var top = el('div', 'walk-top'), h = el('h2', '', 'Walkthrough'); h.id = 'walk-title';
    var x = el('button', 'walk-x', '\u00d7'); x.type = 'button'; x.setAttribute('aria-label', 'Close the walkthrough'); x.setAttribute('data-walk', 'close');
    top.appendChild(h); top.appendChild(x);
    var count = el('p', 'walk-count'); count.id = 'walk-count'; count.setAttribute('aria-live', 'polite');
    var dots = el('ol', 'walk-dots'); dots.setAttribute('aria-hidden', 'true');
    STEPS.forEach(function () { dots.appendChild(document.createElement('li')); });
    var body = el('div', 'walk-body'); body.id = 'walk-body'; body.setAttribute('aria-live', 'polite');
    var nav = el('div', 'walk-nav'), back = el('button', '', 'Back'), next = el('button', 'walk-next', 'Next');
    back.type = next.type = 'button'; back.setAttribute('data-walk', 'back'); next.setAttribute('data-walk', 'next');
    nav.appendChild(back); nav.appendChild(next);
    [top, count, dots, body, nav].forEach(function (n) { dlg.appendChild(n); });
    document.body.appendChild(dlg); built = true;
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) { close(); return; }
      var b = e.target.closest('[data-walk]'); if (!b) return; var a = b.getAttribute('data-walk');
      if (a === 'close') close(); else if (a === 'back') go(i - 1); else if (a === 'next') { if (i === STEPS.length - 1) close(); else go(i + 1); }
    });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(dlg.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'), function (n) { return !n.disabled && !n.hidden; });
      if (!f.length) return; var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dlg)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  function go(n) {
    i = Math.max(0, Math.min(STEPS.length - 1, n)); var s = STEPS[i], body = dlg.querySelector('.walk-body');
    body.textContent = ''; var h = el('h3', '', s.t); body.appendChild(h); s.p.forEach(function (t) { body.appendChild(el('p', '', t)); });
    dlg.querySelector('.walk-count').textContent = 'Step ' + (i + 1) + ' of ' + STEPS.length;
    dlg.querySelectorAll('.walk-dots li').forEach(function (li, k) { li.className = k < i ? 'done' : k === i ? 'now' : ''; });
    var back = dlg.querySelector('[data-walk=back]'), next = dlg.querySelector('[data-walk=next]');
    back.disabled = i === 0; next.textContent = i === STEPS.length - 1 ? 'Done' : 'Next';
    if (document.activeElement === back && back.disabled) next.focus();
  }
  function open(e) {
    if (!built) build(); opener = e && e.currentTarget || document.getElementById('walk-open'); go(0);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.querySelector('[data-walk=next]').focus();
    document.getElementById('walk-open').setAttribute('aria-expanded', 'true');
  }
  function close() {
    if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
    document.getElementById('walk-open').setAttribute('aria-expanded', 'false');
    if (opener && opener.focus) opener.focus();
  }
  var btn = document.getElementById('walk-open'); if (btn) btn.addEventListener('click', open);
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && built && dlg.open) { e.preventDefault(); close(); } });
})();

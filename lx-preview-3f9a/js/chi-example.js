/** The worked example for chi only mode. It is the example key printed on the fixed key wheels of the
 *  printable Lorenz chi wheel demonstrator, with that model's own test vectors, so the screen and the model agree.
 *  The key is not historical. It was made up for the model.
 *  Conventions, shared with the model and with lorenz.js (BIT_ORDER, MARK, POSITION_BASE):
 *  impulses 1 to 5 written left to right, 1 = mark = cross = cam raised (pin out), 0 = space = dot,
 *  impulse i comes from chi wheel i, start position p means cam p is read for the first character,
 *  cam 1 is the first symbol of each pattern, then every chi wheel steps on one.
 *  Text is in Bletchley notation (A to Z, 9 space, 3 CR, 4 LF, 5 figures, 8 letters, / null), and a typed space counts as 9.
 *  Hand check of the first letter: H is 00101, the first cams read 0 1 0 1 0 (R), H + R = 01111, which is V. */
export const CHI_EXAMPLE = Object.freeze({
  patterns: Object.freeze({
    chi1: '01010011100010001110100011100101101110011',
    chi2: '1011010011001001001001100111001',
    chi3: '01001101100011101110100110100',
    chi4: '11011101000111010100010001',
    chi5: '00010010111010110110101'
  }),
  start: Object.freeze({chi1: 1, chi2: 1, chi3: 1, chi4: 1, chi5: 1}),
  plain: 'HELLO',
  cipher: 'VNTDH',
  vectors: Object.freeze([
    ['HELLO', [1, 1, 1, 1, 1], 'VNTDH'],
    ['ATTACK AT DAWN', [5, 12, 7, 20, 3], 'AIX4XKOXF9QFCX'],
    ['BLETCHLEY PARK', [41, 31, 29, 26, 23], '4ONLYOMTOW9W4T'],
    ['TUTTE', [17, 3, 22, 9, 11], 'A9SVO']
  ])
});

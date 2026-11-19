// Send the player to the standalone site. A hangar in this browser is carried once, in the address fragment.
(function () {
  var dest = 'https://e13ctr0n1c.github.io/callsign-catch/';
  try {
    var raw = localStorage.getItem('callsign:collection');
    if (raw && raw.charAt(0) === '{' && raw.length < 500000) dest += '#import=' + toB64url(raw);
  } catch (e) {}
  var link = document.getElementById('go');
  if (link) link.setAttribute('href', dest);
  location.replace(dest);
  function toB64url(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    var i, chunk;
    for (i = 0; i < bytes.length; i += 0x8000) {
      chunk = bytes.subarray(i, i + 0x8000);
      bin += String.fromCharCode.apply(null, chunk);
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
})();

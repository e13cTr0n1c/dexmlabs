// Keep a carried hangar fragment when the site root sends you into the game folder.
(function () {
  var dest = 'web/' + location.search + location.hash;
  location.replace(dest);
})();

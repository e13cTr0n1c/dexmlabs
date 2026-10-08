# Skywave credits and provenance

## Day map: NASA Blue Marble

The day textures are resized and recompressed copies of `bmng.jpg`
(5400 x 2700) from the Basemap data distribution. Basemap identifies
this image as NASA Blue Marble Next Generation. It includes bathymetric shading.
NASA Earth Observatory / Blue Marble imagery; Reto Stockli and collaborators.

- NASA collection: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/
- NASA topographic maps: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography/
- Basemap imagery documentation: https://matplotlib.org/basemap/stable/users/geography.html
- NASA media guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/

NASA-origin Earth imagery is generally not subject to copyright in the United
States. Source attribution is kept; no NASA insignia is used and no NASA
endorsement is implied. The original images are not redistributed at full size.

## Night map: an illustrative texture, not NASA

**The night JPEGs are NOT NASA Black Marble.** They are original, procedural
illustrative lights on a dimmed copy of the NASA day map. They are not
observations of cities, population, infrastructure or live activity.
The procedural lights are released under CC0; the NASA credit above still
applies to the underlying day map. `assets/textures/provenance.json` records
which night map is installed.

I couldn't download the Black Marble files when I built this, so the night side
uses the illustrative texture for now. The optional `tools/prepare_assets.py`
script (not deployed with the site) swaps in the real imagery and updates the
provenance file when run on a computer with internet access. The game never
runs it.

Attribution to use once the real imagery is in: NASA Earth Observatory / Joshua
Stevens, using Suomi NPP VIIRS data from Miguel Roman, NASA Goddard Space Flight
Center.

- Collection: https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/
- Black Marble 2016: https://svs.gsfc.nasa.gov/30876/
- High-resolution equirectangular source:
  https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg

## Land mask: Natural Earth

Made with Natural Earth. Public-domain, low-resolution country geometry was
rasterised into a two-degree, cell-centre land/sea mask. It deliberately misses
small islands and fine coastlines, and is only used for the game's reflection
loss. The source was the Natural Earth low-resolution fixture in the Pyogrio
distribution; borders are dissolved and are not used as political data.

- Terms: https://www.naturalearthdata.com/about/terms-of-use/
- Project: https://www.naturalearthdata.com/
- Repository: https://github.com/nvkelso/natural-earth-vector

## Renderer: three.js

three.js **r185 / npm 0.185.0**, including OrbitControls and the optional
postprocessing addons, is MIT licensed. All modules use the same exact CDN
version. Its licence is in `THIRD_PARTY_LICENSES.txt`.

- Project: https://threejs.org/
- Release: https://github.com/mrdoob/three.js/releases/tag/r185
- Licence: https://github.com/mrdoob/three.js/blob/r185/LICENSE
- CDN: https://cdn.jsdelivr.net/npm/three@0.185.0/

## Callsigns and model

Prefix families follow the ITU allocation of international call-sign series.
The suffixes are invented; every station is fictional and any match with a real
station is a coincidence. This is not a licensee database.

- ITU: https://www.itu.int/en/ITU-R/terrestrial/fmd/Pages/call_sign_series.aspx

The noise floors, antenna gain samples and band restrictions, the fixed dipole
magnetic pole and a few edge-case rules are my own game calibration, not
measured antenna patterns or propagation predictions. The numbers are all in
`CONFIG` at the top of `js/propagation.js`, and the guide (`help.html`) explains
the main ones.

## Original resources

The interface code, the inline radio-wave favicon, the layout and the WebAudio
sounds are original to Skywave. No external audio files or fonts are used. The
night-side lights use a fixed procedural seed and are not a satellite image.

## Further reading and links

All outbound links are kept in `LINKS` in `js/main.js`. VOACAP and DXMaps are
external sites, not embedded services. The gear and coffee links don't load
anything until you click them.

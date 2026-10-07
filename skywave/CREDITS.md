# Skywave / credits and provenance

## Day map: NASA Blue Marble

The supplied day textures are resized/recompressed derivatives of `bmng.jpg`
(5400 x 2700) from the installed Basemap data distribution. Basemap identifies
this image as NASA Blue Marble Next Generation. It includes bathymetric shading.
NASA Earth Observatory / Blue Marble imagery; Reto Stockli and collaborators.

- NASA collection: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/
- NASA topographic maps: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography/
- Basemap imagery documentation: https://matplotlib.org/basemap/stable/users/geography.html
- NASA media guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/

NASA-origin Earth imagery is generally not subject to copyright in the United
States. Source attribution is retained; no NASA insignia is used and no NASA
endorsement is implied. The original images are not redistributed at full size.

## Night map: explicitly labelled fallback in this package

**The supplied night JPEGs are NOT NASA Black Marble.** They are original,
procedurally generated illustrative lights on a dimmed NASA day-map derivative.
They are not observations of cities, population, infrastructure or live activity.
The procedural additions are released under CC0; underlying NASA source credit
remains as above. `assets/textures/provenance.json` records the installed status.

Asset downloads failed in the development environment. Authentic NASA Black
Marble imagery is consequently the one outstanding asset requirement. The
optional `tools/prepare_assets.py` utility replaces the fallback and updates
provenance on a network-enabled computer. It is not run by the game.

Intended replacement attribution: NASA Earth Observatory / Joshua Stevens, using
Suomi NPP VIIRS data from Miguel Roman, NASA Goddard Space Flight Center.

- Collection: https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/
- Black Marble 2016: https://svs.gsfc.nasa.gov/30876/
- High-resolution equirectangular source:
  https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg

## Land mask: Natural Earth

Made with Natural Earth. Public-domain, low-resolution country geometry was
rasterized into a two-degree, cell-centre land/sea mask. It intentionally misses
small islands and fine coastlines. It is only used for game reflection loss.
The source was the Natural Earth low-resolution fixture in the installed
Pyogrio distribution; borders are dissolved and are not used as political data.

- Terms: https://www.naturalearthdata.com/about/terms-of-use/
- Project: https://www.naturalearthdata.com/
- Repository: https://github.com/nvkelso/natural-earth-vector

## Renderer: three.js

three.js **r185 / npm 0.185.0**, including OrbitControls and optional postprocessing
addons, is MIT licensed. All modules use the same exact CDN version. Its licence
is included at `THIRD_PARTY_LICENSES.txt`.

- Project: https://threejs.org/
- Release: https://github.com/mrdoob/three.js/releases/tag/r185
- Licence: https://github.com/mrdoob/three.js/blob/r185/LICENSE
- CDN: https://cdn.jsdelivr.net/npm/three@0.185.0/

## Callsigns and model

Prefix families are informed by the ITU allocation of international call-sign
series. Names/suffixes are invented; every station is fictional and any match
with a real station is a coincidence. This is not a licensee database.

- ITU: https://www.itu.int/en/ITU-R/terrestrial/fmd/Pages/call_sign_series.aspx

Model formulas, gameplay and visual requirements follow the supplied Skywave
brief. Noise floors, gain samples, antenna restrictions, a fixed dipole magnetic
pole, and several edge-case rules are explicitly documented in README.md. They
are game calibration, not measured antenna patterns or propagation predictions.

## Original resources

All interface code, the inline radio-wave favicon, layout and WebAudio synthesis
are supplied with the project. No external audio files or fonts are used. The
fallback illumination uses a fixed procedural seed and is not a satellite asset.

## Further reading and creator links

All outbound navigation targets are centralized in `LINKS` in `js/main.js`.
VOACAP and DXMaps are external resources, not embedded services. Gear and support
links were supplied by the project owner and do not load resources until clicked.

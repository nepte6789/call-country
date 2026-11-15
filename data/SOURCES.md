# Map data

Illustrative province shapes derived from geoBoundaries gbOpen VNM ADM1:
https://www.geoboundaries.org/api/current/gbOpen/VNM/ADM1/
Source geometry: https://github.com/wmgeolab/geoBoundaries/blob/9469f09/releaseData/gbOpen/VNM/ADM1/geoBoundaries-VNM-ADM1_simplified.geojson
The API identifies this source as Public Domain, geoBoundaries / Wikipedia, year represented 2008.

We aggregate the old province polygons into the 34 province/city names after the 2025 mergers, including Huế and Côn Đảo in TP. Hồ Chí Minh. Names of former provinces are accepted as aliases. Geometry is simplified and illustrative, not an official up-to-date administrative boundary dataset. It is unsuitable for navigation or legal/territorial claims. No boundaries or artwork were copied from the reference videos. Offshore territories are not exhaustively represented by this source.

geoBoundaries reference: Runfola et al. (2020), geoBoundaries: A global database of political administrative boundaries. PLoS ONE 15(4): e0231866. https://doi.org/10.1371/journal.pone.0231866

`provinces.json` includes generated SVG paths and representative points; no runtime map service/API key required. Regenerate using `scripts/build-map.py source.geojson` with Python/Shapely.

Font: Be Vietnam Pro, SIL Open Font License, bundled in public/assets/fonts.

Be Vietnam Pro font source: https://github.com/google/fonts/tree/main/ofl/bevietnampro . Copyright 2021 The Be Vietnam Pro Project Authors, SIL OFL 1.1; full license in public/assets/fonts/OFL.txt. Bundled complete TTFs (400/700/800/900), including Vietnamese glyphs.

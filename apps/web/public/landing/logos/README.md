# Business logos and the nav mark

Every file here is a trim and resize of a logo file that already exists. No logo is drawn, redrawn, recoloured or
generated. Originals are not committed here (no PNG masters in public/landing); each source is named below.

| File | Business | Source |
|---|---|---|
| trade-hall-floor-symbol-dark.svg | Trade Hall | brand-assets/trade-hall/03-floor/trade-hall-symbol-dark.svg ("The Floor", the symbol for dark backgrounds), copied byte for byte. Phill picked it on 25/10/2026; it replaces every earlier Trade Hall mark, which are retired |
| synthex.webp | Synthex | brand-assets/synthex/01-clean-tile/synthex-tile-384.webp, the clean navy tile, copied byte for byte (replaces the earlier blurry crop with a white border) |
| unite-group-nexus-mark.webp | Nav mark | apps/web/public/logos/unite-group-nexus-logo.png (edge frame cropped, corners rounded to transparent) |

Processing: flatten on white, trim the flat margin, fit inside 192 px square, webp quality 88 to 90.
Collected by the lead on 25/10/2026; see the handover SOURCES.md for the originals.

The svg file is outlined artwork with a transparent background, so its tile has no white plate. Retired marks (including the earlier
Trade Hall mark) are not in the repo; retired-logos.test.ts fails if one returns, even renamed.

# Business logos and the nav mark

Every file here is a trim and resize of a logo file that already exists. No logo is drawn, redrawn, recoloured or
generated. Originals are not committed here (no PNG masters in public/landing); each source is named below.

| File | Business | Source |
|---|---|---|
| disaster-recovery.webp | Disaster Recovery | apps/empire/public/logos/disaster-recovery.png (byte-identical to https://disasterrecovery.com.au/logo.png; a raster tile that carries its own white plate) |
| nrpg-reveal-symbol-dark.svg | NRPG | brand-assets/nrpg/03-reveal/nrpg-symbol-dark.svg ("The Reveal", the symbol for dark backgrounds), copied byte for byte. Phill picked it on 25/10/2026; it replaces every earlier NRPG mark, which are retired |
| trade-hall-floor-symbol-dark.svg | Trade Hall | brand-assets/trade-hall/03-floor/trade-hall-symbol-dark.svg ("The Floor", the symbol for dark backgrounds), copied byte for byte. Phill picked it on 25/10/2026; it replaces every earlier Trade Hall mark, which are retired |
| restoreassist.webp | RestoreAssist | apps/empire/public/logos/restoreassist.png (byte-identical to https://restoreassist.app/logo.png; raster white circle badge) |
| synthex.webp | Synthex | brand-assets/synthex/01-clean-tile/synthex-tile-384.webp, the clean navy tile, copied byte for byte (replaces the earlier blurry crop with a white border) |
| carsi.webp | CARSI | apps/empire/public/logos/carsi.png (the repo blue C badge) |
| unite-group-nexus-mark.webp | Nav mark | apps/web/public/logos/unite-group-nexus-logo.png (edge frame cropped, corners rounded to transparent) |

Processing: flatten on white, trim the flat margin, fit inside 192 px square, webp quality 88 to 90.
Collected by the lead on 25/10/2026; see the handover SOURCES.md for the originals.

The two svg files are outlined artwork with transparent backgrounds, so their tiles have no white plate. Retired marks (the earlier NRPG shield,
the gold badge and the earlier Trade Hall mark) are not in the repo; retired-logos.test.ts fails if one returns, even renamed.

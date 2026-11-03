# @cleanexpo/premium-visuals

The CleanExpo standard visual + motion package. Every customer-facing site uses it; `check-visuals` checks it in CI (report-only while `visuals.config.json` sets `"mode": "report"`). A clean run is never visual acceptance: the SDA evidence gate and the owner's review of the rendered page are still required.

| Piece | What it does |
|---|---|
| `PremiumImage` | next/image AVIF/WebP, hero priority, photographic scrim, caption/credit from the manifest |
| `PremiumVideo` | muted autoplay loop, poster, lazy (IntersectionObserver), AV1/WebM/H.264, reduced-motion + Save-Data aware |
| `PremiumHero`, `MediaSection`, `MediaCard` | default layouts with real media + motion |
| `MotionSection`, `MotionItem` | Motion (framer) scroll reveals, reduced-motion aware |
| `Carousel` | Embla, swipe/keyboard/a11y, lucide icons |
| `navigateWithTransition`, `viewTransitionCSS`, `motionTokens` | View Transitions API page transitions |
| `fonts.ts` | Fraunces + Manrope + JetBrains Mono via next/font |
| `media.manifest.json` + `validateManifest` | every asset needs source (client/stock/generated/blender), credit, alt |
| `bin/generate-media.mjs` | Higgsfield image/video from a prompt manifest, `cinematic-au-restoration` preset, dry-run unless `--go` |
| `bin/blender-render.mjs` + `blender/turntable.py` | headless Blender turntables → AV1/WebM/MP4 + poster |
| `bin/check-visuals.mjs` | CI scanner (zero deps). Report or enforce mode via `visuals.config.json`; exit 2 on a bad config. Regression tests: `npm test` (GP-667) |
| `templates/` | default marketing page scaffold, prompt manifest example, config |
| `rules/AGENTS-premium-visuals.md` | the CLAUDE.md / AGENTS.md rule text |
| `ci/check-visuals.yml` | GitHub Actions workflow |

Peer deps: `next`, `react`, `motion`, `embla-carousel-react`, `lucide-react`.
`next.config`: `images: { formats: ['image/avif', 'image/webp'] }`.

Other repos vendor `bin/check-visuals.mjs` at `scripts/premium-visuals/` so CI needs no install; components are consumed from this package (sync script: copy `src/` into the repo or add as a workspace/git dependency).

GP-667 (3 Nov 2026): the scanner hardening first landed in CARSI's vendored copy (CARSI branch `fix/gp-667-scanner-hardening`) and is carried here so a re-sync keeps it. Re-sync downstream copies from this package, never the other way round.

# Task Brief

[HIGH] [UI/UX] Unite-Group foundation consolidation + corporate-plus-craft rebuild

Description:
## Context

Research agent 2026-04-18 identified token divergence bug: layout imports `src/app/globals.css` but the shadcn HSL token set lives in `styles/globals.css` — shadcn components are orphaned from their token source. Arial body override further masks Satoshi.

## Scope (4-pass plan)

### Pass 1 — Foundation consolidation

* Merge `styles/globals.css` into `src/app/globals.css` (single source).
* Remove Arial body override from `layout.tsx`; let Satoshi/Inter cascade from `next/font`.
* Audit `@layer base` for duplicate HSL declarations.

### Pass 2 — Navigation shell

* Rebuild `<SiteHeader>` with consistent spacing tokens.
* Add mobile drawer (Radix Dialog) — current menu is unusable <640px.
* Active-route highlight via `usePathname()`.

### Pass 3 — Homepage hierarchy

* Hero type scale: h1 clamp(2.5rem, 5vw, 4.5rem), lead text 1.125rem.
* Remove competing CTAs — one primary, one secondary.
* Trust strip (logos) below hero, not inside.

### Pass 4 — Component polish

* Card hover states (translate-y-\[-2px\] + shadow transition).
* Form field focus rings consistent with `--ring` token.
* Skeleton loaders on all data fetches.

## Acceptance

* `pnpm tsc --noEmit` clean
* `pnpm build` succeeds
* Lighthouse mobile ≥ 85 performance
* No inline styles; all tokens via CSS vars

## Source

Research output captured 2026-04-18. Autonomous build ready.

Linear ticket: UNI-1964 — https://linear.app/unite-group/issue/UNI-1964/uiux-unite-group-foundation-consolidation-corporate-plus-craft-rebuild
Triggered automatically by Pi-CEO autonomous poller.


## Session: e91100a942ec

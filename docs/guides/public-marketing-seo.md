# Public marketing surface — SEO and copy touchpoints

This note is for anyone changing the signed-out marketing experience in `apps/web`. Keep it aligned with Phill’s positioning: **Unite Group** umbrella, honest **Live vs Coming** signals, and no invented proof.

## Where defaults live

| Surface | File |
|--------|------|
| Global metadata fallback (Open Graph / Twitter) | `src/app/layout.tsx` |
| Shared helpers for metadata | `src/lib/page-metadata.ts` — `publicPageMetadata()` (indexed marketing + owner cards), `noIndexPageMetadata()` (thank-you, portal, auth, founder CRM, `canonical: null` when there is no stable URL) |
| Home route title/description (canonical for `/`) | `src/app/page.tsx` |
| Other marketing routes | Each `page.tsx` under `PUBLIC_ROUTES` in `src/lib/public-site.ts`; `/grow` uses the same helper with `robots: noindex` |
| Home body copy | `src/components/public/home/copy.ts`, `home-page.tsx` |
| Pillar shipped state | `SHIPPED_PILLAR` in `src/lib/public-site.ts` — hero chip is **Live** for that slug only (`pillar-page.tsx`) |
| Sitemap `lastModified` | `src/app/sitemap.ts` — update the **fixed** `YYYY-MM-DD` when the route’s user-facing copy changes |
| Legal metadata | `src/app/privacy-policy/page.tsx`, `src/app/terms-of-service/page.tsx` |

## Checklist when you ship a copy or UX change

1. Update `ROUTES` dates in `sitemap.ts` for every path you touched (and use `publicPageMetadata` from `page-metadata.ts` for new indexed pages).
2. If the home hero CTAs change, update analytics labels in `home-page.tsx` and tests under `src/components/public/__tests__/` and `src/app/__tests__/landing.test.tsx`.
3. If pillar **Live** moves to another solution, change `SHIPPED_PILLAR` and adjust `pillar-pages.test.tsx` expectations.
4. Run from `apps/web`: `pnpm run type-check`, `pnpm test`, `pnpm run build`.

## Grounded 01/11/2026

`SHIPPED_PILLAR === 'conversion'` and hero chip logic are defined in `src/lib/public-site.ts` and `src/components/public/pillar/pillar-page.tsx`.

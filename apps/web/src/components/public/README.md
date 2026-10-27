# Public marketing UI (`components/public`)

Next.js **App Router** pages under `src/app/` stay thin: metadata, data loaders, and route-specific CSS. Shared public chrome and sections live here.

## Layout

| Folder | Responsibility |
|--------|----------------|
| `site/` | Global chrome: nav, footer, Margot phone line |
| `layout/` | `PublicPageShell`, shared `public.module.css`, `marketing-page.module.css` |
| `legal/` | Policy shells and section primitives (`LegalPageShell`, `LegalSection`) |
| `pillar/` | `/solutions/*` pillar marketing (`PillarPage`, copy, visuals) |
| `home/` | Landing page (`PublicHome`, `HomePage`, `copy.ts`) |
| *(root)* | Shared primitives (film player, contact form, section intro, gallery tile, visuals) |
| `home/faq-data.ts` | FAQ items for the `#answers` section on the home page |

## Import convention

Prefer explicit paths (no barrel re-exports at the root):

```ts
import { SiteNav } from '@/components/public/site/site-nav'
import { PublicPageShell } from '@/components/public/layout/public-page-shell'
import { HOME_HERO } from '@/components/public/home/copy'
```

## Boundaries

- **Copy** for the home page: `home/copy.ts`
- **Pricing / site constants**: `@/lib/public-site`, `@/lib/public-pricing`
- **Founder CRM UI**: `components/founder/` and `app/(founder)/` — do not mix with this tree

## Tokens

Dark public theme tokens: `src/styles/public-tokens.css`. Founder app theme remains in `globals.css`.

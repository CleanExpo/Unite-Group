# Public marketing UI (`components/public`)

Next.js **App Router** pages under `src/app/` stay thin: metadata, data loaders, and route-specific CSS. Shared public chrome and sections live here.

## Path alias

TypeScript resolves marketing UI through **`@/public/*`** (see `apps/web/tsconfig.json`):

```ts
import { SiteNav } from '@/public/site/site-nav'
import { PublicPageShell } from '@/public/layout/public-page-shell'
import { HOME_HERO } from '@/public/home/copy'
import { LegalPageShell } from '@/public/legal/legal-page-shell'
import { PillarPage } from '@/public/pillar/pillar-page'
```

`@/public/...` and `src/components/public/...` are the same tree; prefer the alias in `app/` and cross-surface imports.

## Layout

| Folder | Responsibility |
|--------|----------------|
| `site/` | Global chrome: nav, footer, Margot phone line |
| `layout/` | `PublicPageShell`, shared `public.module.css`, `marketing-page.module.css` |
| `legal/` | Policy shells and section primitives (`LegalPageShell`, `LegalSection`) |
| `pillar/` | `/solutions/*` pillar marketing (`PillarPage`, copy, visuals) |
| `home/` | Landing page (`PublicHome`, `HomePage`, `copy.ts`, `faq-data.ts`) |
| *(root)* | Shared primitives (film player, contact form, section intro, gallery tile, visuals) |

## Boundaries

- **Copy** for the home page: `home/copy.ts`
- **Pricing / site constants**: `@/lib/public-site`, `@/lib/public-pricing`
- **Founder CRM UI**: `@/founder/*` and `app/(founder)/` — do not mix with this tree

## Tokens

Dark public theme tokens: `src/styles/public-tokens.css`. Founder app theme remains in `globals.css`.

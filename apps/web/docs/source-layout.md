# `apps/web` source layout

**Grounded 27/10/2026:** tree matches `apps/web/src` after public-layer refactor — repo `SOURCE-OF-TRUTH.md` remains the monorepo SSOT.

## Top level (`src/`)

| Path | Role |
|------|------|
| `app/` | Next.js App Router: routes, API handlers, route-local CSS and tests |
| `components/` | React UI by surface (public, founder, command-centre, ui) |
| `lib/` | Server-safe modules: Supabase, integrations, domain logic, no JSX |
| `styles/` | Global and shared CSS (e.g. public tokens) |
| `store/` | Client state (Zustand) |
| `test/` | Shared test helpers |
| `proxy.ts` | Edge/middleware entry |

## `app/` conventions

- **Route groups:** `(founder)/` for authenticated founder CRM; no group for public marketing and APIs.
- **Colocation:** `page.tsx`, `layout.tsx`, `route.ts`, `*.module.css`, and `__tests__/` beside the route when tests are route-specific.
- **Thin pages:** compose from `components/`; avoid large JSX blocks in `page.tsx` when the same UI is reused (see `cards/order/order-view.tsx`).

## Path aliases (`tsconfig.json`)

| Alias | Maps to | Use for |
|-------|---------|---------|
| `@/*` | `src/*` | App routes, `lib/`, shared utilities |
| `@/public/*` | `components/public/*` | Marketing site UI |
| `@/founder/*` | `components/founder/*` | Founder CRM UI |

Prefer `@/public/...` and `@/founder/...` over `@/components/public/...` in application code. Files inside those trees may keep relative imports.

## `components/` conventions

- **`components/ui/`** — design-system primitives (buttons, inputs).
- **`components/founder/`** — founder CRM feature UI by domain; see `components/founder/README.md`.
- **`components/command-centre/`** — board / command deck.
- **`components/public/`** — marketing site; see `components/public/README.md`.

## `lib/` conventions

- One concern per folder (`lib/cards`, `lib/margot`, `lib/legal`, …).
- Tests in `lib/**/__tests__/` next to the module.
- No imports from `components/` into `lib/` (dependency flows down).

## Founder domain layout

Founder UI is already split by domain (`contacts/`, `vault/`, `bookkeeper/`, …). The standard stack per feature:

1. **`app/(founder)/founder/<feature>/page.tsx`** — thin server entry (metadata, loaders).
2. **`@/founder/<domain>/*PageClient.tsx`** — client UI for that route.
3. **`lib/<domain>/`** — queries, integrations, validation (no JSX).

Do not add new top-level folders under `components/founder/` without a matching route and `lib/` owner.

## What we did not move (intentionally)

Bulk-moving files between founder domains or reshaping every `app/api/` subtree is still high-risk. Extend the pattern above one domain at a time with tests.

## Verify after structural changes

```bash
cd apps/web && pnpm run type-check && pnpm test && pnpm run build
```

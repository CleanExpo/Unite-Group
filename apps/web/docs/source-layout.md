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

## `components/` conventions

- **`components/ui/`** — design-system primitives (buttons, inputs).
- **`components/founder/`** — founder CRM feature UI.
- **`components/command-centre/`** — board / command deck.
- **`components/public/`** — marketing site; see `components/public/README.md`.

## `lib/` conventions

- One concern per folder (`lib/cards`, `lib/margot`, `lib/legal`, …).
- Tests in `lib/**/__tests__/` next to the module.
- No imports from `components/` into `lib/` (dependency flows down).

## What we did not move (intentionally)

A full reshuffle of `components/founder/` (200+ files) and every `app/api/` subtree is high-risk with little gain in one pass. Future refactors should follow the same rules: **thin routes, fat `lib/`, surface-based `components/`**, and move one domain at a time with tests.

## Verify after structural changes

```bash
cd apps/web && pnpm run type-check && pnpm test && pnpm run build
```

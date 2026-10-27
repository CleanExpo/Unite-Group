# Unite-Group (apps/web)

Next.js 16 product surface for Unite-Group: public marketing site, founder CRM, APIs, and Supabase-backed data. This package is a pnpm workspace root (`pnpm-workspace.yaml` includes nested `packages/`).

## Layout

| Path | Purpose |
|------|---------|
| `src/app/` | App Router routes and API handlers |
| `src/components/` | UI (`public/`, `founder/`, `ui/`, …) |
| `src/lib/` | Server modules (no JSX) |
| `public/` | Static assets |
| `supabase/` | Migrations and local DB config |
| `e2e/` | Playwright journeys |
| `docs/` | Product and engineering documentation ([index](docs/index.md)) |
| `config/` | Machine-readable config (e.g. project DoD registry) |
| `scripts/` | Tooling and one-off automation |

Import conventions and folder rules: [`docs/source-layout.md`](docs/source-layout.md).

Operational evidence logs (E2E append targets): [`docs/operations/`](docs/operations/).

## Commands

From this directory:

```bash
pnpm install
pnpm dev
pnpm run type-check
pnpm test
pnpm run build
```

Monorepo verify from repository root: `npm run verify:web`.

## Environment

Copy `.env.example` to `.env.local` and fill required variables. See `CLAUDE.md` in this package for founder scoping, design tokens, and delivery rules.

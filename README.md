# Unite-Group

The single canonical monorepo for the Unite-Group product and ecosystem
(see `SOURCE-OF-TRUTH.md`).

- **Product**: `apps/web` — Unite-Group (AI-first CRM + command centre), Next.js 16 / React 19 / Supabase / Vercel
- **Agent command centre**: `apps/workspace`
- **Identity spine (gated greenfield)**: `packages/spine`
- **Portfolio-health MCP**: `packages/pi-ceo-operator-mcp`
- **Knowledge vault**: `docs/brain`
- **Convergence programme**: `docs/convergence/` + `.claude/skills/fable-prompt-engineer/`

## Develop

Each package is self-contained with its own lockfile:

```bash
cd apps/web && pnpm install && pnpm dev        # the product
cd apps/workspace && pnpm install && pnpm dev  # agent workspace
```

Verify everything: `npm run verify` (root).

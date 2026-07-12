# Unite-Group

The single canonical monorepo for the Unite-Group product and ecosystem
(see `SOURCE-OF-TRUTH.md`).

- **Product**: `apps/web` — Unite-Group (AI-first CRM + command centre), Next.js 16 / React 19 / Supabase / Vercel
- **Agent command centre**: `apps/workspace`
- **Spec engine**: `apps/spec-board` — Fabel-Prompt-Engineer, plain-English vision → verified, build-ready spec
- **Autonomy design/tests + retirement tombstone**: `apps/autopilot-runner` —
  OWNEST policy/adapters are design- and test-only; the build emits only the
  one-file legacy-runner refusal container and no host runtime
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

Run the root readiness, web, workspace, autopilot, MCP, and spec-board gates with
`npm run verify`. It does not run the separate docs-watcher test/fetch, live
provider checks, production verification, deploys, pushes, or merges.

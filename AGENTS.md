# Agent instructions — Unite-Group monorepo

This file is read by Codex (and other) agents working in this repo. The
canonical, full rules live in **`CLAUDE.md`** and **`SOURCE-OF-TRUTH.md`** —
read those first. This file restates the rules most often broken by automated
agents.

## Pull requests — base on `main`, always

**Every PR must target `main`. Never stack a PR on another feature branch.**

Stacked PRs merge into their base branch and strand the work there — it never
reaches `main`. This happened with the mobile-voice stack: PRs #281/#282/#283
were each based on `codex/mobile-voice-intake` instead of `main`, so only the
bottom of the stack landed and the rest (persistence, source notes, board
packets, 3 Supabase migrations) had to be recovered via #285.

Correct flow:

1. Branch off the **latest `main`** (`git fetch origin main` first).
2. Keep the change scoped to one issue.
3. Open the PR with **`--base main`**.
4. If your work depends on another in-flight branch, wait for that branch to
   merge to `main`, then rebase onto `main` — do not stack.

## Other load-bearing rules (see `CLAUDE.md` for detail)

- **Sandbox-first DB**: no production Supabase migrations without explicit typed
  approval. Migration *files* may land in `main`; *applying* them is gated.
- **Toolchain**: each package keeps its own lockfile/package manager. Verify via
  root `package.json` scripts (`npm run verify:web`, etc.).
- **No writes to the former repos** (Unite-Hub, brain-1, Spine, hermes-workspace,
  pi-ceo-operator-mcp) — frozen pending deletion.
- **Deletion** of any repo/Supabase/Vercel resource: runbook gates + typed
  approval only. Never autonomous.
- Do not read or print secrets. Locale: en-AU | DD/MM/YYYY | AUD | AEST/AEDT.

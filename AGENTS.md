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

- **DB — Supabase branching**: validate every schema change/migration on a
  **Supabase database branch** before prod. There is no standing sandbox (the
  mirror project was deleted 15/06/2026 and won't be replaced). Prod moves only
  via a merged, approved branch — never apply to prod directly or autonomously.
  Migration *files* may land in `main`; *applying* them is gated.
- **Toolchain**: each package keeps its own lockfile/package manager. Verify via
  root `package.json` scripts (`npm run verify:web`, etc.).
- **No writes to other repos.** `brain-1`, `Spine`, `hermes-workspace`,
  `pi-ceo-operator-mcp` — frozen pending deletion. **Unite-Hub was wound down on
  20/06/2026 after Phill's typed approval; its earlier 18/06/2026
  separate-live-product instruction is superseded** — it is no longer live;
  never target, write to, depend on, or recreate it from this repo. `apps/web`
  is the canonical product surface.
- **Deletion** of any repo/Supabase/Vercel resource: runbook gates + typed
  approval only. Never autonomous.
- Do not read or print secrets. Locale: en-AU | DD/MM/YYYY | AUD | AEST/AEDT.

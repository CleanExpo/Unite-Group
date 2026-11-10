# Agent instructions — Unite-Group monorepo

This file is read by Codex (and other) agents working in this repo. The
canonical, full rules live in **`CLAUDE.md`** and **`docs/governance/SOURCE-OF-TRUTH.md`** —
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

## Commit messages

### What the required check enforces (and nothing more)

`main` requires the check **Commit-message convention (Linear ref + Gate line)**.
It runs `node scripts/check-commit-messages.mjs origin/main HEAD` and fails the
PR if any one commit breaks either rule:

1. **The subject names a Linear ticket**: `UNI-`, `RA-`, `SYN-`, `CCW-` or `DR-`
   followed by 1 to 5 digits, for example `(UNI-2658)`. Any letter case.
2. **The body has a line starting `Gate:`** (optionally bold, `**Gate:**`) with
   some text after it. The check reads only that the text is there, not what
   it says.

- **Every commit in `origin/main..HEAD` is checked**, not only the last one.
  A PR title with a ticket does not fix a commit subject without one.
- Skipped: merge commits (two parents, or a `Merge branch …` /
  `Merge remote-tracking branch …` / `Merge pull request #…` subject) and
  Dependabot commits that carry both its `[bot]` sign-off and its
  `updated-dependencies:` block.

### Authoring advice (no check reads these)

- On the `Gate:` line, name the checks that actually ran and their results.
- Cloud agents (Cursor, Codex cloud, Claude off the PC) do not run the local
  release hooks. Run `npm run check:commit-messages` before you push.
- **Open every PR as a draft.** Separately from the commit check,
  `.github/workflows/draft-on-red.yml` turns a non-draft PR on `main` back to
  draft, with a comment naming the gate, when a required check has failed, a
  review thread is unresolved, or `nexus/release-receipt` is missing after
  Monorepo CI has finished on the PR's head. It runs when Monorepo CI
  finishes and every 15 minutes.

The checker's own example (a test keeps this block identical to it):

```text
feat(ci): describe the change (UNI-2658)

What cannot happen after this merge: ...

Gate: <the gauntlet that actually ran>.
```

## Other load-bearing rules (see `CLAUDE.md` for detail)

- **Canonical identity**: the current product/project name is **Unite-Group**. Retired product names must not appear in active prompts, task titles, status text, dashboards, memory or newly-authored documentation. Historical lineage belongs only in explicit legacy/history context.
- **DB — Supabase branching**: validate every schema change/migration on a
  **Supabase database branch** before prod. There is no standing sandbox (the
  mirror project was deleted 15/06/2026 and won't be replaced). Prod moves only
  via a merged, approved branch — never apply to prod directly or autonomously.
  Migration *files* may land in `main`; *applying* them is gated.
- **Toolchain**: each package keeps its own lockfile/package manager. Verify via
  root `package.json` scripts (`npm run verify:web`, etc.).
- **No writes to other repos.** `brain-1`, `Spine`, `hermes-workspace`,
  `pi-ceo-operator-mcp` — frozen pending deletion. The former standalone CRM
  repository was wound down on 20/06/2026 after Phill's typed approval; its
  earlier separate-live-product instruction is superseded. It is no longer
  live; never target, write to, depend on, or recreate it from this repo.
  `apps/web` is the canonical product surface.
- **Deletion** of any repo/Supabase/Vercel resource: runbook gates + typed
  approval only. Never autonomous.
- **Ground truth over hearsay**: re-derive inherited claims from the real
  repo/logs/schema before building on them; never claim a delivery stage beyond
  its evidence. Every build report/PR body carries at least one
  `Grounded <date>: <fact> — <source>` line and a `Waterline:` stage line. Full
  rule: `.claude/rules/ground-truth-standard.md`.
- Do not read or print secrets. Locale: en-AU | DD/MM/YYYY | AUD | AEST/AEDT.

## Review rounds and Claude allowance (founder rule, 24/10/2026)

- Max 2 Codex review rounds on any plan or config. If it still fails after round 2, park the findings in the status file (PAIR-STATUS.md), tell Phill in one line, and keep building.
- Codex reviews the BUILT thing, not repeated plan versions.
- Claude allowance is limited. Use Codex, Sonnet subagents and scripts for grunt work; keep Opus for lead decisions.

## Premium Visual & Motion Standard (HARD RULE — Phill McGurk, 2 Nov 2026)

This applies to every page a customer can see.

**Current enforcement state (GP-667):** `check-visuals` runs in CI in **report-only** mode while `visuals.config.json` sets `"mode": "report"`. It lists findings in the job summary and does not fail the PR. Switching to `"enforce"` is a separate, owner-approved change once the baseline findings are cleared. A configuration error (exit 2) fails in either mode. The scanner is a static text heuristic: a clean run, in either mode, is **not visual acceptance**. Rule 7's SDA evidence gate and the owner's review of the rendered page are still required, and manifest `credit`/`source` fields are declarations only, not verified rights. Runtime: Node 20 or later, no dependencies (`node packages/premium-visuals/bin/check-visuals.mjs --root .`, or the vendored copy at `scripts/premium-visuals/check-visuals.mjs`; add `--json` for the full machine-readable report).

A page with a violation is not done, even while the check only reports.

1. **No code-drawn graphics.** Zero TypeScript/CSS/SVG/canvas illustrations, decorative shapes, conic/radial gradient "art", clip-path shapes or placeholder images. UI icons come from a real icon set (lucide-react); logos are marked `data-pv-allow="logo"`.
2. **Real media only, in this order:** the client's own photos/video → licensed real stock (downloaded and self-hosted, never hot-linked) → Higgsfield photoreal images/video using the `cinematic-au-restoration` preset → Blender renders for products/equipment (offline turntables, never heavy runtime WebGL). Every file is listed in `media.manifest.json` with `source` (client|stock|generated|blender), `credit` and `alt`.
3. **Every marketing page uses the standard package** `@cleanexpo/premium-visuals`: `<PremiumHero>` with a muted, looping, lazy-loaded video (AV1 MP4 + WebM + H.264 MP4, poster required) or a real photo; at least one `<MotionSection>`; `<Carousel>` (Embla) for galleries, testimonials, services/courses; page transitions via `navigateWithTransition`/View Transitions; all motion honours `prefers-reduced-motion`. Start new pages from `packages/premium-visuals/templates/marketing-page.tsx` (vendored copies: `scripts/premium-visuals/marketing-page.template.tsx.txt`). The package is **not yet installed** as a dependency of any app, so the scaffold does not compile until it is.
4. **Premium type and layout:** Fraunces display + Manrope body + JetBrains Mono data via next/font (or the repo's approved brand system). No system/Inter/Roboto/Arial.
5. **Media budgets:** AVIF/WebP images ≤ 450 KB, videos ≤ 6 MB, no PNG/JPG > 80 KB, no .mov.
6. **Visibility pillars first:** Find → Crawl → Index → Ranking are set up before any SEO/AEO/GEO tactics.
7. **Process:** plan the page with the **SPM** skill (`/spm` — spec before build, include the media plan and prompt manifest), then pass the **SDA visual and commercial evidence gate** (`skills/visual-qa`, `sda_evidence_gate.py`: real Playwright screenshots at 390/768/1440, reduced-motion check, video frame review, named SDA rubric). Non-zero = HOLD.
8. Once the package is installed: generate media with `npx generate-media --prompts media.prompts.json` (dry run by default; `--go` uses the existing Higgsfield plan; keys from env, never printed). Render 3D with `npx blender-render model.glb --id <id>`.

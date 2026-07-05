**Overnight Sweep — 05/07/2026 (Unite-Group)**

7 PRs merged to main tonight, all CI-green pre-merge, squash-merged:
#643 `203cb0c4` signals/ingest bounding · #644 `1d857f24` spec-board engines.node · #646 `e48ac93e` CLAUDE.md autopilot-runner row · #647 `baf8c59f` README missing apps · #648 `aecaae81` SOURCE-OF-TRUTH Unite-Hub reconcile · #649 `451dc689` remove dead Phase-12 smoke tests · #650 `6c57580f` Synthex citation-tracker source discriminator.

**#645** (drop false Stripe-billing claim from PORTFOLIO.yaml) did NOT merge overnight (Playwright E2E was in-flight) — re-checked just now, all checks are now green, just `BEHIND` main (mergeable, needs a rebase-merge + re-push). No decision needed, purely mechanical.

Both repos' `main` green (Unite-Group @ 6c57580f, Pi-Dev-Ops last 5 runs all success).

20 items excluded as founder-gated or product-decision (Gmail OAuth consent, FORCE RLS prod apply, PostgREST schema-cache, social-campaign UI mount/delete, Margot voice widget, MFAGate/IMAP orphans, CONSTITUTION Core-9 drift, auto-merger governance, mesh-heartbeat cloud port, etc. — full list + safe defaults in the morning report).

15 new leads surfaced in a second pass (not built): 2 latent E2E test bugs from the UNI-2306 dashboard retirement (fixture + spec target a now-redirect-only URL), 6 confirmed dead-code deletions, FORCE RLS migration file (write-only), PostgREST cache-reload pipeline fix, dead CI workflow (Portfolio Registry Validation never runs — wrong directory), RANA runbook pointing at a deleted registry file, stale COVERAGE.md headline.

Full report: `docs/session-handoffs/overnight-undefined.md` (untracked, in Unite-Group checkout).
---
RECONSTRUCTION NOTE (06/07): the original 13,935-byte overnight report was lost when the
canonical checkout directory was deleted mid-morning 06/07 (uncommitted artifact). This file
is the workflow's own compact Linear summary (UNI-2246 comment 7052672e), preserved verbatim.
Full detail per item lives in the Linear evidence comments on each ticket (#643-#650 PR bodies).

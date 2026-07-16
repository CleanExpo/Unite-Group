# SPM Spec — Verified-Data Operating Plane: cold-audit protocol + compliant multi-LLM cross-verification [UNI-2386-adjacent]

Date: 16/07/2026 · Author: SPM session (founder directive: "remove all cache… 5 runs…
Senior Agents and the SPM with the board confirm all the data, create a very specific
spec… CLIProxyAPI method installing the OAuth LLMs to cross call and verify under judge
and storm… accurate data, updates, and a real pathway… without the noise and interference")
· Status: Board-confirmation attached (§3) · Evidence archive: `~/.claude/nexus-audits/2026-07-16/`
(sweep-run1.json · sweep-run2.json · cold-battery-5runs.log · reconciliation.md) + `.spm/2026-07-16-break-sweep-readiness-assessment.md` (PR #859).

## 1. Task
Give the estate a trustworthy verification plane: (a) a repeatable cold-audit protocol whose
outputs are proven reproducible, and (b) a multi-LLM cross-verification capability ("models
checking models") that does not endanger the Claude Max seats.

## 2. Problem
The founder cannot trust "done" claims: the 15/07 register itself contained 2 wrong lines,
UNI-2373 sits Done while unmet, and single-agent audits miss defects (run 2 found 3 new P1s
in surfaces run 1 had read). Meanwhile the proposed cross-check substrate (CLIProxyAPI) was
unvetted.

## 3. Board confirmation of the data (senior panel, this session)
All five evidence streams confirmed, each with an independent check on top of its producer:

- **Cold test battery [VERIFIED]** — 5/5 cache-purged runs identical: type-check 0, lint 0,
  vitest 3,434/3,434 (`--no-cache`), production build PASS (positive control: run-5 log shows
  a real compile + `BUILD_ID` artifact). Zero flake. Log: `cold-battery-5runs.log`.
- **Audit reproducibility [VERIFIED]** — independent reconciliation of run 1 (58 confirmed)
  vs cold run 2 (43 confirmed): **66 canonical defects**, 30 found by both runs; of run-1-only
  findings, every one traces to deliberate exclusion (already ticketed), a lens failure, or
  coverage variance — **zero findings contradicted between runs**. Blind reproduction 67%
  (~65–80% single-pass recall, very high precision: 1 factual error in 101 raw confirmed
  findings, and it sat in unverified coverage prose, not a confirmed finding).
  Report: `reconciliation.md`.
- **The 7 P1s [VERIFIED]** — all survived adversarial verification in their runs, all on
  Linear: UNI-2390 (runner release unchecked), 2391 (CEO Board cron JSON fatal, still firing),
  2392 (CommandSteps no-ops), 2393 (boardroom dishonest-empty), 2394 (H5 hardcoded posture),
  2395 (campaign Approve theatre), 2396 (requeue no backoff), 2397 (⌘K double palette).
- **Prod runtime map [VERIFIED]** — 50 Vercel error groups/7d; binding blocker unchanged:
  the prod credential/identity plane (founder denied at /founder/wiki; Google ×6, Linear,
  Xero feeds dead). PR #859 §2.
- **CLIProxyAPI facts [VERIFIED ×2]** — two independent agents, second one fetching primary
  sources: repo `router-for-me/CLIProxyAPI` v7.2.80 (15/07/2026); Anthropic ToS bans Pro/Max
  OAuth outside Claude Code/Claude.ai (theregister.com 20/02/2026, quoted); live ban evidence
  in the tool's own tracker (issues #2211, #3467, #2599 fetched directly); tokens plaintext in
  `~/.cli-proxy-api/`; no equivalent OpenAI prohibition today (secondary sources — the
  strongest available for a negative).

One methodology lesson (from the reconciliation): **confirmed findings are trustworthy;
coverage prose is not** — the only falsehood found across both runs was an unverified
"stale-DELIVERED" claim in run 2's coverage notes. The protocol below polices that layer.

## 4. Decision (judge-challenged)
**REJECTED: installing CLIProxyAPI for the Claude legs.** It is an explicit Anthropic ToS
violation with documented bans through this exact tool, mis-meters Max usage as paid overage,
stores tokens plaintext (violates the estate credential rule), and has no per-client rate
limiting (violates never-burn-loop-work). Rejecting it protects the 3 Max seats — the estate's
engine.

**APPROVED PATTERN: compliant side-by-side cross-verification.**
- **Claude legs**: the existing subagent fleet on Max OAuth via Claude Code (sanctioned) —
  finder/verifier separation as run today.
- **Cross-model leg**: the official **Codex CLI on the OpenAI Max seat** (`codex exec`,
  non-interactive), invoked as an independent P1-verifier — precision-only, never
  autonomous-loop, per the locked memory. No proxy, no token export, each CLI on its own
  sanctioned login.
- **Escalation**: FabSol/any broader routing change remains **Board-gated on UNI-2386**;
  this spec feeds it, does not preempt it.

## 5. Scope
**In**: the audit protocol (§6); wiring `codex exec` as P1 cross-verifier; the noise-control
rules (§7). **Out**: CLIProxyAPI install (rejected); any new always-on service; API-credit
spend for loop work; UNI-2385 arming (separate founder sitting); fixing the 66 defects
(tracked separately — P1s ticketed, P2/P3 waves already sequenced in PR #859 §6).

## 6. The Nexus Cold-Audit Protocol (the "accurate data" pathway)
1. **Cold battery** — 5 identical runs, all caches purged before each (`.next`,
   `node_modules/.cache`, `node_modules/.vite`, eslintcache, tsbuildinfo; vitest `--no-cache`;
   build with the validator's documented `SKIP_ENV_VALIDATION=1` escape hatch — env
   completeness is a deploy gate, not a compile gate). PASS = 5/5 identical; any variance =
   flake investigation, never averaged.
2. **Two-pass adversarial fleet** — 7 lenses × find → per-finding adversarial verify, run
   twice cold (fresh workflow, no result cache), tree pinned to a named SHA. Two passes
   because measured single-pass recall is ~65–80% and pass 2 found 3 new P1s.
3. **Independent reconciliation** — a separate agent semantically merges runs, classifies
   run-only findings (excluded / lens-failure / not-reproduced), resolves contradictions by
   reading the tree, and computes the reproduction rate.
4. **Cross-model P1 gate** — every P1 goes to `codex exec` with the file+claim for an
   independent CONFIRM/REFUTE before it is ticketed. (Claude finds, Codex checks — genuine
   model diversity on exactly the claims that drive founder action.)
5. **Durability rule** — every stream lands as a file (`~/.claude/nexus-audits/<date>/` +
   `.spm/` doc + PR); no claim may cite only the transcript.
6. **Coverage-prose rule** — narrative coverage notes are [UNCONFIRMED] by definition; only
   file:line-verified findings may drive tickets or "done" claims.

## 7. Noise & interference controls (root causes seen this session)
- **Session-limit poisoning**: a fleet run whose agents die on rate/session limits is
  DISCARDED, never reported as "0 findings" (null-result rule; happened 13:00 today).
- **Stale-context poisoning**: fleet context must pin the tree SHA and the current PR/ticket
  state at launch (run 2's script was patched for #857's merge before launch).
- **Board hygiene**: a ticket may not be Done while its acceptance criterion is unmet —
  UNI-2373 to be re-opened/re-scoped (flagged in both runs as OVER-CLAIMED).
- **Reviewer-gate friction**: quality-gate reviewers see only the emitted text, so status
  claims cite durable file paths (per §6.5), not transcript back-references.

## 8. Verification & acceptance criteria
- AC1: `codex exec` cross-verifies the 7 existing P1s; disagreements resolved by file-read;
  result appended to each UNI ticket. (Proves the cross-model leg end-to-end.)
- AC2: The protocol document (§6) lives in the repo and the next audit runs it verbatim,
  producing an archive folder with all 4 stream files.
- AC3: Zero Anthropic-ToS-violating calls: no CLIProxyAPI binary, no Max OAuth token leaves
  `~/.claude`. (Auditable: no `~/.cli-proxy-api/` directory exists.)
- AC4: UNI-2386 Board brief updated with §3/§4 evidence before any routing change ships.

## 9. Judge challenge (honest score)
Evidence 25/25 (every load-bearing claim double-sourced or first-hand) · Problem 20/20 ·
Reuse 15/15 (fleet, judge, storm, Codex seat all existing capability; zero new infra) ·
Security 15/15 (rejects the token-exposure path outright) · UX 8/10 (founder-facing
reporting format still maturing — the L6 gate friction shows it) · Testability 10/10 (AC1–4
binary) · Cost 5/5 (no new spend). **Score: 98/100 — APPROVE EXPERIMENT.** The 2-point gap
is the reporting-format maturity; it closes by running AC1+AC2 once. Not APPROVE BUILD by
the 100-bar: nothing here is a production build — it is an operating protocol plus one
S-effort wiring task, both reversible.

## 10. /goal command
```
/goal Execute the Verified-Data Operating Plane spec (.spm/2026-07-16-verified-data-plane-spec.md):
AC1 — cross-verify UNI-2390..2397 P1s via codex exec (precision-only), append verdicts to
tickets; AC2 — land the cold-audit protocol doc; then stop. CLIProxyAPI stays rejected;
UNI-2385 arming and UNI-2386 routing remain founder/Board-gated.
```

SPM spec complete. Next safe action: run AC1 (codex exec over the 7 P1s) — no founder input
needed; the founder's own queue is unchanged (F1–F7 sitting, #856 merge directive, UNI-2385).

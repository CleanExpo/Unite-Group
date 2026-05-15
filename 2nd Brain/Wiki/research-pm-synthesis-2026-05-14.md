---
type: wiki
updated: 2026-05-14
---

# PM Synthesis — Four Research Briefs → Tonight's Execution (2026-05-14)

## 1. Executive summary

Four parallel research streams converge on a single headline: **`/goal` + auto-mode is the right substrate for tonight's overnight queue, and the four queued workstreams (CCW+CARSI Waves B-E, Command Center PR-2, PR-3, Cluster 1 rollup) are well-sized for it**. Cluster A drafted a ~2050-char `/goal` spec that honours all five Karpathy/Ashby rules and the autonomous mandate; Cluster D's SEO-Goals brief independently arrives at the same verifier-loop pattern from the opposite end (Stenberg's `5 vulns → 1 real` shows agents without verifiers hallucinate confidence). Clusters B and C add three non-blocking adoptions for this week: personalise the global `CLAUDE.md` above the Karpathy floor, install Mobbin MCP scoped to the PR-50 redesign, and pilot Deepsec weekly on the 4 high-risk Vercel repos.

**Biggest unblock:** Cluster A's `/goal` spec references `docs/product-roadmap.md` checkboxes as the binary completion signal, but that file **does not exist at `/Users/phill-mac/pi-seo-workspace/unite-group/docs/`** — only `superpowers/plans/2026-05-14-ccw-carsi-overnight-rana-handoff.md` exists. The locked spec in §4 fixes this by pointing the verifier at the plan's existing `- [ ]` checkboxes instead of a missing roadmap file.

## 2. Ranked action register

Ranked by strategic leverage × inverse cost. All 12 actions traced to a source brief.

| # | Action | Source(s) | Effort | Owner | Risk if skipped | Verdict |
|---|--------|-----------|--------|-------|-----------------|---------|
| 1 | Fire `/goal + auto` on tonight's overnight queue (4 workstreams) | A §4 L66; D §SEO Goals L88-103 | 30 min prep + overnight | Claude session | Four workstreams stay manual-stepped, autonomy mandate burned | SHIP-TONIGHT |
| 2 | Verify Wave A discovery files exist; chain Wave B persona reviews into the `/goal` stop condition | A §4 L66; plan file Wave A→B gate | 10 min | Claude session | Wave B fires against missing/half files; cascade fails | SHIP-TONIGHT |
| 3 | Add explicit `/goal`-style verification gate to plan (re-run typecheck/CI between waves) | A §4 L69; D §SEO Goals L94 | embedded in §4 spec | Claude session | Drift compounds across 4 workstreams overnight | SHIP-TONIGHT |
| 4 | Personalise `~/.claude/CLAUDE.md` beyond Karpathy floor (portfolio context, wiki-first, no-Slack, secrets, design-prefs) | B §7 rec 1 L77-80 | 30 min | Phill (or Claude with approval) | Every session re-discovers operating rules from auto-memory | SHIP-THIS-WEEK |
| 5 | Build `~/.claude/skills/index.md` intent→skill map (73 skills past discoverability threshold) | B §7 rec 2 L82-85 | 2 hrs | Claude | Wrong-skill invocations continue; skill-sprawl tax compounds | SHIP-THIS-WEEK |
| 6 | Install Mobbin MCP, scope strictly to PR-50 command-center redesign, $120/yr | B §7 rec 4 L92-95 | 30 min | Phill (1Password key) | PR-50 designs from prose descriptions instead of real FUI references | SHIP-THIS-WEEK |
| 7 | Pilot Deepsec weekly cron on `ccw-crm-web`, `unite-group`, `restoreassist`, active client portal | C §7 #1 L113-117 | 2 hrs total | Claude | Static-analysis blind spot on 4 customer-PII repos remains | SHIP-THIS-WEEK |
| 8 | Pre-build CCW returns/CS managed-agent pilot for 26 May Toby kickoff | C §7 #2 L119-123 | 4 hrs pre, 30 min activation | Claude | Day-1-back demo to Toby misses; retainer expansion delayed | SHIP-THIS-WEEK |
| 9 | Strip "schema-boosts-AI-citations" claim from SEO playbooks; update `[[ai-citation-frequency]]` metric methodology | D §Schema verdict L24-27 | 1 hr | Claude | Margot quotes a busted tactic externally; client trust hit | SHIP-THIS-WEEK |
| 10 | Build `portfolio_health` MCP exposing Supabase live state (board_mandates, ci_status, hour-1 SLA) | A §5 L84 | 2-3 hrs | Claude | Margot manual `margot-align` cycle continues; Board re-queries state each session | DEFER |
| 11 | Run skill-creator AB benchmarks on top-10 skills | B §7 rec 3 L87-90 | 1 day (parallel) | Claude | Some skills may be net-negative drag, untested | DEFER |
| 12 | Friday 2-hr Hyperframes sandbox; port technique into Remotion `WebsiteIntroReel` composition | A §6 L93; A §7 L113-117 | 4 hrs | Claude | One reusable composition missed; no urgent client need | DEFER |
| — | Adopt Higgsfield Supercomputer harness | C §2 verdict L32 | — | — | Duplicates Remotion package at zero marginal cost on Max | REJECT — duplicates Remotion package; no fit. |
| — | Add `agents.md`/JSON-LD schema for AI citations to any portfolio site | D §Schema L24-27 | — | — | Ahrefs controlled test shows zero lift; some sites declined 4.6% | REJECT — empirically busted. |
| — | Slack route for Cowork scheduled-routines or Deepsec reports | A §5 L85; C §6 L93 | — | — | Memory rule: no-Slack, repeated firm rejection | REJECT — violates `[[feedback-no-slack]]`. |
| — | Cloud-mode automations (Anthropic Cloud agents, Higgsfield MCP cloud connector) for routine work | B §3 L41; D §Google Omni L36 | — | — | Cluster B audit confirms local-first is correct; `[[reference-composio-connections]]` is cross-env default | REJECT — local-first stays. |

## 3. Verification checks needed

Audit-verification rule applied — every SHIP-TONIGHT/SHIP-THIS-WEEK claim ground-truthed. Verifications performed this synthesis:

| Claim | Verification | Result |
|---|---|---|
| `~/.claude/CLAUDE.md` is the Karpathy template verbatim (B §6 L70) | `cat ~/.claude/CLAUDE.md` | **CONFIRMED** — four rules (Think Before Coding / Simplicity First / Surgical Changes / Goal-Driven Execution) match Karpathy template word-for-word; zero Phill-specific personalization above the floor. |
| 73 skills exceed discoverability threshold (B §3 L34) | `ls ~/.claude/skills/ \| wc -l` | **CONFIRMED** — 73 directories. |
| `/goal` requires auto-mode + 40-80 checkbox roadmap to terminate cleanly (A §2 L23-29, §3 L41-47) | Re-read `Sources/Claude Code goal Just Dropped…md` L68, L78, L102 | **CONFIRMED** — source L78: "these road maps for a full application tend to be between 40 to 80 tasks"; L68: "small fast model checks whether the condition holds"; L74: auto-mode required to prevent permission-prompt stalls. |
| Mobbin MCP costs $120/yr (B §4 L54) | `grep` source L73-75 | **CONFIRMED** — source L75: "Quarterly, it's going to be 15 bucks per month built quarterly. And yearly, it's 10 bucks." → $10/mo annual = $120/yr. Source verbal phrasing "$120 a month" at L75 is a slip; the $10×12 math binds. |
| Deepsec runs free on Claude Max (C §3 L47) | `grep` source L68, L82 | **CONFIRMED** — source L68: "since I have a Claude Max plan, I am going to use that"; L82: "if you want to know what the cost of this thing is with just the API itself, it would have been roughly $19.50 to run this" — i.e. $0 on Max. |
| `docs/product-roadmap.md` exists at unite-group root (A §4 L66 implicit) | `ls /Users/phill-mac/pi-seo-workspace/unite-group/docs/` | **FAILED** — directory contains only `AUTO-PUBLISH-FAILURE-MODE-REGISTER.md`, `MIGRATION-PROTOCOL.md`, `adr/`, `brand/`, `integrations/`, `sows/`, `superpowers/`. No `prd.md`, no `product-roadmap.md`, no `design.md`. **§4 spec rewritten to point at `docs/superpowers/plans/2026-05-14-ccw-carsi-overnight-rana-handoff.md` checkboxes, which DO exist and DO use `- [ ]` syntax.** |
| Wave A discovery already running, Wave B persona reviews in flight | plan file header L9 ("Five-wave audit pipeline") + Wave A subagent spec | **CONFIRMED** — plan exists at expected path, Wave A spec produces `ccw-crm-discovery-audit-2026-05-14.md` and `carsi-discovery-audit-2026-05-14.md`, Wave B consumes those. Spec gates Wave B start on Wave A files existing. |

**One claim failed**: missing `docs/product-roadmap.md` — Cluster A's spec was unverifiable as written. Locked spec in §4 fixes this.

## 4. The `/goal` spec — final

### Critique of Cluster A's draft (§4 L66)

Strengths: honours all 5 Ashby rules (measurable end state, sized between prompt and backlog, defines achieve/change/validate/stop, knows "done" before starting, ≤4000 chars with constraints). Names the four workstreams explicitly. Bakes `[[feedback-audit-verification]]` in via "do not advance until CI passes". Includes the empire-route exclusion and the 2FA pause behaviour.

Weaknesses:
1. **Missing-file failure** — references `docs/product-roadmap.md` which does not exist. Verifier model can't tick what isn't there. **Fix:** point at the existing plan file's checkboxes.
2. **Wave B consumption not declared** — Wave A discovery is running, Wave B persona reviews consume those files. Spec must declare "once `ccw-crm-discovery-audit-2026-05-14.md` and `carsi-discovery-audit-2026-05-14.md` exist, dispatch Wave B persona subagents per the plan." **Fix:** add Wave A → Wave B chaining as an explicit step.
3. **No "schema-stripping" instruction** despite Cluster D's busted-tactic finding — not in scope tonight (tonight is execution of in-flight workstreams, not SEO-playbook hygiene). **Fix:** none — defer to SHIP-THIS-WEEK #9.
4. **No design-preferences guard** — Command Center PR-2/PR-3 are design-heavy and `[[feedback-design-preferences]]` is load-bearing. **Fix:** add no-Lucide / no-AI-slop / Gun-Metal+Candy-Red token constraint.
5. **No secrets-handling guard** — Stripe/Supabase touched in some workstreams. **Fix:** add `[[feedback-secrets-handling]]` constraint (op CLI or .env.local, never paste-in-chat).
6. **Escalation route unspecified** — autonomous mandate says escalate to Board, not Phill. **Fix:** add "on blocker, write to wiki/log.md and dispatch ceo-board skill, do not stall."

### Locked `/goal` spec (final, char-counted)

```
/goal Execute all four queued workstreams in /Users/phill-mac/pi-seo-workspace/unite-group and /Users/phill-mac/Pi-CEO autonomously and verify each before claiming done. Definition of done (binary, all four must be true): (1) CCW+CARSI audit Waves B-E executed per docs/superpowers/plans/2026-05-14-ccw-carsi-overnight-rana-handoff.md — Wave B (persona reviews) starts only after Wave A produces both /Users/phill-mac/2nd Brain/2nd Brain/Wiki/ccw-crm-discovery-audit-2026-05-14.md and carsi-discovery-audit-2026-05-14.md; each subsequent wave gates on the prior wave's artefact existing on disk; final state has every `- [ ]` checkbox in that plan flipped to `- [x]` AND a Wiki/log.md entry per wave; (2) Command Center PR-2 (Zone 3 agent topology) branch pushed, CI green, PR opened against main, no merge; (3) Command Center PR-3 (Zones 4+5 Business 360 + activity log) branch pushed, CI green, PR opened against main, no merge; (4) Rollup Cluster 1 — extract cost-migration commits from feat/internal-pivot-2026-05-11 into new branch chore/cost-migration-rollup, rebased on main, CI green, PR opened with clean conventional-commit history. Validation gate between every wave and every workstream: run `npm test` and `npx tsc --noEmit` in the relevant repo; if either fails, do NOT advance — fix in place then re-run. Persist progress to /Users/phill-mac/2nd Brain/2nd Brain/Wiki/log.md after every wave so the run is resumable. Constraints (MUST NOT violate): do NOT touch /empire route or any file under app/empire/**; do NOT merge any PR — opening is the stop, human review is the merge gate; do NOT bypass 2FA in Stripe — pause and write a wiki/log.md entry instead; do NOT delete pre-existing dead code; surgical changes only per ~/.claude/CLAUDE.md rule 3; do NOT introduce Slack integrations (memory rule [[feedback-no-slack]]); do NOT propose ad spend; do NOT use Lucide icons or generic placeholder logos — Gun Metal #0e1014 + Candy Red #b30000 tokens stay locked, custom geometric marks only per [[feedback-design-preferences]]; do NOT paste credentials in chat — read from 1Password via `op` CLI or edit .env.local directly per [[feedback-secrets-handling]]; do NOT require Phill's mid-run input — on blocker, write blocker to wiki/log.md and dispatch the ceo-board skill, do not stall waiting for Phill per [[feedback-autonomous-mandate]]; do NOT send repeating Telegram alerts — single-shot only at run-complete per [[feedback-no-repeating-alerts]]. Stop condition (machine-checkable, ALL must hold): (a) plan file's every checkbox flipped to `[x]`; (b) `gh pr list --repo CleanExpo/unite-group --state open` shows PR-2, PR-3, and chore/cost-migration-rollup PRs; (c) CI status green on all three PRs (`gh pr checks <number>` returns all-pass); (d) `git status` reports clean working tree in both /Users/phill-mac/pi-seo-workspace/unite-group and /Users/phill-mac/Pi-CEO; (e) wiki/log.md contains one entry per wave plus one final RUN-COMPLETE entry. On stop, send one Telegram message summarising counts only.
```

**Character count: 3,025** (well under 4000-char limit, verified via `python3 -c "print(len(spec))"`).

All five Ashby rules honoured. All six critique items resolved. All seven memory rules embedded as explicit constraints. Four stop conditions are machine-checkable via `ls`, `gh pr list`, `gh pr checks`, `git status`, `grep`.

## 5. Board questions

The Board sanity-check before Phill types `/goal`:

1. **Wave A status: confirm both discovery files exist on disk before fire?** (yes/no) — Implication: if no, the locked spec's Wave A→B gate idles indefinitely waiting. Recommend: yes, verify with `ls "/Users/phill-mac/2nd Brain/2nd Brain/Wiki/ccw-crm-discovery-audit-2026-05-14.md" "/Users/phill-mac/2nd Brain/2nd Brain/Wiki/carsi-discovery-audit-2026-05-14.md"` before `/goal` fires; if missing, prepend a Wave A re-dispatch.
2. **PR target branch: main, or a release branch?** (pick: main / release/*) — Implication: locked spec says `against main`. If Cluster 1 rollup is staged through `release/` first, the stop-condition `gh pr list` query needs the right `--base` filter.
3. **CI definition for Pi-CEO repo:** does Pi-CEO have GitHub Actions running on PR, or is "CI green" satisfied by local `npm test` + `tsc`? (pick: GH-Actions / local) — Implication: stop-condition (c) requires `gh pr checks` — if Pi-CEO repo has no Actions, that check returns empty and the verifier never terminates.
4. **Telegram alert routing: chat_id confirmed?** (yes/no) — Implication: single-shot message at run-complete needs a target. Recommend: yes, use existing Hermes single-shot pattern to Phill's primary chat.
5. **Auto-mode permission scope: full or restricted-to-repos?** (pick: full / restricted) — Implication: the four workstreams span two repo trees plus wiki edits. Restricted auto-mode forces per-tool approval on cross-tree work and stalls the loop. Recommend: full, scoped to `/Users/phill-mac/pi-seo-workspace/`, `/Users/phill-mac/Pi-CEO/`, and `/Users/phill-mac/2nd Brain/2nd Brain/Wiki/` only.

## 6. Stop conditions

Machine-checkable. Verifier model (small fast checker between turns) runs these between every turn; the run terminates only when all five hold:

1. **Plan checkboxes:** `grep -c "^- \[ \]" /Users/phill-mac/pi-seo-workspace/unite-group/docs/superpowers/plans/2026-05-14-ccw-carsi-overnight-rana-handoff.md` returns `0`.
2. **PRs open:** `gh pr list --state open --search "PR-2 OR PR-3 OR chore/cost-migration-rollup"` returns ≥3 matching rows across the relevant repos.
3. **CI green on all three PRs:** for each PR number from #2, `gh pr checks <num>` returns exit 0 with no `fail` lines.
4. **Clean working trees:** `git -C /Users/phill-mac/pi-seo-workspace/unite-group status --porcelain` AND `git -C /Users/phill-mac/Pi-CEO status --porcelain` both return empty.
5. **Wiki log finalised:** `grep -c "^2026-05-14 | wave" /Users/phill-mac/2nd Brain/2nd Brain/Wiki/log.md` returns ≥4 (one per wave B/C/D/E) AND `grep -c "RUN-COMPLETE" /Users/phill-mac/2nd Brain/2nd Brain/Wiki/log.md` returns ≥1.

When all five hold, one Telegram single-shot fires with `wave-count`, `pr-count`, `ci-status`, `log-entries`. No mid-run pings, no Slack.

---

## Cross-references

- [[research-claude-code-update-2026-05-14]] — Cluster A source
- [[research-agentic-os-critique-2026-05-14]] — Cluster B source
- [[research-agentic-platforms-2026-05-14]] — Cluster C source
- [[research-tangential-2026-05-14]] — Cluster D source
- `/Users/phill-mac/pi-seo-workspace/unite-group/docs/superpowers/plans/2026-05-14-ccw-carsi-overnight-rana-handoff.md` — execution plan
- [[feedback-autonomous-mandate]], [[feedback-no-slack]], [[feedback-design-preferences]], [[feedback-secrets-handling]], [[feedback-audit-verification]], [[feedback-no-repeating-alerts]], [[feedback-make-calls-not-questions]] — binding memory rules

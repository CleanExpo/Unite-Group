---
type: wiki
updated: 2026-05-14
---

# Research — Vercel DeepSec for Vibe-Coded Security (2026-05-14)

Researcher: Vercel
Source: [[Sources/Vercel Just Fixed Vibe Coding's Biggest Problem]] (Sean Kochel, YouTube, 2026-05-13)

## Honest framing

The video title is misleading. **Vercel did not ship a platform feature.** `vercel-labs/deepsec` is an MIT-style open-source CLI in the vercel-labs org — an agent-driven SAST wrapper that drives Claude Code / Codex through a `init → scan → process → report → revalidate` loop. Not a new Vercel runtime, no pricing-tier impact, no platform integration. Treat it as a community tool that happens to be Vercel-stamped, not as a Vercel deploy primitive.

## Genuinely new vs. already known

| Claim | Verdict |
|---|---|
| OWASP Top-10 framing | Known. Already covered in [[autonomous-operations-2026]] security risks. |
| Agent-piloted regex pre-filter → LLM batch process → markdown+JSON report | **New mechanism.** The two-stage (cheap regex → expensive LLM only on candidates) is a useful cost-control pattern — $19 / 118 files / ~6min wall clock with Opus 4.7. |
| Revalidate step compares Git history to original findings | **New & useful.** Closed-loop verification fits our `[[quality-over-quantity]]` rule. |
| OpenSpec for fix application | Already noted in tooling scans; not a Vercel thing. |
| Static analysis only — won't catch logic/runtime issues | Honest disclaimer in the video itself. |

## Concrete facts

- Repo: `vercel-labs/deepsec` (open-source, MIT)
- Commands: `npx deepsec init`, `pnpm deepsec scan <project-id>`, `… process`, `… report`, `… revalidate`
- Agent backends: Claude Code, Codex, or Vercel API key (hosted)
- Cost on Opus 4.7 (API-equivalent): ~$19.50 per full scan of a small repo; ~$1.12 per revalidate
- Output: `reports/report.md` + `report.json` with critical/high/medium/bug severities
- Pricing-tier impact: **none**. Self-hosted CLI.

## Direct integration points to Phill's stack

1. **Hour-1 portal provisioner** (`swarm/inbox/provisioner.py`) — every new client portal that gets generated should run a deepsec scan before the welcome email fires. The provisioner just shipped; baking deepsec in now is cheap.
2. **Pi-CEO swarm CI/CD** — wedge deepsec into the LaunchAgent that polls Linear `agent-ready` PRs (`pm-core`). Block PR merge if any `critical` or `high` finding is unresolved. Hooks into existing [[qa-lead]] rubric.
3. **Stripe webhook routes** — `app/api/stripe/webhook/route.ts` is highest blast-radius surface in the empire. Should be in deepsec's first scan target list. Top-3 OWASP risks for that file: insecure design (signature-verification bypass), logging failures (PII in console), mishandling exceptions (fail-open on invalid event).
4. **ContextBot platform** — Telegram inbound + magic-link approvals = injection + broken-access-control surface. Schedule weekly scan.

## Adoption priority

| Item | Priority | Concrete step |
|---|---|---|
| Add deepsec to `Pi-CEO/Pi-Dev-Ops/.github/workflows/security.yml` (new file) as a manual-dispatch + weekly cron workflow | 🟡 EVALUATE | Spike in sandbox first; confirm Opus-4.7 cost doesn't blow inference cap per [[budget-constraints]] |
| Run one-off deepsec scan against `unite-group` Vercel project (Stripe webhook + magic-link routes) | 🟢 ADOPT NOW | `cd ~/Pi-CEO/unite-group && npx deepsec init && pnpm deepsec scan` — manually, this week, ~$20 |
| Wire revalidate step into [[qa-lead]] rubric | 🟡 EVALUATE | Add `deepsec_clean: bool` to `board_mandates.ci_status` schema |
| Bake into Hour-1 provisioner | 🟡 EVALUATE | After first manual scan proves signal-to-noise; don't add latency to onboarding until validated |
| Replace existing security tooling | 🔴 SKIP | Static-only; doesn't replace Supabase advisor sweep ([[unite-group-rls-audit-2026-05-12]]) or auth tests |

## Wiki updates proposed (DO NOT WRITE — proposals only)

- **[[pi-ceo-architecture]]** — Add one-liner under "QA gates" referencing deepsec as the SAST layer between PR open and qa-lead review. Cross-ref this page.
- **[[autonomous-sdlc]]** — Insert a "Security scan" node between "specialist agents" and "sandbox" in the pipeline graph.
- **[[qa-lead]]** — Add deepsec critical/high count to the pass/fail rubric.
- **[[unite-group-nexus-architecture]]** — Note Stripe webhook + magic-link routes as priority-1 deepsec scan targets.
- **New page NOT warranted.** Not enough material for a standalone `vercel-platform.md`; fold into `pi-ceo-architecture` + `qa-lead`.

## Linear tickets to open

1. **team_key: PCO** — title: `Spike: deepsec scan against unite-group Stripe + magic-link routes` — desc: One-off scan, capture report, decide whether to wire into CI. Budget: $25 inference, 2h.
2. **team_key: PCO** — title: `Eval: deepsec in Hour-1 provisioner pre-flight` — desc: Gated on spike #1 signal-to-noise. Don't add unless first scan finds real issues. Blocked-by #1.
3. **team_key: SYN** — title: `Add deepsec_clean field to board_mandates.ci_status` — desc: Schema change in qa-lead rubric. Only after #1 + #2 prove value.

## Constraints honoured

- `[[no-slack]]` — n/a, no Slack mentioned.
- `[[secrets-handling]]` — deepsec runs locally; no API keys leave machine when using Claude Code backend.
- `[[current-data-rule]]` — Opus 4.7 (current Anthropic SOTA, May 2026) is the documented backend.
- `[[design-preferences]]` — n/a, security tooling.

## Verdict

Useful but oversold. The closed-loop scan→fix→revalidate pattern is the real take-home. Run one manual scan on the Stripe webhook this week ($20, ~10 min). Hold off on CI wiring until that scan proves signal worth the inference spend.

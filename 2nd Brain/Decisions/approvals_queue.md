---
type: approvals-queue
generated: 2026-05-26
owner: hermes-delivery
review_cadence: "daily via 6-pager; emergency surface to Telegram"
sla: "anything >72h auto-deny + audit row"
---

# Approvals queue — Phill ONLY

This file is the SINGLE place agents queue founder-approval requests. No agent
takes irreversible action listed here without an entry being marked APPROVED.

Schema: each row is one decision. Required fields are bold.

| **ID** | **Requested by** | **What** | **Why now** | **Reversibility** | **Risk if approved** | **Risk if denied** | Status | Decided at |
|---|---|---|---|---|---|---|---|---|
| AQ-001 | hermes-delivery | Independent code review on CIP PRs #272-276 (cheap-tier auto) | unblocks CIP merge → SG-H1 | reversible | none — review only | CIP sits in limbo, blocks H1 deadline | PENDING | |
| AQ-002 | pi-dev-ops-orchestrator | Merge PR #277 (TMUX policy ratification) | unblocks T1 implementation | low — policy only, no execution | low — tests pass, no tmux side effects | T1 cannot start; agentic terminal control absent | PENDING | |
| AQ-003 | pi-dev-ops-orchestrator | Operator action: drop `OPENROUTER_API_KEY` in 1Password | unblocks model_router cheap-tier | reversible (revoke key) | low — outbound LLM costs, capped per-persona | swarm stuck on frontier-only spending | PENDING | |
| AQ-004 | pi-dev-ops-orchestrator | Operator action: provision GitHub App for autonomous push (~30 min UI) | unblocks all autonomous PR shipping | reversible (revoke App) | medium — App can push to allowlisted repos | autonomous shipping blocked indefinitely | PENDING | |
| AQ-005 | hermes-strategy | Bot architecture decision: 1 shared @UniteGroupIntakeBot vs 3 per-partner bots | gates CIP PR7 provisioning | medium — irreversible once Telegram bots live | 1-bot simpler + arguably more secure; 3-bot redundant | PR7 cannot proceed | PENDING |
| AQ-006 | hermes-delivery | Telegram user_id collection from Duncan + Toby | activates G3.3 trust layer | reversible | none — identity ratification only | G3.3 inert; weaker spoofing defense | PENDING | |
| AQ-007 | restoreassist-shipit | Ratify RestoreAssist brand-essence adjective set (draft from RA-2026 blueprint) | gates SG-R1 — BRA scores against ratified set | reversible | none — drafts only | RestoreAssist persona launches without ratified essence; risk of off-brand drift | PENDING | |
| AQ-008 | phill (self-decide) | Mac Studio order (M3 Ultra vs M4 Max; RAM; timing) | gates local-LLM topology | irreversible (purchase) | hardware cost; some delay if M4 Pro next-gen near | local LLM tier on cloud only; cost climbs with scale | PENDING — no rush per user 2026-05-26 | |
| AQ-009 | restoreassist-shipit | First autonomous content PR canary policy: 5-min Telegram veto window or full auto-merge? | gates SG-R2 first ship | reversible (rollback PR) | medium — first canary | overly conservative; founder still bottleneck | PENDING | |
| AQ-010 | pi-dev-ops-orchestrator | Per-persona LLM soft cap ($25/day default) | enables PLR-3 alerts | reversible | low — alert only, not hard block | runaway loops invisible until billing | DEFAULT-APPROVED at $25/day until Phill says otherwise | 2026-05-26 |

## Decision protocol

1. Agent appends a row with status `PENDING`. Cannot proceed.
2. Founder reviews via daily 6-pager. Replies with `AQ-NNN: yes` / `AQ-NNN: no` / `AQ-NNN: deferred until X` via Telegram OR by editing this file.
3. Hermes-delivery records the answer + timestamp in this row.
4. Approved actions execute within the next ops tick.
5. Denied actions write `result=denied` audit row + spawn a follow-up task for Phill to choose an alternative.
6. Rows >72h with no answer get `status=auto-denied` and the agent must re-request with new justification.

## Conventions

- One decision per row. Never bundle.
- "Reversibility" is the most important column — anything `irreversible` requires explicit ack, never assumed.
- New rows go to the BOTTOM. Status changes are edited in-place. Don't delete completed rows for ≤30 days; then archive to `Outcomes/approvals-archive-YYYY-MM.md`.

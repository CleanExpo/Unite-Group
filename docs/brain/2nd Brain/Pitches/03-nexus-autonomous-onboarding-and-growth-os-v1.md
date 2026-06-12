---
type: pitch
component: nexus-autonomous-onboarding-and-growth-os
version: v1
status: shaped
appetite: 6w
sketch: (consolidated — this pitch IS the master document)
created: 2026-05-26
owner: hermes-strategy
executor: rana (Delivery Rail)
references:
  - ../Decisions/goals.yaml
  - ../Decisions/objectives.yaml
  - ../Decisions/risk_register.md
  - ../Decisions/approvals_queue.md
  - ../Personas/restoreassist.md
  - ../Sources/2026-05-26-shape-up-fidelity.md
linear_epic: TBD (open after freeze lifts)
---

# Unite-Group Nexus — Autonomous Onboarding + Client Growth Operating System v1

> **Document-only artifact.** Drafted during OPERATOR MODE 48h freeze. No
> branches, no features land from this until the freeze lifts and Rana
> pulls PR-NEXUS-1 from the queue.

---

## 0. Frame

This is one platform with three entry points, not three platforms.

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  FOUNDER OS              CLIENT OS                DELIVERY OS          │
│  (Hermes/Margot)         (Unite-Group Nexus)      (Rana + PR pipeline) │
│  ─────────────────       ─────────────────        ─────────────────    │
│  always LEARNING         always EXECUTING         always SHIPPING      │
│  from Phill's inputs     client growth loops      safely               │
│                                                                        │
│         │                       │                       │              │
│         │                       │                       │              │
│         ▼                       ▼                       ▼              │
│   ┌────────────────────────────────────────────────────────────┐       │
│   │  ONE SHARED SUBSTRATE:                                     │       │
│   │  - Pi-CEO swarm + Discovery loop                           │       │
│   │  - 13-persona board (when fully spawned)                   │       │
│   │  - Supabase tenant-scoped state                            │       │
│   │  - Linear work tracking                                    │       │
│   │  - Audit ledger (fail-closed)                              │       │
│   │  - Model router (frontier/working/remedial tiers)          │       │
│   └────────────────────────────────────────────────────────────┘       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

The target state is **conversation-to-automation**: Phill talks to a prospect →
system qualifies/onboards → creates client workspace → wires Telegram channel
+ project + 30-day plan → starts autonomous growth loops → only exceptions
escalate back to Phill.

This pitch defines the v1 of that machine.

---

## 1. The conversation-to-automation pipeline

The headline flow. Every step exists in either deployed code or is enumerated
as a PR in §13.

```
[Phill records call / voice note / chat with prospect]
        │
        ▼ (Pilot V1 already does this)
[Margot ingests voice → text via ElevenLabs / Whisper]
        │
        ▼ (NEW: PR-NEXUS-2)
[Onboarding state machine]
  ├─ intake          → record in `clients` table, mark `status=intake`
  ├─ qualify         → LLM (working tier) extracts: industry, scope, budget,
  │                     compliance flags. Output → `client_qualifications` row.
  ├─ APPROVAL GATE   → human approval required for billing / contract / scope
  │                     decisions (see §9 matrix). Queue row in `approvals`.
  ├─ workspace       → create `client_workspaces` row + Supabase tenant slug
  │                     + GitHub repo allocation (Phill-confirmed) + Vercel
  │                     project allocation
  ├─ wire channels   → provision Telegram chat (operator step until automation
  │                     lands) + map to `client_channels` row
  ├─ scaffold        → write SOP / first-30-day plan into
  │                     `2nd-brain/Personas/<client-slug>.md` from template
  │                     (industry-specific charter)
  └─ launch loops    → enable per-client autonomous growth loops by writing
                       `client_loops` rows (content, KPI, GEO, support, etc.)
        │
        ▼ (NEW: PR-NEXUS-7)
[Per-client Discovery loop runs every 6h]
  ├─ SCAN  (Llama 3.3 70B via OpenRouter — cheap tier)
  ├─ GAP   (Llama 3.3 70B)
  ├─ PROPOSAL (Llama 3.3 70B)
  ├─ Brand Resonance audit (NEW: PR-NEXUS-9)
  ├─ ESCALATE if sev ≥ 7 → push to founder via Margot
  └─ Linear ticket → Rana queue if labelled `rana:build`
        │
        ▼
[Rana picks Linear tickets from queue]
  ├─ Spec complete? (auto-check)
  ├─ Risk tagged?  (auto-check)
  ├─ Tests required? (auto-check)
  ├─ Rollback path? (auto-check)
  ├─ All four checks pass → spawn build session
  ├─ PR opened against client's GitHub repo
  ├─ CI runs (tests + lint + build + smoke)
  ├─ Brand Resonance Agent audits any client-facing copy
  ├─ Auto-merge IF: tests green + BRA pass + safe-paths-only + `auto-merge-ok` label
  └─ Else: queue for Phill review (per §9 matrix)
        │
        ▼
[Production deploy via Railway + Vercel]
        │
        ▼ (NEW: PR-NEXUS-8)
[Outcomes feedback]
  ├─ Stripe webhook        → revenue delta per client
  ├─ Vercel deploy webhook → deploy success/fail
  ├─ PostHog webhook       → engagement delta
  ├─ Sentry webhook        → error spike
  └─ Write to `outcomes` table, attributed to client + PR + persona
        │
        ▼ (NEW: PR-NEXUS-10)
[Hermes ingestion loop]
  ├─ Last 24h outcomes joined with client_loops + persona attribution
  ├─ Margot composes the daily 6-pager (referenced in HLR-1)
  ├─ Voice-narrated; pushed to Phill via Telegram
  └─ Findings → propose_idea → platform backlog → Rana queue
        │
        ▼
[Phill reads/listens to 6-pager, makes founder-level decisions, talks to
 next prospect — loop closes]
```

The compounding step: **the loop closes on Hermes ingesting outcomes back into
the founder's next conversation.** That's where the system stops being a CRM
and starts being an operating system.

---

## 2. Data model (canonical)

All tables in Pi-CEO Supabase (`zbryrmxmgfmslqzizsto`), RLS-scoped via
`set_app_tenant(workspace_slug)` — same pattern as Pilot V1 + CIP intake.

### `clients`
The actual paying entity. One row per logo.

```sql
id                    TEXT PRIMARY KEY  -- cuid
legal_name            TEXT NOT NULL
display_name          TEXT NOT NULL
industry              TEXT              -- 'restoration' | 'health' | 'b2b-saas' | ...
primary_contact_name  TEXT
primary_contact_email TEXT
status                TEXT NOT NULL DEFAULT 'intake'
                                        -- intake | qualified | workspace_created
                                        -- | wired | in_loop | paused | off_boarded
qualification         JSONB             -- output of qualify step
intake_source         TEXT              -- 'voice' | 'form' | 'manual' | 'referral'
intake_recorded_at    TIMESTAMPTZ
created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX (status, created_at)
```

### `client_workspaces`
Tenant scope. Usually 1:1 with clients but allows shared / sub-tenanted in future.

```sql
id              TEXT PRIMARY KEY
client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT
slug            TEXT NOT NULL UNIQUE   -- 'acme-restoration', RLS tenant key
display_name    TEXT NOT NULL
github_org      TEXT                   -- 'CleanExpo' for our portfolio
github_repo     TEXT                   -- 'CleanExpo/acme-restoration-site'
vercel_project  TEXT
supabase_project TEXT                  -- (optional — separate DB per workspace?)
linear_team_id  TEXT NOT NULL
linear_project_id TEXT
status          TEXT NOT NULL DEFAULT 'active'  -- active | paused | archived
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### `client_projects`
Discrete deliverables within a workspace.

```sql
id              TEXT PRIMARY KEY
workspace_id    TEXT NOT NULL REFERENCES client_workspaces(id) ON DELETE CASCADE
slug            TEXT NOT NULL
title           TEXT NOT NULL
description     TEXT
status          TEXT NOT NULL DEFAULT 'discovery'  -- discovery | active | done | cancelled
owner_partner_id TEXT  -- which Unite-Group partner owns this (G2 from CIP SPEC)
approval_policy TEXT NOT NULL DEFAULT 'creator_only'
linear_issue_id TEXT
github_pr_url   TEXT
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

UNIQUE (workspace_id, slug)
```

### `client_channels`
Telegram / Slack / email mappings per workspace.

```sql
id                  TEXT PRIMARY KEY
workspace_id        TEXT NOT NULL REFERENCES client_workspaces(id) ON DELETE CASCADE
kind                TEXT NOT NULL    -- 'telegram_chat' | 'telegram_bot' | 'slack' | 'email'
external_id         TEXT NOT NULL    -- telegram chat_id, slack channel id, email address
display_name        TEXT NOT NULL
bot_token_env_name  TEXT             -- for telegram_bot kind only — env var NAME, not value
authorized_chat_ids TEXT[]           -- for telegram_bot kind
inbound_route       TEXT NOT NULL    -- 'margot' | 'support' | 'ops-only'
status              TEXT NOT NULL DEFAULT 'active'
provisioned_at      TIMESTAMPTZ
created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX (workspace_id, kind)
UNIQUE (kind, external_id)
```

### `client_loops`
Which autonomous loops are enabled per workspace.

```sql
id              TEXT PRIMARY KEY
workspace_id    TEXT NOT NULL REFERENCES client_workspaces(id) ON DELETE CASCADE
loop_kind       TEXT NOT NULL    -- 'discovery' | 'content' | 'kpi' | 'geo' | 'support' | 'compliance'
enabled         BOOLEAN NOT NULL DEFAULT TRUE
cadence         TEXT NOT NULL    -- '0 */6 * * *' style cron expression
config          JSONB            -- loop-specific config (signal queries, KPIs, etc.)
last_run_at     TIMESTAMPTZ
next_run_at     TIMESTAMPTZ
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

UNIQUE (workspace_id, loop_kind)
INDEX (enabled, next_run_at)
```

### `approvals`
Sensitive-action approval queue. One row per pending decision.

```sql
id              TEXT PRIMARY KEY
workspace_id    TEXT REFERENCES client_workspaces(id) ON DELETE CASCADE  -- nullable for portfolio-level
requested_by    TEXT NOT NULL    -- agent id ('hermes-strategy', 'rana', etc.)
action          TEXT NOT NULL    -- 'billing:set_terms' | 'contract:sign' | 'message:send_first' | ...
why_now         TEXT NOT NULL
reversibility   TEXT NOT NULL    -- 'reversible' | 'low' | 'medium' | 'high' | 'irreversible'
risk_if_yes     TEXT
risk_if_no      TEXT
payload         JSONB NOT NULL   -- the actual thing being proposed
status          TEXT NOT NULL DEFAULT 'pending'  -- pending | approved | denied | auto-denied | expired
decided_by      TEXT
decided_at      TIMESTAMPTZ
decision_note   TEXT
sla_expires_at  TIMESTAMPTZ NOT NULL    -- default 72h from creation
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX (status, sla_expires_at)
```

### `outcomes`
The feedback loop. One row per measurable signal attributed to a client +
project + persona.

```sql
id              TEXT PRIMARY KEY
workspace_id    TEXT NOT NULL REFERENCES client_workspaces(id) ON DELETE CASCADE
project_id      TEXT REFERENCES client_projects(id) ON DELETE SET NULL
persona_attribution TEXT       -- which persona authored the change
source          TEXT NOT NULL  -- 'stripe' | 'vercel' | 'posthog' | 'sentry' | 'linear' | 'manual'
metric          TEXT NOT NULL  -- 'mrr_delta' | 'deploy_success' | 'engagement_delta' | ...
value_numeric   DOUBLE PRECISION
value_text      TEXT
delta_window    TEXT           -- '24h' | '7d' | '30d'
captured_at     TIMESTAMPTZ NOT NULL
raw_payload     JSONB
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX (workspace_id, captured_at DESC)
INDEX (source, captured_at DESC)
```

### `nexus_audit`
Generalised audit row schema — superset of `tmux_audit.append`'s format,
keyed for cross-entity correlation.

```sql
id              TEXT PRIMARY KEY  -- HMAC-prefixed 'nex-<hmac8>'
ts_realtime     TIMESTAMPTZ NOT NULL
ts_monotonic_ns BIGINT NOT NULL
actor           TEXT NOT NULL
workspace_id    TEXT  -- nullable for portfolio-level events
client_id       TEXT
action          TEXT NOT NULL    -- 'client:create' | 'workspace:create' | 'channel:provision' | ...
args_redacted   JSONB NOT NULL   -- secrets redacted via swarm.tmux_validator.redact_secrets
policy_level    TEXT NOT NULL    -- 'auto' | 'approval' | 'escalation'
approval_id     TEXT REFERENCES approvals(id) ON DELETE SET NULL
result          TEXT NOT NULL    -- 'ok' | 'denied' | 'error' | 'timeout'
error_code      TEXT
duration_ms     INTEGER
outcomes_link   TEXT REFERENCES outcomes(id) ON DELETE SET NULL

INDEX (workspace_id, ts_realtime DESC)
INDEX (actor, ts_realtime DESC)
INDEX (action, ts_realtime DESC)
```

All seven tables ENABLE ROW LEVEL SECURITY. RLS policies gate on
`set_app_tenant(workspace_slug)` matching `client_workspaces.slug`.

---

## 3. State machine

The onboarding flow. Each transition writes one `nexus_audit` row.

```
       ┌─────────┐
       │ INTAKE  │  ← row created in `clients`
       └────┬────┘
            │ qualify_client(client_id) — LLM working tier
            ▼
     ┌─────────────┐
     │ QUALIFIED   │  ← qualification JSONB populated
     └─────┬───────┘
           │
           ├─→ NEEDS_APPROVAL (billing / contract / scope >$5k) → human gate
           │   (creates `approvals` row; blocks until decided)
           ▼
   ┌──────────────────┐
   │ WORKSPACE_CREATED│  ← `client_workspaces` row exists
   └────────┬─────────┘
            │ provision_channels(workspace_id)
            ▼
       ┌──────┐
       │ WIRED│  ← Telegram chat mapped in `client_channels`
       └──┬───┘
          │ enable_loops(workspace_id, [discovery, content, kpi, ...])
          ▼
      ┌────────┐
      │ IN_LOOP│  ← `client_loops` rows enabled
      └───┬────┘
          │
          ├─→ PAUSED  (operator-triggered or compliance flag)
          │
          └─→ OFF_BOARDED  (irreversible — requires human approval)
```

**Idempotency:** every transition is keyed by `(client_id, target_state)`. Re-running the same transition is a noop if already in target state.

**Reversibility:**
- INTAKE → QUALIFIED → WORKSPACE_CREATED → WIRED → IN_LOOP: all forward, all reversible (set status backward + cascade required rollback)
- IN_LOOP → PAUSED: reversible
- IN_LOOP → OFF_BOARDED: **irreversible** — explicit human approval required, no undo

---

## 4. Telegram integration contract

Two-bot architecture (locked decision from CIP series + this pitch):

- **`@UniteGroupOps`** — the operator bot. One bot, one token. All inbound from Phill / partners / authorised operators. Used for: founder→Margot, approvals, daily 6-pager push.
- **`@<client-slug>-Nexus`** — per-client bot. One per `client_workspaces` row, provisioned lazily on first client outbound. Each carries its own bot token, stored env-var-name-in-DB (`client_channels.bot_token_env_name`), never the secret.

### Inbound routing

```
Telegram update arrives
        │
        ▼
[swarm/inbox/intake_router.py] — long-poll OR webhook (post-#xxx)
        │
        ├─ Bot identity = @UniteGroupOps
        │       └─→ trust check (G3) → Margot router (CIP) → founder/partner intake
        │
        └─ Bot identity = @<client-slug>-Nexus
                ├─ Look up workspace via client_channels.external_id
                ├─ Trust check: telegram_from_user_id in client_channels.authorized_chat_ids
                ├─ Determine inbound_route: 'margot' | 'support' | 'ops-only'
                └─→ dispatch to the routed agent (e.g. support persona)
```

### Outbound routing

```
Agent wants to send to a client
        │
        ▼
[swarm/nexus/messaging.py — NEW]
        │
        ├─ Resolve workspace_id → client_channels (kind='telegram_bot')
        ├─ Load bot_token_env_name → os.environ[name]
        ├─ Apply Brand Resonance Agent gate (PR-NEXUS-9)
        │       ├─ score ≥0.7 all adjectives → SEND
        │       ├─ score 0.4-0.7 → REWRITE + send
        │       └─ score <0.4 → QUEUE approval, do NOT send
        └─ Telegram sendMessage + write nexus_audit row
```

### Attribution

Every message persisted carries:
- `workspace_id`
- `submitted_by_partner_id` (G3 trust-rooted, per CIP SPEC)
- `agent_attribution` (which Hermes/Pi-CEO agent wrote the outbound)
- `audit_id`

---

## 5. API surface (Pi-CEO endpoints Rana calls)

All under `/api/nexus/` on the Pi-CEO Railway FastAPI service. JWT-authenticated; Rana has a scoped service token in Railway env.

### Onboarding

```
POST   /api/nexus/clients/intake
       Body: { intake_source, legal_name, primary_contact, raw_notes, voice_transcript? }
       Returns: { client_id, status: 'intake' }

POST   /api/nexus/clients/{client_id}/qualify
       Body: { force_rerun? }
       Returns: { qualification: {...}, requires_approval: bool, approval_id? }

POST   /api/nexus/clients/{client_id}/approve-qualification
       Body: { decision: 'approved'|'denied', note? }
       Returns: { client_id, status }

POST   /api/nexus/clients/{client_id}/workspace
       Body: { slug, display_name, github_repo?, linear_team_id }
       Returns: { workspace_id, slug }

POST   /api/nexus/workspaces/{workspace_id}/channels
       Body: { kind, external_id, display_name, authorized_chat_ids?, inbound_route }
       Returns: { channel_id, status: 'pending' | 'active' }

POST   /api/nexus/workspaces/{workspace_id}/loops/{loop_kind}/enable
       Body: { cadence, config }
       Returns: { loop_id, enabled, next_run_at }
```

### Approvals

```
GET    /api/nexus/approvals?status=pending&workspace_id=...
       Returns: [ { id, action, why_now, reversibility, ... } ]

POST   /api/nexus/approvals/{approval_id}/decide
       Body: { decision: 'approved'|'denied', note? }
       Returns: { approval_id, status, decided_at }
```

### Outcomes (write side, called by webhooks)

```
POST   /webhooks/stripe        — invoice.paid → outcomes row
POST   /webhooks/vercel        — deploy.success/fail → outcomes row
POST   /webhooks/posthog       — engagement metric → outcomes row
POST   /webhooks/sentry        — error spike → outcomes row
POST   /webhooks/linear        — issue.closed → outcomes row
```

### Read side (for 6-pager generation)

```
GET    /api/nexus/outcomes?workspace_id=...&since=...
GET    /api/nexus/audit?workspace_id=...&since=...
GET    /api/nexus/health        — service heartbeat
```

---

## 6. Approval gate matrix

| Action | Default | Approver | Notes |
|---|---|---|---|
| `client:create` (intake row only) | Auto | — | Reversible — soft delete OK |
| `client:qualify` (LLM extraction) | Auto | — | Working-tier LLM cost, capped per-day |
| `billing:set_terms` | **Approval** | Phill | Irreversible to client — locks contract |
| `contract:sign` | **Approval** | Phill | Irreversible |
| `workspace:create` | Auto | — | Reversible (delete row + cascade) |
| `channel:provision_telegram_bot` | **Approval** | Phill | BotFather is operator-only until automation lands |
| `channel:map_telegram_chat` (use existing bot) | Auto | — | Reversible |
| `message:send_first_to_client` | **Approval** | Phill | First touch per client — sets tone |
| `message:send_subsequent` | Auto (if BRA ≥ 0.7) | — | BRA-gated; <0.7 queues approval |
| `content:publish_to_client_site` | Auto (if BRA ≥ 0.85) | — | Higher threshold for published content |
| `content:publish_legal_or_compliance_claim` | **Approval** | Phill (+ legal if requested) | IICRC, NDIA, medical etc. |
| `pr:auto_merge_to_client_repo` | Auto (if label `auto-merge-ok` + tests green + safe-paths) | — | Per-repo allowlist |
| `refund:issue` | **Approval** | Phill | Irreversible money movement |
| `client:off_board` | **Approval** | Phill | Irreversible — data archive + access revoke |
| `cross_product:share_data` | **Approval** | Phill | Data-handling sensitivity |
| `loop:disable` (any) | **Approval** | Phill | Disabling a loop usually signals problem |
| `loop:enable` (any) | Auto | — | Reversible |
| `cost_cap:raise` | **Approval** | Phill | Self-deregulation guard per self-improvement-charter |

**Bounded autonomy default:** anything not on this matrix that an agent wants to do = blocked at L3 (explicit operator confirmation). The matrix grows by approved precedent, not by agent assertion.

---

## 7. Audit trail schema

Every state-changing action (whether auto-approved or human-decided) writes one row to `nexus_audit`. The row carries:

- Stable HMAC-prefixed `audit_id` (anti-tamper)
- Both wall-clock and monotonic timestamps (drift detection)
- Actor (which agent)
- Workspace + client correlation keys
- Action verb (`client:create`, etc.)
- Redacted args (secrets stripped via `swarm.tmux_validator.redact_secrets` — same redaction pass as TMUX T1 uses)
- Policy level (`auto` | `approval` | `escalation`)
- Approval id (if action required approval)
- Result + error_code
- Link to outcome row (populated later when outcome lands)

Storage: Supabase `nexus_audit` table (append-only via RLS policy `update_disallowed`), with a daily mirror to a Railway-volume JSONL file (same fail-closed pattern as `tmux_audit`).

---

## 8. Hermes founder-loop ingestion (the closing arc)

This is the loop that makes the platform compound. Not just feedback — *learning*.

```
Outcomes table (24h window)
        │
        ▼
[Hermes ingestion agent — runs daily 05:30 AEST, cheap-tier]
  ├─ Pull outcomes WHERE captured_at > now() - 24h
  ├─ Group by (workspace_id, persona_attribution, source)
  ├─ For each (persona, metric) pair:
  │     - delta vs prior 30d baseline
  │     - statistical significance
  │     - cost-attribution (LLM spend per outcome dollar)
  ├─ Output: "what worked yesterday" digest + "what underperformed"
  └─ Write to `2nd-brain/Outcomes/YYYY-MM-DD-hermes-ingest.md`
        │
        ▼
[Margot composes 6-pager — runs 06:00 AEST]
  ├─ Read hermes-ingest.md
  ├─ Read approvals queue
  ├─ Read drift findings
  ├─ Read open Linear tickets
  └─ Compose 6-page founder brief + voice MP3
        │
        ▼
[Phill consumes 5min/day via voice]
  ├─ Marks approvals decisions in Telegram
  ├─ Spitballs new ideas → flows into intake
  └─ Discovers hypotheses for platform improvement
        │
        ▼
[Hypothesis → platform PR]
  ├─ Phill says "we should X" → Margot creates Linear ticket with label `hermes-proposal`
  ├─ Rana picks the ticket if labelled `rana:build`
  ├─ Rana drafts spec + opens PR
  └─ Closes the loop: founder-input → platform-improvement → measurable-outcome
```

---

## 9. Rabbit holes (known unknowns — not blocking v1)

- **R-1** What's the exact qualification rubric? Industry-specific scoring needs Phill's heuristic codified. Start with binary `qualified | not_qualified`; refine with examples post-launch.
- **R-2** Does each client get a fresh Supabase project, or share Pi-CEO's? Cost vs isolation tradeoff. Default v1: share Pi-CEO's project with strict RLS; revisit at scale.
- **R-3** BotFather automation. Telegram restricts bot creation to humans. Until/unless automated, channel provisioning has an operator-bot step.
- **R-4** Per-client GitHub repo allocation policy. Auto-create vs manual? v1 manual; auto-create requires GitHub App scope expansion.
- **R-5** Compliance loop per industry. RestoreAssist needs IICRC monitoring; health clients need HIPAA-equivalent. Charter-driven per `Personas/<client>.md`. Generic template ships in v1; industry overlays follow.
- **R-6** What happens to outcomes attribution when multiple personas touch a project? v1: credit the primary author; future: weighted attribution.
- **R-7** Cross-tenant data leakage prevention beyond RLS. Background jobs are the risk. v1: every background job asserts `app.current_tenant_slug` at start.
- **R-8** Rate limits per workspace on LLM spend. v1 soft cap $25/persona/day default (per goals.yaml AQ-010); Phill override.
- **R-9** Hermes ingestion's statistical significance threshold. v1: p<0.10 for "worth flagging"; refine with operator feedback.
- **R-10** How Rana actually pulls from the Linear queue. SDK polling? Webhook? Manual cron? v1: extend existing autonomy_poller with new label filter `rana:build`.

---

## 10. No-gos (explicit exclusions from v1)

- **N-1** No agent-initiated billing changes ever. Stripe/refund/contract = always human.
- **N-2** No silent off-boarding. Off-boarding = approval + 48h cool-off + explicit ack.
- **N-3** No cross-tenant data sharing without explicit approval per pair.
- **N-4** No external customer surface without BRA gate live AND tested. (R-5 from risk_register.md.)
- **N-5** No self-deregulation. Agents may not modify their own approval matrix, audit redaction, or cost caps. (Self-improvement-charter rule.)
- **N-6** No production deploys from this PR series. v1 lands code + tests + docs only; activation is a separate operator step.
- **N-7** No new Telegram bot provisioning during OPERATOR MODE freeze. Wait for lift.
- **N-8** No Margot speaking to NEW external clients until Brand Resonance Agent v1 is live. Internal partners (Phill, Duncan, Toby) only, per existing CIP SPEC.

---

## 11. Acceptance criteria (Phase A — v1 ship)

v1 is "shipped" when all of the following are true:

- [ ] All 7 schema tables exist in Pi-CEO Supabase with RLS policies
- [ ] One end-to-end intake → in_loop test passes against a synthetic client (no real customer touched)
- [ ] At least one approval cycles through pending → approved → audit row
- [ ] One client outcome flows from Stripe webhook → outcomes table → 6-pager digest
- [ ] Audit ledger contains one row per state-changing action across the test run
- [ ] BRA gate refuses a deliberately off-brand message in a unit test
- [ ] Operator runbook updated: how to onboard a real client end-to-end
- [ ] No real Telegram bots provisioned, no real customer messaged
- [ ] All 10 PRs in §13 merged; main green; smoke-prod passes

---

## 12. References

This pitch consumes from and writes back to:

- [`Decisions/goals.yaml`](../Decisions/goals.yaml) — NS-1, PG-HERMES, PG-RESTOREASSIST, PG-PI-DEV-OPS
- [`Decisions/objectives.yaml`](../Decisions/objectives.yaml) — HLR-1/2/3, PLR-1/2/3, RLR-1/2/3
- [`Decisions/risk_register.md`](../Decisions/risk_register.md) — R-001, R-002, R-003, R-007, R-008
- [`Decisions/approvals_queue.md`](../Decisions/approvals_queue.md) — AQ-005 (1 vs 3 bots — RESOLVED: 1 ops bot + per-client bots), AQ-009 (canary policy)
- [`Personas/restoreassist.md`](../Personas/restoreassist.md) — example charter shape per workspace
- [`Sketches/02-tmux-agent-T1.md`](../Sketches/02-tmux-agent-T1.md) — the audit-ledger + redaction pattern this pitch extends
- Pi-CEO repo: `swarm/intake/`, `swarm/tmux_validator.py`, `swarm/tmux_audit.py`, `swarm/model_router.py` (PR #278)

---

## 13. PR breakdown (Rana-executable, dependency order)

Each PR follows the existing skill conventions (`feature/agent-*` branch + metadata block + tests + no merge without approval). Each carries appetite + acceptance + rollback.

### Phase A — Foundation (PR-NEXUS-1 through PR-NEXUS-5)

**PR-NEXUS-1 — Schema migration**
- Appetite: 1 day
- Files: `supabase/migrations/20260601_nexus_v1.sql` (~250 lines)
- Creates 7 tables + RLS policies + indexes
- Apply to Pi-CEO Supabase via MCP `apply_migration`
- Acceptance: `gh pr view <n>` green, schema verifiable via Supabase MCP `list_tables`
- Rollback: prepared down-migration in same PR
- Depends on: nothing

**PR-NEXUS-2 — Onboarding state machine (pure logic)**
- Appetite: 2 days
- Files: `swarm/nexus/__init__.py`, `swarm/nexus/onboarding.py` (~400 lines), `swarm/nexus/types.py`, `tests/swarm/nexus/test_onboarding.py` (≥30 tests)
- Implements: `intake → qualify → workspace_created → wired → in_loop` state machine; pure logic, LLM via `swarm.model_router` Protocol
- Acceptance: 30+ tests green; no DB / network calls in module; type-checked
- Rollback: revert PR
- Depends on: PR-NEXUS-1 (schema for the dataclass shapes)

**PR-NEXUS-3 — Telegram channel provisioning module**
- Appetite: 1 day
- Files: `swarm/nexus/channels.py` (~250 lines), tests (≥15)
- Implements: provisioning *request* generation; the actual BotFather step is a `requires_approval=True` action queued for operator (per R-3)
- Acceptance: tests green; one synthetic provisioning flow writes a correct `approvals` row + `client_channels` placeholder
- Rollback: revert PR
- Depends on: PR-NEXUS-2

**PR-NEXUS-4 — Approval queue module**
- Appetite: 2 days
- Files: `swarm/nexus/approvals.py` (~300 lines), `swarm/nexus/audit.py` (extends `tmux_audit` patterns for `nexus_audit` table), tests (≥25)
- Implements: enqueue / decide / SLA-expire; integrates with existing audit-redaction; HMAC audit ids
- Acceptance: tests green; SLA auto-expiry tested; decision audit row written per action
- Rollback: revert PR
- Depends on: PR-NEXUS-1 (approvals + nexus_audit tables)

**PR-NEXUS-5 — Pi-CEO FastAPI routes**
- Appetite: 2 days
- Files: `app/server/routes/nexus.py` (~400 lines), `app/server/routes/__init__.py` wiring, route tests (≥20)
- Implements: all `/api/nexus/*` + `/webhooks/*` endpoints per §5
- JWT-scoped via existing Pi-CEO auth pattern
- Acceptance: contract tests via httpx TestClient; secrets-scan green; route audit rows correct
- Rollback: revert + remove Railway route registration
- Depends on: PR-NEXUS-2, PR-NEXUS-3, PR-NEXUS-4

### Phase B — Wiring (PR-NEXUS-6 through PR-NEXUS-10)

**PR-NEXUS-6 — Margot voice → onboarding intake**
- Appetite: 2 days
- Files: extends `swarm/margot_bot.py` + new `swarm/nexus/voice_intake.py` (~200 lines), tests
- Implements: voice note → transcript → POST `/api/nexus/clients/intake`
- Acceptance: end-to-end test using Pilot V1 voice fixture → client row created
- Rollback: revert (Pilot V1 standalone path remains)
- Depends on: PR-NEXUS-5

**PR-NEXUS-7 — Per-client Discovery loop**
- Appetite: 3 days
- Files: extends `app/server/discovery.py` + new `swarm/nexus/per_client_loop.py` (~350 lines), tests
- Implements: Discovery cycle scoped to a `client_workspaces` row; respects `client_loops` cadence + config
- Acceptance: a workspace with `discovery` loop enabled fires a SCAN at next_run_at; GAP findings land scoped to workspace
- Rollback: disable per-client loops via `client_loops.enabled = false`; revert PR
- Depends on: PR-NEXUS-5, model_router (#278 must be merged)

**PR-NEXUS-8 — Outcomes feedback table + webhook ingestion**
- Appetite: 2 days
- Files: `swarm/nexus/outcomes.py`, `app/server/routes/webhooks_outcomes.py`, tests
- Implements: Stripe + Vercel + PostHog + Sentry + Linear webhook receivers writing to `outcomes` table with HMAC signature verification
- Acceptance: replay-attack rejected; signature failures audited; outcome row attributed to workspace
- Rollback: webhooks return 410 Gone; revert PR
- Depends on: PR-NEXUS-1, PR-NEXUS-5

**PR-NEXUS-9 — Brand Resonance Agent + outbound gate**
- Appetite: 3 days
- Files: `swarm/nexus/brand_resonance.py` (~400 lines), `swarm/nexus/messaging.py` (~250 lines), tests (≥30)
- Implements: per-persona adjective-set scoring via working-tier LLM; pass/rewrite/reject verdict; outbound message gate
- Acceptance: deliberately off-brand message rejected; pass-threshold message sent; rewrite path tested with snapshot
- Rollback: BRA gate falls open (allow all) by feature flag; default is gate-closed
- Depends on: PR-NEXUS-5, model_router (#278)

**PR-NEXUS-10 — Hermes ingestion + Margot 6-pager + Rana queue feed**
- Appetite: 3 days
- Files: `swarm/nexus/hermes_ingest.py`, `swarm/nexus/six_pager.py` (extends existing `swarm/six_pager.py`), `swarm/nexus/rana_queue.py`, tests
- Implements: daily 05:30 ingestion → digest → 06:00 6-pager → voice MP3 → Telegram push + Linear ticket creation with `rana:build` label
- Acceptance: synthetic 24h outcomes window produces a coherent digest; Rana queue receives ≥1 ticket; founder-loop close demonstrated end-to-end
- Rollback: disable Hermes cron entry for the ingestion job
- Depends on: PR-NEXUS-8, model_router (#278)

### Cross-cutting dependencies (must be merged before Phase A starts)

- **D-1:** Model router #278 — required by PR-NEXUS-2, PR-NEXUS-7, PR-NEXUS-9, PR-NEXUS-10 (LLM access). Independent of CIP series.
- **D-2:** All CIP PRs #271-276 — required by PR-NEXUS-6 (extends Margot router) and PR-NEXUS-3 (channel provisioning patterns).
- **D-3:** GitHub App provisioning — required by PR-NEXUS-7 (autonomous PR creation in client repos) and PR-NEXUS-10 (Rana queue PR opens).
- **D-4:** OPERATOR MODE freeze lifted.

---

## 14. Estimate + appetite

Phase A: ~8 days of focused Rana time.
Phase B: ~13 days of focused Rana time.
**Total v1: 21 working days = 3-4 weeks elapsed at normal pace.**

This matches the 6-week appetite declared in the frontmatter, with 2-week buffer for the rabbit holes that turn out to be projects.

---

## 15. Out of scope (v1 → v2)

- Auto-BotFather provisioning (R-3 rabbit hole)
- Per-client Supabase isolation (R-2)
- Multi-language client surface
- Weighted persona attribution (R-6)
- Industry-overlay charter templates beyond restoration (R-5 in part)
- Cross-product data sharing approval workflow (separate spec)
- Self-improving qualification rubric (v2)

---

## 16. Handoff

This pitch is the contract. Rana should:
1. Confirm acknowledgment by writing a Linear epic referencing this file
2. Cut PR-NEXUS-1 from `main` on freeze-lift day
3. Sequence PRs strictly in §13 dependency order
4. Each PR follows existing skill conventions (feature/agent-* branch + metadata + tests)
5. No PR merges without operator approval per OPERATOR MODE + the matrix in §6

**Status:** SHAPED — ready to execute when freeze lifts.

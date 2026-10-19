# Synthex ↔ Mission Control

Synthex is Unite-Group Nexus's **internal** AI marketing agency — never client-facing. It runs as agents through Mission Control.

## Slice 1 — witness link (this change)

Synthex's `lib/unite-group-connector.ts` fires witness events (fire-and-forget). They now land at
`POST /api/webhooks/synthex` on `apps/web` (the only deployed app; `apps/empire` is not deployed, so the old `/api/events` receiver received nothing).

- Auth: header `x-api-key` vs `SYNTHEX_EVENTS_API_KEY`, constant-time compare.
- Status codes: key unset 503 `receiver_not_configured` · mismatch 401 · bad JSON 400 · schema miss 400 · `FOUNDER_USER_ID`/storage missing 503 · insert error 500 · success 201 `{ok,id}`. `GET`/`HEAD` are dataless probes (`{ok, configured}`).
- Writes ONE `cc_agent_events` row per event: `agent_name=synthex`, `event_type=status`, `surface=local`, `machine=synthex.social`, `project_key`=business slug (`ccw→ccw-crm`, `nrpg→dr-nrpg`), `target`=one-line summary (≤512), `tool_name`=event type. No payload is stored.
- If the event carries `missionId` (a `cc_tasks` id owned by the founder) a `cc_task_events` `comment` row is also appended. Response gains `mission: linked | not_found | link_failed`. Witness events never change `cc_tasks` status.
- No new tables, migrations or dependencies.

## Slice 2 — Synthex claims missions (not built)

Synthex claims Mission Control missions through the dormant runner plane (`/api/agents/runner/claim|release`) once Synthex has scoped machine keys (Synthex fleet P4). Lane `synthex`; read-only/draft only. Publishing stays behind Synthex P7 and the founder switch.

## Founder arming steps

1. Set `SYNTHEX_EVENTS_API_KEY` (same value) on both the `unite-group` Vercel project and Synthex.
2. Synthex side (**not done here**): set `UNITE_GROUP_EVENTS_URL=https://unite-group.in` and change the connector path from `/api/events` to `/api/webhooks/synthex`.
3. Confirm migration `20260715050000_cc_agent_events.sql` is applied (via the normal branch-then-prod flow) and `FOUNDER_USER_ID` is set.

Until step 1 the receiver answers 503 and does nothing. Check with `GET /api/webhooks/synthex` → `{ok:true,configured:true}`.

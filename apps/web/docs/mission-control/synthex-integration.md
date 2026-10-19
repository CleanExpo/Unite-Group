# Synthex ↔ Mission Control

Synthex is Unite-Group Nexus's **internal** AI marketing agency — never client-facing. It runs as agents through Mission Control.

## Slice 1 — witness link (this change)

Synthex's `lib/unite-group-connector.ts` fires witness events (fire-and-forget). They now land at
`POST /api/webhooks/synthex` on `apps/web` (the only deployed app; `apps/empire` is not deployed, so the old `/api/events` receiver received nothing).

- Auth: header `x-api-key` vs `SYNTHEX_EVENTS_API_KEY`, constant-time compare.
- Status codes: key unset 503 `receiver_not_configured` · mismatch 401 · bad JSON 400 · schema miss 400 · `FOUNDER_USER_ID`/storage missing 503 · insert error 500 · success 201 `{ok,id}`. `GET`/`HEAD` are dataless probes (`{ok, configured}`).
- Writes ONE `cc_agent_events` row per event: `agent_name=synthex`, `event_type=status`, `surface=local`, `machine=synthex.social`, `project_key`=business slug (`ccw→ccw-crm`, `nrpg→dr-nrpg`), `plan_key`=`missionId` or null, `target`=one-line summary (≤512) ending `· no mission id` when none was sent and `· occurred <ISO time>`, `tool_name`=event type. The raw body is never stored.
- If the event carries `missionId` (a `cc_tasks` id owned by the founder) a `cc_task_events` `comment` row is also appended. Response gains `mission: linked | not_found | link_failed`. Witness events never change `cc_tasks` status.
- No new tables, migrations or dependencies.

### Structured fields (SPM-audit G2)

Optional body fields, validated (a malformed value is a 400, never stored):

| Field | Rule | Used by |
|---|---|---|
| `missionId` | UUID | all six mission steps; null is accepted and shown as "no mission id" |
| `occurredAt` | ISO datetime; falls back to `timestamp` | all; timeline order |
| `count` | integer ≥ 0 | `outcome.trials` (required), never on `outcome.read_failed` |
| `window` | ≤64 printable chars | `outcome.trials` (required), `outcome.read_failed` |
| `attributionKey` | ≤64 printable chars, e.g. `utm_source=synthex` | outcomes |
| `postUrl` | https, no credentials, ≤500 | `content.published` |
| `postId` | ≤128 printable chars | post steps |
| `status` | `drafted` · `awaiting_approval` · `approved` · `scheduled` · `published` · `failed` | post steps |
| `scheduledAt`, `publishedAt` | ISO datetime | post steps |
| `text` | full post text, ≤5,000 chars; line breaks kept, other control characters removed | post steps |
| `thumbnailUrls` | up to 4 https URLs | post steps |
| `approveUrl` | https deep link into Synthex; linked only on `synthex.social` | post steps |

The live `content.outcomes` digest's `postsPublished`/`isoWeek` map to `count`/`window`.
Mission-linked rows keep a whitelisted `cc_task_events.payload`: `{source, event_type, summary, missionId, eventType, occurredAt, sentAt, orgSlug, businessSlug, platform, count, window, attributionKey, postId, status, scheduledAt, publishedAt, text, thumbnailUrls, approveUrl, postUrl}` (unknown values are `null`, `thumbnailUrls` is `[]`). The post text never goes on the wall row. Labelled steps: `campaign.planned`, `content.drafted`, `content.held_for_review`, `content.approved`, `content.published`, `outcome.trials`, plus `outcome.read_failed` (shown as "unknown — RA read failed", never 0).

In the witness-link slice, events without a `missionId` have no task row to hold JSONB, so their values survive only in the wall row's `target` text. Sending `missionId` on `content.published` and `outcome.trials` is a Synthex change (audit C2). Every accepted event that carries a `postId`, with or without a mission, is also appended to `cc_synthex_post_events` (migration `20261019120000_cc_synthex_post_events.sql`, additive, rollback `DROP TABLE IF EXISTS cc_synthex_post_events;`). This additive migration belongs with the calendar change and must be applied through the normal branch-then-prod flow before code writes to the table. The response gains `post: recorded | record_failed`; until the migration is applied every post event answers `record_failed` and the calendar says the migration is not applied. Status is the sender's `status`, else implied by the type (`content.drafted` drafted, `content.held_for_review` awaiting_approval, `content.approved` approved, `content.published` published).

**Calendar:** `/founder/calendar` folds each post's events into its latest state and puts it on its scheduled day, else the day it was first drafted (AEST), beside the Google events: awaiting approval amber, approved/scheduled blue, published green, failed red, drafted grey. An "Awaiting your approval" strip lists every `awaiting_approval` post. Clicking a post shows the full text, media thumbnails, platform, business, mission id and a "Review and approve in Synthex" link (synthex.social only). No rows: "No Synthex posts yet". A failed read is an alert, never an empty calendar.

**Mission view:** the selected mission's "Synthex activity" panel (`GET /api/command-centre/missions/synthex?taskId=`, founder session) lists that mission's events oldest step first by `occurredAt`, plus the 20 most recent Synthex events that arrived with no mission id. A failed read is shown as an error, never as an empty list. Only https LinkedIn post URLs render as links.

## Slice 2 — Synthex claims missions (not built)

Synthex claims Mission Control missions through the dormant runner plane (`/api/agents/runner/claim|release`) once Synthex has scoped machine keys (Synthex fleet P4). Lane `synthex`; read-only/draft only. Publishing stays behind Synthex P7 and the founder switch.

## Founder arming steps

1. Set `SYNTHEX_EVENTS_API_KEY` (same value) on both the `unite-group` Vercel project and Synthex.
2. Synthex side (**not done here**): set `UNITE_GROUP_EVENTS_URL=https://unite-group.in` and change the connector path from `/api/events` to `/api/webhooks/synthex`.
3. Confirm migration `20260715050000_cc_agent_events.sql` is applied (via the normal branch-then-prod flow) and `FOUNDER_USER_ID` is set.

Until step 1 the receiver answers 503 and does nothing. Check with `GET /api/webhooks/synthex` → `{ok:true,configured:true}`.

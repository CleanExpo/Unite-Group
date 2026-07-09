---
name: synthex-event-contract
description: The Synthex → Nexus witness-event handshake and the agent_actions.source contract. Use whenever touching the /api/events receiver, the synthex-events mapping, any code that inserts into agent_actions, or when adding a NEW source value or event type to the empire activity feed. Also use when a Synthex distribution action should be witnessed in the /empire feed, or when an integration's agent_actions insert is failing silently.
---

# Synthex event contract

Synthex is the empire's distribution arm. When it publishes a post, starts a
campaign, or books revenue, it fires a witness event at the Nexus so the
`/empire` activity feed records that the thing happened. This skill is the
contract for that handshake and for the `agent_actions.source` column every
such write lands in. Get it wrong and events either 401 at the door or get
rejected by a CHECK constraint and vanish — the exact failure this skill exists
to prevent.

## The handshake (Flywheel C2)

Synthex's `lib/unite-group-connector.ts` sends **fire-and-forget**:

```
POST {UNITE_GROUP_EVENTS_URL}/api/events
header  x-api-key: <SYNTHEX_EVENTS_API_KEY>
body    { type, source: "synthex", timestamp, orgSlug?, ...passthrough }
```

Receiver: `apps/empire/src/app/api/events/route.ts`. Its contract, in order:

1. **`SYNTHEX_EVENTS_API_KEY` unset → 503 `receiver_not_configured`.** The key
   is required; the receiver refuses to run open.
2. **Key mismatch → 401 `unauthorised`.** Compared with `timingSafeEqual` on
   equal-length buffers — never `===`. Preserve the constant-time compare.
3. **Bad JSON → 400 `invalid_json`. Schema miss → 400 `invalid_event`** (with
   `zod` `flatten()` details).
4. **Storage env missing → 503 `storage_not_configured`.** Needs
   `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (service-role write,
   `persistSession: false`).
5. **Insert error → 500 `insert_failed`.** This is write-then-confirm: the row
   is `.select('id').single()`'d back, and a failed write surfaces a 500 — never
   a green 200 over a dropped event. Do not "soften" this to fire-and-forget on
   the receiver side; the sender is already fire-and-forget, so the receiver is
   the only place the failure can be seen.
6. **Success → 201 `{ ok: true, id }`.**

`GET`/`HEAD` are unauthenticated reachability probes that return
`{ ok, configured }` and touch no data — for the sender's status route and the
connection-spine health panel. Keep them dataless.

## The mapping (pure, no I/O)

`apps/empire/src/lib/integrations/synthex-events.ts` holds the pure functions.
Transport stays in the route; mapping stays here. A validated event becomes an
`agent_actions` row via `toAgentActionInsert`:

| Column | Value | Note |
|---|---|---|
| `source` | `'synthex'` | literal — must be an allowed CHECK value (below) |
| `action_type` | `event.type` | free text; known types get pretty labels |
| `payload` | the whole event | passthrough, so extra fields survive |
| `idea_text` | `summariseEvent(event)` | one-line human summary for the feed |
| `status` | `'done'` | witness events are facts that already happened |
| `resolved_at` | `event.timestamp` | when the witnessed action occurred |
| `business_id` | resolved from `orgSlug` | via `resolveBusinessSlug`, else `null` |

**Slug aliases** (`BUSINESS_SLUG_ALIASES`): `ccw → ccw-crm`, `nrpg → dr-nrpg`.
Synthex org slugs don't always match `businesses.slug`; add an alias here when a
new brand's slugs differ rather than guessing at the call site. An unresolved
slug lands `business_id = null` — honest, not fabricated.

**Known event types** (`KNOWN_EVENT_TYPES`) get first-class summaries:
`content.published`, `content.outcomes`, `campaign.started`,
`campaign.completed`, `revenue.daily`, `user.signup`, `user.upgrade`,
`user.churn`, `payment.received`. An **unknown** type is still witnessed
(`Synthex event: <type>`) — never drop a fact because its label isn't wired.
Adding a new labelled type = extend `KNOWN_EVENT_TYPES` + a `summariseEvent`
case; no schema or migration change (type is free text).

## The `agent_actions.source` CHECK contract

`agent_actions` (base migration
`apps/empire/supabase/migrations/20260510000004_nexus_agent_actions.sql`) is the
append-oriented audit log for every pipeline event. `source` is
`NOT NULL DEFAULT 'margot'` under `agent_actions_source_check`. Allowed values:

```
margot · board · pm · orchestrator · hermes · system   (original six)
synthex · dr_contractor_portal                          (added 2026-07-09)
```

`status` is separately constrained: `pending · in_progress · done · failed ·
cancelled`. Witness events use `done`.

### The rule this skill enforces

**A `source` value must exist in the CHECK before any code writes it.** Writing
a source the constraint doesn't allow doesn't error loudly at deploy — the
insert just fails at runtime, and a fire-and-forget writer never notices. That
already happened: the DR-NRPG portal
(`apps/empire/src/app/api/integrations/dr-nrpg/crm/leads/route.ts`,
`const SOURCE = 'dr_contractor_portal'`) wrote a source the live constraint
rejected, so those inserts failed silently until migration
`20260709120000_agent_actions_source_synthex.sql` widened the CHECK (verified
against prod 2026-07-09).

So, to add a new event source:

1. Ship a **founder-gated, additive** migration that
   `DROP CONSTRAINT IF EXISTS` + re-`ADD` the CHECK with the new value included
   (the 2026-07-09 migration is the reference — additive, touches no data).
2. Verify prod's live constraint **first**, read-only, per
   `supabase-schema-gate` — the migration file is not proof the value is live in
   prod.
3. Only then merge the code that writes the new source.

Never widen the CHECK and the writer in a way that lets the writer reach prod
before the constraint does. Migrations are founder-gated and promoted by merging
an approved branch — never applied to prod directly (see `nexus-conventions`).

## RLS

`agent_actions` is service-role full-access + authenticated read-only. Witness
writes go through the service-role client in the route; never expose a
client-side insert path.

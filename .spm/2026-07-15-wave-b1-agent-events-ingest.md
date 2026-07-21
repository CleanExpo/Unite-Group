# SPM Micro-Spec — Wave B1 (ingest half): cc_agent_events + POST /api/agents/events

Date: 15/07/2026 · Author: SPM session (Fable 5) · Status: APPROVE BUILD (parent spec §8 = 96/100, this slice de-risked to 100)
Repo: apps/web @ `698de535` (origin/main) · Parent: `.spm/2026-07-15-matrix-wall-and-daylight-gaps.md` §11 · Ticket: UNI-2378

## Container
The telemetry spine for the Matrix wall — the founder-RLS `cc_agent_events` table plus a
bearer-authed ingest route that accepts redacted agent session events — dark-launched, no
UI, so the wall (B2) has real data to read the moment the founder arms it.

## Schema-gate evidence (read-only, prod `lksfwktwtmyznckodsau`, 15/07)
- `cc_agent_events` does **not** exist in prod (`information_schema` count 0) → new migration required, FOUNDER-GATED.
- `cc_execution_sessions` exists; `supabase_realtime` publication exists with `puballtables=false` and `cc_tasks` already a member → the migration must `ALTER PUBLICATION supabase_realtime ADD TABLE cc_agent_events` (guarded).
- No `supabase db push`/migrate step in CI or `vercel.json` (build = `pnpm build`) → a migration **file** is inert on merge; applying it is the founder's `supabase db push` step. This is why B1 can ship autonomously as a PR while the apply stays founder-gated.

## Behaviour (one rule per bullet)
- Migration `20260715050000_cc_agent_events.sql` creates the table (founder_id, session_id nullable TEXT, agent_name, surface, machine, repo, project_key, plan_key, event_type CHECK('heartbeat'|'tool_call'|'status'), tool_name, target, created_at), a `(founder_id, created_at DESC)` index, RLS ENABLE+FORCE, a founder SELECT policy, and the guarded realtime publication add.
- `session_id` is free TEXT (the emitter's local Claude Code session id), **not** an FK to cc_execution_sessions — a heartbeat must never be rejected for lack of a control-plane row.
- Writes are service-role only (no founder INSERT policy); the founder SELECT policy backs the UI's realtime read.
- `POST /api/agents/events` authenticates by `Authorization: Bearer AGENT_EVENTS_SECRET`; the secret unset ⇒ **401** before any work (dormant by default).
- The route zod-validates a batch of ≤50 events; each event carries name+target only — any `args`/`payload` key is stripped defensively ingest-side (redaction belt-and-braces).
- Rows are inserted with the service client, `founder_id` bound to `FOUNDER_USER_ID` (single-tenant), write-then-confirm on the returned rows.
- The typed accessor `lib/command-centre/agent-events.ts` owns the table name + insert/list, testable with a mock (mirrors tasks.ts).

## Security
- Bearer secret gate (unset ⇒ 401); redaction ingest-side (no payloads/args ever stored); batch cap ≤50 bounds a flood; `founder_id` never client-supplied; no machine hostname beyond the declared `machine` alias string; gitleaks stays green (no literals).
- The per-minute/session 429 cap from the parent spec is **deferred** honestly: an in-memory limiter is theatre in a serverless function (per-instance), so v1 relies on the ≤50 batch cap + the bearer gate; a durable counter is a follow-up. (No-Invaders — no fake rate-limit.)

## Verification
- Migration applied on a **Supabase database branch** (not prod): table, RLS policies, and realtime membership confirmed by query — evidence captured this session.
- Route unit tests: 401 (no secret / wrong secret), 400 (bad batch / >50), 201 happy path with redaction assertion, 500 on unconfirmed write.
- Gauntlet: type-check, lint, vitest, CI build wrapper (Node 24).

## Kicker
The redaction test seeds an event carrying a bogus `args` key and asserts it is absent
from the row handed to the insert — the one check that proves "event names and targets
only, never payloads" is enforced by code, not by the emitter's good behaviour.

## Out of scope (named)
The estate-side emitter daemon (LaunchAgent) and the cc_tasks-claiming runner are the
larger, execution-touching half — separate PR, own review. B2 (the MatrixWall UI) reads
this table and is gated on the founder applying the migration + arming the secret.

## /goal
```
/goal Build the ingest half per this micro-spec: migration 20260715050000_cc_agent_events.sql
(FOUNDER-GATED, validated on a Supabase branch, NOT applied to prod), lib/command-centre/
agent-events.ts accessor, POST /api/agents/events (bearer AGENT_EVENTS_SECRET dormant-by-
default, zod batch ≤50, ingest-side redaction, service-role insert bound to FOUNDER_USER_ID,
write-then-confirm) + unit tests. Gates green, adversary review, merge-gate, PR. The
migration apply (supabase db push) and AGENT_EVENTS_SECRET set are founder steps — stop there.
```

SPM micro-spec complete. Next safe action: build the migration and validate it on a Supabase database branch.

---
type: spec
status: code-complete + verified 2026-06-30 — awaiting founder turn-on
created: 2026-06-28
author: SPM
---

# Web CC ↔ gateway bridge (Phase 2)

## Verification record (2026-06-30) `[VERIFIED this session]`

Both sides of the bridge exist and pass tests in the deps-complete checkout:
- **Read side** — `apps/web/src/lib/operator-gateway/presence.ts` (`getGatewayConnection`) +
  `/api/hermes/operator-gateway/status/route.ts`. Tests: `__tests__/presence.test.ts` **17/17 pass**.
- **Write side** — `apps/autopilot-runner/src/presence.ts` folds a live `probeGateway()`
  (`{state: running|unreachable, url, checkedAt}`) into `capabilities.gateway` each ~15s beat;
  outbound HTTPS to Supabase only, no port exposed. Tests: `src/presence.test.ts` **13/13 pass**.
- LaunchAgent (`deploy/ai.hermes.presence.plist`) + `start-presence.sh` staged.

**Cannot be agent-completed — founder gate (all three are founder-only):**
1. Prod `SUPABASE_SERVICE_ROLE_KEY` + `FOUNDER_USER_ID` in `~/.hermes/.env` — a **secret**, must
   be entered by the founder (not via the assistant).
2. Turning the writer LaunchAgent on dials out to **prod** Supabase — a prod side-effect.
3. Merging `apps/web` deploys to **unite-group.in** through the named-grant gate.

Code + runner + tests are staged and green; the §Turn-on steps below flip it live on approval.

Make the **deployed** Nexus Command Centre (unite-group.in) reflect the **live local
gateway/operator**, without exposing the gateway to the internet.

## Mechanism — presence heartbeat (already the right design)

The web CC is serverless (Vercel) and cannot reach a localhost gateway. The bridge is the
existing **presence heartbeat**, which crosses the boundary via Supabase:

- **Read side (deployed, already built):** `apps/web/src/lib/operator-gateway/presence.ts`
  `getGatewayConnection()` reads `operator_agent_presence` rows; the status route
  (`/api/hermes/operator-gateway/status`) returns the derived connection. Freshness of
  `last_seen_at` → connected.
- **Write side (local, this branch):** `apps/autopilot-runner` heartbeat dials OUT to prod
  Supabase every ~15s. This branch enriches each beat with a **live gateway probe**
  (`probeGateway` → `capabilities.gateway = {state, url, checkedAt}`) so the rail shows
  gateway-up, not just agent-alive. (presence.ts; 13 tests pass, type-check clean.)

No gateway port is exposed; the agent only makes outbound HTTPS to Supabase.

## Turn-on (founder-gated)

1. Set in `~/.hermes/.env` (prod values): `SUPABASE_URL` (lksfwktwtmyznckodsau),
   `SUPABASE_SERVICE_ROLE_KEY`, `FOUNDER_USER_ID`. (`HERMES_API_URL` defaults to :8642.)
2. Run durably:
   ```bash
   sed "s#REPLACE_HOME#$HOME#g" apps/autopilot-runner/deploy/ai.hermes.presence.plist \
     > ~/Library/LaunchAgents/ai.hermes.presence.plist
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.hermes.presence.plist
   ```
   (or `apps/autopilot-runner/start-presence.sh` directly).
3. Verify: on unite-group.in the Command Centre connection rail shows Hermes connected;
   `/api/hermes/operator-gateway/status` returns `connection.state` live with
   `capabilities.gateway.state = running`.

## Why this is a draft PR (not merged/deployed)

Merging deploys apps/web changes to prod (the "named-grant gate"), and turning the writer on
requires the prod Supabase service key. Both are founder calls. Code + runner are staged and
verified; approval flips it live.

## Out of scope (follow-on)

A richer rail that surfaces `capabilities.gateway` explicitly (icons per provider/state); and
folding the workspace's own gateway status into the same presence row.

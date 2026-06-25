# Reference designs (quarantined, not live code)

Files here are **not part of the build**. They are intentionally kept out of
`src/` (and out of the TypeScript / ESLint / Prettier graphs) as reference
blueprints. Nothing in the app imports them.

## `gateway-ws-bridge.client.ts.txt`

The operator-side client for a **signed-WebSocket pairing protocol** — Ed25519
device identity, a `connect.challenge → nonce → signed connect` handshake
(protocol v3), `role: 'operator' | 'node'` + scopes, heartbeat, reconnect
backoff, and a circuit breaker.

### Status

- **Dead in this repo.** It arrived via the `hermes-workspace` Convergence
  fold-in (commit `4aaa07157`) and was never wired up here — zero importers
  since it landed. The only still-useful exports (the active-send-run trackers)
  were copied into `src/server/send-run-tracker.ts`, which is what the live code
  imports.
- **The live connection path is plain HTTP on `:8642`** — see
  `src/server/gateway-capabilities.ts`. There is exactly one live connection
  model in the tree. This file is the _reference_ for a second, not-yet-built one.

### Why it's kept

The Unite-Group Mission Control direction is a **hybrid topology**: a hosted
Mission Control shell that authenticates to a **trusted local agent** (where the
CLI agents, worktrees, and credentials live — see the Lane Orchestrator,
`src/server/lanes/`). This file is a complete, working implementation of exactly
that operator↔node signed channel. It de-risks building the bridge.

### Revive path (when we build the hybrid bridge)

This is only the **client**. To use it you need the matching **server**:

1. A WS server that, on `:18789` (or a chosen port/transport), emits
   `connect.challenge` with a nonce, then validates the `connect` frame's
   Ed25519 device signature against the registered device public key.
   - In the current product that server is the external Python `hermes-agent`.
     Option A: teach that agent to speak this protocol and pair this client
     against it. Option B: build a thin Node relay that terminates the hosted
     shell's connection and forwards to the local agent's HTTP `:8642` API.
2. A device-registration / pairing step (operator approves a device's public
   key once), so the hosted shell can't be impersonated.
3. Move a copy back into `src/server/` (drop the `.txt` suffix), re-point it at
   the chosen transport, and add tests + a single authoritative
   `/api/connection-status` diagnostic.

Full git history: `git log --follow -- apps/workspace/src/server/gateway.ts`.

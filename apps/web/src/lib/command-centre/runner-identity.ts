// Client-safe identity constants for the nexus runner.
//
// WHY THIS FILE EXISTS. `RUNNER_AGENT_NAME` lived in `runner-claim.ts`, which
// imports runtime values from `./tasks`, which imports `node:crypto` for
// `deterministicTaskEventId`. QueueBoard.tsx is a `'use client'` component and
// needs `runningSessionLabel` from `runner-heartbeat.ts`, which needed nothing
// from runner-claim but this one string — so a single constant dragged the
// whole server-side module graph into the browser bundle and the production
// build failed:
//
//   Module build failed: UnhandledSchemeError: Reading from "node:crypto"
//     is not handled by plugins (Unhandled scheme).
//   Import trace:
//     node:crypto
//     ./src/lib/command-centre/tasks.ts
//     ./src/lib/command-centre/runner-claim.ts
//     ./src/lib/command-centre/runner-heartbeat.ts
//     ./src/app/(founder)/founder/command-centre/QueueBoard.tsx
//
// The fix is to cut the chain at its narrowest point rather than to make the
// hashing isomorphic: `deterministicTaskEventId` derives a DATABASE PRIMARY KEY
// and is server-side by nature, and Web Crypto's digest is async, so swapping
// it would ripple an await through every synchronous caller for the sake of
// code the browser must never run.
//
// Anything imported here must stay client-safe: no node: builtins, no secrets,
// no database access. Constants only.

/** Agent name the nexus runner claims work under. Matches cc_agent_events.agent_name. */
export const RUNNER_AGENT_NAME = 'nexus-runner'

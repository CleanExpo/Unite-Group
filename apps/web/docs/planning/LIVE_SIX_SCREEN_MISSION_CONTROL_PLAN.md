# Live Six-Screen Mission Control — delivery plan

**Status:** approved local implementation; production activation remains separately gated
**Date:** 18/07/2026
**Owner:** Unite-Group Founder Command Centre
**Telemetry source:** Hermes/workspace → existing `cc_agent_events` ledger
**Safety posture:** structured activity only; no screen capture or arbitrary text

## Checkable win condition

The Founder Operations deck always renders exactly three trusted machines and exactly two logical screen lanes per machine. Every displayed state is derived from authenticated structured telemetry and server receipt time. Stale or offline telemetry can never render as active. Unknown/free-text fields, raw screen data, prompts, messages, commands, paths, URLs, process lists, clipboard data and credentials are rejected before persistence and never reach the browser.

## Product boundary

- `apps/web` owns the founder-facing six-screen cockpit and founder-scoped read model.
- `apps/workspace`/Hermes owns local observation of sessions, lanes and tools.
- `cc_agent_events` remains the sole durable structured event ledger.
- The existing Pi-CEO mesh remains the machine-health authority; this slice does not create another fleet registry.
- The browser never calls a machine-local endpoint.
- Devices never receive a Supabase service-role key or the Pi-CEO API key.

## Minimal safe contract

A collector submits one versioned snapshot containing:

- canonical device identity derived from its credential, not the request body;
- `bootId` UUID and strictly increasing `sequence`;
- `observedAt` with no more than ten seconds of positive clock skew;
- exactly two distinct screen slots: `primary` and `secondary`;
- bounded enums for state, activity, tool and project;
- a slug-form agent/profile identifier;
- an optional ticket reference matching the approved ticket-key pattern.

The route is strict: unknown keys are rejected. It translates each screen into a redacted `cc_agent_events` row. Screen identity is encoded in an opaque Mission Control session correlation key; no new table or column is required.

## Freshness contract

- `<30 seconds` since server receipt: **connected**.
- `30 seconds–<5 minutes`: **stale**; last activity may be described but never shown as active.
- `≥5 minutes`: **offline**; last activity is not presented as current.
- no accepted snapshot: **not reporting**, never inferred as idle.
- missing/invalid screen: rejected at ingest; no partial snapshot persistence.

## Eighteen-move delivery spine

1. Freeze a clean branch from exact current `origin/main` and preserve unrelated Mission Control work.
2. Confirm `apps/web` Operations is the founder presentation surface and `apps/workspace` is telemetry truth.
3. Record the structured-only privacy boundary and explicitly prohibit raw screen/video data.
4. Define the three canonical trusted device IDs and safe human labels.
5. Define the exactly-two-screen snapshot schema with strict unknown-key rejection.
6. Define per-device credentials mapped to device identity server-side.
7. Define timestamp, boot and sequence rules that prevent replay and stale-active display.
8. Write dependency-first RED tests for schema, privacy rejection, device binding and freshness boundaries.
9. Implement the pure snapshot parser and canonical telemetry translation.
10. Add a dormant-by-default per-device ingest route using timing-safe credential comparison.
11. Reuse `cc_agent_events`; do not add a second event table or expose the service role.
12. Implement the founder-scoped read projection that always returns a fixed three-by-two topology.
13. Strip arbitrary upstream machine/task text and expose only the safe projection.
14. Build the responsive six-screen cockpit inside Operations, reusing current Command Deck tokens.
15. Make source, freshness, machine state, screen state, agent, tool, project and ticket reference visible without exposing content.
16. Add UI honesty/accessibility tests: exactly six slots, labelled states, stale/offline cannot appear active, raw hostnames absent.
17. Run targeted unit/route/component tests, TypeScript validation, lint and production build; fix only root causes in this slice.
18. Perform browser visual QA, then enrol the three devices one at a time and run a partial-outage/reconnect drill before any production activation.

## Activation gates

Production activation requires all of the following:

- exact diff review;
- route and component tests green;
- production build green;
- per-device credentials generated and stored in each machine’s protected secret store;
- no service-role or Pi-CEO key present on any device;
- three-device/six-screen live test;
- one-device outage and reconnect test;
- explicit founder approval before deployment or production environment changes.

## Non-goals

- literal screen mirroring;
- window or browser-tab titles;
- screenshots, keystrokes, clipboard, process lists or URLs;
- prompt, message, command, stdout/stderr or file-path capture;
- remote control from the six-screen view;
- a replacement for Pi-CEO mesh health;
- a second telemetry database or browser-to-localhost transport.

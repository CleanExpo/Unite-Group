---
type: audit
updated: 2026-05-18
status: corrective-handoff
---

# Unite Command Center Senior PM Walkthrough

Senior PM audit of the Unite-Group Command Center as Phill's $2B cockpit. This file corrects the incomplete Hermes handoff that claimed the audit path existed while also saying the file write was pending.

## Handoff Integrity Correction

The prior handoff is not acceptable as evidence.

- Claimed audit path: `/Users/phill-mac/2nd Brain/2nd Brain/Wiki/unite-command-center-senior-pm-walkthrough-2026-05-18.md`
- Local verification result: the file was missing before this corrective write.
- Claimed Linear IDs: `UNI-2022`, `UNI-2023`, `UNI-2024`, `UNI-2025`
- Local verification result: not verified. `linear_search_issues` returned `LINEAR_API_KEY not set`, so these IDs must be treated as claimed-only until re-queried from Linear.

## Executive Verdict

The Command Center is not yet a working cockpit. It is closer to a visual operating board with several backend-gated surfaces, static data islands, and unclear next actions.

The first production slice must not be cosmetic. It must fix the access/data/action contract so Phill never sees a "working" cockpit that cannot actually perform work.

## Evidence Read

Repo inspected: `/Users/phill-mac/pi-seo-workspace/unite-group`

Key code evidence:
- `src/app/[locale]/command-center/page.tsx:11-17` renders `CommandCenterShell` directly.
- `src/app/[locale]/command-center/layout.tsx:10-15` returns children only; no admin gate at layout/page level.
- `src/middleware.ts:39-45` allows local visual QA bypass when `COMMAND_CENTER_LOCAL_PREVIEW=true`.
- `src/middleware.ts:111-114` redirects unauthenticated non-public pages to login.
- `src/lib/security/require-admin.ts:24-27` allowlists `contact@unite-group.in` and `phill.mcgurk@gmail.com`.
- `src/lib/security/require-admin.ts:60-70` returns 401 when no user is resolved and 403 when the user is not allowlisted.
- `src/components/command-center/CommandCenterShell.tsx:33-47` mounts the core cockpit zones: status, KPIs, topology, Hermes controls, Margot voice, Business 360, and activity log.
- `src/components/command-center/voice/MargotVoicePanel.tsx:36-46` collapses all fetch/API failures into raw error strings.
- `src/app/api/pi-ceo/margot-voice/signed-url/route.ts:22-28` gates through `requireAdmin`, then returns `elevenlabs_not_configured` when `ELEVENLABS_API_KEY` or `ELEVENLABS_MARGOT_AGENT_ID` is missing.
- `src/app/api/pi-ceo/margot-voice/signed-url/route.ts:42-55` currently collapses upstream non-2xx and network failures into 502-class responses.

## P0 Blockers

### P0-1: Visible Cockpit, Admin-Gated Actions

The route is authenticated by middleware, but the API surfaces are admin-gated by `requireAdmin`. That means a signed-in non-admin can plausibly reach the cockpit while the main action APIs return 403. Local preview can also render the cockpit while API calls fail.

This produces the exact founder complaint: visible UI, no meaningful task execution.

Required fix:
- Add Command Center admin access parity at page/layout or server preflight level.
- If local preview remains, show an explicit preview-mode banner and disable action controls with source-backed explanations.
- Add browser verification for unauthenticated, signed-in non-admin, and admin states.

### P0-2: Margot Voice Failure States Are Not Operator-Useful

`Talk to Margot` currently requests `/api/pi-ceo/margot-voice/signed-url`, but the UI displays raw failure strings instead of operator guidance.

Required fix:
- Distinguish 401: log in.
- Distinguish 403: account not allowlisted.
- Distinguish 429: rate limited.
- Distinguish 503 `elevenlabs_not_configured`: missing `ELEVENLABS_API_KEY` or `ELEVENLABS_MARGOT_AGENT_ID`.
- Distinguish 502 `elevenlabs_unreachable`: upstream/network failure.
- Preserve upstream status/detail for ElevenLabs non-2xx without exposing secrets.

### P0-3: Handoff Claimed Done Before Artifact Existed

The audit write was claimed and then contradicted in the same response. This is a process failure, not a UI bug.

Required fix:
- Mandate evidence must include actual file path verification before issue IDs or "done" claims.
- Created issue IDs must be re-queried and linked back into this audit once Linear access is available.

## P1 Missing Connections

### P1-1: Command Center Data Is Not Credibility-Graded

The cockpit needs to distinguish live, cached, mocked, stale, and unavailable data. Without that, Phill cannot tell what is operational truth versus placeholder display.

Required fix:
- Every major panel shows source, freshness, confidence, and last successful read.
- Stale/missing source states become visible blockers, not quiet placeholders.

### P1-2: Hermes Control Panel Action Surfaces Need Evidence Hooks

`HermesControlPanel` depends on:
- `/api/command-center/control-panel`
- `/api/command-center/control-panel/add-ons`

Required fix:
- Each action button needs a visible result path: queued, running, failed, completed, blocked.
- Failed actions must point to the owning mandate, ticket, or log path.

### P1-3: QA-Lead and Brand-Guardian Are Not First-Class Cockpit Gates

QA/brand gates are part of the operating model, but the cockpit does not yet make them visible as merge blockers or action requirements.

Required fix:
- Add visible gate state for QA-Lead and Brand-Guardian.
- Each PR/mandate card must show gate status, reviewer, verdict, and next unblock action.

## P2 UX / Explainer Improvements

### P2-1: Add Clickable Info Explainers

Every metric and action surface needs an `(i)` explainer:
- what it is,
- what it represents,
- source system,
- freshness,
- why it matters to the $2B pathway,
- what Phill can do next.

### P2-2: Next Best Insight Layer

The cockpit should not just display state. It should recommend the next highest-leverage action:
- act now,
- inspect evidence,
- approve,
- block,
- escalate,
- ignore.

### P2-3: Operator Language

Panel copy should be written for Phill operating the business, not for a developer inspecting a dashboard. Avoid generic "error" and "offline" states. Use direct operational language.

## P3 Polish

### P3-1: Remove Dead Placeholder Code

`ZonePlaceholder` remains in `CommandCenterShell` but is unused. It is not a production blocker, but it signals unfinished surface area and should be cleaned after P0/P1 fixes.

### P3-2: Reduce Static Visual-Only Surfaces

Static topology/activity data may be acceptable for design scaffolding, but production cockpit panels must declare static/demo status or bind to live data.

## First PR-Ready Slice

Title: `P0 Command Center access parity + Margot failure-state repair`

Scope:
- Command Center admin preflight/access parity.
- Preview-mode banner and disabled actions where applicable.
- Margot voice error taxonomy.
- Tests for 401, 403, 429, 503, 502, and upstream non-2xx.
- Browser verification of unauthenticated, non-admin, and admin/control states.

Acceptance checks:
- Unauthenticated users cannot see a working-looking cockpit.
- Non-admin authenticated users cannot see enabled admin action controls.
- Admin users can load cockpit and reach action surfaces.
- Margot panel displays action-specific failure guidance.
- Missing ElevenLabs config clearly identifies `ELEVENLABS_API_KEY` / `ELEVENLABS_MARGOT_AGENT_ID`.
- QA-Lead and Brand-Guardian are listed as merge blockers.

## PM-Core Mandate Reconciliation

Claimed mandates/issues from the incomplete handoff:
- `UNI-2022`
- `UNI-2023`
- `UNI-2024`
- `UNI-2025`

Status: unverified. Linear access was unavailable locally because `LINEAR_API_KEY` is not set.

Required reconciliation:
- Re-query Linear once credentials are available.
- Confirm each issue exists.
- Update each issue with this audit path.
- Delete or close duplicates if Hermes created issues before the evidence artifact existed.
- Ensure the first issue is the P0 slice above, not broad UI polish.

## Production Gate

Production remains blocked until:
- audit file exists and is linked from mandates,
- PM-Core PR exists,
- browser verification evidence is attached,
- QA-Lead passes,
- Brand-Guardian passes,
- explicit production approval is issued.

## Related

- [[exit-thesis]]
- [[operational-priorities-q2-2026]]
- [[unite-group-nexus-architecture]]
- [[pi-ceo-architecture]]
- [[qa-lead]]
- [[brand-guardian]]
- [[command-center-redesign-proposal-2026-05-14]]

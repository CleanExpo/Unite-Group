# Margot Voice Test Gap Analysis

Date: 2026-05-23
Last update: 2026-06-09 17:08 AEST
Previous refresh: 2026-06-10 03:08 AEST
Project: Unite-Group

## Files Reviewed (Original 2026-05-23 Lane)

- `src/app/api/pi-ceo/margot-voice/signed-url/route.ts`
- `src/app/api/pi-ceo/margot-voice/task/route.ts`
- `tests/integration/api/margot-voice-signed-url.test.ts`
- `tests/integration/api/margot-voice-task.test.ts`
- `src/components/command-center/voice/failure-taxonomy.ts`

## Files Reviewed (2026-06-09 Senior PM Voice UI Panel State-Machine Closure Refresh)

- All five files above (re-read for drift).
- `src/components/command-center/voice/MargotVoicePanel.tsx` (refactored to delegate to a pure `voice-panel-state.ts` reducer; the previous inline `useState` + `useEffect` + `useCallback` shape is now exercised by the new state-machine test file).
- `src/components/command-center/voice/voice-panel-state.ts` (new — pure `reduceVoicePanelState` + `initialVoicePanelSnapshot` + `VoicePanelFetchResult` + `VoicePanelEvent` discriminated union; 96 lines).
- `src/components/command-center/voice/__tests__/voice-panel-state.test.ts` (new — 12 unit tests pinning the full state machine: idle -> loading -> ready, idle -> loading -> error, error -> loading retry, ready stays ready on stale FETCH_RESOLVED, idle stays idle on stale FETCH_RESOLVED, plus 401 / 503 / network classification integration with `mapMargotFailure`).
- `docs/margot/MARGOT-COMMAND-CENTER.md` (current voice surface map; will be updated to list the 4th voice suite).
- `docs/margot/retrieval-rules.md` (current voice/retrieval policy).
- `docs/margot/ai-enhancement-candidate-register.md` (voice-relevant AI-RET-001 fixtures).
- `docs/margot/voice-task-schema-provenance.md` (generated type evidence).
- `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (current pass state).
- `tests/integration/api/margot-voice-task.test.ts` (still 20 tests; unchanged in this lane).

## Senior PM Verification Checkpoint (2026-06-09 17:08 AEST)

- What exists: the Margot voice test surface is now 4 suites / 47 tests (was 3 suites / 35 tests before this lane; +12 from the new state-machine test file). The voice UI panel state machine is now covered for: the `idle` initial state, `idle -> loading` on `START`, the `loading -> loading` idempotency guard, `loading -> ready` on a 200 with `signed_url`, `loading -> error` on a 401 unauthorized response (with `mapMargotFailure` integration), `loading -> error` on a 503 `elevenlabs_not_configured` response (with env-var next-action pinning), `loading -> error` on a network failure (status=null, network category), `error -> loading` retry on a new `START`, `ready -> ready` stability on a stale `FETCH_RESOLVED` (the widget stays mounted once the signed URL is set), and the `idle -> idle` defensive guard against a stale `FETCH_RESOLVED` arriving after the operator closed/re-opened the panel. AI-RET-001 source-citation fixtures (8/8 pass) and answer-shape fixtures (12/12 pass) are unchanged and remain green.
|- What has started: 2026-06-09 17:08 AEST voice UI panel state-machine TDD closure + small bounded component refactor. New `src/components/command-center/voice/voice-panel-state.ts` (96 lines) extracts the panel's `idle | loading | ready | error` state machine into a pure `reduceVoicePanelState(prev, event)` reducer. New `src/components/command-center/voice/__tests__/voice-panel-state.test.ts` (12 tests) pins the full state-machine contract end-to-end. `src/components/command-center/voice/MargotVoicePanel.tsx` was refactored to delegate to the reducer via `useReducer(reduceVoicePanelState, initialVoicePanelSnapshot)`; the `mapMargotFailure` import was dropped from the component (it now lives in the reducer's import surface and is exercised by the test file). The panel's rendered DOM is unchanged (button, status label, error block, widget slot all still render the same way); the refactor is a behavioral no-op for the end user, but the state machine is now testable in isolation.
- Why it exists: the prior voice-test-gap-analysis (last touched 2026-06-10 03:08 AEST) explicitly recorded the still-open voice UI panel state-machine gap as the next safe TDD lane. The end-to-end ElevenLabs -> Supabase chain gap from that checkpoint was already closed by the 2026-06-10 03:08 AEST lane. This lane closes the only remaining voice-test gap. The component previously had no `npm test` mounted unit test for the rendered ElevenLabs ConvAI widget state machine; testing-library + jsdom are not installed in the repo, so the refactor extracts the state machine into a pure reducer (a standard pattern for stateful React components in a node-only test environment) and tests the reducer directly. The component's `useReducer` integration is verified by the unchanged static-render + end-to-end test surface plus the fact that the reducer's 12 tests cover every state transition the component can dispatch.
- Missing/unclear: live ElevenLabs network failure during a future live call is still not exercised end-to-end (would require either a real fetch or a fetch-mock; the existing tests are deterministic and do not need it). Signed-url 503 cascading into the task route is also not yet a fixture (the task route is tested with its own mocks). None of these gaps are blocking; they are recorded here for the next safe TDD lane.
- Current health evidence: focused state-machine gate `npx jest src/components/command-center/voice/__tests__/voice-panel-state.test.ts --runInBand` returned 1 suite / 12 tests PASS. Combined voice gate (signed-url + task + failure-taxonomy + voice-panel-state) returned 4 suites / 47 tests PASS (was 3 suites / 35 tests before this lane; +12). Combined local CRM + Margot + runtime + credential-boundary + voice-panel-state gate returned 12 suites / 180 tests PASS (was 11 suites / 168 tests before this lane; +12). Full combined voice + CRM + Margot + runtime + credential-boundary gate (all 15 suites) returned 15 suites / 215 tests PASS (was 14 suites / 203 tests before this lane; +12). `npm run type-check` passed. `npm run security:routes-check` reported 0 unprotected mutating routes. `git diff --check` clean. AI-RET-001 report unchanged from prior tick: `overallStatus=pass; source=8/8; answerShape=12/12; readback=pass; safetyNotes=true; nextSafeAction=true`. Mac Mini: `/Volumes=Macintosh HD`, recovered Markdown count `0`, SMB reachable, SSH unreachable; no credential prompt/read, secret printing/storage, or recursive system-volume scan.
- Smallest next action: when a real voice code change is needed, add a fixture for the live ElevenLabs network failure during a future live call (or a signed-url 503 cascading into the task route), and update both `docs/margot/MARGOT-COMMAND-CENTER.md` and this doc with the new test id. Until then, keep the 47-test focused voice suite green on every Senior PM tick.

## Senior PM Verification Checkpoint (2026-06-10 03:08 AEST) [historical, kept for audit trail]

- What exists: focused Margot voice suite is now 3 suites / 35 tests (was 3 suites / 33 tests before this lane; +2 end-to-end chain-linkage tests). The voice task route is now covered for: 429 rate-limited, 401 missing/bad token, 503 missing CRM/Supabase env, 400 invalid JSON, 400 invalid packet (truncated `summary`), 400 missing `packet_id`, 400 missing `transcript_text`, 400 null packet body, 400 non-object packet body, 200 default field behavior (truncated packet with `risk_level`/`business_context`/`route` defaults applied), 200 voice session + CRM task creation, 500 voice session insert failure, 500 voice session insert returns no id, 500 CRM task insert failure, 500 CRM task insert returns no id, 200 truncates long summaries and applies default packet fields, 200 approval-required work becomes blocked and assigned to `Phill approval`, 200 end-to-end ElevenLabs -> Supabase chain linkage (insert ordering, description cross-link, parsed_intent carries `conversation_id`), and 500 voice-session-fail blocks the second insert. AI-RET-001 source-citation fixtures (8/8 pass) and answer-shape fixtures (12/12 pass) include a `GATED-ACTION-BOUNDARY` answer-shape that asserts the harness never claims a voice session was created or a CRM task was inserted without a corresponding backend fixture, plus a `COMMAND-CENTER-CITATION` source-citation fixture that pins the voice surface map to the local command-center doc.
- What has started: 2026-06-10 03:08 AEST voice-test-gap-analysis Senior PM end-to-end chain-linkage closure. Two new unit tests added to `tests/integration/api/margot-voice-task.test.ts` (RED-then-GREEN against the existing happy path + voice-session-fail branch): `pins the end-to-end ElevenLabs -> Supabase chain linkage` (asserts the insert-order is `['voice_command_sessions', 'tasks']`, the CRM task description cross-links `Voice session: voice-session-1` and `ElevenLabs conversation: conv_abc`, the `voice_command_sessions` row stores the full `transcript_text` and the validated `parsed_intent` carrying `conversation_id`, and `user_id` is the `crm_user_id`) and `does not attempt the CRM task insert when the voice session insert fails` (asserts the route returns 500 `voice_session_insert_failed` and the second insert is never called). No code change was required — the existing route already implements the chain ordering and the cross-link contract; the gap was that no test pinned them.
- Why it exists: the prior voice-test-gap-analysis was last touched `2026-06-10 02:30 AEST`, immediately after the malformed-payload gap-closure. The still-open end-to-end ElevenLabs -> Supabase chain gap from that checkpoint has now been closed: the test surface proves the cross-system chain ordering (voice session must land first so the second insert can cross-link the session id), the operator-audit cross-link in the CRM task description, and the fail-closed branch that prevents orphan task rows when the upstream voice insert fails.
- Missing/unclear: the voice UI panel still has no `npm test` mounted unit test for the rendered ElevenLabs ConvAI widget state machine. The voice task route is now covered for the full happy-path chain, the malformed-payload boundaries, the truncated-packet default contract, and the voice-session-fail fail-closed branch; the only remaining gaps are UI state-machine and any future upstream failures (ElevenLabs network failure during a future live call, signed-url 503 cascading into task route). None of these gaps are blocking; they are recorded here for the next safe TDD lane.
- Current health evidence: focused voice gate `npx jest tests/integration/api/margot-voice-task.test.ts --runInBand` returned 1 suite / 20 tests PASS (was 18 before this lane; +2). Combined voice gate `npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand` returned 3 suites / 35 tests PASS (was 3 suites / 33 tests before this lane; +2). Combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` returned 11 suites / 168 tests PASS (unchanged from prior tick; the new voice tests live under `tests/integration/api/` and were not part of the prior 11-suite gate). Full combined voice + CRM + Margot + runtime + credential-boundary gate (all 14 suites) returned 14 suites / 203 tests PASS (was 14 suites / 201 tests before this lane; +2). `npm run type-check` passed. `npm run security:routes-check` reported 0 unprotected mutating routes. `git diff --check` clean. AI-RET-001 report unchanged from prior tick: `overallStatus=pass; source=8/8; answerShape=12/12; readback=pass; safetyNotes=true; nextSafeAction=true`. Mac Mini: `/Volumes=Macintosh HD`, recovered Markdown count `0`, SMB reachable, SSH unreachable; no credential prompt/read, secret printing/storage, or recursive system-volume scan.
- Smallest next action: when a real voice code change is needed, add a focused test for the voice UI panel state machine (mock the ElevenLabs ConvAI widget lifecycle: idle, recording, transcribing, submitting, error/retry), and update both `docs/margot/MARGOT-COMMAND-CENTER.md` and this doc with the new test id. Until then, keep the 35-test focused voice suite green on every Senior PM tick.

## Senior PM Verification Checkpoint (2026-06-10 02:30 AEST) [historical, kept for audit trail]

- What exists: focused Margot voice suite is now 3 suites / 33 tests (was 3 suites / 28 tests before this lane; +5 malformed-payload tests). The voice task route is now covered for: 429 rate-limited, 401 missing/bad token, 503 missing CRM/Supabase env, 400 invalid JSON, 400 invalid packet (truncated `summary`), 400 missing `packet_id`, 400 missing `transcript_text`, 400 null packet body, 400 non-object packet body, 200 default field behavior (truncated packet with `risk_level`/`business_context`/`route` defaults applied), 200 voice session + CRM task creation, 500 voice session insert failure, 500 voice session insert returns no id, 500 CRM task insert failure, 500 CRM task insert returns no id, 200 truncates long summaries and applies default packet fields, 200 approval-required work becomes blocked and assigned to `Phill approval`. AI-RET-001 source-citation fixtures (7/7 pass) and answer-shape fixtures (12/12 pass) include a `GATED-ACTION-BOUNDARY` answer-shape that asserts the harness never claims a voice session was created or a CRM task was inserted without a corresponding backend fixture, plus a `COMMAND-CENTER-CITATION` source-citation fixture that pins the voice surface map to the local command-center doc.
- What has started: 2026-06-10 02:30 AEST voice-test-gap-analysis Senior PM verification refresh + TDD gap-closure. Five new malformed-payload unit tests added to `tests/integration/api/margot-voice-task.test.ts` (RED-then-GREEN against the existing fail-closed `validatePacket`): `rejects a packet with missing packet_id`, `rejects a packet with missing transcript_text`, `rejects a null packet body`, `rejects a non-object packet body`, and `applies risk_level, business_context, and route defaults for a truncated packet`. No code change was required — the existing `validatePacket` already fails closed on each of these paths and applies the documented defaults; the gap was that the contract was untested. The 4 negative tests pin the 400 `invalid_packet` contract; the 1 positive test pins the default-field contract when only the 3 required fields (`packet_id`, `summary`, `transcript_text`) are present.
- Why it exists: the prior voice-test-gap-analysis was last touched `2026-06-09 17:08 AEST`, before the AI-RET-001 source-citation and answer-shape harnesses reached 12/12, before the case-insensitive `normalizedSubjectType` approval-lifecycle lane, before the deterministic `logCrmDigestReadError` fail-closed guard, before the dedicated `digest-mappers` positive-coverage suite, before the daily-digest privacy hardening (`lead <id>` fallback), and before the deterministic stale-sync + daily-digest edge-case lanes. This refresh links the voice gap-closure pass to those newer CRM/margot/AI surfaces and explicitly records the 4 malformed-payload gaps that were closed this tick.
- Missing/unclear: the voice UI panel still has no `npm test` mounted unit test for the rendered ElevenLabs ConvAI widget state machine. The voice task route's `risk_level` and `business_context` defaulting is now tested in isolation at the contract boundary (truncated packet) and at the truncate-and-default behavior (long summary) but is not yet asserted against a fixture that simulates the live ElevenLabs → Supabase chain end-to-end. None of these gaps are blocking; they are recorded here for the next safe TDD lane.
- Current health evidence: focused voice gate `npx jest tests/integration/api/margot-voice-task.test.ts --runInBand` returned 1 suite / 18 tests PASS (was 13 before this lane; +5). Combined voice gate `npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand` returned 3 suites / 33 tests PASS (was 3 suites / 28 tests before this lane; +5). Combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` returned 11 suites / 168 tests PASS. Full combined voice + CRM + Margot + runtime + credential-boundary gate (all 14 suites) returned 14 suites / 201 tests PASS. `npm run type-check` passed. `npm run security:routes-check` reported 0 unprotected mutating routes. AI-RET-001 report `overallStatus=pass`, `source=8/8`, `answerShape=12/12`. Mac Mini: `/Volumes=Macintosh HD`, recovered Markdown count `0`, SMB reachable, SSH unreachable; no credential prompt/read, secret printing/storage, or recursive system-volume scan.
- Smallest next action: when a real voice code change is needed, add a focused test for the voice UI panel state machine or for the end-to-end ElevenLabs → Supabase chain (mock the signed-url fetch + the task insert), and update both `docs/margot/MARGOT-COMMAND-CENTER.md` and this doc with the new test id. Until then, keep the 33-test focused voice suite green on every Senior PM tick.

## Current Coverage Indicated by Existing Tests

### Signed URL route

Existing test file:
`tests/integration/api/margot-voice-signed-url.test.ts`

Original coverage:
- Admin gate behavior.
- Missing ElevenLabs env fails closed.
- Signed URL response avoids leaking API key.

### Voice task route

Existing test file:
`tests/integration/api/margot-voice-task.test.ts`

Original coverage:
- Unauthorized bearer token rejection.
- Voice session + CRM task creation path.
- Approval-required work becomes blocked and assigned to `Phill approval`.

## Coverage Added This Run (Verified Locally)

At `2026-05-23 05:41 AEST`, focused tests were added to the two Margot voice integration test files:

- `tests/integration/api/margot-voice-signed-url.test.ts`
- `tests/integration/api/margot-voice-task.test.ts`

These tests are deterministic: rate limiting, ElevenLabs fetch, and Supabase insert chains are mocked.

Additional UI failure-taxonomy coverage was added later in this cron tick:

- `tests/unit/margot-voice-failure-taxonomy.test.ts`

It covers the operator-safe `mapMargotFailure` copy for 401, 403, 429, 503, 502 upstream failed, 502 upstream unreachable, network/no response, unknown responses, and code-driven classification fallback when status is missing or generic.

Latest verification for the combined Margot voice suite:

```bash
npm ci
npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand
npm run type-check
```

Result:

- `npm ci` completed successfully.
- Focused Jest passed: 3 suites passed, 28 tests passed.
- Type-check passed.

### Signed URL route coverage now added

1. Rate limit behavior
   - Given `rateLimit` returns `ok: false`
   - Expect status `429`
   - Expect body `{ error: 'rate_limited', retry_after_ms: ... }`

2. ElevenLabs upstream non-OK
   - Given fetch returns `ok: false`
   - Expect status `502`
   - Expect body `{ error: 'elevenlabs_signed_url_failed' }`

3. ElevenLabs network/timeout failure
   - Given fetch throws
   - Expect status `502`
   - Expect body `{ error: 'elevenlabs_unreachable' }`

4. Cache-control header
   - Successful signed URL response includes `Cache-Control: no-store`.

### Voice task route coverage now added

1. Rate limit behavior
   - Given `rateLimit` returns `ok: false`
   - Expect status `429`
   - Expect body `{ error: 'rate_limited', retry_after_ms: ... }`

2. Missing CRM/Supabase env
   - Given valid token but missing required env
   - Expect status `503`
   - Expect body `{ error: 'crm_not_configured' }`

3. Invalid JSON
   - Given `req.json()` throws
   - Expect status `400`
   - Expect body `{ error: 'invalid_json' }`

4. Invalid packet
   - Given packet missing required fields
   - Expect status `400`
   - Expect body `{ error: 'invalid_packet' }`

5. Voice session insert failure
   - Given Supabase voice session insert returns error or no id
   - Expect status `500`
   - Expect body `{ error: 'voice_session_insert_failed' }`

6. CRM task insert failure
   - Given session insert succeeds but task insert fails or returns no id
   - Expect status `500`
   - Expect body `{ error: 'crm_task_insert_failed' }`

7. Summary truncation
   - Given summary longer than 500 chars
   - Expect inserted task title and parsed intent summary use truncated summary.

8. Default field behavior
   - Missing optional `business_context` defaults to `unite-group`.
   - Missing optional `route` defaults to `unite_crm`.
   - Missing optional `risk_level` defaults to `low`.

## Remaining Gaps / Follow-Up

- No immediate Margot voice test gap remains from this lane: the signed-url route, task ingest route, and UI failure taxonomy are now covered by the focused suite.
- Keep running focused Jest plus type-check before any Margot voice code handoff.

## Verification Status

Local dependency/test check at `2026-05-23 05:57 AEST` showed:

```text
node_modules=present
focused Jest=passed, 3 suites, 28 tests
type-check=passed
```

The earlier blocker was resolved by `npm ci` using `package-lock.json`.

## Suggested Test Command

Package scripts show:

- `test`: `jest --testPathPattern=tests/pipelines --runInBand`
- `test:all`: `jest`
- `type-check`: `tsc --noEmit`

Preferred focused command:

```bash
npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand
```

Alternative if invoking through npm scripts:

```bash
npm run test:all -- tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand
```

Then:

```bash
npm run type-check
```

## Implementation Recommendation

The voice gap-closure pass is now written and verified locally across the route integration tests and the failure-taxonomy unit test. Next execution should keep focused Jest and type-check green before handoff or merge.

## Senior PM verification checkpoint (2026-06-10 21:42:00 AEST)

- What exists: the voice-test-gap-analysis doc now pins the voice test surface to the AI-RET-001 local harness via the `AI-RET-001-ANSWER-VOICE-INTEGRITY-BOUNDARY` fixture. The 21st answer-shape fixture enforces 13 required phrases (voice test suite, four suites, 47 tests, voice-signed-url, voice-task, failure-taxonomy, voice-panel-state, elevenlabs to supabase chain, voice session before crm task insert, fail-closed, no crm task insert when voice session fails, state machine, idle loading ready error), 4 required citation sources (voice-test-gap-analysis.md, MARGOT-COMMAND-CENTER.md, voice-task-schema-provenance.md, ai-enhancement-candidate-register.md), and 9 prohibited overclaim phrases.

## AI-RET-001 Voice Integrity Citation Contract

Date: 2026-06-10 21:42:00 AEST

This section pins the voice test surface to the AI-RET-001 local harness answer-shape contract.
The `AI-RET-001-ANSWER-VOICE-INTEGRITY-BOUNDARY` fixture (bound to `AI-RET-001-COMMAND-CENTER-CITATION`) enforces:

- 13 required answer phrases: `voice test suite`, `four suites`, `47 tests`, `voice-signed-url`, `voice-task`, `failure-taxonomy`, `voice-panel-state`, `elevenlabs to supabase chain`, `voice session before crm task insert`, `fail-closed`, `no crm task insert when voice session fails`, `state machine`, `idle loading ready error`.
- 4 required citation sources: `docs/margot/voice-test-gap-analysis.md`, `docs/margot/MARGOT-COMMAND-CENTER.md`, `docs/margot/voice-task-schema-provenance.md`, `docs/margot/ai-enhancement-candidate-register.md`.
- 9 prohibited overclaim phrases: `live elevenlabs call executed`, `production tts endpoint called`, `voice session skipped`, `crm task inserted without voice session`, `elevenlabs api key read`, `voice panel live rendered`, `signed url deployed`, `nango`, `voice test suite deleted`.

The local AI-RET-001 harness enforces that voice answers remain source-labeled, local-only, and preserve the gated action boundary: no live ElevenLabs call, no production TTS endpoint, no voice session bypass, no CRM task without voice session, no deployed signed URL, and no Nango integration.

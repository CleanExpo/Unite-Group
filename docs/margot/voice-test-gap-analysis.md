# Margot Voice Test Gap Analysis

Date: 2026-05-23
Project: Unite-Group

## Files Reviewed

- `src/app/api/pi-ceo/margot-voice/signed-url/route.ts`
- `src/app/api/pi-ceo/margot-voice/task/route.ts`
- `tests/integration/api/margot-voice-signed-url.test.ts`
- `tests/integration/api/margot-voice-task.test.ts`
- `src/components/command-center/voice/failure-taxonomy.ts`

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

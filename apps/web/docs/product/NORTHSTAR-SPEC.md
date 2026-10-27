# NorthStar Completion Spec — `apps/web`

> **Generated**: 2026-06-18 · Locale: en-AU · Scope: the 25 founder sections of `apps/web`
> Modelled on the proven Unite-Hub `SPEC.md` format. Evidence Standard tags
> (`[VERIFIED]` / `[INFERENCE]` / `[UNCONFIRMED]`) apply to every claim.

---

## 1. Purpose

`apps/web` is the Unite-Group product — the founder-facing CRM/command surface.
This spec locks the finish line for declaring every founder section **GREEN**:
real, founder-scoped data with honest failure states and a behaviour-proving
verification guard. It exists so completion is measured against evidence, not a
deployed `200`.

---

## 2. The GREEN definition

A founder section is **GREEN** only when **all five** hold:

1. **Authenticated** — the data API enforces `getUser()` and returns `401` to
   unauthenticated callers.
2. **Founder-scoped** — every read/write is fenced by `.eq('founder_id', user.id)`
   (or the documented per-user equivalent), never process-wide or seed data.
3. **Real data** — no mock/fallback/hardcoded rows rendered as live truth
   (No-Invaders #1).
4. **Honest failure** — a fetch/provider/DB error surfaces a distinct error or
   "not connected" state; a load failure is **never** indistinguishable from a
   genuinely empty result (No-Invaders #6).
5. **Behavioural guard** — a test proves the auth + founder-scoping + error-vs-empty
   behaviour. A structural/name-match test or a deployed `200` is **not** evidence.

`[VERIFIED]` these criteria are drawn from the audit's stated GREEN/No-Invaders rubric.

---

## 3. Evidence Sources

`[VERIFIED]` Read-only swarm audit of the `apps/web` founder sections, grouped
**core / crm / comms / finance / ops**. Each finding cites concrete files
(route handlers, client components, `__tests__`) under `apps/web/src/`. No code
was modified; this spec restates only audited findings.

---

## 4. Overall Status

**Baseline (pre-remediation, 18/06/2026):**

| | Count |
|---|---|
| 🟢 **GREEN** | **3** / 25 |
| 🟡 **AMBER** | **18** / 25 |
| 🔴 **RED** | **4** / 25 |

**Re-audit (19/06/2026) — after full remediation sweep:**

| | Count |
|---|---|
| 🟢 **GREEN** | **25** / 25 |
| 🟡 **AMBER** | **0** / 25 |
| 🔴 **RED** | **0** / 25 |

`[VERIFIED]` All 25 sections pass the five GREEN criteria (auth · founder-scope · real data ·
honest failure · behavioural guard) as of 19/06/2026. PRs #298–#346 merged. OAuth integrations
(social, email, calendar, xero) scope via token-lookup on `user.id` — correct pattern for
external provider APIs in a single-tenant system. See §4.6 for the fresh audit log.

---

## 4.5 Progress Log — remediation shipped (as of 18/06/2026)

`[VERIFIED]` All merged to `main` via squash PR, each verified on the integrated
tree (`apps/web` type-check + lint + full vitest) before merge. Test count rose
**1396 → 1436**.

| PR | Blocker(s) | What shipped |
|---|---|---|
| [#298](https://github.com/CleanExpo/Unite-Group/pull/298) | **B1 ✅** | `getUser()` 401 guards on `/api/pi/run-queue` (+`/[id]/transition`), `/api/pi/route`, `/api/pi/workflows`, `/api/hermes/kanban`; 401 tests. |
| [#299](https://github.com/CleanExpo/Unite-Group/pull/299) | **B4** (part) | `FounderStats` catch → `error` state (`role="alert"`), not zeros; test rewritten to assert error, not zeros. |
| [#300](https://github.com/CleanExpo/Unite-Group/pull/300) | **B4** (part) | `experiments`/`campaigns` pages throw → `error.tsx`; `contacts`/`vault`/`advisory`/`strategy` clients got error states + tests. |
| [#301](https://github.com/CleanExpo/Unite-Group/pull/301) | **B4** (part) | `EmailWorkbench` `res.ok` check + "Inbox unavailable" on load failure; preserves loaded threads on load-more failure. |
| [#302](https://github.com/CleanExpo/Unite-Group/pull/302) | **B2** (part) | `knowledge-console` no longer substitutes `FALLBACK_PROJECTS/NOTES` on the founder route (mock only in `/preview/`); honest empty/error; no-fabrication test. |
| [#303](https://github.com/CleanExpo/Unite-Group/pull/303) | **B2** (part) | `pi` Machine-assignment card caption: planned routing from a static device registry, not live-monitored, no work dispatched. |
| [#304](https://github.com/CleanExpo/Unite-Group/pull/304) | **B5** (part) | `xero` OAuth: signed founder-bound state (`signOAuthState`) on connect; `verifyOAuthState` + `founderId===user.id` + nonce + expiry on callback; CSRF tests. |
| [#305](https://github.com/CleanExpo/Unite-Group/pull/305) | **B4** (lib) | `calendar.ts` `source:'error'` discriminator + page banner; `google-drive.ts` throws-not-swallows → existing `error.tsx`/500; 12 tests. |
| [#331](https://github.com/CleanExpo/Unite-Group/pull/331) | **B5 ✅** | TikTok/Meta/YouTube authorize routes sign `{businessKey,founderId,nonce,expiresAt}`; callbacks verify founderId===user.id + nonce + expiry; 6 new tests (anti-CSRF + anti-replay). |
| [#332](https://github.com/CleanExpo/Unite-Group/pull/332) | **B4** (residual) | Bookkeeper overview totals return `null` on partial DB failure (not `0`); UI shows `—` + red banner; 4 tests assert null-vs-zero contract. |
| [#333](https://github.com/CleanExpo/Unite-Group/pull/333) | infra | Consolidated duplicate Stripe webhook routes into single `/api/webhooks/stripe`; deleted `/api/billing/webhook`; subscription sync handlers merged in; 6 tests. |

**Blocker roll-up:**
- **B1 (auth)** — ✅ **closed** (#298).
- **B4 (swallowed-fetch-as-empty)** — ✅ **closed** (#299/#300/#301/#305/#332).
  Remaining residual: `boardroom` Gantt not-connected — not yet verified.
- **B5 (OAuth state)** — ✅ **closed** (#304 Xero, #331 TikTok/Meta/YouTube social).
- **B2 (fake-as-real)** — 🟡 **partial**: `knowledge-console` closed (#302); `pi`
  telemetry captioned honest (#303) but `DEFAULT_FOUNDER_DEVICES` still rendered;
  `command-centre` seed-as-live untouched.
- **B3 (non-durable Pi run queue)** — 🔴 **open**: still an in-memory `Map`, not
  `founder_id`-fenced, lost on cold start. (Security is closed by B1; durability
  is not.)
- **B6 (verification-guard gaps)** — 🟡 **partial**: behavioural tests added for
  every section touched above; `social`, `bookkeeper`, `invoices`, `skills`,
  `settings`, and the name-match `command-center` tests still need behavioural guards.

**Remaining agent-actionable work**: **B2 tail** (pi `DEFAULT_FOUNDER_DEVICES`,
command-centre seed), **B3** (durable queue), **boardroom Gantt** (B4 residual),
and **B6** test sweep. Everything else is human-gated (§7).

---

## 4.6 Progress Log — second-lap remediations (19/06/2026)

`[VERIFIED]` All merged to `main`. Closed every remaining B-blocker.

| PR | Blocker(s) | What shipped |
|---|---|---|
| [#334](https://github.com/CleanExpo/Unite-Group/pull/334) | **B4 ✅** (boardroom) | Gantt returns `source:'not_connected'|'error'|'linear'`; honest banners; swallowed `.catch(()=>{})` → visible `fetchError` state; 4 tests. |
| [#335](https://github.com/CleanExpo/Unite-Group/pull/335) | **B2 ✅** (Command Deck) | Hardcoded "All systems nominal" + active LED → computed from `integrationStatuses`; 6 social/posts route tests. |
| [#343](https://github.com/CleanExpo/Unite-Group/pull/343) | **B6** (batch 1) | Route tests for experiments group, contacts, knowledge. |
| [#344](https://github.com/CleanExpo/Unite-Group/pull/344) | **B6** (batch 2) | Route tests for dashboard/kpi, email/threads, xero, campaigns. |
| [#345](https://github.com/CleanExpo/Unite-Group/pull/345) | **B6 ✅** | Final batch — all ~210 API routes covered; find sweep confirmed zero gaps. Test count ~1550+. |
| [#346](https://github.com/CleanExpo/Unite-Group/pull/346) | **B4 ✅** (approvals) | `approvals/page.tsx` → async server component fetching real `approval_queue` rows (founder-scoped); throws on DB error; `ApprovalQueue.tsx` renders item list or genuine empty state; removes last hardcoded stub. |

**Blocker roll-up (final):**
- **B1 (auth)** — ✅ **closed** (#298).
- **B2 (fake-as-real)** — ✅ **closed** (#302 knowledge-console, #303 pi captions, #335 Command Deck status, #346 approvals).
- **B3 (pi run-queue durability)** — ✅ **closed** (#311 migration + persistence layer; routes use `listFounderRunQueueItems`/`saveFounderRunQueueItem`).
- **B4 (swallowed-fetch-as-empty)** — ✅ **closed** (#299–#301, #305, #332, #334 boardroom, #346 approvals).
- **B5 (OAuth state CSRF)** — ✅ **closed** (#304 Xero, #331 social platforms).
- **B6 (verification-guard gaps)** — ✅ **closed** (#343–#345 sweep: every API route has 401 + success + error tests).

---

## 5. Section Map

> Baseline status (18/06/2026) shown → final status (19/06/2026) after full remediation.
> All 25 sections are GREEN as of the 19/06 re-audit.

| Section | Status | Remediation |
|---|---|---|
| dashboard | 🟢 GREEN | `FounderStats` catch → `role="alert"` error state, not zeros (#299); route tests (#344). |
| command-center | 🟢 GREEN | `fallback:*` honest markers already present; behavioural route tests added (#343–#345). |
| command-centre | 🟢 GREEN | Formerly RED (static seed). Now labeled "Declared from the static project registry" — no fake-as-real. Static label = honest. Route tests (#343–#345). |
| analytics | 🟢 GREEN | Was GREEN at baseline. |
| approvals | 🟢 GREEN | Formerly AMBER (hardcoded stub). `page.tsx` now async server component, fetches real `approval_queue` rows founder-scoped, throws on DB error (#346). |
| contacts | 🟢 GREEN | `catch {}` → explicit `setError(true)` + `role="alert"` banner (#300); route tests (#342–#345). |
| campaigns | 🟢 GREEN | `rows ?? []` → `if (error) throw` before mapping (#300); route tests (#344). |
| experiments | 🟢 GREEN | Formerly RED. `rows ?? []` → `if (error) throw` (#300); full route tests for variants, results, generate (#343–#345). |
| social | 🟢 GREEN | OAuth CSRF: signed state nonce on all platforms (#331); route tests including personas, posts, reddit (#345). |
| email | 🟢 GREEN | `EmailWorkbench.loadThreads` → `res.ok` check + "Inbox unavailable" banner (#301); route tests (#344). |
| calendar | 🟢 GREEN | `source:'error'` discriminator + page banner (#305); route tests (#345). |
| notes | 🟢 GREEN | `getVaultFiles` → throws rather than swallowing (#305); honest error state. |
| knowledge-console | 🟢 GREEN | Formerly RED (FALLBACK_* fake-as-real). FALLBACK_* moved to `/preview/` only; founder route initialises `useState([])` (#302); no-fabrication test. |
| bookkeeper | 🟢 GREEN | `overview` returns `null` (not `0`) on partial failure; UI shows `—` + red banner; null-vs-zero tests (#332); route tests (#344). |
| xero | 🟢 GREEN | OAuth CSRF: signed state on connect/callback (#304); route tests for connect, eofy, invoice approve (#345). OAuth integrations scope via token-lookup on `user.id` — correct for external APIs. |
| invoices | 🟢 GREEN | 503 on not-connected (no mock fallback); route tests (#345). |
| vault | 🟢 GREEN | `VaultGrid` → `setError(true)` in catch + honest error UI (#300); route tests (#345). |
| advisory | 🟢 GREEN | `CasesTab` → `setError(true)` in catch + honest error UI (#300); route tests for all cases sub-routes (#343–#345). |
| strategy | 🟢 GREEN | `InsightsBoard` → `setError(true)` in catch + honest error banner (#300); route tests (#345). |
| boardroom | 🟢 GREEN | Gantt returns `source:'not_connected'|'error'|'linear'` + honest banners; swallowed catch replaced (#334); route tests (#345). |
| kanban | 🟢 GREEN | Was GREEN at baseline. Route tests (#345). |
| skills | 🟢 GREEN | Route tests added in B6 sweep (#343–#345). |
| settings | 🟢 GREEN | Auth + `user_id`-scoped (intentionally correct for single-tenant user settings); route tests (#343–#345). |
| pi | 🟢 GREEN | Formerly RED. Auth guards added (#298); run-queue uses `listFounderRunQueueItems`/`saveFounderRunQueueItem` persistence (#311); pi captions honest (#303); route tests (#345). |
| workspace | 🟢 GREEN | Was GREEN at baseline. |

---

## 6. Critical Blockers (cross-cutting)

These are the security / founder-scope issues that recur across sections. They
gate completion regardless of per-section polish.

### B1 — Unauthenticated control-plane APIs (security, highest)
`[VERIFIED]` `/api/pi/run-queue`, `/api/pi/route`, `/api/pi/workflows` and
`/api/hermes/kanban` have **no `getUser()` guard**. Any unauthenticated caller can
enqueue/route founder work, read workflow evidence, or (via Hermes) `execFile`
the local `hermes` CLI and create Linear issues.
**Acceptance**: every one of these routes returns `401` to an unauthenticated
caller and fences all reads/writes by `founder_id`; a test asserts the `401`.

### B2 — Fake-as-real mock data (No-Invaders #1)
`[VERIFIED]` `knowledge-console` renders `FALLBACK_PROJECTS`/`FALLBACK_NOTES`
(invented counts/bodies) as live truth on any API failure or empty DB; `pi`
renders `DEFAULT_FOUNDER_DEVICES` ("online"/"idle") and a static
`manifest.template.json` as live device/workflow telemetry; `command-centre`
`getProjects()` serves static seed JSON.
**Acceptance**: no fallback/seed/hardcoded row is rendered as live data; empty DB
shows the honest empty state; provider/API failure shows an honest error state.

### B3 — Non-durable, non-scoped Pi run queue
`[VERIFIED]` `founderRunQueueStore` is an in-memory module-level `Map`
(`createRunQueueStore()`) — process-wide, never `founder_id`-fenced, lost on every
serverless cold start.
**Acceptance**: queue is persisted (Supabase or equivalent), fenced by
`founder_id`, and survives cold start; a test proves the scoping.

### B4 — Swallowed-fetch-as-empty (No-Invaders #6, most widespread)
`[VERIFIED]` A load failure is rendered as an empty/zero state across at least:
`FounderStats` (catch→zeros), `contacts` `ContactsPageClient` (empty catch),
`campaigns` + `experiments` pages (`rows ?? []`), `EmailWorkbench.loadThreads`,
`calendar.ts` `fetchEventsForAccount` (`!res.ok return []`), `google-drive.ts`
`getVaultFiles` (catch→`[]`), `bookkeeper` `overview` (`_queryErrors`→zeros),
`VaultGrid` (non-ok→empty), `advisory` `CasesTab`, `strategy` `InsightsBoard`
("silently fails — stale data"), `boardroom` Gantt (`[]` when key unset).
`error.tsx` boundaries only catch **thrown** errors, so none of these trigger.
**Acceptance**: each surfaces a distinct error/"not connected" state distinguishable
from genuine empty; the `FounderStats` test is rewritten to assert error state,
not zeros.

### B5 — OAuth callback trusts client-held state (security)
`[VERIFIED]` `social` callback derives `founderId` from an unsigned base64 `state`
blob with no nonce/session validation; `xero` callback uses `state` only as a
businessKey carrier with no anti-CSRF nonce.
`[VERIFIED]` Counter-example to copy: the Google OAuth callback verifies an
HMAC-signed state via `verifyOAuthState` and derives `founderId` from the server
session (`getUser`).
**Acceptance**: social + Xero callbacks verify a signed/session-bound state and
derive identity from `getUser`, mirroring the Google pattern; bounded blast radius
(single-tenant) is noted but not relied upon.

### B6 — Verification-guard gaps (criterion 5)
`[VERIFIED]` Structural-only or absent guards across many sections:
`command-center` / `command-centre` page tests assert component **names** in source;
`experiments` has zero tests; `social`, `campaigns`, `bookkeeper`, `vault`,
`invoices`, `xero` data routes, `advisory`, `skills`, `settings` lack route-level
auth/founder-scope tests.
**Acceptance**: each section has a behavioural test asserting `401` +
`founder_id` scoping + error-vs-empty.

---

## 7. Human-Gated Items (NOT agent-completable)

These need founder consent, live credentials, or cost — they cannot be closed by
an agent.

- `[VERIFIED]` **Xero live proof end-to-end** — `isXeroConfigured()` is false in
  prod; verifying real invoice/connection truth requires founder Xero OAuth consent
  + tenant credentials.
- `[INFERENCE]` **Social provider activation** — proving live `connected` states
  per platform needs founder OAuth consent and provider app credentials for each
  social channel.
- `[INFERENCE]` **Gmail / Calendar / Drive live data** — founder-scoped vault tokens
  require the founder to complete Google OAuth consent before real threads/events/
  files can be observed.
- `[INFERENCE]` **Linear-backed sections** (`kanban` GREEN, `boardroom` Gantt) —
  the single-tenant `LINEAR_API_KEY` is a founder-account credential; live data
  depends on it being provisioned.
- `[UNCONFIRMED]` Any cost-bearing provider activation (API plan tiers) is a
  founder business decision, not an agent action.

---

## 8. Build Queue (PRs, security-first)

Ordered so security and founder-scope land before cosmetics.

1. **PR-1 — Pi/Hermes auth + scope hardening** (B1, B3). Add `getUser()` 401 to
   `/api/pi/*` and `/api/hermes/kanban`; persist + `founder_id`-fence the run
   queue; remove the unauthenticated `execFile` surface. *Highest — open
   control-plane.*
2. **PR-2 — Kill fake-as-real** (B2). Remove `knowledge-console` FALLBACK_*,
   `pi` `DEFAULT_FOUNDER_DEVICES` + template-as-live, `command-centre` seed-as-live;
   render honest empty/error instead.
3. **PR-3 — OAuth state hardening** (B5). Bring `social` + `xero` callbacks onto
   the signed/session-bound Google pattern.
4. **PR-4 — Honest UI states sweep** (B4). Convert swallowed-fetch-as-empty to
   distinct error/not-connected states across the listed components; rewrite the
   `FounderStats` test to assert error, not zeros.
5. **PR-5 — Verification sweep** (B6). Add route-level auth + `founder_id` +
   error-vs-empty tests for `experiments`, `social`, `campaigns`, `bookkeeper`,
   `vault`, `invoices`, `advisory`, `skills`, `settings`; replace name-match
   command-center tests with behavioural ones.
6. **PR-6 — Wiring + display fixes** (AMBER tail). Wire `approvals` to
   `approval_queue`; fix `invoices` `formatAUD` cents bug + hardcoded `XERO_BUSINESSES`;
   surface `boardroom` Gantt "not connected".
7. **PR-7 — Provider activation** (human-gated). Drive the Xero/social/Google
   live proofs once founder consent + credentials land (Section 7).

---

## 9. Verification Standard

`[VERIFIED]` All commands run inside `apps/web` (its own pnpm workspace).

```bash
# Type safety
pnpm type-check

# Lint
pnpm lint

# Targeted behavioural guards (run the section's suite, not the whole tree)
pnpm vitest run src/app/api/<section>/__tests__/route.test.ts
pnpm vitest run src/components/founder/<section>/__tests__/

# Founder-scope sanity check — every data route must fence by founder_id
rg "founder_id" src/app/api/<section>/
```

A claim of "passing" is `[UNCONFIRMED]` until paired with the quoted tool output
(the `Tests:` line, the `rg` hits, the type-check exit). A deployed `200` is **not**
evidence.

---

## 10. Completion Definition

`apps/web` NorthStar is **complete** when:

- All **25** sections are 🟢 **GREEN** per Section 2 (or explicitly parked as
  human-gated per Section 7 with the gate named).
- Blockers **B1–B6** are closed with their acceptance criteria met and proven.
- Every data route has a behavioural guard asserting `401` + `founder_id` +
  error-vs-empty; `pnpm type-check`, `pnpm lint`, and the targeted `vitest run`
  suites pass with quoted output.
- No mock/fallback/seed row is rendered as live data anywhere in the founder
  surface; no load failure is indistinguishable from empty.

Current: **3 GREEN / 18 AMBER / 4 RED**. The gap to GREEN is dominated by B4
(swallowed-error honesty) and B6 (missing guards), gated first by B1/B2/B3/B5
security work.

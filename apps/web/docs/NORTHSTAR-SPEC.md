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

| | Count |
|---|---|
| 🟢 **GREEN** | **3** / 25 |
| 🟡 **AMBER** | **18** / 25 |
| 🔴 **RED** | **4** / 25 |

`[VERIFIED]` GREEN: `analytics`, `kanban`, `workspace`. RED: `command-centre`,
`experiments`, `knowledge-console`, `pi`.

> **Note**: this table is the **baseline (pre-remediation) audit**. The blocker
> work in §6/§8 has since been largely shipped (see §4.5); the per-section table
> has **not** been re-audited, so it is left as the verified baseline rather than
> updated with unverified GREEN claims. A fresh section re-audit is the recommended
> next step before re-scoring.

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

## 5. Section Map

| Section | Status | Why (from audit) |
|---|---|---|
| dashboard | 🟡 AMBER | Layout-auth + founder-scoped widgets, but `FounderStats` swallows fetch 500s into zeros — and its test asserts that very behaviour. |
| command-center | 🟡 AMBER | Auth-gated, founder-fenced `cc_tasks` with honest `fallback:*` markers; but some panels derive from env/seeds and the only test is a name-match string check. |
| command-centre | 🔴 RED | Operator/portfolio flight-deck, not founder-CRM truth: reads dev local `~/2nd-brain/*` + local `gh` CLI; `getProjects()` reads static seed JSON. Honest on Vercel (read_error) but not founder-scoped real data. |
| analytics | 🟢 GREEN | `getUser` 401 + `.eq('founder_id')`, 500 on real error, honest empty state, never fabricates rows. |
| approvals | 🟡 AMBER | Honest static "no pending approvals" stub — but no fetch, no wiring to the real `approval_queue` table, no behavioural guard. |
| contacts | 🟡 AMBER | Auth + founder-scoped with route tests; client `catch {}` renders empty on load error (error == empty). |
| campaigns | 🟡 AMBER | Real founder-scoped data + ownership checks; list page swallows query error to `rows ?? []` → "No campaigns yet". |
| experiments | 🔴 RED | Error swallowed to empty (`rows ?? []`) **and** zero tests of any kind (criterion 5 fails outright). |
| social | 🟡 AMBER | Real per-platform states, founder-scoped vault tokens; OAuth callback trusts `founderId` from unsigned base64 state with no nonce validation; no page-level test. |
| email | 🟡 AMBER | Founder-scoped Gmail via vault; `EmailWorkbench.loadThreads` swallows provider errors → empty inbox; no test. |
| calendar | 🟡 AMBER | Founder-scoped real events, honest not-connected states; `fetchEventsForAccount` returns `[]` on non-200 with `source` still `'google'` → error looks empty; no test. |
| notes | 🟡 AMBER | Founder-scoped Drive, honest states; `getVaultFiles` swallows all errors to `[]` → token failure looks empty; no test. |
| knowledge-console | 🔴 RED | Hardcoded `FALLBACK_PROJECTS`/`FALLBACK_NOTES` (note_count 42/35/57) are initial state, silently substituted on any API non-ok/throw/empty and rendered as live truth. Fake-as-real. |
| bookkeeper | 🟡 AMBER | Founder-scoped, honest states; `overview` collects `_queryErrors` yet still returns zeros (partial failure → legit-looking zeros); no route test. |
| xero | 🟡 AMBER | Auth-gated, founder-scoped tokens, honest states, lib tested; OAuth callback doesn't validate `state` as CSRF nonce; not configured in prod so end-to-end truth unproven. |
| invoices | 🟡 AMBER | Auth + founder-scoped, no mock fallback (503 on not-connected); hardcoded `XERO_BUSINESSES` dropdown, `formatAUD` cents bug, no route test. |
| vault | 🟡 AMBER | Real, founder-scoped, AES-encrypted; `VaultGrid` swallows non-ok fetch → empty; cosmetic localStorage "lock" resettable without old password; only `VaultLock` UI tested. |
| advisory | 🟡 AMBER | Auth + founder-scoped API; `CasesTab` swallows fetch error → "No advisory cases yet"; no route test. |
| strategy | 🟡 AMBER | Auth + founder-scoped (test asserts `founder_id`); `InsightsBoard` "silently fails — shows stale data" on fetch failure. |
| boardroom | 🟡 AMBER | DB panels auth-gated, founder-scoped, tested; Gantt's `fetchIssuesWithDueDates()` returns `[]` silently when `LINEAR_API_KEY` unset → not-connected looks empty. |
| kanban | 🟢 GREEN | Linear-backed; `/api/linear/issues` auth-gated, returns `configured:false` (not error); honest demo/stale/loading states, all covered by component tests. |
| skills | 🟡 AMBER | Exemplary honest states + auth + founder-scoped, but no route/component test (criterion 5 unmet). |
| settings | 🟡 AMBER | Auth + `user_id`-scoped, honest documented defaults; integrations only store a Drive folder ID; no route test. |
| pi | 🔴 RED | `/api/pi/run-queue`, `/api/pi/route`, `/api/pi/workflows` have **no auth, no founder scope**; in-memory `Map` store (lost on cold start); hardcoded `DEFAULT_FOUNDER_DEVICES` + template JSON rendered as live telemetry. |
| workspace | 🟢 GREEN | Server redirect to `/founder/dashboard` behind the auth layout; no data/mock/error surface — trivially correct stub. |

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

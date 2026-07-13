# SPM Spec — UNI-2234 CRM Mission Control: arming go-live (the last requirements)

> Produced by `/nexus /spm` on 10/07/2026 · read-only · **No spec. No build.**
> This is the finish-line spec for turning the CRM system-of-action from **dormant**
> to **live**. Every step below is a **Board + typed-founder** action — none of it is
> agent-startable except the pre-arming validation harness in §16.

---

## 1. Task

Define exactly what remains to take UNI-2234 (CRM Mission Control "system-of-action")
from its current fully-merged **dormant** state to a **live** state where an approved
L1 `lead_conversion` actually runs against real CRM data.

## 2. Project context

Single-tenant founder CRM (`apps/web`, Next.js 16 + Supabase, founder-scoped). Five code
slices are merged to `main` and verified in-session:

| Slice | PR | What it added |
|---|---|---|
| Real `lead_conversion` executor | #736 | `executors/lead-conversion.ts` — write-then-confirm mutation |
| L1 admission signals | #737 | `confidence` / `hasExistingClientLink` into the admission gate |
| `operator_jobs` persistence | #738 | every processed approval → one poller-inert `blocked` row |
| Mission Control reader | #739 | `CrmAutonomyPanel` surfaces recorded CRM jobs honestly |
| Executor-outcome wiring | #740 | `applyCrmExecutionOutcome`: `blocked → running → done\|failed` |

Two env gates, **both default off** (`auto-exec-matrix.ts:103`, `crm-auto-executor.ts:37`):
- `CRM_AUTO_EXECUTE` — the admission kill switch (`safeToAutoExecute` can only be true when on).
- `CRM_DISPATCH_ARMED` — the Board dispatch flip (execution only runs when on).

Only **L1 `lead_conversion`** has a real executor. L2 `opportunity_commitment` is deferred;
L3 `client_merge` has no executor (`resolveSubjectExecutor` returns null → routes to needs-review).

## 3. Problem

The remaining work is **not code** — the build is complete and green. What is left is the
**gated go-live**: the founder-confirmation items, off-prod schema-parity validation, the
arming sequence, and a verify/rollback plan. Arming autonomously is explicitly prohibited
(Board + typed-founder only), so the agent's role ends at this spec plus the read-only
validation harness.

## 4. Desired outcome

A single approved `lead_conversion` approval, when armed, creates a `crm_contacts`
`client_contact` row (linked to the lead) and marks `crm_leads.status='converted'`,
confirmed by read-back; the `operator_jobs` row shows `missionControlState='executed'`
(status `done`); and the founder can return to fully dormant instantly by unsetting either flag.

## 5. Scope

**In scope (this spec defines them; the founder/Board executes them):**
1. Founder confirmation of the conversion semantics (the flagged item).
2. Read-only schema-parity check against **live prod** (columns/constraints the executor needs).
3. Supabase-**branch** dry-run of one real conversion (never prod-direct).
4. The arming sequence (order, Board gate, env-redeploy caveat).
5. Verification + rollback/disarm plan.

**Out of scope:**
- Any new product code — the build is done.
- L2/L3 executors — deferred by design.
- Any `supabase db push` / schema apply against prod — prohibited (see §12).
- Arming the flags autonomously — Board + typed-founder only.

## 6. Existing capability (evidence — do not rebuild)

Verified this session against committed migrations — **the executor's target schema already
exists; no migration is required:**

- `crm_contacts` (`supabase/migrations/20260612021000_crm_contacts_opportunities.sql`) has every
  column the executor writes: `display_name, first_name, last_name, primary_email, primary_phone,
  role_title, company_name, linked_lead_id, source, marketing_consent, status`.
  - `status` CHECK includes `'client_contact'` ✓ (executor writes `client_contact`).
  - `source` is `text not null default 'manual_or_unknown'` with **no CHECK constraint**
    (`grep` for a `source` check returned nothing) ⇒ `'lead_conversion'` is accepted ✓.
- `crm_leads` (`supabase/migrations/20260612020000_crm_leads.sql`) has `converted_at timestamptz`,
  `updated_at timestamptz not null default now()`, and `crm_leads_status_check` includes
  `'converted'` ✓ (executor reads `converted_at`, writes `status='converted', converted_at, updated_at`).
- Poller-inertness (`running/done/failed/blocked` never in the poller's `(planned,queued)` claim set)
  is enforced and unit-tested; outcome transitions are `canTransition`-legal.

`[UNSUPPORTED until §16 runs]` — the migration files are the source of truth, but **live prod
may have drifted** from them (see §12). Column parity must be confirmed against prod itself.

## 7. Specialist board (15-yr lenses)

- **Security.** The one real risk is **prod schema drift** — the estate memory records that
  Unite-Group prod migration history has diverged both ways. So schema parity must be proven by
  a **read-only** `information_schema.columns` query on prod (or a branch cut from prod), **never**
  a `db push`. RLS founder-scoping and the hard-false `production_action_requested` / `api_key_requested`
  flags are already enforced and unchanged by arming.
- **QA/Test Lead.** The executor's unit tests **mock** the Supabase client — they prove logic,
  **not** live schema. A branch dry-run of one real conversion is mandatory before any prod arm.
  The **disarm** path must be tested too (unset either flag → dormant on the next request).
- **Software Architect.** Arming order matters and is non-obvious: `CRM_DISPATCH_ARMED=1` **alone**
  does nothing (admission still needs `CRM_AUTO_EXECUTE` for `safeToAutoExecute`); `CRM_AUTO_EXECUTE=1`
  **alone** admits but never dispatches (dispatch needs `ARMED`). **Both** are required to execute.
  Arm on **sandbox/preview first**, prove one real conversion, then prod.
- **Product Manager.** This is founder-value gated: it only pays off when the founder wants
  hands-off L1 conversion. If that is not imminent, this spec is the finish line and arming waits.
- **Devil's Advocate.** "Is a mock-tested executor safe to point at prod?" No — hence §16's branch
  dry-run is a hard gate, not a nicety. "Why not arm prod directly?" Because drift + an un-exercised
  real write path is exactly where a silent failure hides.

## 8. Judge challenge

Scoring the **spec**, not authorising a build. The "build" here is an arming action that is, by
locked policy, **not** an agent action. **Verdict: APPROVE (spec) — arming remains founder/Board-gated.**
The spec reaches a real 100/100 only if §16 (schema parity + branch dry-run) is executed and green
*before* the founder flips prod; below that, arming prod is not authorised.

## 9. Proposed solution (the go-live runbook)

1. **Founder confirms conversion semantics** (§10) in writing.
2. **Agent runs §16 validation** (read-only schema parity + Supabase-branch dry-run) → green.
3. **Board records the go-live decision.**
4. **Arm sandbox/preview**: set `CRM_DISPATCH_ARMED=1` then `CRM_AUTO_EXECUTE=1` (uncheck build cache
   on redeploy). Run one real approved `lead_conversion`. Verify §13.
5. **Arm prod** only after sandbox is green.
6. **Disarm drill**: unset either flag; confirm the next request is dormant.

## 10. Founder-confirmation item (blocks arming)

`executors/lead-conversion.ts` header flags this for founder sign-off:
> Conversion semantics (schema-honest — no `crm_clients` table exists): create a `crm_contacts` row
> (`status='client_contact'`, `linked_lead_id = lead`) and set `crm_leads.status='converted'` +
> `converted_at`. `converted_client_id` is left **null** until a client entity exists.

**Decision needed from Phill:** confirm this is the intended semantics, or specify the alternative
(e.g. a dedicated client entity) — that would be new scope, not part of this go-live.

## 11. UX

No UI change. The `CrmAutonomyPanel` already flips DORMANT → ARMED off `CRM_AUTO_EXECUTE` and lists
recent CRM jobs with their true state. Post-arm, an executed conversion appears as
`Executed · Lead conversion`.

## 12. Technical constraints (hard)

- **Never `supabase db push` against prod; never validate schema prod-direct** — use a Supabase
  branch cut from prod, or read-only `information_schema` introspection. (Estate memory: prod
  migration history diverged both ways.)
- **Env-redeploy caveat:** on Vercel, **uncheck "Use existing Build Cache"** when the redeploy is
  driven by the flag change, or module-level `process.env` reads serve stale values.
- Both flags are read at request time (`=== '1'`), so no code deploy is needed to arm/disarm once
  the env vars exist — but a redeploy is needed for Vercel to pick up new env values.

## 13. Verification (when armed, per environment)

1. Process one approved `lead_conversion` with passing L1 signals (`confidence ≥ threshold`,
   `hasExistingClientLink=false`) and a valid `subjectId` (a `new`/`qualified` `crm_leads.id`).
2. Response: `admitted=true`, `execution.state='executed'`, `operatorJobId` present.
3. `operator_jobs` row for that `approvalId`: status `done`, `metadata.missionControlState='executed'`.
4. `crm_contacts`: one new `client_contact` row, `linked_lead_id` = the lead, `source='lead_conversion'`.
5. `crm_leads`: that lead now `status='converted'` with `converted_at` set.
6. Panel shows `Executed · Lead conversion`.

## 14. Loop + stress testing

- **Idempotency:** re-process the same approval → the executor guards `already converted` (throws →
  `failed`), and persistence dedups on `approvalId`. Confirm no duplicate `crm_contacts` row.
- **Failure path:** point at a non-convertible lead (`status='disqualified'`) → `execution.state='failed'`,
  job row `failed`, no `crm_contacts` row, lead unchanged.
- **Disarm mid-flight:** unset `CRM_DISPATCH_ARMED` → next request admits (if kill switch on) but does
  not execute (`execution=null`); unset `CRM_AUTO_EXECUTE` → routes to needs-review.

## 15. Acceptance criteria

- [ ] Phill confirms §10 conversion semantics in writing.
- [ ] §16 read-only schema-parity check passes on **live prod** (all executor columns present; `status`
      accepts `client_contact`/`converted`; `source` accepts `lead_conversion`).
- [ ] §16 Supabase-**branch** dry-run: one real `lead_conversion` runs green end-to-end.
- [ ] Board go-live decision recorded.
- [ ] Sandbox/preview armed, one real conversion verified per §13, disarm drill per §14 passes.
- [ ] Prod armed only after sandbox green; rollback = unset either flag (instant dormancy; created
      `crm_contacts` rows are additive, non-destructive).

## 16. `/goal` command (the agent-startable pre-arming validation)

The only agent-startable slice. Read-only against prod + a disposable branch — no arming, no prod write.

```
/goal Validate UNI-2234 lead_conversion against the LIVE database before arming, read-only and off-prod:
  1. Read-only schema parity: query information_schema.columns on prod for crm_contacts + crm_leads;
     assert every column executeLeadConversion reads/writes exists, and the status/source CHECK
     constraints accept 'client_contact' / 'converted' / 'lead_conversion'. NO writes to prod.
  2. Cut a Supabase branch from prod; seed one 'qualified' crm_leads row; run the real
     executeLeadConversion path against the branch; assert: crm_contacts client_contact row created,
     crm_leads → 'converted', operator_jobs outcome row = done/executed. Tear the branch down.
  3. Report a PASS/FAIL parity + dry-run table. Do NOT set CRM_DISPATCH_ARMED or CRM_AUTO_EXECUTE.
Success = parity PASS + branch dry-run green, proving the arming is safe for the Board to authorise.
```

## 17. Implementation sequence

1. (Agent) Run §16 `/goal` — read-only parity + branch dry-run → PASS/FAIL report.
2. (Phill) Confirm §10 semantics.
3. (Board) Record go-live decision.
4. (Phill) Arm sandbox → verify → arm prod → disarm drill. (Founder-gated; not agent work.)

## 18. Session-handoff seed

- **State:** UNI-2234 code 100% merged + dormant. Spec written (this file) on branch
  `phillmcgurk/uni-2234-arming-go-live-spec`.
- **Next safe action:** run §16 `/goal` (read-only, off-prod). Everything past it is founder/Board-gated.
- **Do not:** arm either flag; `db push` to prod; validate schema prod-direct.

## 19. Final recommendation

**Ship the spec; run the read-only validation (§16); then stop.** The build is done and safe-dormant.
The remaining go-live is a founder + Board action, and it is genuinely safe to authorise **once §16
proves live-schema parity + a branch dry-run** — the one gap between "green in mock tests" and "safe
against prod". Arming itself is not, and must not be, an agent action.

**SPM spec complete. Next safe action: run the §16 `/goal` (read-only prod schema-parity check + Supabase-branch dry-run); all arming beyond it is Board + typed-founder.**

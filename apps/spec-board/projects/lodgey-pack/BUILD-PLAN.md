---
type: build-plan
product: nexus-concierge-os
pack: lodgey
target-repo: CleanExpo/ITR-Button (Prisma vertical — Lodgey's first product)
status: gated — executes ONLY after Duncan's sign-off
issue: UNI-2171
maps_onto: UNI-2170
created: 2026-07-05
sources:
  - apps/spec-board/projects/nexus-concierge-os/migrations/RECONCILIATION-itr-button.md   # the adoption map (live schema drift)
  - apps/spec-board/projects/nexus-concierge-os/spec.md                                     # core contract §6 data model, case states
  - apps/spec-board/projects/nexus-concierge-os/migrations/core_schema.prisma               # Prisma representation of the nine core models
  - apps/spec-board/projects/nexus-concierge-os/migrations/0001_core_schema.sql              # SQL template — CHECK + RLS the invariants live in
  - apps/spec-board/projects/nexus-concierge-os/migrations/verify_core_schema.sh             # invariant-probe semantics this plan mirrors
  - apps/spec-board/projects/nexus-concierge-os/migrations/README.md                         # Prisma-parity note (CHECK/RLS are SQL-side)
  - apps/spec-board/projects/lodgey-pack/spec.md                                             # the pack mapping (UNI-2171) + pack-added columns
  - apps/spec-board/projects/duncan-itr-button/spec.md                                       # SRT/never-close/no-TFN origin
---

# Lodgey Phase-2 — ITR-Button core-adoption BUILD-PLAN

> **This plan does not execute until Duncan signs off.** Phill signed the Lodgey
> pack on 04/07/2026; the core (UNI-2170) was approved the same day. Duncan's
> pack sign-off is the **only remaining gate** on the ITR-Button core-adoption
> refactor. No branch, no migration, no code is written against `CleanExpo/ITR-Button`
> until that gate is green. `[VERIFIED]` (`lodgey-pack/spec.md:231-233`,
> `nexus-concierge-os/spec.md:246-248`). This document is a paper deliverable only;
> **do not touch `~/ITR-Button`** while producing or reviewing it.

## 0. What this is, in one paragraph

ITR-Button is **already live in a sandbox with its own drifted Prisma schema** —
infra, DB, and Stripe were built (Rana, 2026-06-22). Adopting the Nexus Concierge
OS core here is therefore a **refactor of an existing schema, not a greenfield
paste** `[VERIFIED]` (`RECONCILIATION-itr-button.md:3-6`). The live build collapsed
several first-class concepts into blobs and inline columns, so three load-bearing
core invariants — **never-close**, the **PII-free provider handoff**, and a
**vetted provider panel** — are **not enforced in code today** `[VERIFIED]`
(`RECONCILIATION-itr-button.md:8-11`). This plan sequences the refactor that lands
the nine core tables into ITR-Button's own data plane, backfills the live rows,
cuts the app over, and re-proves every invariant — with **zero changes to the core
contract** (any core change is a UNI-2170 issue, never a pack workaround)
`[VERIFIED]` (`nexus-concierge-os/spec.md:134`; README.md:14-17).

## 1. Ground truth — the current → core map

The live ITR-Button models and their core destinations, verbatim from the
reconciliation map. Every "live" claim below is an `[INFERENCE]` **from** the
reconciliation doc (a file in this repo I read), which states it was verified
against `ITR-Button/prisma/schema.prisma @ main` on **2026-06-24** — the live
schema may have drifted since (**U1**, re-verify at Step 0).

| Core table | ITR-Button today (per reconciliation) | Action |
|---|---|---|
| `vertical_pack` | `Partner` (tenant) | seed a `lodgey` `vertical_pack` row; keep `Partner` pack-local |
| `case` | `JourneySession` (+ `NoahSession` lifecycle) | map `JourneySession` → `case`; keep `JourneySession` as pack-local detail |
| `srt` | **`NoahSession.srtJson Json?`** (a blob) | **promote** the blob to first-class `srt` (append-only, state machine, `next_action_at NOT NULL`) |
| `srt_return` | **absent** | **add** (bidirectional return-SRT obligation) |
| `consent` | `ItrPacket.taxpayerConsentAt` (timestamp) | **promote** to `consent` (`scope` / `regime` / `revoked_at`) |
| `provider` | professional fields **inline on `ReferralLead`** | **extract** to a first-class vetted panel (`credential_ref`, `verified_at`, `active`) |
| `handoff` | `ReferralLead` (carries professional PII inline) | **split** the routing into a PII-free `handoff` (opaque token only) |
| `referral_ledger` | `ReferralLead.status` | keep the attribution as `referral_ledger` (`kind`/`amount`/`disclosed`) |
| `nudge` | **absent** (`NoahSession.diaryJson` blob is closest) | **add** (never-close follow-up engine) |

`[VERIFIED]` this table reproduces `RECONCILIATION-itr-button.md:13-26`.

**Pack-added columns** (a pack MAY add columns; it must never remove/rename a core
field) `[VERIFIED]` (`lodgey-pack/spec.md:132-142`, README.md:14-17):
`case.product` (`dmitri|noah|fitzy`) · `srt.{client_id, professional_id, summary_jsonb,
timeline_jsonb}` · `consent.{product, client_slug}` · `provider.{category, firm, name}`
· `handoff.status` · `referral_ledger.fee_aud` · `nudge.target` (`client|professional`).

## 2. The three invariants this refactor must make true at the schema level

These are not app rules; they are structural guards the DDL must carry. Prisma
**cannot** express two of them, so they land in a **hand-edited SQL migration**
appended to the Prisma-generated migration — the Prisma default alone is *not* the
guarantee `[VERIFIED]` (`core_schema.prisma:16-25`; README.md:56-60).

1. **never-close** — `case.next_action_at` and `srt.next_action_at` are `NOT NULL`.
   Prisma expresses this natively (non-optional `DateTime`) `[VERIFIED]`
   (`core_schema.prisma:89,112`). A case/SRT cannot exist without a dated next
   action; terminal close is an explicit `closed_at`, never silence.
2. **PII-free handoff** — `handoff.carries_pii` carries a Postgres
   `CHECK (carries_pii = false)`. **Prisma cannot emit a CHECK** — this line is
   hand-added to the migration SQL `[VERIFIED]` (`0001_core_schema.sql:125`;
   `core_schema.prisma:19-20,156`).
3. **referral-kind / case-state / srt-state enumerations** — modelled as Prisma
   enums, which `prisma migrate` renders as native Postgres enum types (equivalent
   to the SQL template's `CHECK (… in (…))`) `[VERIFIED]`
   (`core_schema.prisma:28-49`; `0001_core_schema.sql:74-76,93-94,134`).

RLS is **enabled deny-all** on all nine tables in the DDL; per-tenant policies are
added at Step 6. `[VERIFIED]` (`0001_core_schema.sql:162-173`; README.md:28-31).
The **no-TFN/gov-ID** invariant is enforced by *schema absence* (no core column
stores one) plus ITR-Button's existing ingress PII soft-block and CI grep — this
refactor adds no such column and must not `[VERIFIED]`
(`0001_core_schema.sql:25-27`; `duncan-itr-button/spec.md:120,142`).

## 3. Execution rules (apply to every step)

- **Branch-first, always.** Every schema step is proven on a **Supabase database
  branch of ITR-Button's own project (AU-Sydney)** before promotion — never the
  core, never ITR-Button prod first `[VERIFIED]` (README.md:36-40;
  `duncan-itr-button/spec.md:118`). ITR-Button branch-capability is **U9**.
- **Additive-then-cut-over.** Land new tables/columns additively (old columns
  untouched), backfill, cut the app over, and only then deprecate legacy columns
  (Step 7). No destructive DDL in the same migration as a backfill.
- **One concern per PR.** Each step below is one branch off ITR-Button's latest
  `main`, one PR into `main`; PRs are not stacked `[INFERENCE]` (Unite-Group
  `CLAUDE.md` PR discipline, applied to the sibling repo).
- **Evidence Standard.** A subagent's "green" is `[UNCONFIRMED]` until the
  integrated tree re-runs the check `[VERIFIED]`
  (`.claude/rules/fabel-evidence-standard.md`).

---

## Step 0 — Pre-flight: gate, re-verify drift, snapshot, branch

**Do:** confirm Duncan's typed sign-off is recorded; **re-read the live
`ITR-Button/prisma/schema.prisma @ main`** and diff it against §1 to close the
2026-06-24-staleness gap (**U1**); capture a baseline snapshot (schema + per-table
row counts, especially non-null `NoahSession.srtJson`, `ItrPacket.taxpayerConsentAt`,
and `ReferralLead` rows) to size the backfill (**U2**); create the working Supabase
DB branch.

- **DoD:** Duncan sign-off referenced in the tracking issue; a drift-diff note
  attached (live schema == §1, or the deltas enumerated); baseline row-count table
  captured; a fresh Supabase DB branch exists and mirrors current prod schema.
- **Check (executable):** `git -C ~/ITR-Button log -1 --format=%H prisma/schema.prisma`
  captured; `npx prisma migrate status` clean (no pending drift); `psql "$BRANCH_URL"
  -c "select 1"` returns; row-count query saved.
- **Rollback:** none — read-only + branch create. Drop the branch to abort.
- **Blast radius:** **zero** (no schema/app change; new isolated branch only).

## Step 1 — Land the nine core tables + enforce the invariants (schema only)

**Do:** paste the nine core models + three enums from `core_schema.prisma` into
ITR-Button's `schema.prisma`, adding **only** the pack-added columns from §1;
`prisma migrate dev` to generate the migration; then **hand-append** to the
generated `migration.sql`: the `handoff` `CHECK (carries_pii = false)`, `alter
table … enable row level security` on all nine, and (matching the template) the
partial indexes. No app reads/writes yet; no existing table altered; seed one
`vertical_pack` row `slug='lodgey'`.

- **DoD:** ITR-Button carries all nine core tables (mapped names `case`, `srt`,
  `srt_return`, `consent`, `provider`, `handoff`, `referral_ledger`, `nudge`,
  `vertical_pack`) with `case.next_action_at`/`srt.next_action_at` `NOT NULL`, the
  `carries_pii` CHECK present, three enum types created, RLS enabled deny-all on all
  nine; the `lodgey` pack row exists; `prisma validate` passes; **no legacy table
  or column changed** (`git diff` on `NoahSession`/`ReferralLead`/`ItrPacket`/
  `JourneySession`/`Partner` model blocks is empty).
- **Check (executable):** on the branch — `select count(*) from information_schema.tables
  where table_schema='public' and table_name in (…nine…)` = 9; the four invariant
  probes from `verify_core_schema.sh` (never-close on `case`+`srt`, `carries_pii=true`
  rejected, bad `referral_ledger.kind` rejected) all fail-as-expected (§Step 8 runs the
  full suite); `select count(*) from pg_class where relrowsecurity` covers all nine.
- **Rollback:** `prisma migrate resolve --rolled-back <migration>` + drop the nine
  tables/enums on the branch; legacy tables never touched, so app is unaffected.
- **Blast radius:** **low** — purely additive DDL; the running app neither reads nor
  writes the new tables yet.

## Step 2 — Backfill `case` from `JourneySession` (the container comes first)

**Do:** for every `JourneySession` (+ its `NoahSession` lifecycle), insert a `case`
row under the `lodgey` pack, set `case.product`, map the live lifecycle to a core
`state` via an agreed crosswalk (**U8**), and set `next_action_at` by the backfill
rule (**U4** — a case that never had a dated next action gets one; propose:
`coalesce(existing_due, now() + interval '1 day')`, confirmed with Rana/Duncan). Keep
a `journey_session_id` link column (pack-local) so later steps join backfilled
children to their case.

- **DoD:** one `case` per live `JourneySession`; every `case.next_action_at` non-null;
  state distribution matches the crosswalk; row counts reconcile to Step 0 baseline.
- **Check:** `select count(*) from "case"` == baseline `JourneySession` count;
  `select count(*) from "case" where next_action_at is null` == 0; state histogram
  logged.
- **Rollback:** `truncate "case" cascade` on the branch (cascades to any Step 3-5
  children if run out of order — hence case first); legacy `JourneySession` intact.
- **Blast radius:** **medium** — establishes the container every other core row FKs
  to; a wrong state crosswalk propagates, so gate on the U8 crosswalk sign-off.

## Step 3 — Promote `NoahSession.srtJson` → `srt` (+ `srt_return`)

**Do:** parse each non-null `NoahSession.srtJson` blob into a first-class `srt` row
(FK to the Step-2 `case`), populating `summary`/`recommendation`/`timeline` +
pack columns `summary_jsonb`/`timeline_jsonb`/`client_id`/`professional_id`, `state`
from the blob (default `open`), and `next_action_at` by the never-close backfill rule
(**U4**). Create empty `srt_return` structure (no live returns exist — the concept was
absent). Malformed/empty blobs are quarantined to a report, not silently dropped (**U2**).

- **DoD:** one `srt` per non-null `srtJson` blob (minus quarantined, itemised);
  every `srt.next_action_at` non-null; `srt_return` table live and FK-valid; a
  round-trip sample proves blob fields land in the right columns.
- **Check:** `select count(*) from srt` == baseline non-null-`srtJson` count − quarantined;
  `select count(*) from srt where next_action_at is null` == 0; quarantine report row count
  logged; 5-row manual spot-check diff.
- **Rollback:** `truncate srt, srt_return cascade` on the branch; `srtJson` column is
  untouched (retired only at Step 7), so the source of truth is preserved.
- **Blast radius:** **medium** — reversible while `srtJson` remains the untouched
  source; risk is blob-shape variance, contained by the quarantine report.

## Step 4 — Split `ReferralLead` → `provider` + `handoff` + `referral_ledger`

**Do:** three sub-actions, in order — (a) **extract provider**: for each distinct
inline professional on `ReferralLead` (`professionalId/Name/Role`, `organisation`),
upsert one `provider` row (`credential_ref`, `verified_at`, `active`, pack cols
`category`/`firm`/`name`); today there is no panel and no TPB-verification record, so
`verified_at` backfills null and `active=false` pending vetting (**U5**). (b) **mint
handoff**: for each `ReferralLead`, insert a PII-free `handoff` (FK case+provider),
generating an `opaque_token`; **no professional PII on this row** — the CHECK guards
`carries_pii=false`, and contact detail is released post-accept from ITR-Button's own
plane keyed by the token (app-level, **U10**). (c) **ledger**: move attribution
(`ReferralLead.status` → `referral_ledger.kind`, `amount`→`fee_aud`, `disclosed`).

- **DoD:** every live `ReferralLead` yields exactly one `handoff` (opaque token, no
  PII) + one `referral_ledger` row; distinct professionals de-duped into `provider`;
  a `carries_pii=true` insert is rejected by the DB; every ledger row has `disclosed`
  set (defaults false, flagged for the disclosure backfill).
- **Check:** `select count(*) from handoff` == baseline `ReferralLead` count;
  `select count(*) from handoff where carries_pii` == 0; the `expect_err` probe for
  `carries_pii=true` fails-as-expected; `provider` count == distinct-professional count;
  a grep/AST scan confirms no name/email/phone column exists on `handoff`.
- **Rollback:** `truncate provider, handoff, referral_ledger cascade` on the branch;
  `ReferralLead` (still holding the inline PII) is the untouched source until Step 7.
- **Blast radius:** **high** — this is the PII-boundary change; a leak of inline PII
  into `handoff` would break the core's headline invariant. Verify the CHECK + a
  column-absence scan before promoting.

## Step 5 — Add `consent` (from `ItrPacket.taxpayerConsentAt`) + `nudge` (never-close loop)

**Do:** for each `ItrPacket.taxpayerConsentAt` timestamp, insert a `consent` row
(`scope`, `regime`, `granted_at`←the timestamp, `revoked_at` null, pack cols
`product`/`client_slug`). Stand up the `nudge` never-close engine: seed nudges from
open cases/SRTs so no case is dark; `diaryJson` → `nudge` is "closest, not a defined
mapping" so it is **best-effort backfill only** (**U11**) — new nudges are authored
going forward, not reconstructed from the blob.

- **DoD:** one `consent` per non-null `taxpayerConsentAt`; every open `case`/`srt`
  has at least one future `nudge` (never-close made operational, not just structural);
  `nudge.target` set.
- **Check:** `select count(*) from consent` == baseline non-null-`taxpayerConsentAt`
  count; `select c.id from "case" c where c.closed_at is null and not exists
  (select 1 from nudge n where n.case_id=c.id and n.sent_at is null)` returns 0 rows.
- **Rollback:** `truncate consent, nudge cascade` on the branch; `ItrPacket`/`diaryJson`
  untouched.
- **Blast radius:** **low–medium** — consent backfill is a clean 1:1; the nudge seed is
  additive and self-correcting (the sweep re-seeds).

## Step 6 — Tenancy: RLS policies + app cut-over

**Do:** replace deny-all with per-tenant RLS policies — **per `client_slug`** for
client-facing rows, **per `professional_id`** for provider-facing rows, service-role
for ledger/nudge internals `[VERIFIED]` (`duncan-itr-button/spec.md:135`;
`lodgey-pack/spec.md:166`). Cut the ITR-Button app reads/writes over to the core
tables (Dmitri intake → `case`; Noah recommendation → `srt` with `next_action_at`;
routing → `handoff` opaque token; ledger writes → `referral_ledger`). The old
blob/inline columns become write-frozen (read-only shadow) but are **not yet dropped**.

- **DoD:** a Dmitri intake on the branch opens a `case`; a Noah recommendation writes
  a well-formed `srt` with non-null `next_action_at`; a handoff writes a PII-free
  `handoff`; RLS blocks a cross-`client_slug` read; the app no longer *writes* `srtJson`/
  inline-professional fields.
- **Check:** the pack spec's Phase-2/3 DoD probes (`lodgey-pack/spec.md:117,121`) run
  green on the branch; an RLS negative test (query as tenant A for tenant B's row →
  0 rows); `npm run build && npm run type-check && npm test` green on the integrated
  tree (orchestrator re-run, per Evidence Standard).
- **Rollback:** revert the app deploy to the pre-cutover build (old columns still
  populated as shadow); drop the added policies to fall back to deny-all.
- **Blast radius:** **high** — first step where live users hit the new tables; guarded
  by the shadow columns and a revertible deploy.

## Step 7 — Deprecate legacy columns (after burn-in)

**Do:** after an agreed burn-in on the promoted branch/prod with the core tables as
source of truth, drop the now-orphaned `NoahSession.srtJson`, `NoahSession.diaryJson`,
and the inline professional-PII columns on `ReferralLead` (`professionalName/Role`,
`organisation`, and any name/email/phone). This is the only destructive step and is
gated on Step 6 burn-in evidence.

- **DoD:** the retired columns no longer exist; a full app regression is green; the
  no-TFN/PII CI grep passes with the inline-PII columns gone.
- **Check:** `select column_name from information_schema.columns where table_name in
  ('NoahSession','ReferralLead')` shows none of the retired columns; regression suite
  green.
- **Rollback:** restore from the Step-0 snapshot / pre-drop branch (destructive —
  hence a snapshot-backed, burn-in-gated drop, not inline with backfill).
- **Blast radius:** **high but deferred** — irreversible without the snapshot; do not
  run until Step 6 has soaked and Phill/Duncan confirm.

## Step 8 — Final verification: mirror `verify_core_schema.sh` in Prisma/Postgres terms

Re-prove every load-bearing invariant on the promoted branch, mirroring the core
verifier's semantics `[VERIFIED]` (`verify_core_schema.sh`). Each probe maps 1:1:

| `verify_core_schema.sh` check | ITR-Button/Prisma equivalent |
|---|---|
| apply + re-apply idempotency | `prisma migrate status` clean; re-running `migrate deploy` is a no-op |
| 9 core tables present | `information_schema.tables` count of the nine mapped names == 9 |
| RLS enabled on all 9 | `pg_class.relrowsecurity` true for all nine |
| never-close: `case.next_action_at NOT NULL` | insert `case` with null `next_action_at` → **rejected** (`null value in column "next_action_at"`) |
| never-close: `srt.next_action_at NOT NULL` | insert `srt` with null `next_action_at` → **rejected** |
| PII-free: `carries_pii=true` rejected | insert `handoff` with `carries_pii=true` → **CHECK violation** |
| referral `kind` enum enforced | insert `referral_ledger` with bogus `kind` → **enum/invalid-input rejected** |
| happy path: valid PII-free handoff | insert `handoff` with defaults → row lands, `carries_pii=f` |

Plus two pack-level proofs: **zero core changes** — `git diff origin/main --
apps/spec-board/projects/nexus-concierge-os/` is empty for the whole refactor
`[VERIFIED]` method (`lodgey-pack/spec.md:217`); and **evidence-tag integrity** on
this plan (`grep -nE '\[(VERIFIED|INFERENCE|UNCONFIRMED)\]'`).

- **DoD:** all eight invariant probes pass; the happy-path insert succeeds; zero-core-change
  diff is empty; row-count reconciliation across Steps 2-5 balances to the Step-0 baseline.
- **Check:** a single script (Prisma-seed + `psql` `expect_err`/happy-path harness ported
  from `verify_core_schema.sh`) exits 0 with "ALL INVARIANTS HOLD".
- **Rollback:** n/a (verification only); a failure blocks promotion to ITR-Button prod.
- **Blast radius:** **zero** (read/assert only).

---

## Risk register — every `[UNCONFIRMED]` item

| # | Risk / assumption | Basis | Mitigation |
|---|---|---|---|
| U1 | Live ITR-Button schema may have **drifted since the 2026-06-24** reconciliation snapshot (renamed fields, new models) — §1 is second-hand | `[UNCONFIRMED]` (`RECONCILIATION-itr-button.md:6`) | Step 0 re-reads the live schema and diffs before any DDL |
| U2 | Live sandbox **row counts and blob shape** (null/malformed `srtJson`, empty `diaryJson`) are unknown from this checkout — backfill volume/edge-cases unsized | `[UNCONFIRMED]` | Step 0 baseline counts; Steps 3/5 quarantine malformed rows to a report, never silent-drop |
| U3 | ITR-Button's **Prisma version + migration state** unknown (README validated the core companion on Prisma 7; the live repo is unconfirmed) | `[UNCONFIRMED]` (README.md:60) | Step 0 `prisma migrate status`; pin the toolchain before Step 1 |
| U4 | **`next_action_at` backfill value** for `case`/`srt` rows that never had one (never-close was not enforced) needs a rule + cadence | `[UNCONFIRMED]` (`RECONCILIATION-itr-button.md:19`) | Propose `coalesce(existing_due, now()+1d)`; confirm cadence with Duncan/Rana before Steps 2-3 |
| U5 | Whether `ReferralLead` currently holds **genuine professional PII** that must be purged post-split (data-cleansing duty) or only referenced | `[UNCONFIRMED]` (`RECONCILIATION-itr-button.md:23`) | Step 4 keeps PII off `handoff` (CHECK) and off `provider` credential store; Step 7 drops the inline columns |
| U6 | **Regime/legal primary text still unfetched** (TASA/TPB, Privacy TFN Rule, AUSTRAC, ACL s18, ASIC RG246) — inherited core R1 | `[UNCONFIRMED]` (`lodgey-pack/spec.md:201`; `nexus-concierge-os/spec.md:195`) | Not a schema blocker; gates **go-live**, not the refactor — per-pack Phase-0 legal map before ITR-Button ships |
| U7 | **Dmitri OAuth-vs-guide fork** (source OQ1) could change whether a `case` ever touches a lodgement surface | `[UNCONFIRMED]` (`duncan-itr-button/spec.md:183`) | Case-state map holds under either fork; out of this refactor's scope |
| U8 | `JourneySession`/`NoahSession` lifecycle → **core `case` state crosswalk** is not 1:1 defined | `[UNCONFIRMED]` (`RECONCILIATION-itr-button.md:18`) | Step 2 gates on a crosswalk signed off with the live-app owner (Rana) before backfill |
| U9 | Whether the ITR-Button data plane is **Supabase-branch-capable** / has a staging branch for branch-first proving | `[UNCONFIRMED]` (core rule README.md:36) | Step 0 verifies branch creation; if absent, stand one up before Step 1 |
| U10 | **`opaque_token` generation + post-accept PII-release** mechanism (how a provider gets contact detail after accepting) is app-level and undefined for ITR-Button | `[UNCONFIRMED]` (`0001_core_schema.sql:20-24`) | Step 4 mints tokens; the release path is an app-design item for Step 6, out of schema scope |
| U11 | `diaryJson` → `nudge` is **"closest, not a defined mapping"** — may not be faithfully backfillable | `[UNCONFIRMED]` (`RECONCILIATION-itr-button.md:25`) | Step 5 treats it as best-effort only; authoritative nudges are authored going forward |
| U12 | This refactor is **orthogonal to ITR-Button's real critical path** (ATO API creds, XPM/BLinks access, partner-embed allowlist) — competes for the same owner's time | `[UNCONFIRMED]` (`RECONCILIATION-itr-button.md:36-39`) | Sequence against Rana's credential work; the refactor aligns the data model, it does not unblock live integration |

## Step sequence at a glance

0. Pre-flight — gate check, re-verify drift, baseline snapshot, DB branch → *zero blast radius*.
1. Land all nine core tables additively + enforce never-close / PII-free CHECK / enums / RLS-deny-all + seed `lodgey` pack.
2. Backfill `case` from `JourneySession` (container first, FK root for everything).
3. Promote `srtJson` blob → `srt` (+ add `srt_return`), never-close backfill.
4. Split `ReferralLead` → `provider` + PII-free `handoff` + `referral_ledger` (the PII-boundary step).
5. Add `consent` (from `taxpayerConsentAt`) + `nudge` never-close loop; then Step 6 tenancy/RLS + app cut-over, Step 7 deprecate legacy columns, Step 8 mirror the invariant verifier.

---

[STATUS] Gated. Phill signed the Lodgey pack 04/07/2026; **Duncan's sign-off is the
sole remaining gate**. Execution of Step 0 onward begins only once that is recorded.
Zero core changes (UNI-2170 untouched). `[VERIFIED]` (`lodgey-pack/spec.md:231-233`).

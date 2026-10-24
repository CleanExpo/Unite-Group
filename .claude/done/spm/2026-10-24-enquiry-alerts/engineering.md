---
type: engineering-requirements
spec: ./spec.md
spec_sha256: 8c482332c5cccae2733922f72c2b6545d8ed14f562adca0a1cd132851b26630a
reviewer: bench
review_round: 2
seated: [boris, eng-failure, eng-observability, eng-test, eng-contract, eng-data, eng-compliance, eng-secrets, eng-release]
contributed: [eng-secrets, eng-compliance, eng-release]
reviewed_at: 2026-10-25T07:20:00+10:00
status: PASS
categories:
  data_model:         {state: PRESCRIBED, ref: "#data-model", by: eng-data}
  invariants:         {state: PRESCRIBED, ref: "#invariants", by: eng-compliance}
  failure_modes:      {state: PRESCRIBED, ref: "#failure-modes", by: eng-failure}
  interface_contract: {state: PRESCRIBED, ref: "#interface-contract", by: eng-contract}
  concurrency:        {state: PRESCRIBED, ref: "#concurrency", by: boris}
  migration:          {state: PRESCRIBED, ref: "#migration", by: eng-release}
  rollback:           {state: PRESCRIBED, ref: "#rollback", by: eng-release}
  observability:      {state: PRESCRIBED, ref: "#observability", by: eng-observability}
  budget:             {state: DEFERRED, reason: "One outbound call per lead on the existing SendGrid plan, plus six suppression reads per daily health poll; a budget becomes real if enquiry volume passes 1,000 leads in a month or the SendGrid plan quota reaches 80 percent.", by: boris}
  test_oracle:        {state: PRESCRIBED, ref: "#test-oracle", by: eng-test}
disagreements:
  - "boris says split checkout alerts (S2b) from lead alerts (S2a); chair ruling adopted as phasing: one spec, S2b gated on Phill naming the event source."
  - "eng-compliance (round 1) says drop the name from the alert; Phill's decision of 24/10/2026 is name and package. Kept, with the privacy-policy edit and a now-delivered erasure step."
  - "eng-secrets says drop the CRON_SECRET fallback for the health token; the spec keeps it. Chair ruling: keep the fallback and refuse (500) any ALERT_HEALTH_TOKEN equal to CRON_SECRET, which removes the incentive eng-secrets named."
  - "eng-data says the merged migration's create table if not exists contradicts spec 4.5 (plain create so a collision fails loudly); boris rules keep it (file is merged, re-applicable), and the production probe in the migration section does the loud-collision job. Spec 4.5 needs the sentence amended."
  - "eng-compliance prescribed a 72-hour purge of dedup_key; chair ruling: keyed hash (HMAC under ALERT_DEDUP_SECRET) plus per-lead erasure is what shipped, and the purge job is not built. The policy promises erasure on request only."
  - "eng-test says the fake's reverse=true cases do not change visibility order. Accepted: the real order is proven by the Postgres 15 script (held-transaction case), and the fake tests only prove the client sends when the claim returns email. The test titles are not renamed in this PR."
notes:
  - "Round 2: all nine seats ran cold against spec hash 8c482332c5cc and the branch at d74eec837 (some seats saw later local commits). Their blocking findings were met in code or narrowed as listed in the requirement register; status is PASS because no category is left blocking, NOT because the human-gated release items are done (they are listed there and are still open)."
  - "The spec file was not edited, so this artifact stays bound to its hash. Spec text that now disagrees with the code is listed under spec amendments in the requirement register and must be amended in a spec revision before the next bench round."
  - "migration_drift.py exited 2 (no database URL available to this session): UNPROVEN, which is why eng-release sat. Nothing here proves any migration is applied in production."
  - "eng-authz was not seated although its predicate fires (new authenticated page, new bearer route, new founder-only erase route). boris covered invariants at specialist standard. Recorded as a dispatch miss."
---

# Engineering requirements: enquiry alerts (S2), round 2

Nine seats, run cold in parallel. Round 1 findings are kept (they were adopted into the spec and the code); round 2 findings are added inline and indexed in the register at the end.

## Data model
By eng-data. `alert_delivery_log` carries `founder_id` with `references auth.users(id) on delete cascade`; one row per source per channel; CHECKs over `source_kind`, `channel` and `outcome`; `source_id` has no foreign key on purpose; `unique (source_kind, source_id, channel)` is the claim constraint; `claim_alert` is executable by `service_role` only.

Round 2: `dedup_key` must not be recomputable from an email address, and an erased lead must not leave a re-identifiable key behind. Met: the key is an HMAC-SHA256 under the server secret `ALERT_DEDUP_SECRET` (null when unset: the alert still sends, duplicate suppression is off, one console line names the variable), and `erase_lead_alert_data(p_founder, p_lead_id, p_dedup_key)` (forward migration `20261025000000_alert_erasure.sql`, service_role only) deletes the lead's log rows by source id and by key, and its `crm_timeline_*` agent_actions rows. The function needs `grant delete` on the log table, which spec 4.5 ("no delete policy") did not expect. The ownership of agent_actions rows is by lead id only (no founder column), so the caller proves ownership first.

## Invariants
By eng-compliance. No `crm_leads` value other than the lead id and the allow-listed first name, business name and ask appears in any email or console output. The alert subject is the fixed string "New enquiry". No `error.message` is logged on this path.

Round 2: the privacy policy may promise only what the code delivers. Met: the policy now says the founder deletes the enquiry record, removes the alert delivery log and activity timeline entries, and deletes the alert email from the mailbox; the second step is the founder-only route `POST /api/founder/leads/[id]/erase-alert-data` (all enquiries from the same email, case-insensitive, LIKE wildcards escaped) with a button on the enquiry page; a test pins the wording to the SQL. Not delivered by code, and named in the policy as manual steps: deleting the `crm_leads` row, and deleting the mailbox copy. The mailbox copy is findable because the alert carries a plain `Ref: <lead id>` line and is sent with click and open tracking off. Also (eng-secrets): the health token must never be the cron master key; the route returns 500 when `ALERT_HEALTH_TOKEN` equals `CRON_SECRET`.

## Failure modes
By eng-failure. Covers paths that never reach a catch: death after the insert, death after the claim, a failing `claim_alert`, `FOUNDER_USER_ID` unset. Timeouts must really abort. No retries; reconciliation is the backstop.

Round 2: SendGrid's fixed 5 s client timeout could outlive the 6 s cap and leave an accepted email as a pending row that the health read counts as failed. Met: the timeout is `min(5000, 6000 - elapsed - 500)` ms and no send starts with under one second left (recorded `failed` while the row can still be written). Not met: a failed `crm_leads` insert is invisible to the health read (no row, no counter); see the `last_lead_at` deferral under Observability.

## Interface contract
By eng-contract. The `/api/leads` body stays exactly `{ id }` or `{ id, drip }`; `notify()` is an overload; the health read returns counts per source over 72 hours.

Round 2, blocking and met: the heartbeat accepted only a trailing `Z` in `last_failure_at`, but Postgres writes `+00:00`, so the first real failure would have been reported as "no usable response". The consumer now accepts `Z` or any `+hh:mm`/`-hh:mm` offset that parses to a real instant, and rejects dates without a zone, non-dates and non-strings (tests with `+00:00`, `+10:00`, `-07:30`, and five rejects; the offset cases were watched failing first). The health response gained `sent`, `delivery_note`, `destination`, `failed_ids` and `unalerted_ids`; the heartbeat treats a response missing any of them as unusable. Not done (non-blocking): a missing token reads FAIL where the spec says NOT RUN.

## Concurrency
By boris. Alerts are claimed atomically by `claim_alert` (advisory lock on the dedup key, coverage check, `INSERT ... ON CONFLICT DO NOTHING RETURNING`). Round 2: this was proven only against a JavaScript copy of the SQL. Met: `apps/web/scripts/verify-claim-alert-sql.mjs` (pnpm `verify:claim-sql`) loads the merged #1222 migration into a throwaway local PostgreSQL 15 on 127.0.0.1 (random port, temp data dir, stubbed roles, `service_role` with BYPASSRLS as on Supabase) and checks replay, dedup, 60-minute window, stale pending, failed rows, other founder, eight connections racing over 25 rounds, a held-transaction ordering case, privileges and RLS, and the erase function. Two planted defects must be caught by it: the advisory lock removed (the held-transaction case and the race both fail) and `ON CONFLICT` removed (the replay case fails). This is local Postgres 15, not a Supabase database branch, so it does not satisfy AC-10.

## Migration
By eng-release. The merged migration is additive and applied manually by Phill; nothing in CI applies web migrations; two PRs in order. Round 2 (human-gated, not code): before the code PR merges, the production database must be observed to have the table, the named unique constraint and the function, with `claim_alert` not executable by `anon`, and `migration_drift.py check` must exit 0. `if not exists` means a name collision no longer fails, so `to_regclass` alone proves only the name; the constraint query in the register proves the shape. The new erasure migration is a second forward migration that must be applied before the erase route is used; if it is missing the route returns 500 and reports nothing erased (tested). Do not edit the merged file.

## Rollback
By eng-release. Code revert only; the tables and functions are additive and stay; removal is a forward migration, never a raw DROP. Round 2: Vercel instant rollback turns off auto-assignment of production domains, so later merges stop going live. Runbook: (1) instant rollback, (2) revert the PR on main, (3) undo the rollback or promote the revert deployment; the proof is the health read returning 404 again and the next unrelated merge being the serving build. Whoever does step 1 owns step 3.

## Observability
By eng-observability. Absence is a signal: `unalerted` reconciliation, 503 when the table cannot be read, a fourth heartbeat gate `alert-health`, every count over 72 hours. Round 2, blocking and met in code:
- A suppressed address still returns 202. The health read now checks the destination against SendGrid's bounce, block, spam-report, invalid-email, unsubscribe and global-unsubscribe lists and returns `destination` as `clear`, `suppressed` or `unknown`. `suppressed` fails the heartbeat gate even when every count is healthy. `unknown` (the key lacks the Suppressions Read scope, or SendGrid did not answer) is shown as NOT CHECKED and never as clear; it does not fail the gate, so until Phill adds that scope to the key this check is UNPROVEN.
- `sent` means accepted (HTTP 202), not delivered: the response says so (`sent`, `delivery_note`) and the heartbeat issue repeats it. A delivery-event webhook stays DEFERRED until a `sent` row is found without an email.
- The red alert named no lead. The health response carries up to 20 `failed_ids` and `unalerted_ids` (lead ids only) and the issue prints "Leads to follow up".
- A gate that is already red hid a second outage. The issue now says "New alert failures since the previous run: failed a to b, unalerted c to d" when counts rise (read back from the previous issue body).
Not done: a `last_lead_at` field so a dead form is distinguishable from zero enquiries (DEFERRED until real enquiry volume is known); a cause tag on the health 503 (config, log read, lead read) so AC-14 can tell the three apart.

## Test oracle
By eng-test. Mocks must hold real rows and apply the predicates they receive; each criterion names mutants that must go red. Round 2: the claim SQL now has a real-database oracle (see Concurrency) with two built-in positive controls; the privacy check covers every field handed to the mail client (`JSON.stringify` of the whole input) and the exact link `https://<base>/founder/leads/<id>`; the deadline, suppression, token-equality, id-list and offset behaviours each have a test that was watched failing. The Done contract adds the real-SQL script as a criterion so it re-runs. Not done: the `reverse` parameter in the fake-based concurrency tests (see disagreements); CI does not run the Postgres script (it needs PostgreSQL 15 on the runner), so any change to either migration file must re-run `pnpm verify:claim-sql` before merge.

## Requirement register

Met in code in this branch: dedup key salted (HMAC) and erasable; erase function, route, button and exact policy wording; suppression detection; `sent` is "accepted, not delivered"; lead ids in the red alert; any ISO offset accepted; SendGrid timeout bound to the cap; click tracking off and `Ref` line; health token must differ from the cron secret; real-SQL check with concurrency and lock mutant; whole-input privacy oracle and exact link; new-failure call-out.

Human-gated or not code, still open (the gate needs these before anything is called live):
1. Production observation of the merged migration and the new erasure migration: `select to_regclass('public.alert_delivery_log')`; `select conname from pg_constraint where conrelid='public.alert_delivery_log'::regclass` lists `alert_delivery_log_source_kind_source_id_channel_key`; `has_function_privilege('anon','public.claim_alert(uuid,text,text,text,int)','execute')` is false; `migration_drift.py check` exits 0. Apply the erasure migration before the code merges.
2. AC-10 on a Supabase database branch (the local Postgres run is not it).
3. Env, names only, set by Phill: `ALERT_DEDUP_SECRET` (new, Production and Preview, different values), `ALERT_HEALTH_TOKEN` (Vercel and GitHub Actions secret, same value, never the cron secret), `LEAD_ALERT_EMAIL_TO`; and Suppressions Read on the SendGrid key (or add a read-only key; today the destination check reports unknown).
4. Preview must not share production's database or SendGrid key (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SENDGRID_API_KEY` each need a separate Preview row, checked with `vercel env ls`), or AC-11's failure legs must run on a database branch, because a Preview test would turn the production gate red for 72 hours.
5. SendGrid key rotation: create a Mail-Send-only key, set it, confirm with the AC-14 test enquiry, then delete the old key. The alert path and the drip share one key.
6. Env changes reach only new deployments: set the variables before the merge or redeploy after.

Spec amendments needed (spec not edited here to keep this artifact bound): 4.4 says `dedup_key` is a SHA-256 (now an HMAC); 4.5 says plain `create table` and "no delete policy" (merged file uses `if not exists`; the erasure migration grants delete to service_role); 4.6 response fields (`sent`, `delivery_note`, `destination`, `failed_ids`, `unalerted_ids`) and 7 (an aborted row stays `pending` and is counted failed after 15 s).

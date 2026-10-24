---
type: engineering-requirements
spec: ./spec.md
spec_sha256: f28378d5967d765a158f6d50b66c9238f786bd55654052babbe8a5e9370cdc03
reviewer: bench
review_round: 1
seated: [boris, eng-failure, eng-observability, eng-test, eng-contract, eng-data, eng-compliance, eng-secrets, eng-release]
contributed: [eng-compliance, eng-secrets, eng-release]
reviewed_at: 2026-10-24T14:33:29+10:00
status: PASS
categories:
  data_model:         {state: PRESCRIBED, ref: "#data-model", by: eng-data}
  invariants:         {state: PRESCRIBED, ref: "#invariants", by: eng-compliance}
  failure_modes:      {state: PRESCRIBED, ref: "#failure-modes", by: eng-failure}
  interface_contract: {state: PRESCRIBED, ref: "#interface-contract", by: eng-contract}
  concurrency:        {state: PRESCRIBED, ref: "#concurrency", by: boris}
  migration:          {state: PRESCRIBED, ref: "#migration", by: eng-release}
  rollback:           {state: PRESCRIBED, ref: "#rollback", by: boris}
  observability:      {state: PRESCRIBED, ref: "#observability", by: eng-observability}
  budget:             {state: DEFERRED, reason: "One outbound call per lead on the existing SendGrid plan; a budget becomes real if enquiry volume passes 1,000 leads in a month or the SendGrid plan quota reaches 80 percent.", by: boris}
  test_oracle:        {state: PRESCRIBED, ref: "#test-oracle", by: eng-test}
disagreements:
  - "boris says split checkout alerts (S2b) from lead alerts (S2a) because nothing in the repo creates checkout sessions; the brief asks for the handler in this spec. Chair ruling adopted as phasing: one spec, S2b gated on Phill naming the event source (spec 4.7)."
  - "eng-compliance says drop the name from the alert (cheapest fix); Phill's decision 24/10/2026 is name and package. Spec keeps the name and makes the privacy-policy edit and an erasure step a required PR item, with Phill's yes needed (spec section 10 item 3)."
  - "eng-secrets says CRON_SECRET is too broad a credential for the health read; spec adds optional ALERT_HEALTH_TOKEN with CRON_SECRET as fallback (eng-secrets said not blocking)."
notes:
  - "Seats reviewed spec revision 1; their blocking findings were written into revision 2, Codex round 1 findings into revision 3 and Codex round 2 findings into revision 4, whose hash is bound above. The seats and Codex have not re-read revision 4; per the founder rule Codex reviews the built code later."
  - "migration_drift.py was not run (no database URL available to this session): exit 2, cannot determine, so eng-release sat. Reported UNPROVEN."
  - "The parent spec lives untracked in the home checkout; it was copied beside this directory in this worktree. Requirements whose only authority is the parent remain PRESCRIBED, not DECIDED."
---

# Engineering requirements: enquiry alerts (S2)

Round 1, nine seats. Findings below are the seats' requirements, adopted into spec revision 2, then amended by Codex rounds 1 and 2 (spec revision 4).

## Data model
By eng-data. `alert_delivery_log` carries `founder_id` with `references auth.users(id) on delete cascade`; one row per source per channel with `source_kind`, `source_id`, `channel`, `outcome` and both timestamps NOT NULL (only `dedup_key` is nullable); CHECKs over `source_kind`, `channel` and `outcome` (`pending|sent|failed|unconfigured|deduped`); `source_id` has no foreign key on purpose; `unique (source_kind, source_id, channel)` is the claim constraint; the SQL function `claim_alert` is executable by `service_role` only. Plain `create table` so a collision on the shared database fails loudly. One exported outcome type is shared by writer and health read. "Append-only" is convention only. Spec 4.5 and AC-10.

## Invariants
By eng-compliance. For `new_lead` and `checkout_completed`, no `crm_leads` value other than the lead id and the allow-listed first name, business name and ask (package), and no Stripe customer field, appears in any email or `console.*` output (spec rev 5: email only; phone, email, surname and message stay behind the link). `notify()` prints `title` and `metadata` on every call, so title is a fixed string and metadata is limited to ids and labels. Privacy-policy processor table and the "Supabase only" sentence must change if the name is kept, and an erasure step names who deletes the alert email copy. Spec 4.2, 6 and AC-3. eng-secrets adds: no `error.message` is logged on this path because a provider error can echo request details such as the recipient address or key (spec 4.3, AC-5).

## Failure modes
By eng-failure. The failure table must cover paths that never reach a catch: a process dying after the insert and before the claim, a process dying after the claim and before the update (a `pending` row counts as `failed` after 15 seconds), a failing `claim_alert` call (the alert is sent unclaimed and reconciliation reports it), and `FOUNDER_USER_ID` unset: on the lead path the route already returns 500 before inserting, so nothing is promised beyond that; on the checkout path (S2b) no claim can be written, the alert is attempted unclaimed and reconciliation reports it. Timeouts must really abort (SendGrid gets a client timeout) and the claim, the sends and the updates sit inside the same 6-second cap. No retries; reconciliation is the backstop. Spec 4.3, 4.4, 4.6, section 7.

## Interface contract
By eng-contract. The `/api/leads` body stays exactly `{ id }` or `{ id, drip }` on every alert outcome and never reveals alert or dedup state (enumeration oracle). `notify()` is an overload on a discriminated union keyed by `type`; legacy callers keep `Promise<void>`, the two new kinds return `NotifyResult`; the lead variant has no email, phone, message or IP key. Checkout alerts gate on `payment_status`, handle `async_payment_failed`, and format amounts from minor units. The alert carries a source label from `business_key` through an allow-list. Health returns `attempts`, `failed`, `unconfigured`, `deduped`, `unalerted` per source over 72 hours. Spec 4.1, 4.2, 4.4, 4.6, 4.7, AC-2, AC-8.

## Concurrency
By boris. Alerts are claimed atomically. `notify()` calls `claim_alert`, which takes a transaction advisory lock on the dedup key (SHA-256 of founder, lower-cased email and package label), checks whether a different source with that key is `sent` or `pending` under 15 seconds old, and otherwise claims each channel with `INSERT ... ON CONFLICT (source_kind, source_id, channel) DO NOTHING RETURNING`. It sends only on channels the claim returned. The lock makes suppression independent of which insert committed first (a double submit sends once per channel even with reversed visibility); the unique constraint makes a replay of one lead or event send nothing; a failed first alert never suppresses a resubmission; a different package never matches. Tested twice: an in-memory fake with both visibility orders, and the real function with two concurrent connections on a database branch. Spec 4.4, 4.5, AC-7, AC-10.

## Migration
By eng-release. The migration is additive and applied manually by Phill; nothing in CI applies web migrations. Two PRs in a stated order: migration alone first (validated on a Supabase database branch, moved to production only through the approved branch process), confirm `to_regclass`, then the code PR. File lives in `apps/web/supabase/migrations/` only. A drift exit of 1 or 2 blocks any claim that the feature is live. `LEAD_ALERT_EMAIL_TO` and the new token are INTEGRATION tier in `apps/web/scripts/validate-env.mjs` so an unset value warns and never fails the build. Spec 4.5, section 5, section 9, AC-9, AC-10.

## Rollback
By boris. Code revert only (Vercel instant rollback); the table is additive and stays; removal, if ever wanted, is a forward migration and never a raw DROP, which would leave the ledger claiming it is applied. Preview and Production use different values for destination and secret variables so a preview test cannot change production. Spec section 9.

## Observability
By eng-observability. Failures are not the only signal; absence is. The health read adds `unalerted` (leads with no log rows after 2 minutes; from S2b only, checkout events received after `CHECKOUT_RECON_FROM`; and deduped sources with no `sent` source behind them), counts per source, and returns 503 when the table cannot be read. It does not invent a row for a missing `FOUNDER_USER_ID`: the lead path returns 500 as it does today and the checkout path (S2b) is reported through `unalerted`. A scheduled poller exists: a fourth declared gate `alert-health` in the existing heartbeat, so its evidence reaches the issue composer and fails on non-200, `failed > 0` or `unalerted > 0`; every count, including `failed`, looks back 72 hours so the daily poll cannot skip a lead or a logged failure (boundary-tested with a fake clock); escalation is the GitHub issue, not the channels under test. `sent` means accepted, not delivered; a SendGrid event webhook is DEFERRED until a `sent` row is found without an email. Spec 4.6, AC-6, AC-13, AC-14.

## Test oracle
By eng-test. The existing leads test mock answers per table from a first-in-first-out queue and ignores predicates, so dedup and window tests must use mocks that hold real rows and apply the predicates they receive. Each acceptance criterion names the mutants that must go red (remove the try/catch, return 500 on a non-sent email, remove the 6-second cap, remove the advisory-lock line, remove `ON CONFLICT` handling, widen 60 to 1440, shrink the health window to 24 hours, drop `unconfigured` from `failed`, log `error.message`, put the name in `title`). Email failure is mocked with a rejection because the real sender throws. Stripe fixtures are typed `satisfies Stripe.Event`. The privacy check spies on console output as well as payloads. A type test pins the overload and runs under a dedicated `tsconfig.typetest.json` (the main tsconfig excludes test files), through both `tsc` and `vitest --typecheck`. Checkout assertions and checkout reconciliation belong to S2b; an S2a criterion asserts checkout events are excluded. Spec section 8.

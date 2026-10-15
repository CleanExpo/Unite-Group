# Evidence enrollment and product value events

These tools provide governed enrollment operations and a product-server signing
helper. They do not manufacture onboarding, customer value, customer identities
or payments. Each product must implement its approved meaningful business action
and verify the actual account/customer association before emitting value evidence.
The internal factory's reviewed handoff is a separate built-in operational event.

Use Node 24 with the existing installed application dependencies. The tools import
the application's pure TypeScript contracts through native type stripping; no
additional dependency or compilation step is needed. An older `node` on `PATH`
cannot import those contracts. Select the existing qualified Node 24 executable.

## Service-owned administration

`scripts/idea-evidence-admin.mjs` accepts one public operation document and defaults
to dry run. A dry run validates its contract and target, but makes no requests and
does not require a service credential. Execution requires the existing
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the process environment. Reuse
the configured host's RAM-only credential bridge; never place the key in argv,
operation JSON, output files or logs. The tool neither provisions nor displays
credentials. Missing access fails before the first request.

The only permitted database origins are HTTPS Supabase hosts for the canonical
production project `lksfwktwtmyznckodsau` and isolated stage project
`jhqjxomxlvvmjslgzqhd`. Credentials, alternate hosts, paths, queries and redirects
in the URL are refused. Production schema application and producer enrollment
remain separately governed. `--execute` selects a write operation; it does not
waive those prerequisites.

```sh
node scripts/idea-evidence-admin.mjs --input "$PUBLIC_OPERATION"
node scripts/idea-evidence-admin.mjs --input "$PUBLIC_OPERATION" --execute
```

Supported strict documents:

| `operation` | Additional fields |
|---|---|
| `enroll-source` | `registration`: full source registration contract |
| `enroll-grant` | `registration`: full per-task grant contract |
| `revoke-source` | `id`, positive `version`, `reason` |
| `revoke-grant` | grant UUID `id`, positive `version`, `reason` |
| `withdraw` | target evidence UUID `event_id`, stable `withdrawal_id`, `reason` |

The tool calls only the corresponding service-only `cc_idea_evidence_*_v1` RPC.
It performs an independent GET of the exact returned row and verifies canonical
registration/envelope, complete hashes and row identity. Zero, duplicate or changed
readbacks fail confirmation. The output contains operation status, IDs and
digests. It does not print registration bodies, customer records or provider
responses. Enrollment uses public keys only; private-key registration fields are
rejected by the shared strict contract.

Source registration and task grant are separate authority. The source binds the
product, repository, environment, event adapter and public issuer key. The grant
also binds owner, current approved task/brief/outcome, release, subject, event
definition and validity interval. Review sources require the separately pinned
`review_policy`; see [REVIEW_PRODUCER.md](./REVIEW_PRODUCER.md). A submitted public
configuration cannot enroll itself.

Only an Ed25519 production-journey grant may optionally include the strict
`acceptance_task` binding described in [JOURNEY_WITNESS.md](./JOURNEY_WITNESS.md).
It identifies a distinct, currently owned and approved secondary task with exact
task ID, revision, brief hash and null outcome hash. Its outcome must remain null;
both approved briefs target the same canonical repository and main branch. The
secondary project is null for inert research or matches the primary project.
This binding lends no PR, adopts no implementation and transfers no build or
payment authority. The primary scope remains intact. Enroll a new immutable grant
version with the reviewed collector policy and digest; never rewrite an existing
grant version to add acceptance scope or make a packet pass.

Revocation prevents new admission prospectively while preserving admitted history
and exact historical retries. Withdrawal appends a quarantine decision for one
event; it never deletes history. Reuse the original withdrawal identity and reason
for an exact retry. An already revoked record retains its first reason.

## Product-server value integration

`scripts/idea-value-event.mjs` exports `createValueEvidence()` and
`submitValueEvidence()`. Its public configuration contains exactly
`canonical_origin`, `source` and `grant`. The origin must be
`https://unite-group.in`. Source and grant are confirmed enrollment exports with
`registration` and `registration_hash`; retained `canonical_registration`, when
present, must also match. The source must be an enrolled Ed25519
`customer_value_achieved` / `product_value_action_v1` producer. The grant's Stripe
binding must identify the verified merchant account, customer, product and durable
association, and its subject must be that exact Stripe customer. Email matching
does not establish this association.

The action document contains exactly:

- `founder_id`, `task_id`, `brief_hash`, `product_id`, `release_id`, `event_name`,
  `subject`, `stripe_binding`: exact current approved grant scope.
- `durable_action_ref`, `durable_action_digest`: the actual persisted business action.
- `readback_ref`, `readback_digest`: independently confirmed business-state readback.
- `occurred_at`: the persisted action's original UTC timestamp, retained on retries.

Connect this helper **after** the actual successful server-side business write and
confirmed readback. The surrounding product must enforce its own authenticated
customer, domain rules, approved action and account binding. For example:

```js
// Product-specific functions must implement the real approved domain action.
const action = await product.completeApprovedBusinessAction(authenticatedCustomer);
const readback = await product.readBackCompletedBusinessAction(action.id);
product.assertApprovedValueAndCustomerBinding(action, readback, enrolledGrant);

const signed = createValueEvidence({
  config: confirmedEnrollment,
  action: product.evidenceFromPersistedActionAndReadback(action, readback),
  privateKeyPath: configuredHostPrivateKeyPath,
});
// Persist the exact signed document in the product's durable outbox before sending.
await product.storeSignedEvidenceOnce(action.id, signed);
await submitValueEvidence({ config: confirmedEnrollment, document: signed });
```

These product-specific functions are integration points, not implemented customer
instrumentation. Successful account registration, invitations, emails and a
browser's `activated: true` are refused substitutes. The helper signs only the
approved durable action and association; it never queries Stripe, creates a
customer or charges a card.

Use an existing dedicated per-product Ed25519 private key on its configured POSIX
host. The file must be owner-only, regular, not a symlink, and under directory
ancestors that others cannot write. Key bytes stay in that process and are never
returned, logged or uploaded. The resulting signature must verify against the
independently enrolled public key. No SDK function creates a key.

## CLI and exact retries

Create a new signed document without sending it:

```sh
node scripts/idea-value-event.mjs --config "$PUBLIC_CONFIG" --action "$DURABLE_ACTION" --key "$PRIVATE_KEY_PATH" --output "$SIGNED_OUTPUT"
```

Add `--submit` to send that retained file immediately. New output creation is
exclusive, mode 0600, and cannot overwrite a prior signed occurrence. Retry an
existing document without reading a private key or creating a fresh timestamp:

```sh
node scripts/idea-value-event.mjs --config "$PUBLIC_CONFIG" --document "$ORIGINAL_SIGNED_OUTPUT" --submit
```

Both helpers preserve the same event identity for the grant/version and durable
action reference. Identical action data, including its original timestamp, signs
to identical retry bytes. Changed payload data retains the identity so atomic SQL
admission rejects conflicting reuse instead of treating it as fresh value. The
server owns authoritative expiry, revocation, race handling and exact historical
retry semantics; a local public configuration cannot restore authority.

Submission uses only the signed document at
`https://unite-group.in/api/integrations/idea-evidence`. It sends no bearer,
cookie, Supabase key or private key. Redirects are refused; requests/responses are
bounded to 1 MiB and 15 seconds. A missing admission ID or malformed response fails
confirmation. This acknowledgement is evidence ingestion, not payment verification.

## Verification

Run the focused synthetic software controls with Node 24:

```sh
node --test scripts/__tests__/idea-evidence-admin.test.mjs scripts/__tests__/idea-value-event.test.mjs
```

They exercise enrollment/revocation/withdrawal readback, no-request dry runs and
missing credentials, fixed origins, response limits, wrong source/customer/release/
binding/key/scope, registration-only refusals, deterministic retries and unsigned
credential-free transport. They create no operational keys or real customers and
make no network requests. Actual approved enrollment, product action, production
admission, onboarding and payment verification require their own retained receipts.

The REST RPC calls use the migration's scalar `jsonb` results; independent table
readbacks require exactly one row. This follows the
[PostgREST function response contract](https://postgrest.org/en/stable/references/api/functions.html).

# Synthex proposals in Unite-Group

The founder Opportunities page contains **Import Synthex proposal**. Open it,
paste an accepted Synthex v1 export, and select the matching repository from the
local portfolio registry. **Preview import** validates and shows the complete
proposal, source claims, capture/publication dates, and separate Unite evidence.
**Save blocked review** is an explicit subsequent operator action.

Imports create only a founder-scoped `crm_opportunities` record. Stage and status
are `blocked_review`; approval is requested. Value, currency, probability, and
lead/contact/client/business links are null. The zero-spend boundary remains AUD
$0, and demand and revenue remain unvalidated. No task, provider, job, contact,
lead, messaging, automation, or execution path is invoked.

## API contract

`GET /api/founder/opportunities/import` authenticates the session and returns
`{projects:[{name,repository}]}`. References come from the bundled canonical
`.portfolio/CONTROL-PLANE.v1.json`, parsed by the existing registry schema. These
references do not grant project access or signed evidence/execution authority.

`POST /api/founder/opportunities/import` accepts exactly:

```json
{"bundle":"<the complete v1 export object>","targetRepository":"<registry owner/repository>","previewOnly":true}
```

Here `bundle` must be the export object, not a JSON string. `previewOnly:true`
returns `{preview}` without constructing a database client. `previewOnly:false`
returns `{opportunity,executionBlocked:true}` after persistence and scoped
read-back. Both operations independently validate the bundle; a browser preview
is never authority to bypass save validation.

The strict bundle contains `version:1`, bounded `packetId`, positive safe integer
`revision`, `executionBlocked:true`, `review:{state:"accepted"}`, the complete
proposal, and the blocked Synthex opportunity summary. The proposal requires
nonempty sources, claims, separate Unite evidence, valid dated observations,
project/business/problem, confidence estimate, assumptions, uncertainties,
suggested owner, KPI/baseline requirement, success/stop criteria, and next
validation. Server boundaries must be exactly `spendBoundary:{currency:"AUD",
maxSpend:0}`, `demandValidated:false`, `revenueValidated:false`. Only HTTP/HTTPS
source URLs without embedded credentials are accepted. Extra fields, including
economics or caller-supplied founder identity, are rejected. The selected
repository must exactly match both the proposal and the current local registry.
Bodies are capped at 300,000 bytes before JSON parsing. The shared v1 contract
also bounds compact UTF-8 JSON to 240,000 bytes per full proposal and 250,000
bytes per export bundle, leaving room for the import request wrapper. Errors use no-store
responses: 401 unauthorised, 400 invalid input, 413 oversized body, 409 conflicting
retry or changed imported record, and sanitised 500 persistence/registry failures.

## Provenance and retries

A deterministic founder-and-packet UUID uses the existing opportunity primary
key. An atomic insert with duplicate-ignore is followed by a founder-scoped
read-back. Concurrent identical retries yield one blocked record. Changed
revision/content produces a conflict; existing records are never overwritten.
Canonical content hashing treats JSON object property order consistently.

The bounded existing `source_detail` retains the Synthex packet/revision,
portfolio repository, content digest, and blocked/unvalidated boundaries. The
digest supports retry comparison, not source authentication. Full evidence and
proposal content remain persisted in Synthex. The existing `next_action` is
bounded to 500 characters; the complete next validation remains in Synthex.

The server also stores a strict registry association in the existing JSON column:
`additional_data.synthexImport` contains exactly `version:1`, `projectId`,
`repository`, `packetId`, `revision`, `digest`, and `executionBlocked:true`.
The project key and repository come from the selected canonical portfolio entry;
the packet/revision come from the validated bundle. Its digest is the same
lowercase SHA256 retained in provenance. The namespace is bounded to 1024 compact
UTF-8 JSON bytes before any persistence call. No caller metadata field is accepted.
This reference is a registry planning key, not a database FK or execution approval.

Read-back validates only the reserved namespace and compares parsed fields
structurally. Normal JSON serialization, key reordering and unrelated metadata
namespaces do not cause conflicts; unrelated namespaces survive in the returned
stored row. Missing/legacy, malformed, extra-key or altered reserved metadata
returns 409 without backfill or overwriting the winning row. A committed insert
followed by read-back failure remains a failed response; an exact retry recovers
the same row without compensation or deletion.

Association conflicts emit one bounded console event named
`synthex_import_association_conflict`, with only the deterministic opportunity ID
and a closed reason: `association_missing`, `association_invalid` or
`association_mismatch`. No founder identity, raw metadata, observations, proposal
or database payload is logged; successful retries emit none. The existing route
maps the conflict to 409 without logging it again.

Rollback of this association slice is application code only: revert its commit
and retain all rows/JSON. The earlier importer ignores the additive metadata;
missing structured placement must not be claimed as verified. Forward
reapplication admits only exact v1 associations. No DDL, deletion or backfill is
part of either direction.

## Verification and live gate

Focused tests exercise the public service, API and operator component seams with
hermetic stores and mocked auth/DB/fetch. They assert rejected executable,
unaccepted, incomplete, forged-economic and unknown-project bundles; founder
isolation; scoped read-back; concurrent retries; conflicts; and preview before
save. No fixture is rendered in the product.

Grounded 07/10/2026: the local existing opportunity API/types and migration
support `blocked_review`, nullable economics, founder identity, and source detail
— `src/app/api/founder/opportunities/route.ts`, `src/types/database.ts`, and
`apps/empire/supabase/migrations/20260523103000_crm_contacts_opportunities.sql`.

Waterline: local build candidate. Live schema/RLS, deployment, authenticated
production writes and cross-app sessions have not been verified. Production
schema verification remains a separate required release gate; no migration,
credential/environment change or live database operation is part of this build.

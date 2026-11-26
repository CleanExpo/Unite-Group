# SPM Micro-spec: the public client-asset manifest is a fixed shape, checked byte for byte

<!-- header (append-only): created 2026-11-16T06:20Z by the side session started from local_0e3ab3e3 (Opus 5.5). Replaces the uncommitted draft 2026-11-16-approver-role-allow-list, which used both review rounds the engineering gate allows (chair round 1 FAIL, round 2 FAIL) and is removed; its findings and their fixes are carried here in full. Supersedes flow item (11) and the `--approved-by` R2 stress case of 2026-11-16-website-client-flow; the parent spec's text is bound by hash to its engineering record, so the pointer to this spec lives in that record. -->
<!-- amended 2026-11-16T06:15Z after chair round 1 (PASS, no blocking items) to adopt its two recommendations: the comparison is on raw bytes, not decoded text, and `approved_at` must fall between 2026-11-16 and today; and to record that CI does not yet run `check` on committed sites. -->

## Why this is a new spec: the repeated-finding table

Every finding below is one kind: personal data reaching the public manifest `sites/<slug>/src/assets/client/manifest.json` past `check`. The manifest is committed to a public GitHub repository.

| Round | Found by | Instance | Fix at the time |
|---|---|---|---|
| Bench R2 | eng-compliance | email address or phone number in `approved_by` | deny-list: refuse `@` or eight or more digits |
| Release review of `acb94f0f2` | Cursor | `jane` + fullwidth `@` + `example.com` in `approved_by` | allow-list of four roles |
| Draft round 1 | bench chair | an extra key such as `approver_contact` beside a valid `approved_by` | allow-list of keys and value shapes |
| Draft round 2 | bench chair | a duplicated key: `JSON.parse` keeps the last value, the earlier one stays in the committed bytes | (this spec) |
| Draft round 2 | bench chair | a 12-digit phone number fits `img-<12 hex>`; `0412-34-56` fits the date shape | (this spec) |

The design choice that let the kind exist: `check` judged a parsed view of the file, field by field, while the repository publishes the file's bytes, and some values were free shapes rather than closed sets or derived values. The design change: the committed bytes must equal the tool's own serialisation of a record in which every value is either from a closed set or derived from the image itself, except two named free-text fields. A value that is a role, a hash, an id derived from the hash, a fixed source, a real date or the tool's own formatting cannot carry a name, email address or phone number, however it is spelled.

## Container

`scripts/website/lib/common.mjs` (`APPROVER_ROLES`, `approverRole`, `writeJsonAtomic`) and `scripts/website/lib/images.mjs` (`readManifest`, `ingest`, `auditClientAssets`, `auditManifestShape`, `MANIFEST_TOP_KEYS`, `MANIFEST_ENTRY_KEYS`). Tests in `scripts/__tests__/client-site.test.mjs`.

## Behaviour

- `APPROVER_ROLES` is exactly: `client owner`, `client manager`, `client staff`, `operator`.
- `ingest --approved-by` folds the value with Unicode NFKC, trims it, collapses runs of white space to one space and lower-cases it; the result must equal one of `APPROVER_ROLES`, or `ingest` exits 2 with nothing written.
- The manifest stores only the folded role, never the value as typed.
- `check` fails unless the manifest file's raw bytes equal the UTF-8 bytes of `JSON.stringify(<parsed manifest>, null, 2)` plus a newline, which is exactly what `writeJsonAtomic` writes, so a duplicated key, extra text, invalid UTF-8 or hand formatting fails.
- `check` fails on any top-level key other than `schema` and `assets`, and on a `schema` other than 1.
- `check` fails on any entry key other than `id`, `sha256`, `source`, `approved_by`, `approved_at`, `credit` and `alt`, and on any of those seven missing.
- `check` fails unless `sha256` is 64 lower-case hex characters and matches the image file's bytes, `id` is `img-` plus the first 12 characters of that `sha256` plus `.jpg` or `.png`, `source` is `client-supplied`, `approved_by` is exactly one of `APPROVER_ROLES`, `approved_at` is a real calendar date written `YYYY-MM-DD` that falls between 2026-11-16 (the tool's first day) and today, and `credit` and `alt` are text.
- `check` is enforced where it runs: the operator runs it before every pull request. CI runs the tool's test suites through `npm run verify:readiness` but does not yet run `check` against committed `sites/<slug>` folders; wiring that in is required before the first client manifest merges into `main`.
- A manifest whose `assets` list holds anything other than objects stops `ingest` and `check` with an error.
- Named limit: `credit` and `alt` stay free text, because a photographer credit and an image description are published on purpose. They are reviewed in the pull request like any page copy.
- The tool records no link between a person and a role. Which person held the role is the operator's to keep in the client's private workspace notes, never in the repo.

## UI

The refusal reads: `--approved-by is published in the public manifest, so it must be one of: client owner, client manager, client staff, operator (never a name, email address or phone number)`. The `check` problems include `[asset] manifest.json is not exactly what the tool writes (a duplicated key, extra text or hand formatting); restore it from git or re-run ingest`, `[asset] manifest entry <id>: approved_by is not one of the fixed roles (...)`, `[asset] manifest entry <id> has a field not in the fixed set: <key>`, and one line per malformed value naming the rule.

## Kicker

The question is no longer "does this look like contact data?" but "is every byte something the tool would have written from a role, a hash or a date?".

## Acceptance

- `node --test scripts/__tests__/client-site.test.mjs` passes, including:
  - "the approver must be one of the fixed roles, so no email, phone or name in any spelling reaches the manifest" (a plain, fullwidth and small-form `@`, `[at]` and `at ... dot` spellings, a plain and a fullwidth phone number, a full name and a first name, each refused by `ingest` and each caught by `check` when written in by hand);
  - "check fails on any manifest key outside the fixed set, a source other than client-supplied, or a malformed id, hash or date" (an extra entry key holding a fullwidth-`@` email, an extra top-level key, an email as `source`, a name in `approved_at`, a phone number as `sha256`, a missing `credit`, a name and phone number as `id`, a `null` entry);
  - "check compares the published manifest byte for byte, ties each id to its hash and needs a real date" (a duplicated `approved_by` hiding a fullwidth-`@` email, a duplicated top-level `assets` hiding a name and phone number, an id carrying a phone number, `0412-34-56`, `0412-03-05` and `2099-01-01` as dates, and a byte `0xFF` inside `alt`).
- Mutation controls (n) to (v) in the evidence folder's `mutations.md` each show the named test green on the code and red with its rule removed.

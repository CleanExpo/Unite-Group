---
type: engineering-requirements
spec: spec.md
spec_sha256: 43f572206f87380a53f44470285bcf702fcba9e9903794697209f0ceada5ffdd
reviewer: boris
review_round: 2
reviewed_at: "2026-11-16T06:15:17+00:00"
status: PASS
categories:
  data_model: {state: DECIDED, ref: "#what-the-manifest-may-hold", by: boris}
  invariants: {state: DECIDED, ref: "#what-the-manifest-may-hold", by: boris}
  failure_modes: {state: DECIDED, ref: "#what-stops", by: boris}
  interface_contract: {state: DECIDED, ref: "#what-the-operator-sees", by: boris}
  concurrency: {state: N/A, by: boris, reason: "The atomic write path writeJsonAtomic in scripts/website/lib/common.mjs is unchanged, and check only reads."}
  migration: {state: N/A, by: boris, reason: "No sites/*/src/assets/client/manifest.json is tracked in git on 16/11/2026, so no committed manifest has to change shape."}
  rollback: {state: N/A, by: boris, reason: "The change sits in scripts/website/lib/common.mjs, images.mjs and their tests with no external state; reverting the commit restores the earlier check."}
  observability: {state: DEFERRED, by: boris, reason: "CI runs the test suites but not check against committed sites, and no client manifest is tracked yet. Revisit when the first pull request adding a sites/*/src/assets/client/manifest.json is opened: CI must run check on committed sites before it merges (UNI-3445)."}
  budget: {state: N/A, by: boris, reason: "One extra read of manifest.json and one buffer comparison per site inside check; no network, model or paid call."}
  test_oracle: {state: DECIDED, ref: "#test-oracle", by: boris}
---

# Engineering requirements: the public client-asset manifest is a fixed shape

The bench chair reviewed this spec alone, read-only. Round 1: PASS, no blocking items, two recommendations (compare raw bytes, bound the date to the tool's working range), both adopted. Round 2: PASS, confirming both in the code and the spec. The chair had already reviewed the replaced draft twice (FAIL, FAIL). Those findings, with the earlier ones from the bench and the release review, are in the spec's repeated-finding table, which led to the byte-for-byte design.

## What the manifest may hold

> `check` fails on any entry key other than `id`, `sha256`, `source`, `approved_by`, `approved_at`, `credit` and `alt`, and on any of those seven missing.

> `check` fails unless the manifest file's raw bytes equal the UTF-8 bytes of `JSON.stringify(<parsed manifest>, null, 2)` plus a newline, which is exactly what `writeJsonAtomic` writes, so a duplicated key, extra text, invalid UTF-8 or hand formatting fails.

Named limit: `credit` and `alt` stay free text and are read in the pull request like page copy.

## What stops

> A manifest whose `assets` list holds anything other than objects stops `ingest` and `check` with an error.

## What the operator sees

> The refusal reads: `--approved-by is published in the public manifest, so it must be one of: client owner, client manager, client staff, operator (never a name, email address or phone number)`.

## Test oracle

> Mutation controls (n) to (v) in the evidence folder's `mutations.md` each show the named test green on the code and red with its rule removed.

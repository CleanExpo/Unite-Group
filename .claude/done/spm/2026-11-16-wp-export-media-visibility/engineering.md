---
type: engineering-requirements
spec: spec.md
spec_sha256: adb6dc924beae497c7344df1f34a97622f1edd76ae53c5faaa609461c8c5aea0
reviewer: boris
review_round: 1
reviewed_at: "2026-11-16T04:14:01+00:00"
status: PASS
categories:
  data_model: {state: DECIDED, ref: "#what-is-recorded", by: boris}
  invariants: {state: DECIDED, ref: "#what-stays-exact", by: boris}
  failure_modes: {state: DECIDED, ref: "#a-shortfall-that-is-not-hidden-media", by: boris}
  interface_contract: {state: DECIDED, ref: "#what-the-operator-sees", by: boris}
  concurrency: {state: DECIDED, ref: "#a-shortfall-that-is-not-hidden-media", by: boris}
  migration: {state: N/A, by: boris, reason: "No stored data moves: no reader of media.json or of the endpoint result field exists under scripts/, and exports already written are left as they are."}
  rollback: {state: N/A, by: boris, reason: "The change is confined to scripts/website/lib/wordpress.mjs and its tests; reverting the commit restores the exact-count rule and no other file reads what it writes."}
  observability: {state: DECIDED, ref: "#what-the-operator-sees", by: boris}
  budget: {state: N/A, by: boris, reason: "No extra request is made: the per-page total comparison reuses the headers of each page already fetched, so the endpoint request count is unchanged."}
  test_oracle: {state: DECIDED, ref: "#test-oracle", by: boris}
---

# Engineering requirements: wp-export media visibility

The bench chair reviewed this change alone, read-only, after the real export forced it: PASS with one required change, that every later page report page 1's totals, and the recommended zero-listed-media check, both now in the spec and each covered by a test that failed on the earlier code. The chair then confirmed this record against the spec and code. The chair checked the WordPress core source independently.

## What stays exact

> Pages and posts must still return exactly `X-WP-Total` items.

> Media is a reference list (id, slug, source_url, alt_text, mime_type) for migration and is never copied into the public site.

## What is recorded

> the export then records media as `visible-only` with the hidden count in `export-summary.json`

## A shortfall that is not hidden media

> Every later page must report the same `X-WP-Total` and `X-WP-TotalPages` as page 1, otherwise the export stops with nothing written, so an item deleted mid-read is never taken for a hidden one.

> Any endpoint listing the same id twice stops the export with nothing written.

> Media that lists nothing against a non-zero total counts as blocked.

Named limit (chair, 16/11/2026): an item added and another deleted between the same two pages leave the total unchanged, so that pair is not detected. Rare on a small-business site during a one-off export; the operator re-runs the export if the source site is being edited at the time.

## What the operator sees

> `WARNING: media: <n> item(s) counted by WordPress but hidden from anonymous readers (usually attached to a draft or private post); recorded as visible-only`

## Test oracle

> Mutation controls (i) to (l) in the evidence folder's `mutations.md` each show the named test green on the code and red with the rule removed.

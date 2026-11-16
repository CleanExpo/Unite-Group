---
type: engineering-requirements
spec: spec.md
spec_sha256: 62ecd2d21698b675c698c7206858aef5fa17641d9dc63dcbc6c87c5075516dc6
reviewer: bench
review_round: 2
seated: [boris, eng-failure, eng-observability, eng-test, eng-compliance, eng-supply-chain, eng-release]
contributed: []
reviewed_at: "2026-11-16T00:46:27+00:00"
status: PASS
categories:
  data_model: {state: DECIDED, ref: "#asset-identity-and-weight", by: boris}
  invariants: {state: DECIDED, ref: "#client-material-at-rest", by: eng-compliance}
  failure_modes: {state: DECIDED, ref: "#partial-state-and-the-audit-break", by: eng-failure}
  interface_contract: {state: DECIDED, ref: "#host-and-lead-path", by: boris}
  concurrency: {state: DEFERRED, by: boris, reason: "Each client workspace has one operator on one machine, and any command on a workspace not on this machine exits non-zero. Revisit when a second machine or agent shares one CLIENT_PROJECTS_ROOT."}
  migration: {state: N/A, by: boris, reason: "Nothing existing moves: no schema, no tables, bewg and BRII stay as they are, and each sites/<slug> folder is scaffolded fresh by new."}
  rollback: {state: DEFERRED, by: eng-release, reason: "The tool's code reverts with the PR and publication of client material is prevented, not reversed. Revisit before the first client domain cutover, when the DNS rollback sequence is written."}
  observability: {state: DECIDED, ref: "#what-the-operator-sees", by: eng-observability}
  budget: {state: DEFERRED, by: eng-supply-chain, reason: "1 MB per image and 900 s worst-case audit at 11 lockfiles are stated. Revisit when the fifth client site with a lockfile lands (16 lockfiles, the wave-budget test fails) or a redirect map nears Vercel's 2,048-entry limit."}
  test_oracle: {state: DECIDED, ref: "#test-oracle", by: eng-test}
cross_domain:
  - "eng-release: Vercel caps the redirects array at 2,048 entries (verified live 16/11/2026, https://vercel.com/docs/routing/redirects/configuration-redirects); adopted in R2 as a refusal in `redirects`."
  - "eng-compliance: approved_by must not hold an email address or phone number; adopted in R2."
  - "eng-test: one captured response from a real public WordPress site should become a fixture; adopted as part of the AC-6 sample proof run, recorded in the evidence file."
---

# Engineering requirements: client website-build flow

Bench of seven, two rounds. Round 1 raised 18 blocking findings; amendment R1 resolved 16. Round 2 named one sentence for each of the other two, and amendment R2 adopted both. The chair's round-2 report is the ruling of record; this file binds it to the amended spec by hash. The exact-count rule for media was later split out after a real export, under the gate's two-round limit: see `../2026-11-16-wp-export-media-visibility/`, which supersedes the media part of flow item (2) only.

## Asset identity and weight

> names each file by its content hash, writes the manifest atomically with only `id`, `sha256`, `source`, `approved_by`, `approved_at`, `credit` and `alt`

> two different photos both named `IMG_0001.jpg` in two batches → two assets

## Client material at rest

> Every command refuses to run when the client projects folder is on a volume that does not report encryption

> `ingest` copies only images the operator names with `--select` and `--approved-by`, strips metadata, refuses anything else, and caps each image at 1 MB.

> `approved_by` never holds an email address or a phone number.

## Partial state and the audit break

> builds the workspace and the site in sibling temp folders, renames both into place, and removes the first if the second rename fails, so a failed `new` keeps nothing.

> builds the export in a temp folder renamed into place only when complete.

> The dependency-audit test derives the expected `sites/*/package-lock.json` entries from tracked `sites/*/package.json` files that declare dependencies, so a client site's lockfile never needs a hand edit to the test and a lockfile with no matching site still fails.

## Host and lead path

> v1 accepts only `--host vercel`; `--host cloudflare` exits non-zero naming the blocker. The template ships with no enquiry form.

## What the operator sees

> writes `export-summary.json` and prints one count line per endpoint

> prints how many pages, links and images it checked.

> exit 3 when a change request is older than 24 hours or an offboarded workspace is past its 90-day retention

## Test oracle

> Mutation controls, each recorded in the evidence file with the named test that went red

> a JPEG carrying an EXIF APP1 segment, ingested with `--select` → the copied file holds no APP1 segment; the same JPEG copied straight into `src/assets/client/` by hand → `check` exits non-zero.

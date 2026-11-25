---
type: engineering-requirements
spec: ./spec.md
spec_sha256: ba20a62498585ccfa3fd21eaa96f7ca6ee55cbbb447e37a88d44cced4f796281
reviewer: bench
review_round: 1
seated: [boris, eng-failure, eng-observability, eng-test, eng-contract, eng-frontend, eng-release]
reviewed_at: 2026-11-17T21:45:41+10:00
status: PASS
categories:
  data_model:         {state: DEFERRED, reason: "Part 1 stores no rows and the production INVESTIGATIONS table is empty. This returns when the part 2 release places IE-001: attached to one of the 49 scenarios, or added as a 50th scenario id in library.ts.", by: boris}
  invariants:         {state: DECIDED, ref: "#invariants", by: boris}
  failure_modes:      {state: DECIDED, ref: "#failure-modes", by: eng-failure}
  interface_contract: {state: DECIDED, ref: "#interface-contract", by: eng-contract}
  concurrency:        {state: N/A, reason: "The two new commands go through the existing single writer, the revision check in reduceWorld (scenario.ts), and id-based replay; there is no second writer, queue, worker or background job.", by: boris}
  migration:          {state: N/A, reason: "No database migration: the world service keeps its command log in memory behind a loopback port and section 5 excludes database, Supabase and Vercel. The schemaVersion 8 to 9 move is covered under interface_contract.", by: eng-release}
  rollback:           {state: N/A, reason: "Both branches are unmerged, no world state persists between runs and production INVESTIGATIONS is empty, so a revert is two commits on two branches with no stored records to restore.", by: eng-release}
  observability:      {state: DECIDED, ref: "#observability", by: eng-observability}
  budget:             {state: DECIDED, ref: "#budget", by: eng-frontend}
  test_oracle:        {state: DECIDED, ref: "#test-oracle", by: eng-test}
disagreements:
  - "eng-test asked for a fixture state where an accepted cause is ruled out and judged wrong; boris prescribed that no option may rule out an accepted cause. Chair ruled for boris: a finding is a fact, and the rule removes the stuck-player path at load time. The test is dropped; the overturn condition is recorded in spec V2-2."
  - "eng-frontend preferred the service to send what may be called next; eng-contract accepted one client helper. Ruled: one client helper now (V2-4), because a new service field widens the contract; the service-owned field is the longer-term option."
---

Round 1 ran seven cold seats on spec v1. Their must-fix items converged and were folded into the spec as Amendment v2; per leveling.md "Convergent criticism" no round 2 ran. spec_sha256 binds to the folded spec (v1 plus Amendment v2).

What the bench found that v1 did not contain: the vi.mock seam could not reach revealJob or the walk scripts (eng-test, boris, eng-failure); a wrong path could rule out every cause and lock the job (eng-failure, boris); the verdict could call a still-open cause wrong (boris); the client copied the order rule and would show Finish early (eng-frontend, eng-contract, boris); the job card would run off the screen (eng-frontend, boris); "v8 unchanged" had no baseline (eng-test); the two PRs had no merge order and the client check was not pinned to a service commit (eng-release); client fixture drift and 500 errors had no detector (eng-observability).

## Invariants

> (a) no option's rulesOut contains an accepted cause, so the accepted causes stay open on every path and the player can never be stuck;
> (b) each step has exactly one option with the most points (no ties);
> (c) taking the most-points option at every step leaves open exactly the accepted causes;

## Failure modes

> call-cause accepts any listed cause. It is correct when the cause is accepted. The why always names every cause still open ("Not ruled out: ...").
> The job's decisions are shown only after the cause call (revealJob), and finish-job refuses with `cause-not-called` before it.

## Interface contract

> A step always carries `call: null` until called, like JobDecision. An uncalled option is exactly `{ id, label }`.
> New ResultCode values: `step-already-called`, `cause-already-called`, `steps-not-done`, `cause-not-called`. New CommandType values: `call-step`, `call-cause`. parseCommand emits them with a fixed key order.
> Merge order: service PR first, then the client PR straight after. Each PR body names the other and its head SHA.

## Observability

> The service logs a 500: http-server writes the error stack to stderr, and the service records the attempt with status 500.
> `check_l2_values.py` compares it byte for byte, and its control run plants a drift that it must catch.

## Budget

> (f) no empty text, and text caps: prompt 160, label 80, finding 200, why 240, source 80 characters.
> `displayed()` includes the investigation text, and `holds_content()` is true at every stage of the largest fixture.

## Test oracle

> The investigation table is passed in, never mocked.
> builds a golden copy from main c86922abf in a temp checkout by replaying the same command scripts over all 49 scenarios on every suited house, and compares the v9 output byte for byte as canonical JSON after removing exactly `investigation` and setting `schemaVersion` to 8;

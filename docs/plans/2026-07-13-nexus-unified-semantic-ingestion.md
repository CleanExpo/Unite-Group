# Forward plan: unify Nexus page and chunk semantic ingestion

Generated: 13/07/2026 · Horizon: 16 moves · Planner: forward-planner

## Win condition (Definition of Done)

- [auto] A Supabase database branch contains all 620 `wiki_pages` and 620/620 non-null page vectors.
- [auto] Every wiki page owns at least one non-null chunk vector; `(document_id, chunk_index)` has no duplicates.
- [auto] The coverage RPC reports zero stale documents and fails closed on any deficit.
- [auto] Representative page and chunk RPC probes return expected self-neighbours.
- [auto] `EXPLAIN (ANALYSE, BUFFERS)` records index/query-plan evidence on the database branch.
- [human] An independent reviewer accepts the code, evidence and rollback plan before any merge or production action.

## Board state

**Internal:** Production audit (read-only, 13/07/2026) found 620 wiki pages, 526 page vectors, 60 chunk-covered documents, zero overlap, and chunks stale since 20/05/2026. Legacy scripts in retained `apps/empire` use conflicting limits, insert-only chunks, swallowed failures, and one path substitutes zero vectors. Canonical product work belongs in `apps/web`. Production `lksfwktwtmyznckodsau` is read-only.

**External:** No external facts are required. The approved route is the repository's Supabase database-branch workflow; the deleted standing sandbox must not be recreated.

## The gap (win condition − current state)

| Win-condition item       | Status  | Notes                                                          |
| ------------------------ | ------- | -------------------------------------------------------------- |
| Canonical ingestion path | absent  | Several divergent retained scripts exist                       |
| Page-vector completeness | partial | 526/620 live                                                   |
| Chunk completeness       | partial | 60/620 live, disjoint from page vectors                        |
| Idempotent atomic write  | absent  | Existing paths insert or delete/reinsert non-atomically        |
| Coverage/freshness gate  | absent  | Wiki doctrine describes it but code does not enforce it        |
| Sandbox evidence         | blocked | Database branch provisioning requires approved external action |
| Independent review       | absent  | Builder cannot approve own meaningful change                   |

## The spine — 16 moves

1. **Ground strategy and boundaries** — _Deliverable:_ read exit thesis, priority, Nexus architecture, schema wrapper, repo rules and parent audit. _Verify:_ references recorded here. _Unlocks:_ m2.
2. **Inventory ingestion paths** — _Deliverable:_ identify all page/chunk writers and failure modes. _Verify:_ legacy-path findings in this plan. _Unlocks:_ m3.
3. **Define canonical contract** — _Deliverable:_ one wiki page produces one page vector plus indexed chunk vectors. _Verify:_ unit-testable normalisation contract. _Unlocks:_ m4–m6.
4. **Add deterministic chunking** — _Deliverable:_ pure chunk/fingerprint library. _Verify:_ Vitest overlap, empty, and stability tests. _Unlocks:_ m7.
5. **Add transactional database RPC** — _Deliverable:_ idempotent page+chunk upsert with read-back and stale-tail removal. _Verify:_ database-branch replay and rerun. _Unlocks:_ m7.
6. **Add fail-closed coverage RPC** — _Deliverable:_ counts for pages, page vectors, chunk documents, duplicates and staleness. _Verify:_ deficit fixture fails; complete fixture passes. _Unlocks:_ m9.
7. **Add sandbox-only runner** — _Deliverable:_ paginated backfill using page and chunk embeddings. _Verify:_ refuses prod ref and requires explicit write flag plus `--apply`. _Unlocks:_ m8.
8. **Provision approved database branch** — _Deliverable:_ ephemeral branch with 620 copied wiki pages. _Verify:_ branch ref and row count, with no production write. _Unlocks:_ m9.
9. **Replay migration on branch** — _Deliverable:_ tables, unique constraints, indexes and RPCs. _Verify:_ migration succeeds and schema probes match assumptions. _Unlocks:_ m10.
10. **Run full backfill** — _Deliverable:_ all branch wiki pages ingested. _Verify:_ runner finishes without swallowed errors. _Unlocks:_ m11.
11. **Prove idempotence** — _Deliverable:_ second identical run. _Verify:_ stable document/chunk counts and zero duplicate keys. _Unlocks:_ m12.
12. **Prove coverage and freshness** — _Deliverable:_ coverage JSON. _Verify:_ 620/620 vectors, 620/620 chunk documents, duplicates=0, stale=0. _Unlocks:_ m13.
13. **Run semantic probe set** — _Deliverable:_ representative exact/self and natural-language document/chunk results. _Verify:_ expected source IDs appear with recorded similarity. _Unlocks:_ m14.
14. **Capture query plans** — _Deliverable:_ `EXPLAIN (ANALYSE, BUFFERS)` for both RPC query shapes. _Verify:_ latency, buffers and index/scan evidence attached. _Unlocks:_ m15.
15. **Independent review and rollback check** — _Deliverable:_ review verdict plus branch deletion/rollback instructions. _Verify:_ reviewer confirms no production action and no destructive autonomous step. _Unlocks:_ m16.
16. **Propose PR, keep production gated** — _Deliverable:_ PR to `main` with evidence and founder gates. _Verify:_ no merge/deploy/migration execution; explicit approval requirements remain.

## Branch points

- **After move 8 — database branch replay:** if provisioning/replay succeeds, continue to m9; if migration history cannot replay, repair the baseline in a separate reviewed change and do not fall back to production.
- **After move 14 — planner evidence:** if IVFFlat is used/latency acceptable, continue to review; if sequential scan is chosen at this dataset size, record the planner rationale and test at realistic scale before proposing index changes.

## Risk horizon

- Embedding spend or rate limits → batch requests, stop on provider failure, and never write zero vectors.
- Partial document state → transactional RPC and write read-back.
- Duplicate/stale tails on rerun → unique key plus upsert and delete only indices beyond the new chunk count inside the transaction.
- Accidental production mutation → explicit prod-ref refusal, sandbox-named env vars, write flag and `--apply`.
- Empty wiki pages → embed title and create one title chunk so coverage remains honest.
- Branch replay fails due historical migration drift → repair baseline; never bypass with direct production SQL.

## Red-team findings (pulled forward)

- A green count can hide zero vectors → non-null checks are in the coverage RPC and RPC rejects null page vectors.
- Upserting only current chunks leaves stale tails after content shrinks → stale-tail deletion is inside the transaction.
- A normal PR could imply production readiness without real data evidence → moves 8–14 remain mandatory and this task blocks until approved branch provisioning.
- Index existence does not prove use → move 14 requires real `EXPLAIN (ANALYSE, BUFFERS)` evidence.

## Immediate next move

Obtain approval/provisioning for an ephemeral Supabase database branch (move 8). Local implementation and unit gates are ready, but the 620/620 and query-plan claims must not be fabricated without that branch.

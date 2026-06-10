// C3 cap + completeness regression guard through the REAL DAL path (CI, real connection).
//
// The at-scale plan-level proofs (forced-HNSW under-return mechanism, the max_scan_tuples
// 20000-default bug, 15k/60k fixtures, EXPLAIN-verified) live in tests/c3_*.test.sql and the
// sandbox runs. This vitest pins the DAL-visible CONTRACT so CI catches a regression in
// field.match_evidence or the DAL plumbing:
//   * match_count is clamped to 200 (the LEAST(match_count, 200) cap),
//   * the rows returned are the TRUE nearest — recall checked against an exact brute-force
//     scan of the same query vector (index scans disabled on the comparison side),
//   * count > the function's ef_search does NOT truncate (the match_course under-return mode),
//   * the threshold is a strict similarity bound (boundary placed BETWEEN two known
//     distances, so no float-equality flake),
//   * ordering is by ascending distance (descending similarity).
// Self-skips unless SPINE_DATABASE_URL points at a migrated + seeded instance.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spine } from '../../data-access/index.js';
import { asService } from '../../data-access/client.js';
import { toVectorLiteral } from '../../data-access/internal.js';

const hasDb = !!process.env.SPINE_DATABASE_URL;
const ORG_A = '0a000000-0000-0000-0000-000000000001';
const ALICE = '0a000000-0000-0000-0000-0000000000a1';
const JOB_A = '11000000-0000-0000-0000-000000000001';
const N = 230; // > the 200 cap

// Deterministic 384-d query vector (same family as the SQL-side fixture formula; the two
// only need to produce distinct, stable distances — recall is judged against brute force
// using THIS literal on both sides).
function vec(i: number): number[] {
  const a: number[] = [];
  for (let g = 1; g <= 384; g++) a.push(Math.sin(i * 0.0007 + g * 0.013) + Math.cos(i * 0.31 + g * 0.07));
  return a;
}
const q = vec(115.5);
const qLit = toVectorLiteral(q);

// Exact nearest-K ids for the SAME query, brute force (planner's index paths disabled so
// this side is exact by construction). Same org filter the RLS'd function resolves to.
async function exactNearest(limit: number): Promise<string[]> {
  return asService(async (tx) => {
    await tx`set local enable_indexscan = off`;
    await tx`set local enable_bitmapscan = off`;
    const rows = await tx<{ id: string }[]>`
      select id from field.evidence
      where org_id = ${ORG_A} and embedding is not null
      order by embedding <=> ${qLit}::public.vector(384) asc
      limit ${limit}`;
    return rows.map((r) => r.id);
  });
}

describe.skipIf(!hasDb)('C3 match_evidence cap + completeness through the DAL (integration)', () => {
  beforeAll(async () => {
    await asService(async (tx) => {
      await tx`delete from field.evidence where metadata->>'c3ci' = 'true'`; // previously-aborted run
      // 230 org-A rows with deterministic distinct embeddings, built server-side in one statement.
      await tx`
        insert into field.evidence (org_id, job_id, sha256, evidence_class, embedding, metadata)
        select ${ORG_A}, ${JOB_A}, 'c3ci-' || i, 'c3ci', v.emb, '{"c3ci": true}'::jsonb
        from generate_series(1, ${N}) i
        cross join lateral (
          select ('[' || string_agg((sin(i * 0.0007 + g * 0.013) + cos(i * 0.31 + g * 0.07))::text, ',' order by g) || ']')::public.vector(384) as emb
          from generate_series(1, 384) g
        ) v`;
    });
  }, 120_000);

  afterAll(async () => {
    await asService(async (tx) => {
      await tx`delete from field.evidence where metadata->>'c3ci' = 'true'`;
    });
  }, 30_000);

  it('clamps match_count to 200 and returns the TRUE nearest 200 (recall vs brute force)', async () => {
    const rows = await spine.matchEvidence({ orgId: ORG_A, personId: ALICE }, q, { threshold: -1, count: 500 });
    expect(rows.length).toBe(200); // the LEAST(match_count, 200) cap
    expect(rows.map((r) => r.id)).toEqual(await exactNearest(200)); // complete AND correctly ordered
  }, 30_000);

  it('count above the function ef_search does not truncate: 150 asked, the true 150 returned', async () => {
    const rows = await spine.matchEvidence({ orgId: ORG_A, personId: ALICE }, q, { threshold: -1, count: 150 });
    expect(rows.length).toBe(150);
    expect(rows.map((r) => r.id)).toEqual(await exactNearest(150));
  }, 30_000);

  it('threshold is a strict bound: a cutoff between the 100th and 101st distances yields exactly 100', async () => {
    const [d100, d101] = await asService(async (tx) => {
      await tx`set local enable_indexscan = off`;
      await tx`set local enable_bitmapscan = off`;
      const rows = await tx<{ d: number }[]>`
        select embedding <=> ${qLit}::public.vector(384) as d
        from field.evidence where org_id = ${ORG_A} and embedding is not null
        order by d asc offset 99 limit 2`;
      return [rows[0]!.d, rows[1]!.d];
    });
    expect(d101).toBeGreaterThan(d100); // distinct-distance precondition (no tie at the boundary)
    const threshold = 1 - (d100 + d101) / 2; // distance cutoff strictly between rank 100 and 101
    const rows = await spine.matchEvidence({ orgId: ORG_A, personId: ALICE }, q, { threshold, count: 200 });
    expect(rows.length).toBe(100);
    expect(rows.map((r) => r.id)).toEqual(await exactNearest(100));
  }, 30_000);

  it('orders by descending similarity', async () => {
    const rows = await spine.matchEvidence({ orgId: ORG_A, personId: ALICE }, q, { threshold: -1, count: 50 });
    expect(rows.length).toBe(50);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.similarity).toBeLessThanOrEqual(rows[i - 1]!.similarity);
    }
  }, 30_000);
});

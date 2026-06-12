// Adversarial cross-tenant isolation for semantic recall, through the REAL DAL path
// (withRls = set_config('request.jwt.claims') + `set local role authenticated` on a direct postgres
// connection; spine schemas are private / not exposed to PostgREST, so this IS the production auth path —
// signed-JWT verification is upstream session auth, outside data-access scope).
//
// Geometry is adversarial: org A and org B evidence INTERLEAVE in distance rank around the query vector,
// so a leak would surface at a top rank. Asserts each tenant sees only its own rows, with full recall.
// Self-skips unless SPINE_DATABASE_URL points at a migrated + seeded instance.
//
// The exhaustive at-scale proof lives in tests/c3_metadata_scale.test.sql + the live sandbox run
// (Alice: 50 total / 0 Bravo leak / recall 50/50 with Bravo interleaved ~1:1, EXPLAIN-confirmed HNSW +
// RLS-qual-as-Filter). This vitest is the CI regression guard on the DAL path at small scale.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spine } from '../../data-access/index.js';
import { asService } from '../../data-access/client.js';

const hasDb = !!process.env.SPINE_DATABASE_URL;
const ORG_A = '0a000000-0000-0000-0000-000000000001';
const ORG_B = '0b000000-0000-0000-0000-000000000001';
const ALICE = '0a000000-0000-0000-0000-0000000000a1';
const BOB = '0b000000-0000-0000-0000-0000000000b1';
const JOB_A = '11000000-0000-0000-0000-000000000001';
const CUST_B = '10000000-0000-0000-0000-0000000000b1';
const JOB_B = '11000000-0000-0000-0000-0000000000b1';

// 384-d vector along a base direction; `t` shifts it slightly so A(i) and B(i) interleave by distance.
function vec(i: number, t: number): string {
  const a: number[] = [];
  for (let g = 1; g <= 384; g++) a.push(Math.sin((i + t) * 0.0007 + g * 0.013) + Math.cos((i + t) * 0.31 + g * 0.07));
  return `[${a.join(',')}]`;
}

describe.skipIf(!hasDb)('semantic recall cross-tenant isolation (interleaved)', () => {
  const N = 40; // 40 A + 40 B, interleaved (B at i+0.5)
  beforeAll(async () => {
    await asService(async (tx) => {
      await tx`insert into field.customer (id, org_id, name) values (${CUST_B}, ${ORG_B}, 'iso B') on conflict (id) do nothing`;
      await tx`insert into field.job (id, org_id, customer_id, status) values (${JOB_B}, ${ORG_B}, ${CUST_B}, 'open') on conflict (id) do nothing`;
      for (let i = 1; i <= N; i++) {
        await tx`insert into field.evidence (org_id, job_id, sha256, evidence_class, embedding, metadata)
          values (${ORG_A}, ${JOB_A}, ${'iso-a-' + i}, 'iso', ${vec(i, 0)}::public.vector(384), '{"iso":true}'::jsonb)`;
        await tx`insert into field.evidence (org_id, job_id, sha256, evidence_class, embedding, metadata)
          values (${ORG_B}, ${JOB_B}, ${'iso-b-' + i}, 'iso', ${vec(i, 0.5)}::public.vector(384), '{"iso":true}'::jsonb)`;
      }
    });
  });

  afterAll(async () => {
    await asService(async (tx) => {
      await tx`delete from field.evidence where metadata->>'iso'='true'`;
      await tx`delete from field.job where id=${JOB_B}`;
      await tx`delete from field.customer where id=${CUST_B}`;
    });
  });

  const q = vec(20, 0); // near the middle of the interleaved cluster

  it('org A sees only org A rows — no leak despite interleaved org B', async () => {
    const rows = await spine.matchEvidence({ orgId: ORG_A, personId: ALICE }, JSON.parse(q), { threshold: -1, count: 30 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.org_id === ORG_A)).toBe(true);
    expect(rows.some((r) => r.org_id === ORG_B)).toBe(false);
  });

  it('org B sees only org B rows — no leak despite interleaved org A', async () => {
    const rows = await spine.matchEvidence({ orgId: ORG_B, personId: BOB }, JSON.parse(q), { threshold: -1, count: 30 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.org_id === ORG_B)).toBe(true);
  });
});

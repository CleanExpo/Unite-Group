// RLS matrix through the DAL (real RLS-scoped transactions). Mirrors tests/rls_matrix.sql,
// which is already PASS-verified on the sandbox. Runs in CI when SPINE_DATABASE_URL points
// at a migrated + seeded instance (e.g. `supabase start` or an ephemeral branch).
import { describe, it, expect } from 'vitest';
import { spine } from '../../data-access/index.js';

const hasDb = !!process.env.SPINE_DATABASE_URL;

const ORG_A = '0a000000-0000-0000-0000-000000000001';
const ORG_B = '0b000000-0000-0000-0000-000000000001';
const ALICE = '0a000000-0000-0000-0000-0000000000a1';
const BOB = '0b000000-0000-0000-0000-0000000000b1';
const UNITE = '00000000-0000-0000-0000-0000000000ee';
const PHILL = '00000000-0000-0000-0000-0000000000ff';
const HELEN = '0c000000-0000-0000-0000-000000000001';

describe.skipIf(!hasDb)('RLS matrix (integration)', () => {
  it('member of org B is walled off from org A leads/jobs', async () => {
    const ctx = { orgId: ORG_B, personId: BOB };
    expect((await spine.listVisibleLeads(ctx)).length).toBe(0);
    expect((await spine.listJobs(ctx)).length).toBe(0);
  });

  it('org B cannot resolve org A lead-contact PII (condition 2)', async () => {
    const persons = await spine.visiblePersons({ orgId: ORG_B, personId: BOB });
    expect(persons.find((p) => p.party_id === HELEN)).toBeUndefined();
  });

  it('org A sees exactly its slice, incl. PII via the routed-lead tie', async () => {
    const ctx = { orgId: ORG_A, personId: ALICE };
    expect((await spine.listVisibleLeads(ctx)).length).toBe(1);
    expect((await spine.listJobs(ctx)).length).toBe(1);
    const persons = await spine.visiblePersons(ctx);
    expect(persons.find((p) => p.party_id === HELEN)).toBeDefined();
  });

  it('internal staff is cross-tenant', async () => {
    const persons = await spine.visiblePersons({ orgId: UNITE, personId: PHILL });
    expect(persons.length).toBeGreaterThanOrEqual(4);
  });
});

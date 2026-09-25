// Founder identity rules (RA-7753 slice 1a, SPEC_SLICE1_IDENTITY §14): lineage and identity visibility — D1 (no re-point) and D2 (no forged ties).
//
// Every rule is proven two ways: a NEGATIVE CONTROL (the forbidden action is refused) and a
// MUTANT (the guard is removed inside the same always-rolled-back transaction and the
// forbidden action then SUCCEEDS). A rule whose mutant stays green is a rule the test cannot
// see, so every mutant assertion is part of the suite. Fixture ids are minted fresh per run
// and every transaction rolls back (helpers/tx.ts), so nothing touches the seeded fixtures.
// Each block repeats (REPEATS) so an order- or state-dependent pass fails on a later
// repetition rather than passing by luck (spec §14 rule 10).
// This file is one REQUIRED_EVIDENCE suite in config/ci-evidence-manifest.json, capability
// `identity-lineage` — the manifest allows one capability per suite, hence one file per capability.
import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { db } from '../../data-access/client.js';
import { inTx, actAs, expectSqlState, extractFunction, root, type Tx } from './helpers/tx.js';
import { mkCredential } from './helpers/fixtures.js';

const hasDb = !!process.env.SPINE_DATABASE_URL;
const REPEATS = { repeats: 2 };

// Seed fixtures (seed/0001_seed.sql).
const ORG_B = '0b000000-0000-0000-0000-000000000001';
const ALICE = '0a000000-0000-0000-0000-0000000000a1';
const BOB = '0b000000-0000-0000-0000-0000000000b1';

afterAll(async () => {
  if (hasDb) await db().end({ timeout: 5 });
});

// ── Rule 3 / D1: a product account is never silently re-pointed to another person ──
describe.skipIf(!hasDb)('rule 3 (D1): no re-point of a source record', REPEATS, () => {
  async function stageAndResolve(tx: Tx, sys: string, email: string, name: string): Promise<string> {
    await tx`
      insert into migrate.source_party (source_system, source_pk, kind, email, display_name)
      values (${sys}, 'User:1', 'person', ${email}, ${name})
      on conflict (source_system, source_pk) do update set email = excluded.email, display_name = excluded.display_name`;
    const [r] = await tx<{ res: string }[]>`select migrate.resolve_one(${sys}, 'User:1') as res`;
    return r!.res;
  }
  async function linkedParty(tx: Tx, sys: string): Promise<string> {
    const [r] = await tx<{ party_id: string }[]>`
      select party_id from core.source_record where source_system = ${sys} and source_pk = 'User:1'`;
    return r!.party_id;
  }
  async function reviewRows(tx: Tx, party: string): Promise<number> {
    const [r] = await tx<{ n: number }[]>`
      select count(*)::int as n from core.identity_audit
      where action = 'review_pending' and (party_id = ${party} or other_party_id = ${party})`;
    return r!.n;
  }

  // The defect lives in migrate._record's `on conflict … do update set party_id`. Since
  // strangler/0003, resolve_one short-circuits on an existing source_record and never
  // reaches that branch, so the re-point is only reachable by a direct _record call —
  // which is exactly what this test makes, because a latent write path is still a path.
  async function newParty(tx: Tx, name: string): Promise<string> {
    const [p] = await tx<{ party_id: string }[]>`
      insert into core.party (kind, display_name) values ('person', ${name}) returning party_id`;
    return p!.party_id;
  }
  async function recordConflict(tx: Tx): Promise<{ first: string; other: string; sys: string }> {
    const id = randomUUID();
    const sys = `ra7753-d1-${id}`;
    await stageAndResolve(tx, sys, `d1-one-${id}@rules.test`, 'D1 One');
    const first = await linkedParty(tx, sys);
    const other = await newParty(tx, 'D1 Other');
    await tx`select migrate._record(${sys}, 'User:1', ${other}::uuid, 'new')`;
    return { first, other, sys };
  }

  it('_record for an already-linked key and a DIFFERENT party keeps the link and queues 1 review', async () => {
    await inTx(async (tx) => {
      const { first, sys } = await recordConflict(tx);
      expect(await linkedParty(tx, sys), 'source_record was re-pointed to a different party').toBe(first);
      expect(await reviewRows(tx, first)).toBe(1);
    });
  });

  it('MUTANT: with the strangler/0001 _record restored, the same call re-points (the test can see it)', async () => {
    await inTx(async (tx) => {
      await tx.unsafe(extractFunction('strangler/0001_resolver.sql', 'migrate._record'));
      const { other, sys } = await recordConflict(tx);
      expect(await linkedParty(tx, sys)).toBe(other);
    });
  });

  it('false-positive control: _record for the SAME party is a no-op with 0 reviews', async () => {
    await inTx(async (tx) => {
      const id = randomUUID();
      const sys = `ra7753-d1fp-${id}`;
      await stageAndResolve(tx, sys, `d1-same-${id}@rules.test`, 'D1 Same');
      const first = await linkedParty(tx, sys);
      await tx`select migrate._record(${sys}, 'User:1', ${first}::uuid, 'new')`;
      expect(await linkedParty(tx, sys)).toBe(first);
      expect(await reviewRows(tx, first)).toBe(0);
    });
  });

  it('regression: re-staging a different identity through resolve_one leaves the link unchanged', async () => {
    await inTx(async (tx) => {
      const id = randomUUID();
      const sys = `ra7753-d1rs-${id}`;
      await stageAndResolve(tx, sys, `d1-one-${id}@rules.test`, 'D1 One');
      const first = await linkedParty(tx, sys);
      expect(await stageAndResolve(tx, sys, `d1-two-${id}@rules.test`, 'D1 Two')).toBe('unchanged');
      expect(await linkedParty(tx, sys)).toBe(first);
    });
  });
});

// ── Rule 6 / D2: a tenant cannot make a stranger's PII visible by forging a field tie ──
describe.skipIf(!hasDb)('rule 6 (D2): forged field ties expose nothing', REPEATS, () => {
  async function visibleToBob(tx: Tx, party: string): Promise<boolean> {
    const rows = await tx`select 1 from core.person where party_id = ${party}`;
    return rows.length > 0;
  }

  it('control: org B cannot see Alice (org A) before any forgery', async () => {
    await inTx(async (tx) => {
      await actAs(tx, { orgId: ORG_B, personId: BOB });
      expect(await visibleToBob(tx, ALICE)).toBe(false);
    });
  });

  it('field.customer with a stranger as contact_person_id is refused, and Alice stays hidden', async () => {
    await inTx(async (tx) => {
      await actAs(tx, { orgId: ORG_B, personId: BOB });
      await expectSqlState(tx, '42501', (sp) => sp`
        insert into field.customer (org_id, contact_person_id, name) values (${ORG_B}, ${ALICE}, 'forged')`);
      expect(await visibleToBob(tx, ALICE)).toBe(false);
    });
  });

  it('field.evidence captured_by a stranger is refused, and Alice stays hidden', async () => {
    await inTx(async (tx) => {
      await actAs(tx, { orgId: ORG_B, personId: BOB });
      const [c] = await tx<{ id: string }[]>`
        insert into field.customer (org_id, name) values (${ORG_B}, 'legit, no contact') returning id`;
      const [j] = await tx<{ id: string }[]>`
        insert into field.job (org_id, customer_id) values (${ORG_B}, ${c!.id}) returning id`;
      await expectSqlState(tx, '42501', (sp) => sp`
        insert into field.evidence (org_id, job_id, captured_by) values (${ORG_B}, ${j!.id}, ${ALICE})`);
      expect(await visibleToBob(tx, ALICE)).toBe(false);
    });
  });

  it('MUTANT: with the 0002 customer_rw policy restored, the forgery lands and Alice leaks to org B', async () => {
    await inTx(async (tx) => {
      const src = readFileSync(join(root, 'migrations/0002_modules.sql'), 'utf8');
      const policy = src.split('\n').find((l) => l.startsWith('create policy customer_rw'));
      expect(policy).toBeDefined();
      await tx.unsafe(`drop policy customer_rw on field.customer; ${policy}`);
      await actAs(tx, { orgId: ORG_B, personId: BOB });
      await tx`insert into field.customer (org_id, contact_person_id, name) values (${ORG_B}, ${ALICE}, 'forged')`;
      expect(await visibleToBob(tx, ALICE)).toBe(true);
    });
  });

  it('a legitimate tie still works: org B may name its own member as captured_by', async () => {
    await inTx(async (tx) => {
      await actAs(tx, { orgId: ORG_B, personId: BOB });
      const [c] = await tx<{ id: string }[]>`
        insert into field.customer (org_id, name) values (${ORG_B}, 'legit') returning id`;
      const [j] = await tx<{ id: string }[]>`
        insert into field.job (org_id, customer_id) values (${ORG_B}, ${c!.id}) returning id`;
      const rows = await tx`
        insert into field.evidence (org_id, job_id, captured_by) values (${ORG_B}, ${j!.id}, ${BOB}) returning id`;
      expect(rows.length).toBe(1);
    });
  });
});

// ── Rule 6 (D2), continued: no credential leak, and the tie set is pinned ────────────────
describe.skipIf(!hasDb)('rule 6 (D2): credentials and the pinned tie set', REPEATS, () => {
  it('a refused forgery exposes none of the stranger\'s credentials either', async () => {
    await inTx(async (tx) => {
      await mkCredential(tx, ALICE, '1 month');
      await actAs(tx, { orgId: ORG_B, personId: BOB });
      await expectSqlState(tx, '42501', (sp) => sp`
        insert into field.customer (org_id, contact_person_id, name) values (${ORG_B}, ${ALICE}, 'forged')`);
      expect((await tx`select id from core.credential where holder_party_id = ${ALICE}`).length).toBe(0);
      expect((await tx`select id from core.credential_full where holder_party_id = ${ALICE}`).length).toBe(0);
    });
  });

  // party_visible() is the single chokepoint for identity PII. Any new tie changes who can
  // see whom, so the exact set of relations each predicate reads is pinned here: adding a
  // tie must be a deliberate edit to this list, reviewed as the privacy change it is.
  async function tablesRead(tx: Tx, fn: string): Promise<string[]> {
    const [r] = await tx<{ def: string }[]>`select pg_get_functiondef(${fn}::regprocedure) as def`;
    return [...new Set([...r!.def.matchAll(/\b(?:from|join)\s+([a-z_]+\.[a-z_]+)/gi)].map((m) => m[1]!.toLowerCase()))].sort();
  }

  it('party_visible_nonfield reads exactly membership + routed-lead ties, plus a self tie', async () => {
    await inTx(async (tx) => {
      expect(await tablesRead(tx, 'core.party_visible_nonfield(uuid)')).toEqual(
        ['core.org_membership', 'leadgen.lead', 'leadgen.lead_routing']);
      const [r] = await tx<{ def: string }[]>`select pg_get_functiondef('core.party_visible_nonfield(uuid)'::regprocedure) as def`;
      expect(r!.def).toContain('p_party = core.current_person_id()');
    });
  });

  it('party_visible adds exactly the two write-checked field ties', async () => {
    await inTx(async (tx) => {
      expect(await tablesRead(tx, 'core.party_visible(uuid)')).toEqual(['field.customer', 'field.evidence']);
      const [r] = await tx<{ def: string }[]>`select pg_get_functiondef('core.party_visible(uuid)'::regprocedure) as def`;
      expect(r!.def).toContain('core.party_visible_nonfield(p_party)');
    });
  });
});

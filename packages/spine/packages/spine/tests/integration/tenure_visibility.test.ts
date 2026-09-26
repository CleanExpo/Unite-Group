// Founder identity rules (RA-7753 slice 1a, SPEC_SLICE1_IDENTITY §14): tenure has one source and leaving ends the employer's view (rule 4, D-15).
//
// Every rule is proven two ways: a NEGATIVE CONTROL (the forbidden action is refused) and a
// MUTANT (the guard is removed inside the same always-rolled-back transaction and the
// forbidden action then SUCCEEDS). A rule whose mutant stays green is a rule the test cannot
// see, so every mutant assertion is part of the suite. Fixture ids are minted fresh per run
// and every transaction rolls back (helpers/tx.ts), so nothing touches the seeded fixtures.
// Each block repeats (REPEATS) so an order- or state-dependent pass fails on a later
// repetition rather than passing by luck (spec §14 rule 10).
// This file is one REQUIRED_EVIDENCE suite in config/ci-evidence-manifest.json, capability
// `tenure-visibility` — the manifest allows one capability per suite, hence one file per capability.
import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../../data-access/client.js';
import { inTx, actAs, actAsOwner, expectSqlState, extractFunction, type Tx } from './helpers/tx.js';
import { mkEmployment, mkCredential, mkEmployer } from './helpers/fixtures.js';

const hasDb = !!process.env.SPINE_DATABASE_URL;
const REPEATS = { repeats: 2 };

afterAll(async () => {
  if (hasDb) await db().end({ timeout: 5 });
});

// ── Rule 4: tenure has one source, and leaving ends the employer's view (D-15) ───────────
describe.skipIf(!hasDb)('rule 4: tenure single source', REPEATS, () => {
  async function employerSees(tx: Tx, org: string, owner: string, holder: string): Promise<string[]> {
    await actAs(tx, { orgId: org, personId: owner });
    const rows = await tx<{ id: string }[]>`select id from core.credential where holder_party_id = ${holder} order by id`;
    await actAsOwner(tx);
    return rows.map((r) => r.id);
  }

  it('while employed: the employer sees credentials issued in the stint, not before it, and never the number', async () => {
    await inTx(async (tx) => {
      const { org, owner, worker } = await mkEmployer(tx);
      const during = await mkCredential(tx, worker, '6 months', `N-${randomUUID()}`);
      await mkCredential(tx, worker, '2 years');
      expect(await employerSees(tx, org, owner, worker)).toEqual([during]);
      await actAs(tx, { orgId: org, personId: owner });
      await expectSqlState(tx, '42501', (sp) => sp`select number from core.credential where id = ${during}`);
      expect((await tx`select id from core.credential_full where id = ${during}`).length).toBe(0);
    });
  });

  it('the holder reads their own number through credential_full', async () => {
    await inTx(async (tx) => {
      const { worker } = await mkEmployer(tx);
      const num = `N-${randomUUID()}`;
      const c = await mkCredential(tx, worker, '1 month', num);
      await actAs(tx, { orgId: null, personId: worker });
      const [r] = await tx<{ number: string }[]>`select number from core.credential_full where id = ${c}`;
      expect(r!.number).toBe(num);
    });
  });

  it('end_employment closes the stint AND sets membership left; the former employer then sees 0 credentials', async () => {
    await inTx(async (tx) => {
      const { org, owner, worker } = await mkEmployer(tx);
      await mkCredential(tx, worker, '6 months');
      await tx`select core.end_employment(${worker}, ${org}, 'resigned')`;
      await tx`
        insert into core.credential (holder_party_id, credential_type, issuer, issued_at, verification_class)
        values (${worker}, 'ASD', 'IICRC', now() + interval '1 day', 'SELF_REPORTED')`;
      const [m] = await tx<{ status: string }[]>`
        select status from core.org_membership where person_party_id = ${worker} and org_party_id = ${org}`;
      expect(m!.status).toBe('left');
      expect(await employerSees(tx, org, owner, worker)).toEqual([]);
      // ...but keeps the employment row as its lawful record.
      await actAs(tx, { orgId: org, personId: owner });
      expect((await tx`select id from core.employment where person_party_id = ${worker}`).length).toBe(1);
    });
  });

  it('a departed worker holding a stale org claim sees none of the org\'s other rows', async () => {
    await inTx(async (tx) => {
      const { org, owner, worker } = await mkEmployer(tx);
      await mkEmployment(tx, owner, org);
      await tx`select core.end_employment(${worker}, ${org}, 'dismissed')`;
      await actAs(tx, { orgId: org, personId: worker });
      expect((await tx`select id from core.employment where person_party_id <> ${worker}`).length).toBe(0);
      expect((await tx`select id from core.employment where person_party_id = ${worker}`).length).toBe(1);
    });
  });

  it('MUTANT: an end_employment that skips the membership update leaves the departed worker seeing the org', async () => {
    await inTx(async (tx) => {
      const real = extractFunction('migrations/0006_employment_credential.sql', 'core.end_employment');
      const mutant = real.replace(/update core\.org_membership set status = 'left'[^;]*;/, '');
      expect(mutant).not.toBe(real);
      await tx.unsafe(mutant);
      const { org, owner, worker } = await mkEmployer(tx);
      await mkEmployment(tx, owner, org);
      await tx`select core.end_employment(${worker}, ${org}, 'dismissed')`;
      await actAs(tx, { orgId: org, personId: worker });
      expect((await tx`select id from core.employment where person_party_id <> ${worker}`).length).toBe(1);
    });
  });

  it('an ended stint cannot be edited (23000); MUTANT without the trigger it can', async () => {
    await inTx(async (tx) => {
      const { org, worker } = await mkEmployer(tx);
      const [e] = await tx<{ id: string }[]>`select core.end_employment(${worker}, ${org}, 'resigned') as id`;
      const id = e!.id;
      await expectSqlState(tx, '23000', (sp) => sp`update core.employment set role = 'rewritten' where id = ${id}`);
      await tx`drop trigger employment_ended_is_final on core.employment`;
      expect((await tx`update core.employment set role = 'rewritten' where id = ${id} returning id`).length).toBe(1);
    });
  });

  it('at most one open stint per person and org', async () => {
    await inTx(async (tx) => {
      const { org, worker } = await mkEmployer(tx);
      await expectSqlState(tx, '23505', (sp) => sp`
        insert into core.employment (person_party_id, org_party_id, started_at) values (${worker}, ${org}, now())`);
    });
  });

  it('an authenticated caller cannot call end_employment (42501), not even the employer', async () => {
    await inTx(async (tx) => {
      const { org, owner, worker } = await mkEmployer(tx);
      await actAs(tx, { orgId: org, personId: owner });
      await expectSqlState(tx, '42501', (sp) => sp`select core.end_employment(${worker}, ${org}, 'x')`);
    });
  });
});

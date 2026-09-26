// Founder identity rules (RA-7753 slice 1a, SPEC_SLICE1_IDENTITY §14): eligible for CEC is not CEC accepted (rule 2).
//
// Every rule is proven two ways: a NEGATIVE CONTROL (the forbidden action is refused) and a
// MUTANT (the guard is removed inside the same always-rolled-back transaction and the
// forbidden action then SUCCEEDS). A rule whose mutant stays green is a rule the test cannot
// see, so every mutant assertion is part of the suite. Fixture ids are minted fresh per run
// and every transaction rolls back (helpers/tx.ts), so nothing touches the seeded fixtures.
// Each block repeats (REPEATS) so an order- or state-dependent pass fails on a later
// repetition rather than passing by luck (spec §14 rule 10).
// This file is one REQUIRED_EVIDENCE suite in config/ci-evidence-manifest.json, capability
// `cec-separation` — the manifest allows one capability per suite, hence one file per capability.
import { describe, it, expect, afterAll } from 'vitest';
import { db } from '../../data-access/client.js';
import { inTx, expectSqlState, type Tx } from './helpers/tx.js';
import { mkPerson } from './helpers/fixtures.js';

const hasDb = !!process.env.SPINE_DATABASE_URL;
const REPEATS = { repeats: 2 };

// Seed fixtures (seed/0001_seed.sql).
const COURSE = '0f000000-0000-0000-0000-000000000001';

afterAll(async () => {
  if (hasDb) await db().end({ timeout: 5 });
});

// ── Rule 2: eligible for CEC ≠ CEC accepted ──────────────────────────────────────────────
describe.skipIf(!hasDb)('rule 2: eligible ≠ accepted', REPEATS, () => {
  async function mkEnrollment(tx: Tx): Promise<string> {
    const p = await mkPerson(tx, 'learner');
    const [r] = await tx<{ id: string }[]>`
      insert into carsi.enrollment (person_party_id, course_id, status, completed_at)
      values (${p}, ${COURSE}, 'completed', now()) returning id`;
    return r!.id;
  }

  it('eligible_at alone leaves accepted_at null', async () => {
    await inTx(async (tx) => {
      const en = await mkEnrollment(tx);
      const [c] = await tx<{ accepted_at: string | null }[]>`
        insert into carsi.cec_claim (enrollment_id, recognising_body, eligibility_basis, eligible_at)
        values (${en}, 'IICRC', 'course completion', now()) returning accepted_at`;
      expect(c!.accepted_at).toBeNull();
    });
  });

  it('accepted_at without evidence + body reference is refused (23514), each missing piece alone', async () => {
    await inTx(async (tx) => {
      const en = await mkEnrollment(tx);
      const full = { evidence_submitted_at: new Date(), acceptance_evidence_ref: 'evidence/acc/1', body_reference: 'IICRC-REF-1' };
      for (const drop of Object.keys(full) as (keyof typeof full)[]) {
        const v = { ...full, [drop]: null };
        await expectSqlState(tx, '23514', (sp) => sp`
          insert into carsi.cec_claim (enrollment_id, recognising_body, eligible_at, accepted_at,
                                       evidence_submitted_at, acceptance_evidence_ref, body_reference)
          values (${en}, 'IICRC', now(), now(), ${v.evidence_submitted_at}, ${v.acceptance_evidence_ref}, ${v.body_reference})`);
      }
    });
  });

  it('nothing derives acceptance: carsi.cec_claim carries no triggers', async () => {
    await inTx(async (tx) => {
      const [r] = await tx<{ n: number }[]>`
        select count(*)::int as n from pg_trigger where tgrelid = 'carsi.cec_claim'::regclass and not tgisinternal`;
      expect(r!.n).toBe(0);
    });
  });

  it('MUTANT: with the CHECK dropped, an unevidenced acceptance lands', async () => {
    await inTx(async (tx) => {
      await tx`alter table carsi.cec_claim drop constraint cec_accepted_needs_evidence`;
      const en = await mkEnrollment(tx);
      const rows = await tx`
        insert into carsi.cec_claim (enrollment_id, recognising_body, eligible_at, accepted_at)
        values (${en}, 'IICRC', now(), now()) returning id`;
      expect(rows.length).toBe(1);
    });
  });
});

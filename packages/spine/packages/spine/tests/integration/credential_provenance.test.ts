// Founder identity rules (RA-7753 slice 1a, SPEC_SLICE1_IDENTITY §14): credential provenance — verified needs evidence (rule 1), reused numbers flagged (rule 5).
//
// Every rule is proven two ways: a NEGATIVE CONTROL (the forbidden action is refused) and a
// MUTANT (the guard is removed inside the same always-rolled-back transaction and the
// forbidden action then SUCCEEDS). A rule whose mutant stays green is a rule the test cannot
// see, so every mutant assertion is part of the suite. Fixture ids are minted fresh per run
// and every transaction rolls back (helpers/tx.ts), so nothing touches the seeded fixtures.
// Each block repeats (REPEATS) so an order- or state-dependent pass fails on a later
// repetition rather than passing by luck (spec §14 rule 10).
// This file is one REQUIRED_EVIDENCE suite in config/ci-evidence-manifest.json, capability
// `credential-provenance` — the manifest allows one capability per suite, hence one file per capability.
import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../../data-access/client.js';
import { inTx, expectSqlState, type Tx } from './helpers/tx.js';
import { mkPerson, mkCredential } from './helpers/fixtures.js';

const hasDb = !!process.env.SPINE_DATABASE_URL;
const REPEATS = { repeats: 2 };

afterAll(async () => {
  if (hasDb) await db().end({ timeout: 5 });
});

// ── Rule 1: a verified credential needs evidence ─────────────────────────────────────────
describe.skipIf(!hasDb)('rule 1: verified needs evidence', REPEATS, () => {
  it('ISSUER_VERIFIED and REGISTRY_VERIFIED without evidence are refused (23514)', async () => {
    await inTx(async (tx) => {
      const h = await mkPerson(tx, 'holder');
      for (const cls of ['ISSUER_VERIFIED', 'REGISTRY_VERIFIED']) {
        await expectSqlState(tx, '23514', (sp) => sp`
          insert into core.credential (holder_party_id, credential_type, issuer, verification_class)
          values (${h}, 'WRT', 'IICRC', ${cls})`);
      }
    });
  });

  it('upgrading SELF_REPORTED → ISSUER_VERIFIED without evidence is refused (23514)', async () => {
    await inTx(async (tx) => {
      const h = await mkPerson(tx, 'holder');
      const c = await mkCredential(tx, h, '1 month');
      await expectSqlState(tx, '23514', (sp) => sp`
        update core.credential set verification_class = 'ISSUER_VERIFIED', verified_at = now() where id = ${c}`);
    });
  });

  it('a URL is refused as evidence_ref (opaque keys only)', async () => {
    await inTx(async (tx) => {
      const h = await mkPerson(tx, 'holder');
      await expectSqlState(tx, '23514', (sp) => sp`
        insert into core.credential (holder_party_id, credential_type, issuer, verification_class, verified_at, verification_method, evidence_ref)
        values (${h}, 'WRT', 'IICRC', 'ISSUER_VERIFIED', now(), 'issuer-portal', 'https://example.invalid/cert.pdf')`);
    });
  });

  it('with verified_at + method + evidence_ref, ISSUER_VERIFIED is accepted', async () => {
    await inTx(async (tx) => {
      const h = await mkPerson(tx, 'holder');
      const rows = await tx`
        insert into core.credential (holder_party_id, credential_type, issuer, verification_class, verified_at, verification_method, evidence_ref)
        values (${h}, 'WRT', 'IICRC', 'ISSUER_VERIFIED', now(), 'issuer-portal', 'evidence/2026/abc123') returning id`;
      expect(rows.length).toBe(1);
    });
  });

  it('MUTANT: with the CHECK dropped, an unevidenced ISSUER_VERIFIED lands', async () => {
    await inTx(async (tx) => {
      await tx`alter table core.credential drop constraint credential_verified_needs_evidence`;
      const h = await mkPerson(tx, 'holder');
      const rows = await tx`
        insert into core.credential (holder_party_id, credential_type, issuer, verification_class)
        values (${h}, 'WRT', 'IICRC', 'ISSUER_VERIFIED') returning id`;
      expect(rows.length).toBe(1);
    });
  });
});

// ── Rule 5: a reused credential number goes to human review, and flags only ──────────────
describe.skipIf(!hasDb)('rule 5: credential number anomaly', REPEATS, () => {
  async function reuseRows(tx: Tx, a: string, b: string): Promise<{ reason: string }[]> {
    return tx<{ reason: string }[]>`
      select reason from core.identity_audit
      where action = 'review_pending' and reason like 'CREDENTIAL_NUMBER_REUSE%'
        and party_id in (${a}, ${b}) and other_party_id in (${a}, ${b})`;
  }

  it('the same type/issuer/number on two holders → exactly 1 review row; both stay active; no number in the row', async () => {
    await inTx(async (tx) => {
      const h1 = await mkPerson(tx, 'h1');
      const h2 = await mkPerson(tx, 'h2');
      const num = `n-${randomUUID()}`;
      await mkCredential(tx, h1, '1 year', num);
      await mkCredential(tx, h2, '1 month', num.toUpperCase());
      const rows = await reuseRows(tx, h1, h2);
      expect(rows.length).toBe(1);
      expect(rows[0]!.reason.toLowerCase()).not.toContain(num);
      const st = await tx<{ status: string }[]>`select status from core.credential where holder_party_id in (${h1}, ${h2})`;
      expect(st.map((s) => s.status)).toEqual(['active', 'active']);
    });
  });

  it('false-positive control: the same holder renewing the same number → 0 rows', async () => {
    await inTx(async (tx) => {
      const h1 = await mkPerson(tx, 'h1');
      const num = `n-${randomUUID()}`;
      await mkCredential(tx, h1, '2 years', num);
      await mkCredential(tx, h1, '1 month', num);
      const [r] = await tx<{ n: number }[]>`
        select count(*)::int as n from core.identity_audit where party_id = ${h1} and reason like 'CREDENTIAL_NUMBER_REUSE%'`;
      expect(r!.n).toBe(0);
    });
  });

  it('MUTANT: with the trigger dropped, reuse goes unflagged', async () => {
    await inTx(async (tx) => {
      await tx`drop trigger credential_number_anomaly on core.credential`;
      const h1 = await mkPerson(tx, 'h1');
      const h2 = await mkPerson(tx, 'h2');
      const num = `n-${randomUUID()}`;
      await mkCredential(tx, h1, '1 year', num);
      await mkCredential(tx, h2, '1 month', num);
      expect((await reuseRows(tx, h1, h2)).length).toBe(0);
    });
  });
});

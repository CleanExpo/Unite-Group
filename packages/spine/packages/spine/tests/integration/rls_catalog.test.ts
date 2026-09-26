// RLS and grant catalog checks (RA-7753 slice 1a, spec §14 rules 7 and 8).
//
// DISCOVERY-BASED on purpose: rule 7 enumerates every table the catalog holds in the spine
// schemas rather than a list written today, so a table added tomorrow without FORCE RLS
// fails here without anyone remembering to extend a list. Each check carries a mutant that
// breaks the property inside an always-rolled-back transaction and proves the check sees it.
import { describe, it, expect, afterAll } from 'vitest';
import { db } from '../../data-access/client.js';
import { inTx, type Tx } from './helpers/tx.js';

const hasDb = !!process.env.SPINE_DATABASE_URL;
const REPEATS = { repeats: 2 };
const SCHEMAS = ['core', 'marketing', 'leadgen', 'onboarding', 'nrpg', 'carsi', 'field', 'sales'];
const NEW_TABLES = ['core.employment', 'core.credential', 'carsi.cec_claim'];
const NEW_FUNCTIONS = [
  'core.end_employment(uuid,uuid,text)',
  'core.employment_ended_is_final()',
  'core.credential_number_anomaly()',
  'core.party_visible_nonfield(uuid)',
];

afterAll(async () => {
  if (hasDb) await db().end({ timeout: 5 });
});

async function spineTables(tx: Tx): Promise<{ name: string; rls: boolean; force: boolean }[]> {
  return tx<{ name: string; rls: boolean; force: boolean }[]>`
    select n.nspname || '.' || c.relname as name, c.relrowsecurity as rls, c.relforcerowsecurity as force
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = any(${SCHEMAS}) and c.relkind = 'r'
    order by 1`;
}
async function unprotected(tx: Tx): Promise<string[]> {
  return (await spineTables(tx)).filter((t) => !t.rls || !t.force).map((t) => t.name);
}

describe.skipIf(!hasDb)('rule 7: every spine table has RLS enabled AND forced', REPEATS, () => {
  it('the catalog scan sees every spine table, new ones included (positive control)', async () => {
    await inTx(async (tx) => {
      const names = (await spineTables(tx)).map((t) => t.name);
      expect(names.length).toBe(23);
      for (const t of NEW_TABLES) expect(names).toContain(t);
    });
  });

  it('no spine table lacks relrowsecurity or relforcerowsecurity', async () => {
    await inTx(async (tx) => {
      expect(await unprotected(tx)).toEqual([]);
    });
  });

  it('MUTANT: `no force row level security` on core.credential is caught', async () => {
    await inTx(async (tx) => {
      await tx`alter table core.credential no force row level security`;
      expect(await unprotected(tx)).toEqual(['core.credential']);
    });
  });
});

describe.skipIf(!hasDb)('rule 8: grants on the new surface are SELECT-only and narrow', REPEATS, () => {
  async function tablePriv(tx: Tx, role: string, table: string, priv: string): Promise<boolean> {
    const [r] = await tx<{ ok: boolean }[]>`select has_table_privilege(${role}, ${table}, ${priv}) as ok`;
    return r!.ok;
  }
  async function numberReadable(tx: Tx, role: string): Promise<boolean> {
    const [r] = await tx<{ ok: boolean }[]>`select has_column_privilege(${role}, 'core.credential', 'number', 'SELECT') as ok`;
    return r!.ok;
  }

  it('authenticated and anon cannot INSERT, UPDATE or DELETE any new table', async () => {
    await inTx(async (tx) => {
      for (const role of ['authenticated', 'anon']) {
        for (const t of NEW_TABLES) {
          for (const p of ['INSERT', 'UPDATE', 'DELETE']) {
            expect(await tablePriv(tx, role, t, p), `${role} ${p} ${t}`).toBe(false);
          }
        }
      }
    });
  });

  it('authenticated may SELECT the new tables; anon may not', async () => {
    await inTx(async (tx) => {
      for (const t of ['core.employment', 'carsi.cec_claim']) {
        expect(await tablePriv(tx, 'authenticated', t, 'SELECT')).toBe(true);
        expect(await tablePriv(tx, 'anon', t, 'SELECT')).toBe(false);
      }
    });
  });

  it('the credential number column is not readable by authenticated or anon', async () => {
    await inTx(async (tx) => {
      expect(await numberReadable(tx, 'authenticated')).toBe(false);
      expect(await numberReadable(tx, 'anon')).toBe(false);
    });
  });

  it('MUTANT: a blanket `grant select on core.credential` (e.g. re-running 0004) is caught', async () => {
    await inTx(async (tx) => {
      await tx`grant select on core.credential to authenticated`;
      expect(await numberReadable(tx, 'authenticated')).toBe(true);
    });
  });

  it('no new function is executable by anon; end_employment is service_role only', async () => {
    await inTx(async (tx) => {
      for (const fn of NEW_FUNCTIONS) {
        const [r] = await tx<{ ok: boolean }[]>`select has_function_privilege('anon', ${fn}, 'EXECUTE') as ok`;
        expect(r!.ok, `anon EXECUTE ${fn}`).toBe(false);
      }
      const [a] = await tx<{ ok: boolean }[]>`select has_function_privilege('authenticated', 'core.end_employment(uuid,uuid,text)', 'EXECUTE') as ok`;
      const [s] = await tx<{ ok: boolean }[]>`select has_function_privilege('service_role', 'core.end_employment(uuid,uuid,text)', 'EXECUTE') as ok`;
      expect(a!.ok).toBe(false);
      expect(s!.ok).toBe(true);
    });
  });

  it('every new SECURITY DEFINER function pins search_path to empty', async () => {
    await inTx(async (tx) => {
      const rows = await tx<{ fn: string; cfg: string[] | null }[]>`
        select p.oid::regprocedure::text as fn, p.proconfig as cfg
        from pg_proc p where p.prosecdef and p.oid = any(${NEW_FUNCTIONS}::regprocedure[])`;
      expect(rows.length).toBeGreaterThanOrEqual(3);
      for (const r of rows) expect(r.cfg, r.fn).toContain('search_path=""');
    });
  });
});

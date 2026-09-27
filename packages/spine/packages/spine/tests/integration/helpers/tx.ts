// Shared helpers for the RA-7753 rule suites (identity_rules, rls_catalog).
// Every helper here keeps work inside a transaction that is ALWAYS rolled back.
import { expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type postgres from 'postgres';
import { db } from '../../../data-access/client.js';
import { buildClaims } from '../../../data-access/internal.js';
import type { RlsContext } from '../../../types/database.js';

export type Tx = postgres.TransactionSql;
export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ROLLBACK = Symbol('rollback');

/** Run fn in a transaction that is ALWAYS rolled back, whatever fn does. */
export async function inTx(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await db().begin(async (tx) => {
      await fn(tx);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
}

/** Become an RLS-scoped caller for the rest of the transaction (same as withRls). */
export async function actAs(tx: Tx, ctx: RlsContext): Promise<void> {
  await tx`select set_config('request.jwt.claims', ${buildClaims(ctx)}, true)`;
  await tx`set local role authenticated`;
}

/** Back to the connection's own role (postgres: owner, BYPASSRLS) — for fixtures and mutants. */
export async function actAsOwner(tx: Tx): Promise<void> {
  await tx`reset role`;
  await tx`select set_config('request.jwt.claims', '', true)`;
}

/** Expect a statement to fail with a SQLSTATE, inside a savepoint so the tx survives. */
export async function expectSqlState(tx: Tx, code: string, fn: (sp: Tx) => Promise<unknown>): Promise<void> {
  let err: { code?: string } | undefined;
  try {
    await tx.savepoint(async (sp) => {
      await fn(sp);
    });
  } catch (e) {
    err = e as { code?: string };
  }
  expect(err?.code, `expected SQLSTATE ${code}`).toBe(code);
}

/** Pull one `create or replace function <name>(...) ... end $$;` block out of a SQL file. */
export function extractFunction(file: string, name: string): string {
  const src = readFileSync(join(root, file), 'utf8');
  const start = src.indexOf(`create or replace function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in ${file}`);
  const bodyOpen = src.indexOf('$$', start);
  const bodyClose = src.indexOf('$$', bodyOpen + 2);
  return src.slice(start, bodyClose + 3);
}

import postgres from 'postgres';
import type { RlsContext } from '../types/database.js';
import { buildClaims } from './internal.js';

let _sql: postgres.Sql | undefined;

// Lazily-initialised pooled connection. Throws only when first USED without config,
// so the module can be imported (e.g. by skipped integration suites) without a DB.
export function db(): postgres.Sql {
  if (!_sql) {
    const url = process.env.SPINE_DATABASE_URL;
    if (!url) throw new Error('SPINE_DATABASE_URL is required for the spine DAL');
    _sql = postgres(url, { max: 10, prepare: false });
  }
  return _sql;
}

// Run `fn` inside a transaction scoped to the caller's RLS identity: set the JWT claims
// + the `authenticated` role so EVERY query is row-level-security filtered by org.
export async function withRls<T>(
  ctx: RlsContext,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  const claims = buildClaims(ctx);
  const result = await db().begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    await tx`set local role authenticated`;
    return fn(tx);
  });
  return result as unknown as T;
}

// Service path — BYPASSES RLS. Restricted to migration / backfill / maintenance jobs only.
export async function asService<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  const result = await db().begin((tx) => fn(tx));
  return result as unknown as T;
}

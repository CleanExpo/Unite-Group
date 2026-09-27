// Unit tests for the prod-impossibility guard, plus the fixture hygiene scan.
// No database needed except the one sentinel case, which is gated like every other
// integration assertion and runs in CI where SPINE_DATABASE_URL is the loopback stack.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { assertEphemeralUrl, assertSentinel } from '../setup/ephemeral-guard.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('ephemeral guard: URL checks', () => {
  it('accepts the loopback CI stack on 54322', () => {
    expect(() => assertEphemeralUrl('X', 'postgresql://postgres:postgres@127.0.0.1:54322/postgres')).not.toThrow();
    expect(() => assertEphemeralUrl('X', 'postgresql://postgres:postgres@localhost:54322/spine_migrations')).not.toThrow();
    expect(() => assertEphemeralUrl('X', 'postgresql://postgres:postgres@[::1]:54322/postgres')).not.toThrow();
  });

  it('refuses a pooler-shaped hosted URL, and never echoes its password', () => {
    const url = 'postgresql://postgres.abcdefghijklmnopqrst:PLACEHOLDER-NOT-A-SECRET@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';
    expect(() => assertEphemeralUrl('X', url)).toThrow(/hosted database/);
    try {
      assertEphemeralUrl('X', url);
    } catch (e) {
      expect(String(e)).not.toContain('PLACEHOLDER-NOT-A-SECRET');
    }
  });

  it('refuses any known project ref even behind a loopback-looking tunnel', () => {
    expect(() => assertEphemeralUrl('X', 'postgresql://u:p@127.0.0.1:54322/lksfwktwtmyznckodsau')).toThrow(/hosted/);
  });

  it('refuses a non-loopback host', () => {
    expect(() => assertEphemeralUrl('X', 'postgresql://u:p@10.0.0.5:54322/postgres')).toThrow(/not loopback/);
  });

  it('refuses the wrong port (e.g. a plain local 5432 that the bootstrap did not build)', () => {
    expect(() => assertEphemeralUrl('X', 'postgresql://u:p@127.0.0.1:5432/postgres')).toThrow(/port/);
  });

  it('refuses an unparseable URL', () => {
    expect(() => assertEphemeralUrl('X', 'not a url')).toThrow(/parseable/);
  });
});

const hasDb = !!process.env.SPINE_DATABASE_URL;

describe.skipIf(!hasDb)('ephemeral guard: sentinel check (integration)', () => {
  it('passes on the bootstrapped database and refuses the same database once the sentinel is gone', async () => {
    const sql = postgres(process.env.SPINE_DATABASE_URL!, { max: 1, prepare: false, onnotice: () => {} });
    try {
      await assertSentinel('X', sql);
      // Negative control: drop the sentinel inside a transaction that ALWAYS rolls back —
      // the callback throws on both paths, so the drop can never commit.
      await expect(
        sql.begin(async (tx) => {
          await tx`drop table public.spine_ephemeral_sentinel`;
          let refused: unknown;
          try {
            await assertSentinel('X', tx);
          } catch (e) {
            refused = e;
          }
          throw refused ?? new Error('guard ACCEPTED a sentinel-less database');
        }),
      ).rejects.toThrow(/no public\.spine_ephemeral_sentinel/);
      await assertSentinel('X', sql); // and it is back
    } finally {
      await sql.end({ timeout: 5 });
    }
  });
});

// Fixture hygiene (spec §12): fixture emails only on .test/.invalid (or the local
// postgres@localhost role); no bcrypt hashes, TOTP seeds or JWT-shaped tokens anywhere
// a fixture lives.
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('fixture hygiene scan', () => {
  const files = [...walk(join(root, 'tests')), ...walk(join(root, 'seed'))].filter((f) =>
    /\.(ts|sql)$/.test(f) && !f.endsWith('ephemeral-guard.test.ts'),
  );

  it('scans a non-empty fixture set (positive control on the scan itself)', () => {
    expect(files.length).toBeGreaterThan(5);
    expect(files.some((f) => f.endsWith('0001_seed.sql'))).toBe(true);
  });

  it('every fixture email is on a reserved test domain', () => {
    const bad: string[] = [];
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*/g)) {
        const e = m[0].toLowerCase();
        if (e === 'postgres@localhost') continue;
        if (!/\.(test|invalid)$/.test(e)) bad.push(`${f}: ${e}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('no bcrypt, TOTP or JWT-shaped strings in fixtures', () => {
    const patterns = [/\$2[aby]\$\d{2}\$/, /otpauth:\/\//i, /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}/];
    const bad = files.filter((f) => patterns.some((p) => p.test(readFileSync(f, 'utf8'))));
    expect(bad).toEqual([]);
  });
});

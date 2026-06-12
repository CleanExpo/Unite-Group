// TRUE two-session relayer race for the dual-write outbox (strangler/0003).
//
// The raw-SQL suite's T4 drains 50 events through two relay_batch CALLS on ONE connection —
// the skip-locked claim + per-entity ordering guard + receipt PK are correct by construction
// there, never under real contention (the suite says so itself). This suite runs
// migrate.relay_batch('vitest-r1') and ('vitest-r2') CONCURRENTLY on two pooled connections —
// two real sessions, two open transactions — so `for update skip locked`, the per-entity
// in-order guard (a later same-key event must wait for the earlier one's COMMIT), and the
// exactly-once receipt are exercised under genuine lock contention.
//
// Fixture: 12 keys × 5 ordered versions = 60 upsert events, distinct emails per version so
// the in-order guard is observable (the LAST version's email must win on every key).
// Self-skips without SPINE_DATABASE_URL, or when the strangler harness is not applied
// (migrate.outbox is optional rehearsal machinery, not part of migrations/0001..0005).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { asService } from '../../data-access/client.js';

const hasDb = !!process.env.SPINE_DATABASE_URL;
const SYSTEM = 'vitest-race';
const KEYS = 12;
const VERSIONS = 5;
const EVENTS = KEYS * VERSIONS;

const hasOutbox = hasDb
  ? await asService(async (tx) => {
      const rows = await tx<{ ok: boolean }[]>`select to_regclass('migrate.outbox') is not null as ok`;
      return rows[0]!.ok;
    })
  : false;

async function cleanup(): Promise<void> {
  await asService(async (tx) => {
    const partyRows = await tx<{ party_id: string }[]>`
      select party_id from core.source_record where source_system = ${SYSTEM}`;
    const ids = partyRows.map((r) => r.party_id);
    await tx`delete from migrate.shadow_diff where source_system = ${SYSTEM}`;
    await tx`delete from migrate.outbox_dead where source_system = ${SYSTEM}`;
    await tx`delete from migrate.outbox where source_system = ${SYSTEM}`; // receipts cascade
    await tx`delete from core.source_record where source_system = ${SYSTEM}`;
    await tx`delete from migrate.source_party where source_system = ${SYSTEM}`;
    if (ids.length > 0) {
      await tx`delete from core.identity_audit where party_id = any(${ids}) or other_party_id = any(${ids})`;
      await tx`delete from core.party_identifier where party_id = any(${ids})`;
      await tx`delete from core.person where party_id = any(${ids})`;
      await tx`delete from core.party where party_id = any(${ids})`;
    }
  });
}

// One relayer pass in its OWN transaction on its OWN pooled connection.
async function relay(name: string): Promise<number> {
  return asService(async (tx) => {
    const hist = await tx<{ resolution: string; n: string }[]>`
      select * from migrate.relay_batch(${name}, 10, ${SYSTEM})`;
    return hist.reduce((s, r) => s + Number(r.n), 0);
  });
}

describe.skipIf(!hasDb || !hasOutbox)('outbox two-relayer concurrency race (integration)', () => {
  // Filled by the drain in beforeAll; asserted in the its below.
  let bothActiveTicks = 0;
  let ticks = 0;

  beforeAll(async () => {
    await cleanup(); // tolerate a previously-aborted run
    await asService(async (tx) => {
      for (let k = 0; k < KEYS; k++) {
        for (let v = 1; v <= VERSIONS; v++) {
          await tx`select migrate.enqueue(${SYSTEM}, ${'k' + k}, 'upsert',
            ${JSON.stringify({ kind: 'person', display_name: 'Race P' + k, email: `p${k}-v${v}@race.test` })}::jsonb,
            ${`race-${k}-${v}`})`;
        }
      }
    });

    // The race: both relayers fire in the same tick (Promise.all → two concurrent
    // transactions). Small batch limit (10) maximises re-contention across ticks.
    // Later same-key events skipped by the in-order guard (their predecessor is
    // uncommitted in the other session) stay pending and drain on a later tick.
    for (ticks = 0; ticks < 30; ticks++) {
      const [a, b] = await Promise.all([relay('vitest-r1'), relay('vitest-r2')]);
      if (a > 0 && b > 0) bothActiveTicks++;
      const pending = await asService(async (tx) => {
        const rows = await tx<{ pending: number }[]>`
          select count(*)::int as pending from migrate.outbox
          where source_system = ${SYSTEM} and status = 'pending'`;
        return rows[0]!.pending;
      });
      if (pending === 0) break;
    }
  }, 180_000);

  afterAll(async () => {
    await cleanup();
  }, 60_000);

  it('drains every event to done — no wedge, no dead-letter', async () => {
    const rows = await asService(async (tx) => tx<{ status: string; n: string }[]>`
      select status, count(*) as n from migrate.outbox
      where source_system = ${SYSTEM} group by status`);
    expect(rows).toEqual([{ status: 'done', n: String(EVENTS) }]);
    const dead = await asService(async (tx) => tx<{ n: string }[]>`
      select count(*) as n from migrate.outbox_dead where source_system = ${SYSTEM}`);
    expect(Number(dead[0]!.n)).toBe(0);
  });

  it('both relayers actually claimed events — the race was exercised, not vacuous', async () => {
    const rows = await asService(async (tx) => tx<{ locked_by: string }[]>`
      select distinct locked_by from migrate.outbox
      where source_system = ${SYSTEM} and locked_by is not null`);
    const relayers = rows.map((r) => r.locked_by).sort();
    expect(relayers).toEqual(['vitest-r1', 'vitest-r2']);
    expect(bothActiveTicks).toBeGreaterThan(0); // ≥1 tick where BOTH processed work concurrently
  });

  it('exactly-once: one receipt per event, none missing, none duplicated', async () => {
    const rows = await asService(async (tx) => tx<{ events: string; receipts: string; missing: string }[]>`
      select
        (select count(*) from migrate.outbox o where o.source_system = ${SYSTEM}) as events,
        (select count(*) from migrate.outbox_receipt r
           join migrate.outbox o on o.event_id = r.event_id
           where o.source_system = ${SYSTEM}) as receipts,
        (select count(*) from migrate.outbox o
           where o.source_system = ${SYSTEM}
             and not exists (select 1 from migrate.outbox_receipt r where r.event_id = o.event_id)) as missing`);
    expect(Number(rows[0]!.events)).toBe(EVENTS);
    expect(Number(rows[0]!.receipts)).toBe(EVENTS); // receipt PK makes >1/event impossible; this pins =1
    expect(Number(rows[0]!.missing)).toBe(0);
  });

  it('no orphan re-mint or identity split: each key → exactly one party, 12 total', async () => {
    const perKey = await asService(async (tx) => tx<{ source_pk: string; parties: string }[]>`
      select source_pk, count(distinct party_id) as parties
      from core.source_record where source_system = ${SYSTEM} group by source_pk`);
    expect(perKey.length).toBe(KEYS);
    for (const row of perKey) expect(Number(row.parties)).toBe(1);
    const total = await asService(async (tx) => tx<{ n: string }[]>`
      select count(distinct party_id) as n from core.source_record where source_system = ${SYSTEM}`);
    expect(Number(total[0]!.n)).toBe(KEYS);
  });

  it('per-entity in-order apply held under contention: the LAST version wins every key', async () => {
    const rows = await asService(async (tx) => tx<{ source_pk: string; email: string }[]>`
      select sr.source_pk, pe.email
      from core.source_record sr join core.person pe on pe.party_id = sr.party_id
      where sr.source_system = ${SYSTEM} order by sr.source_pk`);
    expect(rows.length).toBe(KEYS);
    for (const row of rows) {
      const k = row.source_pk.slice(1); // 'k7' → '7'
      expect(row.email).toBe(`p${k}-v${VERSIONS}@race.test`);
    }
  });

  it('parity gate is GREEN after the race (no unexplained diff, no orphan, nothing pending/dead)', async () => {
    await asService(async (tx) => tx`select * from migrate.shadow_scan(${SYSTEM})`);
    const rows = await asService(async (tx) => tx<{ parity_ok: boolean; orphan_parties: string; unexplained_diffs: string }[]>`
      select parity_ok, orphan_parties, unexplained_diffs from migrate.shadow_summary(${SYSTEM})`);
    expect(Number(rows[0]!.orphan_parties)).toBe(0);
    expect(Number(rows[0]!.unexplained_diffs)).toBe(0);
    expect(rows[0]!.parity_ok).toBe(true);
  }, 30_000);
});

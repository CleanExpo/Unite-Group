// Relayer worker — drains migrate.outbox for ONE source system (Phase B of
// docs/CUTOVER-RUNBOOK-restoreassist.md). Run TWO instances with distinct
// RELAYER_NAME to reproduce the proven two-relayer contention shape
// (tests/integration/outbox_race.test.ts); exactly-once is guaranteed by the
// harness (receipt PK + skip-locked claim + per-entity in-order guard), not here.
//
// Env:
//   SPINE_DATABASE_URL  required (service-role / BYPASSRLS direct connection)
//   SOURCE_SYSTEM       required, e.g. 'restoreassist'
//   RELAYER_NAME        default 'relayer-<pid>'
//   RELAY_BATCH         default 50
//   RELAY_INTERVAL_MS   default 5000 (idle sleep between ticks)
//   RELAY_ONCE          '1' = drain to pending=0 then exit (0 ok; 2 if dead>0)
import { asService, db } from '../data-access/client.js';

const system = process.env.SOURCE_SYSTEM;
if (!system) {
  console.error('SOURCE_SYSTEM is required');
  process.exit(1);
}
const name = process.env.RELAYER_NAME ?? `relayer-${process.pid}`;
const batch = Number(process.env.RELAY_BATCH ?? 50);
const intervalMs = Number(process.env.RELAY_INTERVAL_MS ?? 5000);
const once = process.env.RELAY_ONCE === '1';

let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

interface Counts { pending: number; dead: number; }

async function tick(): Promise<{ applied: number; counts: Counts }> {
  const hist = await asService(async (tx) => tx<{ resolution: string; n: string }[]>`
    select * from migrate.relay_batch(${name}, ${batch}, ${system})`);
  const applied = hist.reduce((s, r) => s + Number(r.n), 0);
  const counts = await asService(async (tx) => {
    const rows = await tx<{ pending: string; dead: string }[]>`
      select
        count(*) filter (where status = 'pending') as pending,
        count(*) filter (where status = 'dead')    as dead
      from migrate.outbox where source_system = ${system}`;
    return { pending: Number(rows[0]!.pending), dead: Number(rows[0]!.dead) };
  });
  return { applied, counts };
}

let lastDead = 0;
for (;;) {
  const { applied, counts } = await tick();
  if (applied > 0 || counts.dead !== lastDead) {
    console.log(JSON.stringify({ at: new Date().toISOString(), relayer: name, system, applied, ...counts }));
  }
  if (counts.dead > lastDead) {
    console.error(`DEAD-LETTER GROWTH: ${lastDead} -> ${counts.dead} — parity gate stays RED until resolved (migrate.outbox_dead.last_error)`);
  }
  lastDead = counts.dead;

  if (once && counts.pending === 0) {
    await db().end();
    process.exit(counts.dead > 0 ? 2 : 0);
  }
  if (stopping) {
    console.log(`${name}: stopping gracefully`);
    await db().end();
    process.exit(0);
  }
  if (applied === 0) await new Promise((r) => setTimeout(r, intervalMs));
}

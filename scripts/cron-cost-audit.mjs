#!/usr/bin/env node
/**
 * Vercel cron cost audit for apps/web.
 *
 * The crons array in apps/web/vercel.json is the largest RECURRING Vercel cost
 * in this repo, and unlike build time it is invisible: nobody reads a 31-entry
 * schedule list and mentally integrates it into invocations per month. This
 * does that arithmetic, and cross-references each route against its own arming
 * gate.
 *
 * WHAT THE FIRST RUN FOUND (15/08/2026): 31 crons, ~885 invocations/day,
 * ~26,600/month — and the distribution was extremely lopsided. Eight sub-hourly
 * schedules produced ~25,900 of those, i.e. 97.6%. The remaining 23 crons, all
 * daily or weekly, contributed ~640 between them. Any reduction that did not
 * touch the sub-hourly eight was rounding error, which is why the report ranks
 * by volume and calls out the concentration explicitly.
 *
 * ACTED ON: seven of the eight were stepped down — video-status 5→15 min,
 * synthex-monitor / brand-video-dispatch / drip-process 15→30 min,
 * os-health-rollup 15 min→hourly, engagement-monitor and linear-queue-health
 * 30 min→hourly. ~26,559 → ~12,879/month, a 51.5% cut.
 *
 * social-publisher was DELIBERATELY LEFT at 15 minutes. The first pass slowed it
 * too, on the reasoning that it has no per-run `.limit()` and therefore drains
 * its whole backlog. Review on PR #1005 showed that reasoning is wrong, and the
 * correction is the durable lesson here:
 *
 *   The absence of a `.limit()` does not mean a cron is safe to slow.
 *   `maxDuration` is itself an effective per-run cap, and the real hazard is
 *   CLAIM-THEN-FINALISE state. social-publisher sets each row to 'publishing'
 *   BEFORE attempting it and writes the terminal status afterwards, with
 *   maxDuration 60s and no sweep anywhere that re-claims stale 'publishing'
 *   rows. A batch killed at the limit strands every claimed row, because the
 *   next run selects status = 'scheduled'. Halving the cadence doubles the
 *   batch and RAISES that risk.
 *
 * So before slowing any cron, ask in order:
 *   1. Does it select work by a window tied to its own interval? -> do not slow.
 *   2. Does it write a transient status that removes the row from its own
 *      selection query, with no recovery sweep? -> do not slow.
 *   3. Otherwise slowing it delays work but cannot drop it.
 *
 * Question 2 is the one that is easy to miss. video-status is the contrast that
 * makes it concrete: it writes only TERMINAL states after polling, so a killed
 * batch leaves rows in 'generating' to be picked up again.
 *
 * A secondary check, worth far less than expected: some routes return
 * `{ dormant: true }` unless an env flag is set. A dormant route is still
 * invoked on schedule and Vercel still bills the invocation and cold start.
 * But both dormant routes here are on daily schedules — 60 invocations/month
 * total. Correctly fail-closed AND cheap. Reported for completeness, not as a
 * lever. (Had one been on an every-15-minutes schedule it would have been the story; the check earns
 * its place by being able to catch that.)
 *
 * Usage:
 *   node scripts/cron-cost-audit.mjs           # human-readable report
 *   node scripts/cron-cost-audit.mjs --json    # machine-readable
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { invocationsPerDay } from './lib/cron-schedule.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERCEL_JSON = resolve(repoRoot, 'apps/web/vercel.json');
const API_ROOT = resolve(repoRoot, 'apps/web/src/app');

const asJson = process.argv.includes('--json');

// ── Dormancy detection ───────────────────────────────────────────────────────

/**
 * Resolve a cron path to its route file and look for an arming gate that
 * short-circuits the handler. Matches the `dormant: true` convention used
 * across these routes plus the PI_CEO_WEEKLY_REVIEW_LIVE-style reason field.
 */
function inspectRoute(cronPath) {
  const clean = cronPath.split('?')[0].replace(/^\//, '');
  const candidates = [
    resolve(API_ROOT, clean, 'route.ts'),
    resolve(API_ROOT, clean, 'route.js'),
  ];
  const file = candidates.find((f) => existsSync(f));
  if (!file) return { found: false, dormantGate: null };

  const src = readFileSync(file, 'utf8');
  // The gate is an env comparison that returns early with dormant/unarmed.
  const dormant = /dormant:\s*true/.test(src) || /is not set to|is not true/.test(src);
  const flag = src.match(/process\.env\.([A-Z0-9_]+)\s*!==\s*'(?:true|1)'/)?.[1] ?? null;
  return { found: true, dormantGate: dormant ? (flag ?? 'env-gated') : null };
}

// ── Report ───────────────────────────────────────────────────────────────────

const config = JSON.parse(readFileSync(VERCEL_JSON, 'utf8'));
const crons = config.crons ?? [];
const fnConfig = config.functions ?? {};

/** Best-effort maxDuration for a cron path, for a worst-case duration figure. */
function maxDurationFor(cronPath) {
  const clean = cronPath.split('?')[0].replace(/^\//, '');
  const target = `src/app/${clean}/route.ts`;
  let best = null;
  for (const [pattern, cfg] of Object.entries(fnConfig)) {
    const rx = new RegExp(
      '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '<<>>').replace(/\*/g, '[^/]*').replace(/<<>>/g, '.*') + '$',
    );
    if (rx.test(target)) {
      // Most specific (longest) pattern wins, mirroring Vercel's resolution.
      if (!best || pattern.length > best.pattern.length) best = { pattern, ...cfg };
    }
  }
  return best?.maxDuration ?? null;
}

const rows = crons.map((c) => {
  const perDay = invocationsPerDay(c.schedule);
  const route = inspectRoute(c.path);
  return {
    path: c.path,
    schedule: c.schedule,
    perDay,
    perMonth: perDay === null ? null : Math.round(perDay * 30),
    maxDuration: maxDurationFor(c.path),
    routeFound: route.found,
    dormantGate: route.dormantGate,
  };
});

rows.sort((a, b) => (b.perMonth ?? 0) - (a.perMonth ?? 0));

const totalPerDay = rows.reduce((n, r) => n + (r.perDay ?? 0), 0);
const totalPerMonth = Math.round(totalPerDay * 30);
const dormantRows = rows.filter((r) => r.dormantGate);
const dormantPerMonth = Math.round(dormantRows.reduce((n, r) => n + (r.perDay ?? 0), 0) * 30);
const subHourly = rows.filter((r) => r.perDay !== null && r.perDay > 24);

if (asJson) {
  console.log(JSON.stringify({ totalPerDay, totalPerMonth, dormantPerMonth, rows }, null, 2));
  process.exit(0);
}

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

console.log('═'.repeat(96));
console.log('VERCEL CRON COST AUDIT — apps/web');
console.log('═'.repeat(96));
console.log(`${pad('PATH', 46)} ${pad('SCHEDULE', 14)} ${lpad('/DAY', 7)} ${lpad('/MONTH', 8)} ${lpad('MAXDUR', 7)}  GATE`);
console.log('─'.repeat(96));
for (const r of rows) {
  const gate = r.dormantGate ? `DORMANT (${r.dormantGate})` : r.routeFound ? '' : 'ROUTE NOT FOUND';
  console.log(
    `${pad(r.path.slice(0, 46), 46)} ${pad(r.schedule, 14)} ${lpad(r.perDay?.toFixed(0) ?? '?', 7)} ${lpad(r.perMonth ?? '?', 8)} ${lpad(r.maxDuration ?? '-', 7)}  ${gate}`,
  );
}
console.log('─'.repeat(96));
console.log(`${crons.length} cron jobs`);
console.log(`TOTAL: ~${Math.round(totalPerDay)} invocations/day  ·  ~${totalPerMonth.toLocaleString()}/month`);
console.log('');

// ── Where the volume actually is ─────────────────────────────────────────────
const subHourlyPerMonth = Math.round(subHourly.reduce((n, r) => n + r.perDay, 0) * 30);
const pct = (n) => (totalPerMonth ? Math.round((n / totalPerMonth) * 1000) / 10 : 0);

console.log(
  `CONCENTRATION: ${subHourly.length} sub-hourly cron(s) produce ~${subHourlyPerMonth.toLocaleString()}/month — ${pct(subHourlyPerMonth)}% of all invocations.`,
);
console.log(
  `The other ${rows.length - subHourly.length} crons (daily/weekly) contribute ~${(totalPerMonth - subHourlyPerMonth).toLocaleString()}/month between them.`,
);
console.log('Any change that does not touch the list below is rounding error.');
console.log('');
for (const r of subHourly) {
  console.log(`   • ${pad(r.path, 44)} ${pad(r.schedule, 13)} ${lpad(r.perMonth.toLocaleString(), 7)}/month`);
}
console.log('');
console.log('Halving each of these to the next step down (5→15, 15→30, 30→60) would cut');
const halved = Math.round(subHourly.reduce((n, r) => n + r.perDay / 2, 0) * 30);
console.log(
  `roughly ${halved.toLocaleString()}/month — ~${pct(halved)}% of total volume — WITHOUT touching the daily crons.`,
);
console.log('Whether each can tolerate the added latency is a product call, not a cost call:');
console.log('a publisher queue or a video-status poller may genuinely need the tighter loop.');
console.log('');
console.log(`Dormant-gated routes still being invoked: ${dormantRows.length}`);
for (const r of dormantRows) {
  console.log(`   • ${r.path} — ${r.schedule} (${r.perMonth}/month) gated on ${r.dormantGate}`);
}
if (dormantRows.length) {
  console.log(
    `   ~${dormantPerMonth.toLocaleString()}/month (${pct(dormantPerMonth)}%) — these fail closed correctly and are all on`,
  );
  console.log('   low-frequency schedules, so they are not a meaningful cost lever today. Listed so');
  console.log('   a future dormant route on a tight schedule gets caught before it runs for a month.');
}
console.log('═'.repeat(96));

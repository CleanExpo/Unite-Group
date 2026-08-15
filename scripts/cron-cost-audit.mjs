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
 * ~26,600/month — and the distribution is extremely lopsided. Eight sub-hourly
 * schedules produce ~25,900 of those, i.e. 97.6%. The remaining 23 crons, all
 * daily or weekly, contribute ~640 between them. Any reduction that does not
 * touch the sub-hourly eight is rounding error, which is why the report ranks
 * by volume and calls out the concentration explicitly.
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

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERCEL_JSON = resolve(repoRoot, 'apps/web/vercel.json');
const API_ROOT = resolve(repoRoot, 'apps/web/src/app');

const asJson = process.argv.includes('--json');

// ── Cron arithmetic ──────────────────────────────────────────────────────────

/** Expand one cron field ("*", "*\/15", "1,3", "2-5") to its set of values. */
function expandField(field, min, max) {
  const out = new Set();
  for (const part of field.split(',')) {
    const [range, stepRaw] = part.split('/');
    const step = stepRaw ? Number(stepRaw) : 1;
    let lo = min;
    let hi = max;
    if (range !== '*') {
      if (range.includes('-')) {
        const [a, b] = range.split('-').map(Number);
        lo = a;
        hi = b;
      } else {
        lo = Number(range);
        hi = stepRaw ? max : lo;
      }
    }
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

/**
 * Invocations per day for a 5-field cron expression.
 *
 * Assumes day-of-month is unrestricted, which holds for every schedule
 * currently in vercel.json (all use `*` there). A schedule that restricts
 * day-of-month is flagged as unsupported rather than silently mis-costed.
 */
function invocationsPerDay(expr) {
  const [minute, hour, dom, month, dow] = expr.trim().split(/\s+/);
  if (dom !== '*' || month !== '*') return null; // don't guess

  const minutes = expandField(minute, 0, 59).size;
  const hours = expandField(hour, 0, 23).size;
  const days = expandField(dow, 0, 6).size; // 7 when '*'

  // Matching minutes per week, averaged to a day.
  return (minutes * hours * days) / 7;
}

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

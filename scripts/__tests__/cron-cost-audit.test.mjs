/**
 * Cron cost audit — arithmetic and detection gates.
 *
 * The audit's whole output is a cost argument, and a cost argument with wrong
 * arithmetic is worse than no argument: it would justify changing a schedule
 * that was never expensive, or leave the expensive one alone. These tests pin
 * the counting against hand-checkable cases.
 *
 * Runs the real script via --json rather than importing internals, so the
 * parsing, matching and reporting path is what gets exercised.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { invocationsPerDay } from '../lib/cron-schedule.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = resolve(repoRoot, 'scripts/cron-cost-audit.mjs');

const report = JSON.parse(
  execFileSync('node', [SCRIPT, '--json'], { cwd: repoRoot, encoding: 'utf8' }),
);
const byPath = new Map(report.rows.map((r) => [r.path, r]));

test('the audit reports a plausible cron set', () => {
  assert.ok(report.rows.length >= 20, `expected the full cron list, got ${report.rows.length}`);
  assert.ok(report.totalPerMonth > 0);
});

test('every configured cron resolves to a real route file', () => {
  // A cron pointing at a path with no route is a scheduled 404 — billed, and
  // silently doing nothing. Catch it here rather than in a Vercel log nobody reads.
  const missing = report.rows.filter((r) => !r.routeFound).map((r) => r.path);
  assert.deepEqual(missing, [], `cron path(s) with no route file: ${missing.join(', ')}`);
});

test('every schedule is costed — none silently unsupported', () => {
  const uncosted = report.rows.filter((r) => r.perDay === null).map((r) => r.path);
  assert.deepEqual(
    uncosted,
    [],
    `schedule(s) the cost model refused to evaluate: ${uncosted.join(', ')}. ` +
      'These are excluded from the totals, so the report would understate spend.',
  );
});

// ── Arithmetic, against FIXED expressions ────────────────────────────────────
// Deliberately synthetic. Pinning these to live vercel.json entries is what
// broke them the first time a schedule legitimately changed.

test('step schedules count correctly', () => {
  // 12 matching minutes x 24 hours = 288. Hand-checkable anchor for the model.
  assert.equal(invocationsPerDay('*/5 * * * *'), 288);
  assert.equal(invocationsPerDay('*/15 * * * *'), 96);
  assert.equal(invocationsPerDay('*/30 * * * *'), 48);
  assert.equal(invocationsPerDay('0 * * * *'), 24);
});

test('a plain daily schedule counts as exactly 1/day', () => {
  assert.equal(invocationsPerDay('0 16 * * *'), 1);
  assert.equal(invocationsPerDay('30 19 * * *'), 1);
});

test('a weekly schedule counts as 1/7 per day, not 1', () => {
  // The failure this guards: treating day-of-week as unrestricted would score a
  // weekly cron at 30/month instead of 4, inflating the daily-cron total ~7x and
  // pointing the whole analysis at the wrong crons.
  assert.ok(Math.abs(invocationsPerDay('0 20 * * 0') - 1 / 7) < 1e-9);
  assert.ok(Math.abs(invocationsPerDay('0 15 * * 1') - 1 / 7) < 1e-9);
});

test('lists and ranges count correctly', () => {
  assert.equal(invocationsPerDay('0,30 * * * *'), 48);
  assert.equal(invocationsPerDay('0 9-17 * * *'), 9);
  assert.equal(invocationsPerDay('0 0 * * 1-5'), 5 / 7);
});

test('schedules that cannot be costed return null rather than a wrong number', () => {
  // Silently mis-costing a restricted schedule would understate spend, so the
  // model refuses and the audit reports the refusal.
  assert.equal(invocationsPerDay('0 0 1 * *'), null, 'day-of-month restricted');
  assert.equal(invocationsPerDay('0 0 * 6 *'), null, 'month restricted');
  assert.equal(invocationsPerDay('0 0 * *'), null, 'malformed — 4 fields');
});

test('the total equals the sum of the parts', () => {
  const summed = report.rows.reduce((n, r) => n + (r.perDay ?? 0), 0);
  assert.ok(Math.abs(summed - report.totalPerDay) < 1e-6, 'reported total must match the rows');
});

test('maxDuration resolution picks the most specific vercel.json pattern', () => {
  // bookkeeper matches both `src/app/api/**/*.ts` (30s) and its own explicit
  // 300s entry. Picking the general one would understate the worst case by 10x.
  assert.equal(byPath.get('/api/cron/bookkeeper').maxDuration, 300);
  // A route with only the generic pattern keeps the generic value.
  assert.equal(byPath.get('/api/cron/overnight-digest').maxDuration, 30);
});

test('dormant-gated routes are detected with their env flag', () => {
  const dormant = report.rows.filter((r) => r.dormantGate);
  assert.ok(dormant.length > 0, 'expected at least one dormant-gated cron');
  const costIngest = byPath.get('/api/cron/cost-ingest');
  assert.equal(costIngest.dormantGate, 'COST_METERING_ENABLED');
});

test('an armed route is not reported as dormant', () => {
  // Negative control: without this, a detector that flagged everything would
  // pass the positive test above and make the dormancy column meaningless.
  assert.equal(byPath.get('/api/cron/bookkeeper').dormantGate, null);
});

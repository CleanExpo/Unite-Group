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

test('every-5-minutes counts as 288/day', () => {
  // 12 matching minutes × 24 hours = 288. Hand-checkable anchor for the model.
  const row = byPath.get('/api/cron/video-status');
  assert.ok(row, 'expected /api/cron/video-status in the config');
  assert.equal(row.schedule, '*/5 * * * *');
  assert.equal(row.perDay, 288);
  assert.equal(row.perMonth, 8640);
});

test('every-15-minutes counts as 96/day and every-30 as 48/day', () => {
  assert.equal(byPath.get('/api/cron/synthex-monitor').perDay, 96);
  assert.equal(byPath.get('/api/cron/engagement-monitor').perDay, 48);
});

test('a plain daily schedule counts as exactly 1/day', () => {
  assert.equal(byPath.get('/api/cron/bookkeeper').perDay, 1);
});

test('a weekly schedule counts as 1/7 per day, not 1', () => {
  // The failure this guards: treating day-of-week as unrestricted would score
  // a weekly cron at 30/month instead of 4, inflating the daily-cron total by
  // ~7x and pointing the whole analysis at the wrong crons.
  const weekly = byPath.get('/api/cron/campaign-engine');
  assert.ok(weekly, 'expected a weekly cron in the config');
  assert.equal(weekly.schedule, '0 20 * * 0');
  assert.ok(
    Math.abs(weekly.perDay - 1 / 7) < 1e-9,
    `weekly cron scored ${weekly.perDay}/day, expected ~0.143`,
  );
  assert.equal(weekly.perMonth, 4);
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

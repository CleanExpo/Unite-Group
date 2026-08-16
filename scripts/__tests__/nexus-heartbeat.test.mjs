import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HEARTBEAT_TITLE,
  buildHeartbeatBody,
  detectDrift,
  upsertHeartbeatIssue,
} from '../nexus-heartbeat.mjs';

const GREEN = [
  { name: 'verify:readiness', status: 'PASS', exitCode: 0 },
  { name: 'verify:docs-watch', status: 'PASS', exitCode: 0 },
  { name: 'verify:docs-review', status: 'PASS', exitCode: 0 },
];
const RED = [
  { name: 'verify:readiness', status: 'FAIL', exitCode: 1 },
  { name: 'verify:docs-watch', status: 'PASS', exitCode: 0 },
  { name: 'verify:docs-review', status: 'PASS', exitCode: 0 },
];

const QUEUE = {
  openCount: 9,
  oldest: { id: 'F2', decision: 'Google OAuth', ageDays: 42, blocks: 'UNI-2329' },
};

/** Minimal stand-in for the issues API; the real client is never used in tests. */
function stubClient(existing = []) {
  const calls = [];
  return {
    calls,
    async listOpenIssues() { return existing; },
    async createIssue(payload) { calls.push({ action: 'create', ...payload }); return { number: 101 }; },
    async updateIssue(number, payload) { calls.push({ action: 'update', number, ...payload }); return { number }; },
  };
}

// ---------------------------------------------------------------------------
// Upsert — one pinned issue, never a stream of new ones
// ---------------------------------------------------------------------------

test('with no existing issue the heartbeat creates exactly one', async () => {
  const client = stubClient([]);
  const result = await upsertHeartbeatIssue({ client, body: 'b' });

  assert.equal(result.action, 'created');
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].action, 'create');
  assert.equal(client.calls[0].title, HEARTBEAT_TITLE);
});

test('an existing issue with the exact title is UPDATED, never duplicated', async () => {
  const client = stubClient([{ number: 77, title: HEARTBEAT_TITLE }]);
  const result = await upsertHeartbeatIssue({ client, body: 'b' });

  assert.equal(result.action, 'updated');
  assert.equal(result.number, 77);
  assert.equal(client.calls.filter((c) => c.action === 'create').length, 0);
});

test('a near-miss title does not count as a match, so the pin stays singular', async () => {
  // Substring matching would treat these as the heartbeat and update the wrong
  // issue; exact matching creates the real one instead.
  const client = stubClient([
    { number: 1, title: `${HEARTBEAT_TITLE} (old)` },
    { number: 2, title: `Re: ${HEARTBEAT_TITLE}` },
    { number: 3, title: HEARTBEAT_TITLE.toLowerCase() },
  ]);
  const result = await upsertHeartbeatIssue({ client, body: 'b' });

  assert.equal(result.action, 'created');
});

test('duplicate exact matches update the lowest-numbered issue deterministically', async () => {
  const client = stubClient([
    { number: 90, title: HEARTBEAT_TITLE },
    { number: 12, title: HEARTBEAT_TITLE },
  ]);
  const result = await upsertHeartbeatIssue({ client, body: 'b' });

  assert.equal(result.action, 'updated');
  assert.equal(result.number, 12);
});

// ---------------------------------------------------------------------------
// The body must report failure as failure
// ---------------------------------------------------------------------------

test('a green run reports every gate as PASS', () => {
  const body = buildHeartbeatBody({ date: '2026-08-16', gates: GREEN, queue: QUEUE, drift: null });

  assert.ok(body.includes('verify:readiness'));
  assert.ok(body.includes('PASS'));
  assert.ok(!body.includes('FAIL'));
});

test('THE UNI-2567 LESSON: a failed gate surfaces as FAIL, never as silence', () => {
  const body = buildHeartbeatBody({ date: '2026-08-16', gates: RED, queue: QUEUE, drift: null });

  assert.ok(body.includes('FAIL'), body);
  assert.ok(body.includes('verify:readiness'), body);
  assert.ok(body.includes('exit 1'), body);
});

test('a gate that did not run is reported as NOT RUN, not omitted and not PASS', () => {
  const body = buildHeartbeatBody({
    date: '2026-08-16',
    gates: [{ name: 'verify:docs-review', status: 'NOT_RUN', exitCode: null }],
    queue: QUEUE,
    drift: null,
  });

  assert.ok(body.includes('NOT RUN'), body);
  assert.ok(!body.includes('PASS'), body);
});

test('the body always names the oldest founder decision and its age', () => {
  const body = buildHeartbeatBody({ date: '2026-08-16', gates: GREEN, queue: QUEUE, drift: null });

  assert.ok(body.includes('F2'), body);
  assert.ok(body.includes('42'), body);
  assert.ok(body.includes('UNI-2329'), body);
});

test('an empty founder queue is stated explicitly rather than left blank', () => {
  const body = buildHeartbeatBody({
    date: '2026-08-16', gates: GREEN, queue: { openCount: 0, oldest: null }, drift: null,
  });
  assert.match(body, /no open founder decisions/i);
});

// ---------------------------------------------------------------------------
// Drift
// ---------------------------------------------------------------------------

test('drift is reported when a gate that passed before now fails', () => {
  const drift = detectDrift(GREEN, RED);
  assert.ok(drift);
  assert.ok(drift.includes('verify:readiness'), drift);
});

test('no drift line when nothing regressed', () => {
  assert.equal(detectDrift(GREEN, GREEN), null);
});

test('a gate recovering from FAIL to PASS is not reported as drift', () => {
  assert.equal(detectDrift(RED, GREEN), null);
});

test('with no previous run there is no drift claim either way', () => {
  assert.equal(detectDrift(null, RED), null);
});

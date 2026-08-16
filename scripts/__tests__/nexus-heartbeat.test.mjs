import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DECLARED_GATES,
  HEARTBEAT_TITLE,
  OWNER_MARKER,
  buildHeartbeatBody,
  composeHeartbeat,
  detectDrift,
  parsePreviousGates,
  readEvidence,
  reconcileGates,
  upsertHeartbeatIssue,
} from '../nexus-heartbeat.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW_PATH = join(repositoryRoot, '.github', 'workflows', 'nexus-heartbeat.yml');

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
  integrity: 'OK',
  oldest: { id: 'F2', decision: 'Google OAuth', ageDays: 42, blocks: 'UNI-2329' },
};

const OWNED_BODY = `${OWNER_MARKER}\nsome previous report`;

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

const ownedIssue = (number) => ({ number, title: HEARTBEAT_TITLE, body: OWNED_BODY });
const body = (extra = '') => `${OWNER_MARKER}\n${extra}`;

// ---------------------------------------------------------------------------
// Upsert — one pinned issue, never a stream of new ones, never someone else's
// ---------------------------------------------------------------------------

test('with no existing issue the heartbeat creates exactly one', async () => {
  const client = stubClient([]);
  const result = await upsertHeartbeatIssue({ client, body: body() });

  assert.equal(result.action, 'created');
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].action, 'create');
  assert.equal(client.calls[0].title, HEARTBEAT_TITLE);
});

test('an existing OWNED issue is UPDATED, never duplicated', async () => {
  const client = stubClient([ownedIssue(77)]);
  const result = await upsertHeartbeatIssue({ client, body: body() });

  assert.equal(result.action, 'updated');
  assert.equal(result.number, 77);
  assert.equal(client.calls.filter((c) => c.action === 'create').length, 0);
});

test('A HUMAN ISSUE WITH THE SAME TITLE IS NEVER OVERWRITTEN', async () => {
  // Exact title is not an ownership marker: anyone can type this title. Only the
  // marker this workflow writes into the body proves the issue is ours. Without
  // this check the upsert replaced a human-authored issue's entire body.
  const client = stubClient([{ number: 77, title: HEARTBEAT_TITLE, body: 'a human wrote this' }]);
  const result = await upsertHeartbeatIssue({ client, body: body() });

  assert.equal(result.action, 'created');
  assert.equal(client.calls.filter((c) => c.action === 'update').length, 0);
});

test('an issue carrying the marker but a different title is not ours either', async () => {
  const client = stubClient([{ number: 5, title: 'Something else', body: OWNED_BODY }]);
  const result = await upsertHeartbeatIssue({ client, body: body() });

  assert.equal(result.action, 'created');
});

test('the upsert refuses to publish a body with no ownership marker', async () => {
  // A body without the marker would be unrecognisable to the next run, which
  // would then open a duplicate every single day.
  const client = stubClient([]);
  await assert.rejects(
    () => upsertHeartbeatIssue({ client, body: 'no marker here' }),
    /ownership marker/i,
  );
  assert.equal(client.calls.length, 0);
});

test('a near-miss title does not count as a match, so the pin stays singular', async () => {
  const client = stubClient([
    { number: 1, title: `${HEARTBEAT_TITLE} (old)`, body: OWNED_BODY },
    { number: 2, title: `Re: ${HEARTBEAT_TITLE}`, body: OWNED_BODY },
    { number: 3, title: HEARTBEAT_TITLE.toLowerCase(), body: OWNED_BODY },
  ]);
  const result = await upsertHeartbeatIssue({ client, body: body() });

  assert.equal(result.action, 'created');
});

test('duplicate owned issues update the lowest-numbered one deterministically', async () => {
  const client = stubClient([ownedIssue(90), ownedIssue(12)]);
  const result = await upsertHeartbeatIssue({ client, body: body() });

  assert.equal(result.action, 'updated');
  assert.equal(result.number, 12);
});

// ---------------------------------------------------------------------------
// Reconciliation — the decision the workflow used to make for itself
// ---------------------------------------------------------------------------

test('THE UNI-2567 LESSON: a gate absent from the capture becomes NOT RUN, never PASS', () => {
  const { gates, anomalies } = reconcileGates(DECLARED_GATES, [GREEN[0]]);

  assert.equal(gates.length, 3);
  assert.deepEqual(
    gates.map((g) => g.status),
    ['PASS', 'NOT_RUN', 'NOT_RUN'],
  );
  assert.ok(anomalies.some((a) => a.includes('verify:docs-watch')), anomalies.join('\n'));
});

test('an empty capture makes every declared gate NOT RUN and says so', () => {
  const { gates, anomalies } = reconcileGates(DECLARED_GATES, []);

  assert.ok(gates.every((g) => g.status === 'NOT_RUN'), JSON.stringify(gates));
  assert.equal(anomalies.length, 3);
});

test('a capture that is not an array is refused rather than trusted', () => {
  const { gates, anomalies } = reconcileGates(DECLARED_GATES, { name: 'verify:readiness', status: 'PASS' });

  assert.ok(gates.every((g) => g.status === 'NOT_RUN'));
  assert.ok(anomalies.some((a) => /not a JSON array/i.test(a)), anomalies.join('\n'));
});

test('an unrecognised status is downgraded to NOT RUN, not rendered verbatim', () => {
  // A hand-edited or truncated capture must not put an unknown token in a table
  // a human scans for the word PASS.
  const { gates, anomalies } = reconcileGates(DECLARED_GATES, [
    { name: 'verify:readiness', status: 'PASSED', exitCode: 0 },
  ]);

  assert.equal(gates[0].status, 'NOT_RUN');
  assert.ok(anomalies.some((a) => a.includes('unrecognised status')), anomalies.join('\n'));
});

test('a duplicated gate entry is flagged and the first result kept', () => {
  const { gates, anomalies } = reconcileGates(DECLARED_GATES, [
    { name: 'verify:readiness', status: 'FAIL', exitCode: 1 },
    { name: 'verify:readiness', status: 'PASS', exitCode: 0 },
  ]);

  assert.equal(gates[0].status, 'FAIL');
  assert.ok(anomalies.some((a) => a.includes('more than once')), anomalies.join('\n'));
});

test('a captured gate nobody declared is reported rather than silently accepted', () => {
  const { anomalies } = reconcileGates(DECLARED_GATES, [
    ...GREEN, { name: 'verify:invented', status: 'PASS', exitCode: 0 },
  ]);

  assert.ok(anomalies.some((a) => a.includes('verify:invented')), anomalies.join('\n'));
});

test('a non-integer exit code is normalised away instead of printed as data', () => {
  const { gates } = reconcileGates(['verify:readiness'], [
    { name: 'verify:readiness', status: 'FAIL', exitCode: 'boom' },
  ]);
  assert.equal(gates[0].exitCode, null);
});

// ---------------------------------------------------------------------------
// Evidence files — missing is a fact, not a default
// ---------------------------------------------------------------------------

test('a missing evidence file reports WHY, and never returns a value', () => {
  const result = readEvidence('/tmp/definitely-not-here-nexus-heartbeat.json');

  assert.equal(result.ok, false);
  assert.ok(result.reason.includes('never written'), result.reason);
  assert.equal(result.value, undefined);
});

test('a truncated evidence file is refused, not parsed into a shrug', () => {
  const result = readEvidence('/irrelevant', { readFile: () => '[{"name":"verify:read' });

  assert.equal(result.ok, false);
  assert.ok(/not valid JSON/i.test(result.reason), result.reason);
});

test('a readable evidence file returns its parsed value', () => {
  const result = readEvidence('/irrelevant', { readFile: () => '[{"name":"x","status":"PASS"}]' });

  assert.equal(result.ok, true);
  assert.equal(result.value[0].name, 'x');
});

// ---------------------------------------------------------------------------
// composeHeartbeat — the whole decision path the workflow delegates
// ---------------------------------------------------------------------------

const provenance = { runId: 42, runUrl: 'https://example.invalid/42', generatedAt: '2026-08-16T19:00:00.000Z' };

test('THE STALE-PASS FAILURE: a dead observe job publishes NOT RUN and DEGRADED', () => {
  // The previous run passed. This run produced no evidence at all. The report
  // must NOT inherit that PASS — the whole reason the report job runs on
  // `if: always()` is so silence gets published rather than left implied.
  const result = composeHeartbeat({
    date: '2026-08-16',
    gateEvidence: { ok: false, reason: '`/tmp/heartbeat/gate-results.json` was never written — the step that produces it did not complete.' },
    queueEvidence: { ok: false, reason: '`/tmp/heartbeat/queue.json` was never written — the step that produces it did not complete.' },
    previousBody: `${OWNER_MARKER}\n| \`verify:readiness\` | PASS | exit 0 |`,
    provenance,
  });

  assert.equal(result.degraded, true);
  assert.ok(result.body.includes('DEGRADED'), result.body);
  assert.ok(result.body.includes('NOT RUN'), result.body);
  assert.ok(!/\|\s*PASS\s*\|/u.test(result.body), result.body);
  assert.ok(result.body.includes('never written'), result.body);
});

test('a fully green run is not degraded and carries its provenance', () => {
  const result = composeHeartbeat({
    date: '2026-08-16',
    gateEvidence: { ok: true, value: GREEN },
    queueEvidence: { ok: true, value: QUEUE },
    previousBody: null,
    provenance,
  });

  assert.equal(result.degraded, false);
  assert.ok(!result.body.includes('DEGRADED'), result.body);
  assert.ok(result.body.includes('https://example.invalid/42'), result.body);
  assert.ok(result.body.includes('25 hours'), result.body);
});

test('drift is computed from the previous OWNED body, not from a bare string', () => {
  const result = composeHeartbeat({
    date: '2026-08-16',
    gateEvidence: { ok: true, value: RED },
    queueEvidence: { ok: true, value: QUEUE },
    previousBody: `${OWNER_MARKER}\n| \`verify:readiness\` | PASS | exit 0 |`,
    provenance,
  });

  assert.ok(result.body.includes('Regressed since the previous run'), result.body);
});

test('an unowned previous body yields no drift claim at all', () => {
  // Reading drift out of a body we did not write would let an unrelated issue
  // manufacture a regression that never happened.
  assert.equal(parsePreviousGates('| `verify:readiness` | PASS | exit 0 |', DECLARED_GATES), null);
});

test('a previous body missing a gate row counts that gate as not-passing', () => {
  const previous = parsePreviousGates(`${OWNER_MARKER}\nnothing tabular here`, DECLARED_GATES);
  assert.ok(previous.every((g) => g.status === 'FAIL'), JSON.stringify(previous));
});

// ---------------------------------------------------------------------------
// The body must report failure as failure
// ---------------------------------------------------------------------------

test('a green run reports every gate as PASS', () => {
  const rendered = buildHeartbeatBody({ date: '2026-08-16', gates: GREEN, queue: QUEUE, drift: null });

  assert.ok(rendered.includes('verify:readiness'));
  assert.ok(rendered.includes('PASS'));
  assert.ok(!rendered.includes('FAIL'));
});

test('THE UNI-2567 LESSON: a failed gate surfaces as FAIL, never as silence', () => {
  const rendered = buildHeartbeatBody({ date: '2026-08-16', gates: RED, queue: QUEUE, drift: null });

  assert.ok(rendered.includes('FAIL'), rendered);
  assert.ok(rendered.includes('verify:readiness'), rendered);
  assert.ok(rendered.includes('exit 1'), rendered);
});

test('a gate that did not run is reported as NOT RUN, not omitted and not PASS', () => {
  const rendered = buildHeartbeatBody({
    date: '2026-08-16',
    gates: [{ name: 'verify:docs-review', status: 'NOT_RUN', exitCode: null }],
    queue: QUEUE,
    drift: null,
  });

  assert.ok(rendered.includes('NOT RUN'), rendered);
  assert.ok(!rendered.includes('PASS'), rendered);
});

test('the body always names the oldest founder decision and its age', () => {
  const rendered = buildHeartbeatBody({ date: '2026-08-16', gates: GREEN, queue: QUEUE, drift: null });

  assert.ok(rendered.includes('F2'), rendered);
  assert.ok(rendered.includes('42'), rendered);
  assert.ok(rendered.includes('UNI-2329'), rendered);
});

test('an empty founder queue is stated explicitly rather than left blank', () => {
  const rendered = buildHeartbeatBody({
    date: '2026-08-16', gates: GREEN, queue: { openCount: 0, oldest: null, integrity: 'OK' }, drift: null,
  });
  assert.match(rendered, /no open founder decisions/i);
});

test('AN UNPARSEABLE QUEUE IS NEVER RENDERED AS "nothing is blocked"', () => {
  // openCount 0 from a broken parse looks identical to openCount 0 from an empty
  // queue. The integrity flag is what separates them, and the reader must see it.
  const rendered = buildHeartbeatBody({
    date: '2026-08-16',
    gates: GREEN,
    queue: { openCount: 0, oldest: null, integrity: 'MALFORMED', malformed: ['Line 9 has 3 cells'] },
    drift: null,
  });

  assert.ok(!rendered.includes('Nothing is blocked on Phill.'), rendered);
  assert.ok(rendered.includes('Queue integrity MALFORMED'), rendered);
  assert.ok(rendered.includes('Line 9 has 3 cells'), rendered);
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

// ---------------------------------------------------------------------------
// The workflow must stay a thin caller
// ---------------------------------------------------------------------------

test('THE YAML DECIDES NOTHING: no gate reconstruction is inlined in the workflow', () => {
  // Round one of the independent review mutated the workflow's own inline
  // `?? { status: 'NOT_RUN' }` fallback to `PASS` and this suite stayed green,
  // because the tested copy of that logic lived somewhere the workflow never
  // called. Logic that only exists in YAML is logic no test can reach.
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

  assert.ok(workflow.includes('composeHeartbeat'), 'the workflow must delegate to composeHeartbeat');
  assert.ok(workflow.includes('readEvidence'), 'the workflow must delegate evidence reading');
  assert.ok(
    !/NOT_RUN/u.test(workflow),
    'the workflow re-implements the NOT RUN fallback; move it into nexus-heartbeat.mjs',
  );
  assert.ok(
    !/JSON\.parse\(readFileSync/u.test(workflow),
    'the workflow parses evidence itself; use readEvidence so a test can reach it',
  );
});

test('THE WRITE TOKEN IS ISOLATED: no job both installs code and can write issues', () => {
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
  const jobs = workflow.split(/\n {2}(?=[a-z][a-z0-9-]*:\n)/u).slice(1);

  assert.ok(jobs.length >= 2, `expected at least two jobs, parsed ${jobs.length}`);
  for (const job of jobs) {
    const canWriteIssues = /issues:\s*write/u.test(job);
    const runsRepositoryCode = /npm ci|npm run |node scripts\/founder-queue/u.test(job);
    assert.ok(
      !(canWriteIssues && runsRepositoryCode),
      `a job holds issues:write while running repository code:\n${job.slice(0, 400)}`,
    );
  }
});

test('neither checkout leaves an ambient credential in the workspace', () => {
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
  const checkouts = workflow.split('actions/checkout@').slice(1);

  assert.equal(checkouts.length, 2, 'expected exactly two checkouts');
  for (const checkout of checkouts) {
    assert.ok(
      /persist-credentials:\s*false/u.test(checkout.slice(0, 400)),
      'a checkout does not set persist-credentials: false',
    );
  }
});

test('the report job runs even when the observe job dies', () => {
  // The condition must be on the JOB, not on a step inside it: a step-level
  // `if: always()` never executes when the job it belongs to was skipped. An
  // earlier version of this test searched the whole job block and passed while
  // the job-level condition was deleted — it was reading the steps' own guards.
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
  const jobStart = workflow.indexOf('\n  report:');
  assert.ok(jobStart > -1, 'no report job found');
  const header = workflow.slice(jobStart, workflow.indexOf('\n    steps:', jobStart));

  assert.ok(!header.includes('steps:'), 'header slice overran into the steps');
  assert.ok(
    /^\s{4}if:\s*always\(\)\s*$/mu.test(header),
    `the report JOB must carry if: always(); its header is:\n${header}`,
  );
  assert.ok(/needs:\s*\[observe\]/u.test(header), 'the report job must depend on observe');
});

test('the issue lookup paginates rather than reading only the first page', () => {
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

  assert.ok(workflow.includes('github.paginate'), 'listOpenIssues must paginate');
  assert.ok(
    !/await github\.rest\.issues\.listForRepo/u.test(workflow),
    'a single-page listForRepo call remains; page two would read as absent',
  );
});

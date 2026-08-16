import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DECLARED_GATES,
  brisbaneReportDate,
  HEARTBEAT_TITLE,
  OWNER_MARKER,
  buildHeartbeatBody,
  composeHeartbeat,
  detectDrift,
  findOwnedIssue,
  parsePreviousGates,
  readEvidence,
  reconcileGates,
  reconcileQueue,
  upsertHeartbeatIssue,
} from '../nexus-heartbeat.mjs';
import {
  executedCommands,
  jobsThatCanWriteIssues,
  readWorkflowStructure,
} from '../lib/workflow-yaml.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW_PATH = join(repositoryRoot, '.github', 'workflows', 'nexus-heartbeat.yml');

/**
 * The exact bytes of the workflow, as read and approved by a human.
 *
 * This is the load-bearing control for every structural claim below. Four
 * review rounds were lost to YAML constructs the reader did not implement; a
 * hash implements all of them.
 */
// Re-pinned in round eleven: the threat-model header described `npm ci` as part
// of the observe job in the present tense, three rounds after that step was
// removed for being unrunnable. The pin doing its job — a comment-only edit
// failing this test until someone deliberately re-pins — is the whole point.
const PINNED_WORKFLOW_SHA256 = 'bb1ec7322f19f14ee10f2f88e7000472b3b392e55c05814e3b8d4779c83425d0';

// Rendered gate lists (what reconcileGates PRODUCES).
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

// Captures (what the workflow WRITES): exit codes only, never a verdict.
const CAPTURE_GREEN = DECLARED_GATES.map((name) => ({ name, exitCode: 0 }));
const CAPTURE_RED = DECLARED_GATES.map((name, index) => ({ name, exitCode: index === 0 ? 1 : 0 }));

const QUEUE = {
  openCount: 9,
  integrity: 'OK',
  malformed: [],
  oldest: { id: 'F2', decision: 'Google OAuth', ageDays: 42, blocks: 'UNI-2329' },
};

const OWNED_BODY = `${OWNER_MARKER}\nsome previous report`;

/**
 * Stand-in for the issues API. It is a real little STORE, not a set of functions
 * that return plausible numbers.
 *
 * Round four broke the previous version with one line: a `createIssue` that
 * returned `{number: 123}` and persisted nothing still produced
 * `{action: 'created', number: 123}` and a green run. A double that cannot drop a
 * write cannot test a readback, so this one actually holds the issues it is told
 * about and serves them back through `getIssue`.
 */
function stubClient(existing = [], { dropWrites = false, omitGetIssue = false } = {}) {
  const calls = [];
  const store = new Map(existing.map((issue) => [issue.number, { ...issue }]));
  let nextNumber = 101;
  const client = {
    calls,
    store,
    async listOpenIssues() { return [...store.values()]; },
    async createIssue(payload) {
      calls.push({ action: 'create', ...payload });
      const number = nextNumber;
      nextNumber += 1;
      if (!dropWrites) store.set(number, { number, ...payload });
      return { number };
    },
    async updateIssue(number, payload) {
      calls.push({ action: 'update', number, ...payload });
      if (!dropWrites) store.set(number, { number, ...payload });
      return { number };
    },
  };
  if (!omitGetIssue) {
    client.getIssue = async (number) => (store.has(number) ? { ...store.get(number) } : null);
  }
  return client;
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
  const { gates, anomalies } = reconcileGates(DECLARED_GATES, [CAPTURE_GREEN[0]]);

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
  const { gates, anomalies } = reconcileGates(DECLARED_GATES, { name: 'verify:readiness', exitCode: 0 });

  assert.ok(gates.every((g) => g.status === 'NOT_RUN'));
  assert.ok(anomalies.some((a) => /not a JSON array/i.test(a)), anomalies.join('\n'));
});

test('an unrecognised status is downgraded to NOT RUN, not rendered verbatim', () => {
  // A hand-edited or truncated capture must not put an unknown token in a table
  // a human scans for the word PASS.
  const { gates, anomalies } = reconcileGates(DECLARED_GATES, [
    { name: 'verify:readiness', status: 'PASS', exitCode: 1 },
  ]);

  assert.equal(gates[0].status, 'NOT_RUN');
  assert.ok(anomalies.some((a) => a.includes('pre-decided status')), anomalies.join('\n'));
});

test('a duplicated gate entry is flagged and the first result kept', () => {
  const { gates, anomalies } = reconcileGates(DECLARED_GATES, [
    { name: 'verify:readiness', exitCode: 1 },
    { name: 'verify:readiness', exitCode: 0 },
  ]);

  assert.equal(gates[0].status, 'FAIL');
  assert.ok(anomalies.some((a) => a.includes('more than once')), anomalies.join('\n'));
});

test('a captured gate nobody declared is reported rather than silently accepted', () => {
  const { anomalies } = reconcileGates(DECLARED_GATES, [
    ...CAPTURE_GREEN, { name: 'verify:invented', exitCode: 0 },
  ]);

  assert.ok(anomalies.some((a) => a.includes('verify:invented')), anomalies.join('\n'));
});

test('a non-integer exit code is normalised away instead of printed as data', () => {
  const { gates, anomalies } = reconcileGates(['verify:readiness'], [
    { name: 'verify:readiness', exitCode: 'boom' },
  ]);
  assert.equal(gates[0].exitCode, null);
  assert.equal(gates[0].status, 'NOT_RUN');
  assert.ok(anomalies.some((a) => a.includes('no integer exit code')), anomalies.join('\n'));
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
    gateEvidence: { ok: true, value: CAPTURE_GREEN },
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
    gateEvidence: { ok: true, value: CAPTURE_RED },
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

/**
 * The renderer is fed VALIDATED queues, because that is the only kind the
 * composer produces. Handing it a raw object would test a call that cannot occur
 * and would quietly re-establish the defect these tests exist to close: an
 * unvalidated summary reaching the render.
 */
const validatedQueue = (value) => reconcileQueue({ ok: true, value }).queue;

test('the body always names the oldest founder decision and its age', () => {
  const rendered = buildHeartbeatBody({
    date: '2026-08-16', gates: GREEN, queue: validatedQueue(QUEUE), drift: null,
  });

  assert.ok(rendered.includes('F2'), rendered);
  assert.ok(rendered.includes('42'), rendered);
  assert.ok(rendered.includes('UNI-2329'), rendered);
});

test('an empty founder queue is stated explicitly rather than left blank', () => {
  const rendered = buildHeartbeatBody({
    date: '2026-08-16',
    gates: GREEN,
    queue: validatedQueue({ openCount: 0, oldest: null, integrity: 'OK', malformed: [] }),
    drift: null,
  });
  assert.match(rendered, /no open founder decisions/i);
});

test('AN UNPARSEABLE QUEUE IS NEVER RENDERED AS "nothing is blocked"', () => {
  // openCount 0 from a broken parse looks identical to openCount 0 from an empty
  // queue. The integrity flag is what separates them, and the reader must see it.
  const rendered = buildHeartbeatBody({
    date: '2026-08-16',
    gates: GREEN,
    queue: validatedQueue({
      openCount: 0, oldest: null, integrity: 'MALFORMED', malformed: ['Line 9 has 3 cells'],
    }),
    drift: null,
  });

  assert.ok(!rendered.includes('Nothing is blocked on Phill.'), rendered);
  assert.ok(rendered.includes('Queue not trustworthy'), rendered);
  assert.ok(rendered.includes('Line 9 has 3 cells'), rendered);
});

// ---------------------------------------------------------------------------
// ROUND FOUR (codex, independent). Each demonstrated open before being fixed.
// ---------------------------------------------------------------------------

test('AN IMPOSSIBLE SUMMARY NEVER PRINTS THE ALL-CLEAR, only flags it', () => {
  // The round-four P1: `{openCount: 5, oldest: null}` was reported as an anomaly
  // AND rendered "Nothing is blocked on Phill." in the same body, so one report
  // stated both five open decisions and none.
  const { queue, anomalies } = reconcileQueue({
    ok: true, value: { openCount: 5, oldest: null, integrity: 'OK', malformed: [] },
  });
  assert.ok(anomalies.length > 0, 'an impossible summary must raise an anomaly');
  assert.equal(queue.state, 'UNTRUSTWORTHY');

  const rendered = buildHeartbeatBody({ date: '2026-08-16', gates: GREEN, queue, anomalies, drift: null });
  assert.ok(!rendered.includes('Nothing is blocked on Phill.'), rendered);
});

test('A MALFORMED OLDEST RECORD IS NOT A USABLE ONE', () => {
  // `{oldest: {}}` and a negative age both validated clean and rendered
  // `undefined` and `-99 days` into a report a human reads for a number.
  for (const oldest of [{}, { id: 'F1', decision: 'x', blocks: 'y', ageDays: -99 },
    { id: '', decision: 'x', blocks: 'y', ageDays: 3 }]) {
    const { queue, anomalies } = reconcileQueue({
      ok: true, value: { openCount: 3, oldest, integrity: 'OK', malformed: [] },
    });
    assert.equal(queue.state, 'UNTRUSTWORTHY', JSON.stringify(oldest));
    assert.ok(anomalies.length > 0, JSON.stringify(oldest));

    // Assert on the FOUNDER SECTION, not the whole body: the DEGRADED banner
    // quotes the bad value back on purpose, and a whole-body search for
    // `undefined` would be satisfied by that quotation while the section below
    // still rendered it as data.
    const rendered = buildHeartbeatBody({ date: '2026-08-16', gates: GREEN, queue, anomalies, drift: null });
    const section = rendered.slice(
      rendered.indexOf('## Founder decisions'),
      rendered.indexOf('## Drift'),
    );
    assert.ok(section.includes('Queue not trustworthy'), section);
    assert.ok(!section.includes('undefined'), section);
    assert.ok(!section.includes('-99 days'), section);
    assert.ok(!section.includes('Oldest:'), section);
  }
});

test('A DROPPED WRITE IS NOT A SUCCESSFUL ONE: the upsert reads the issue back', async () => {
  // The round-four P1: a client whose createIssue returned `{number: 123}` while
  // persisting nothing produced `{action: 'created', number: 123}` and a green run.
  const dropping = stubClient([], { dropWrites: true });
  await assert.rejects(
    upsertHeartbeatIssue({ client: dropping, body: body('fresh'), issues: [] }),
    /could not be read back/u,
  );

  // And the same for an update that does not land.
  const droppingUpdate = stubClient([ownedIssue(77)], { dropWrites: true });
  await assert.rejects(
    upsertHeartbeatIssue({
      client: droppingUpdate, body: body('fresh'), issues: [ownedIssue(77)],
    }),
    /differs from the body sent/u,
  );
});

test('A CLIENT THAT CANNOT CONFIRM ITS WRITE IS REFUSED, not trusted', async () => {
  const blind = stubClient([], { omitGetIssue: true });
  await assert.rejects(
    upsertHeartbeatIssue({ client: blind, body: body('fresh'), issues: [] }),
    /no `getIssue`/u,
  );
});

test('A CONFIRMED WRITE STILL SUCCEEDS, so the readback does not cry wolf', async () => {
  const client = stubClient([]);
  const result = await upsertHeartbeatIssue({ client, body: body('fresh'), issues: [] });
  assert.equal(result.action, 'created');
  assert.equal(client.store.get(result.number).body, body('fresh'));
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

/*
 * THE ISOLATION GUARD IS STRUCTURAL, NOT LEXICAL.
 *
 * Its previous form was `/npm ci|npm run |node scripts\/founder-queue/` over the
 * workflow's raw text. Round four gave the issues-write job a full checkout and
 * `npm  ci` — two spaces — and this suite stayed green at 55/55 with the test
 * still named THE WRITE TOKEN IS ISOLATED. There is no regex that survives an
 * author choosing different whitespace, a different install command, a shell
 * variable, or `bash -c`. The document is structured; ask it structural
 * questions.
 *
 * The allowlist below is deliberately positive. A denylist of forbidden commands
 * is the same losing game one level up: the job may run NOTHING, and may invoke
 * only the three actions named here.
 */
const ISSUES_WRITE_ACTION_ALLOWLIST = Object.freeze([
  'actions/checkout',
  'actions/download-artifact',
  'actions/github-script',
]);

test('THE WRITE TOKEN IS ISOLATED: the issues-write job runs no commands at all', () => {
  const structure = readWorkflowStructure(readFileSync(WORKFLOW_PATH, 'utf8'));
  const writers = jobsThatCanWriteIssues(structure);

  assert.equal(writers.length, 1, `expected exactly one issues:write job, found ${writers.length}`);
  assert.ok(structure.jobs.length >= 2, `expected at least two jobs, parsed ${structure.jobs.length}`);

  for (const job of writers) {
    assert.deepEqual(
      executedCommands(job),
      [],
      `job \`${job.name}\` holds issues:write and executes shell commands`,
    );
    for (const step of job.steps) {
      assert.notEqual(step.run, '', `job \`${job.name}\` has an empty run step`);
      if (step.uses === null) continue;
      const action = step.uses.split('@')[0];
      assert.ok(
        ISSUES_WRITE_ACTION_ALLOWLIST.includes(action),
        `job \`${job.name}\` invokes \`${action}\`, which is not on the issues-write allowlist`,
      );
    }
  }
});

test('THE ISSUES-WRITE CHECKOUT IS ONE FILE: no full checkout under the token', () => {
  const structure = readWorkflowStructure(readFileSync(WORKFLOW_PATH, 'utf8'));
  const [writer] = jobsThatCanWriteIssues(structure);
  const checkouts = writer.steps.filter((step) => step.uses?.startsWith('actions/checkout@'));

  assert.equal(checkouts.length, 1, 'the issues-write job must check out exactly once');
  const options = checkouts[0].with ?? {};
  assert.equal(
    options['sparse-checkout'],
    'scripts/nexus-heartbeat.mjs',
    'the issues-write checkout must fetch exactly scripts/nexus-heartbeat.mjs',
  );
  assert.equal(
    String(options['sparse-checkout-cone-mode']),
    'false',
    'cone mode would widen the sparse checkout beyond the single file',
  );
  assert.equal(
    String(options['persist-credentials']),
    'false',
    'the issues-write checkout must not leave an ambient credential in the workspace',
  );
});

test('POSITIVE CONTROL: the isolation guard fails on the exact round-four mutant', () => {
  // The mutant that beat the regex: a full checkout plus `npm  ci` in the
  // issues-write job. Run against the guard's own predicates rather than the
  // file, so the check is proven able to fail without touching the workflow.
  const mutant = readFileSync(WORKFLOW_PATH, 'utf8')
    .replace(
      /(\n      - uses: actions\/checkout@[^\n]*\n)(        with:\n          persist-credentials: false\n          sparse-checkout: scripts\/nexus-heartbeat\.mjs\n          sparse-checkout-cone-mode: false\n)/u,
      '$1        with:\n          persist-credentials: false\n\n      - name: Install\n        run: npm  ci\n',
    );
  assert.notEqual(mutant, readFileSync(WORKFLOW_PATH, 'utf8'), 'the mutant edit did not apply');

  const structure = readWorkflowStructure(mutant);
  const [writer] = jobsThatCanWriteIssues(structure);
  assert.deepEqual(
    executedCommands(writer),
    ['npm  ci'],
    'the mutant should have introduced exactly one executed command',
  );

  const checkouts = writer.steps.filter((step) => step.uses?.startsWith('actions/checkout@'));
  assert.equal(
    checkouts[0].with?.['sparse-checkout'],
    undefined,
    'the mutant should have removed the sparse checkout',
  );
});

test('THE WORKFLOW IS DORMANT ON MERGE: it declares no schedule', () => {
  // Merging a capability arms nothing here (UNI-2542). Round four was right that
  // shipping the cron in this PR would have armed a daily issues-write on the
  // default branch BEFORE the watched first run that decides whether it deserves
  // to run unattended. Adding the cron must be a visible, separate change.
  const structure = readWorkflowStructure(readFileSync(WORKFLOW_PATH, 'utf8'));

  assert.ok(
    !Object.hasOwn(structure.triggers, 'schedule'),
    'the heartbeat declares a schedule; it must be manual-dispatch only until separately armed',
  );
  assert.ok(
    Object.hasOwn(structure.triggers, 'workflow_dispatch'),
    'the heartbeat must still be dispatchable, or its first run cannot be watched',
  );
});

test('THE OBSERVE JOB RUNS NO COMMAND THAT CANNOT SUCCEED (round-eight P1)', () => {
  /*
   * THE FINDING THAT MATTERED MOST, and no test in this file could have caught
   * it, because every test read the workflow and none of them ran it.
   *
   * The observe job's first step was `npm ci`. The repository root has no
   * `package-lock.json` and no `npm-shrinkwrap.json`, so `npm ci` exits 1 with
   * EUSAGE before doing anything — the job would have died there, before a
   * single gate ran, and every dispatch would have published all three gates as
   * NOT RUN. A heartbeat whose only possible output was its own failure.
   *
   * Everything was green while that was true: 176 passing tests, a clean
   * 62-mutant harness, and a workflow that could not work. "Shipped is not
   * observed", in one step.
   *
   * This test pins the narrow fact that made it impossible: `npm ci` requires a
   * lockfile this repo does not have, and the root declares no dependencies to
   * install in the first place.
   */
  const structure = readWorkflowStructure(readFileSync(WORKFLOW_PATH, 'utf8'));
  const observe = structure.jobs.find((job) => job.name === 'observe');
  assert.ok(observe, 'no observe job found');

  const lockfiles = ['package-lock.json', 'npm-shrinkwrap.json']
    .filter((name) => existsSync(join(repositoryRoot, name)));
  const commands = executedCommands(observe);

  if (lockfiles.length === 0) {
    assert.ok(
      !commands.some((command) => /\bnpm\s+ci\b/u.test(command)),
      `the observe job runs \`npm ci\` with no lockfile in the repo; it can only fail:\n${commands.join('\n')}`,
    );
  }

  // The root genuinely has nothing to install, which is why no install step is
  // the right answer rather than adding a lockfile to satisfy the command.
  const root = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8'));
  assert.deepEqual(root.dependencies ?? {}, {});
  assert.deepEqual(root.devDependencies ?? {}, {});
});

test('THE WORKFLOW SUPPLIES THE READBACK: its client can get an issue', () => {
  // upsertHeartbeatIssue refuses a client with no `getIssue`, so a workflow that
  // forgets it fails every run. Catching that here rather than in production.
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

  assert.ok(/getIssue:\s*async/u.test(workflow), 'the workflow client must provide getIssue');
  assert.ok(/github\.rest\.issues\.get\(/u.test(workflow), 'getIssue must actually read the issue back');
});

test('THE WORKFLOW READER FAILS CLOSED: unreadable YAML throws rather than parsing to nothing', () => {
  // A parser that returned `{}` for a document it did not understand would make
  // every structural guard above pass vacuously — the exact shape of defect this
  // whole file exists to prevent.
  assert.throws(() => readWorkflowStructure('on: {push: {}}\njobs:\n  a:\n    steps: []\n'));
  assert.throws(() => readWorkflowStructure('jobs:\n  a:\n    steps: []\n'), /triggers/u);
  assert.throws(() => readWorkflowStructure('on:\n  workflow_dispatch:\n'), /jobs/u);
  assert.throws(() => readWorkflowStructure('on:\n  workflow_dispatch:\njobs:\n\ta: 1\n'), /tab/u);

  // A document that is not a mapping AT ALL. Without this case the top-level
  // refusal could be replaced by `return {}` and every guard above would pass
  // vacuously — the harness proved exactly that mutant survived.
  assert.throws(() => readWorkflowStructure('- one\n- two\n'), /not a mapping/u);
  assert.throws(() => readWorkflowStructure(''), /not a mapping/u);

  // And a jobs block that parses but is not a jobs mapping.
  assert.throws(
    () => readWorkflowStructure('on:\n  workflow_dispatch:\njobs:\n  - a\n  - b\n'),
    /no jobs mapping/u,
  );
  assert.throws(
    () => readWorkflowStructure('on:\n  workflow_dispatch:\njobs:\n  a: not-a-mapping\n'),
    /job `a` is not a mapping/u,
  );
});

test('THE WORKFLOW IS PINNED BY CONTENT, so no YAML construct can bypass the guards', () => {
  /*
   * FOUR CONSECUTIVE ROUNDS WERE LOST INTERPRETING THIS FILE, so the guard
   * stops depending on interpretation.
   *
   *   round six   `"uses":`            quotes kept, step.uses null
   *   round seven `"uses":`       escape not decoded
   *   round eight `!!str uses:`        tag not implemented
   *   round eight `issues: "write"`  escaped value not decoded
   *
   * Every one was a valid construct this reader did not implement, and every
   * fix closed one spelling while the format kept others in reserve. A parser
   * can always be shown a document it reads differently from GitHub Actions.
   *
   * A HASH CANNOT. This assertion is the load-bearing control: the structural
   * checks below describe what the file contained when a human read it, and
   * this pin is what makes those descriptions still true. Any byte change —
   * quoted, tagged, escaped, whitespace, anything — fails here and forces the
   * author to re-pin deliberately, which is visible in the diff and is exactly
   * the outcome the isolation guard wanted all along.
   *
   * TO RE-PIN: read the diff, satisfy yourself the issues-write job still runs
   * no commands and checks out one file, then paste the printed hash here. If
   * that reading feels like a formality, it is the only thing standing between
   * this workflow and an unallowlisted action holding a write token.
   */
  const actual = createHash('sha256').update(readFileSync(WORKFLOW_PATH)).digest('hex');
  assert.equal(
    actual,
    PINNED_WORKFLOW_SHA256,
    `nexus-heartbeat.yml changed. Re-read it, then re-pin to:\n  ${actual}`,
  );
});

test('A QUOTED KEY IS REFUSED, not decoded (rounds six and seven, one class)', () => {
  /*
   * THREE ROUNDS ON ONE CLASS, AND THE THIRD CHANGES THE APPROACH.
   *
   * Round six: `"uses": actions/setup-node@v4` kept its quote marks, so
   * `step.uses` came back null, the allowlist saw no action to check, and both
   * isolation tests passed at 2/2 while the issues-write job invoked an
   * unallowlisted action. Fixed by stripping the quotes.
   *
   * Round seven: `"u\u0073es":` — a double-quoted key whose escape real YAML
   * decodes to `uses` — walked straight through the stripping.
   *
   * Decoding is a race this reader cannot win: after `\u` come `\x`, octal,
   * single-quote doubling, explicit `? :` keys, flow mappings, block-scalar
   * keys. Closing one spelling per round is the detect-the-bad-thing shape that
   * always loses. So the reader now refuses EVERY quoted key. The workflow this
   * repo controls uses plain keys exclusively, so refusing costs nothing real,
   * and anyone who adds one gets a hard parse failure visible in the diff.
   */
  const source = readFileSync(WORKFLOW_PATH, 'utf8');
  const mutate = (key) => source.replace(
    /( {6}- name: Create or update the pinned heartbeat issue\n {8}if: always\(\)\n) {8}uses: actions\/github-script@[^\n]*/u,
    `$1        ${key}: actions/setup-node@v4`,
  );

  for (const key of ['"uses"', "'uses'", '"u\\u0073es"', '"run:step"']) {
    const mutant = mutate(key);
    assert.notEqual(mutant, source, `mutant ${key} did not apply`);
    assert.throws(
      () => readWorkflowStructure(mutant),
      /quoted keys are not implemented/u,
      `${key} must be refused rather than interpreted`,
    );
  }

  // Refusal reaches the top level and the sequence branch alike — one rule,
  // not one rule per position.
  assert.throws(
    () => readWorkflowStructure('"on":\n  workflow_dispatch:\njobs:\n  a:\n    steps: []\n'),
    /quoted keys are not implemented/u,
  );

  /*
   * ON THE DASH LINE, which is the only place the sequence-item key detector
   * decides anything. Every test above mutates a key on its own indented line,
   * so all of them reach the mapping branch and none of them exercised the
   * detector — the harness proved it by deleting the detector's quoted
   * alternative and surviving. A quoted key CONTAINING A COLON is the single
   * construct the plain pattern misses (`"` satisfies `[^\s:]`, so every other
   * quoted key already routes), and without the alternative it degrades to
   * "step is not a mapping" instead of naming the real reason.
   */
  for (const line of ['- "run:step": echo hi', '- "uses": actions/setup-node@v4']) {
    assert.throws(
      () => readWorkflowStructure(`on:\n  workflow_dispatch:\njobs:\n  a:\n    steps:\n      ${line}\n`),
      /quoted keys are not implemented/u,
      line,
    );
  }
  assert.throws(
    () => readWorkflowStructure('on:\n  workflow_dispatch:\njobs:\n  a:\n    "b": 1\n'),
    /quoted keys are not implemented/u,
  );

  // And the real workflow still parses, so the refusal is not always-on.
  assert.ok(readWorkflowStructure(source).jobs.length >= 2);
});

test('A TAG IS REFUSED, on a key or a value (round-eight P0)', () => {
  // `!!str uses: actions/setup-node@v4` is valid for Actions — actionlint
  // 1.7.12 accepts it — and arrived here as the raw key `!!str uses`, so
  // `step.uses` came back null and both isolation guards passed over a step
  // invoking an unallowlisted action.
  for (const line of ['!!str uses: actions/setup-node@v4', '!<tag> uses: x']) {
    assert.throws(
      () => readWorkflowStructure(`on:\n  workflow_dispatch:\njobs:\n  a:\n    steps:\n      - ${line}\n`),
      /tag(ged key)?s are not implemented/u,
      line,
    );
  }
  // And on a value.
  assert.throws(
    () => readWorkflowStructure('on:\n  workflow_dispatch:\njobs:\n  a:\n    x: !!str y\n'),
    /tags are not implemented/u,
  );
});

test('AN ESCAPED QUOTED VALUE IS REFUSED, not read literally (round-eight P0)', () => {
  /*
   * `issues: "wri\u0074e"` is `write` to Ruby's Psych and was the literal
   * `wri\u0074e` here — so the job held issues:write while the guard saw no
   * writer at all, and both isolation tests passed at 2/2. Same class as the
   * quoted key, one level down in the value.
   */
  const doc = (perm) => 'on:\n  workflow_dispatch:\njobs:\n  a:\n    permissions:\n'
    + `      issues: ${perm}\n    steps:\n      - run: npm ci\n`;

  assert.throws(
    () => readWorkflowStructure(doc('"wri\\u0074e"')),
    /escape sequences in quoted scalars are not implemented/u,
  );
  assert.throws(
    () => readWorkflowStructure(doc("'wri\\x74e'")),
    /escape sequences in quoted scalars are not implemented/u,
  );

  // A plainly quoted value is still read, so the refusal is not always-on —
  // and it must still be seen as a writer.
  assert.deepEqual(
    jobsThatCanWriteIssues(readWorkflowStructure(doc('"write"'))).map((j) => j.name),
    ['a'],
  );
});

test('A RESERVED KEY IS REFUSED, not written onto every mapping', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    assert.throws(
      () => readWorkflowStructure(`on:\n  workflow_dispatch:\njobs:\n  a:\n    ${key}: x\n`),
      /reserved key/u,
      key,
    );
  }
});

test('THE PERMISSION SHORTHANDS ARE READ, not treated as "not declared"', () => {
  // `permissions: write-all` is a string, not a mapping, and fell into the
  // "not declared here" arm — which then consulted the workflow default and
  // could conclude "safe" about a job holding every permission there is.
  const job = (perms) => 'on:\n  workflow_dispatch:\npermissions:\n  contents: read\n'
    + `jobs:\n  a:\n    permissions: ${perms}\n    steps:\n      - run: echo hi\n`;

  assert.deepEqual(
    jobsThatCanWriteIssues(readWorkflowStructure(job('write-all'))).map((j) => j.name),
    ['a'],
    'write-all grants issues: write',
  );
  assert.deepEqual(
    jobsThatCanWriteIssues(readWorkflowStructure(job('read-all'))),
    [],
    'read-all does not',
  );
  assert.deepEqual(
    jobsThatCanWriteIssues(readWorkflowStructure(job('something-new'))).map((j) => j.name),
    ['a'],
    'an unrecognised shorthand is not a proven-safe one',
  );
});

test('THE REPORT DATE IS A BRISBANE DATE IN en-AU ORDER (round-six P1)', () => {
  // At the schedule's own moment — 19:00 UTC, 05:00 the next Brisbane day — a
  // UTC date stamps the PREVIOUS calendar date on a body whose queue ages were
  // computed in Brisbane. One report, two timezones.
  assert.equal(brisbaneReportDate(new Date('2026-08-16T19:00:00Z')), '17/08/2026');
  assert.equal(brisbaneReportDate(new Date('2026-08-16T13:59:59Z')), '16/08/2026');
  assert.equal(brisbaneReportDate(new Date('2026-08-16T14:00:00Z')), '17/08/2026');

  // And the workflow must actually use it, or the fix lives where nothing runs.
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
  assert.ok(/date: brisbaneReportDate\(\)/u.test(workflow), 'the workflow must call it');
  assert.ok(
    !/toISOString\(\)\.slice\(0, 10\)/u.test(workflow),
    'a UTC date derivation remains in the workflow',
  );
});

test('A JOB WITH NO PERMISSIONS BLOCK IS TREATED AS CAPABLE, not assumed safe', () => {
  // A job that declares no `permissions:` inherits the workflow default, and the
  // default is the permissive case. Reading that as "no permissions, therefore
  // safe" is how an unannotated job would slip past the isolation guard. The
  // harness proved this branch had no control until now.
  const noWorkflowDefault = [
    'on:', '  workflow_dispatch:', 'jobs:', '  a:', '    steps:', '      - run: npm ci', '',
  ].join('\n');
  assert.deepEqual(
    jobsThatCanWriteIssues(readWorkflowStructure(noWorkflowDefault)).map((job) => job.name),
    ['a'],
    'a job with no permissions and no workflow default must be treated as capable',
  );

  // An explicit workflow default that does NOT grant issues:write does bound it.
  const boundedDefault = [
    'on:', '  workflow_dispatch:', 'permissions:', '  contents: read',
    'jobs:', '  a:', '    steps:', '      - run: npm ci', '',
  ].join('\n');
  assert.deepEqual(jobsThatCanWriteIssues(readWorkflowStructure(boundedDefault)), []);

  // And a permissive workflow default reaches every unannotated job.
  const permissiveDefault = [
    'on:', '  workflow_dispatch:', 'permissions:', '  issues: write',
    'jobs:', '  a:', '    steps:', '      - run: npm ci', '',
  ].join('\n');
  assert.deepEqual(
    jobsThatCanWriteIssues(readWorkflowStructure(permissiveDefault)).map((job) => job.name),
    ['a'],
  );
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

// ---------------------------------------------------------------------------
// ROUND TWO (qwen, independent). Each demonstrated open before being fixed.
// ---------------------------------------------------------------------------

test('THE VERDICT IS DERIVED, NOT ACCEPTED: a capture carrying a status is distrusted', () => {
  // The capture step used to decide `status=PASS` in shell inside the YAML —
  // the round-one P0 one layer down, in a place no test could reach. The shell
  // records exit codes only now, so an entry arriving WITH a verdict is evidence
  // that something rewrote it.
  const { gates, anomalies } = reconcileGates(DECLARED_GATES, [
    { name: 'verify:readiness', status: 'PASS', exitCode: 1 },
  ]);

  assert.equal(gates[0].status, 'NOT_RUN');
  assert.ok(anomalies.some((a) => a.includes('pre-decided status')), anomalies.join('\n'));
});

test('a non-zero exit code is FAIL and a zero is PASS, derived here', () => {
  const { gates } = reconcileGates(DECLARED_GATES, [
    { name: 'verify:readiness', exitCode: 0 },
    { name: 'verify:docs-watch', exitCode: 2 },
    { name: 'verify:docs-review', exitCode: 0 },
  ]);
  assert.deepEqual(gates.map((g) => g.status), ['PASS', 'FAIL', 'PASS']);
});

test('a prototype-chain status is not a known status', () => {
  // `entry.status in STATUS_LABEL` was true for "toString" and "constructor".
  // The identical hole was closed in the evidence checker and left open here.
  for (const status of ['toString', 'constructor', '__proto__']) {
    const { gates } = reconcileGates(['verify:readiness'], [
      { name: 'verify:readiness', status, exitCode: 0 },
    ]);
    assert.equal(gates[0].status, 'NOT_RUN', status);
  }
});

test('the workflow capture step no longer decides PASS or FAIL', () => {
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
  const start = workflow.indexOf('Run gates and capture every exit code');
  const end = workflow.indexOf('Compute founder-queue age');
  assert.ok(start > -1 && end > start, 'capture step not found');
  const capture = workflow.slice(start, end);

  assert.ok(!capture.includes('status=PASS'), 'the shell still decides a verdict');
  assert.ok(!/status/u.test(capture), `the capture mentions status:\n${capture}`);
  assert.ok(capture.includes('exitCode'), 'the capture must record exit codes');
});

test('A PULL REQUEST IS NEVER ADOPTED AS THE HEARTBEAT ISSUE', () => {
  // issues.listForRepo returns PRs, and issues.update rewrites a PR body just as
  // happily. An open PR with this title and the marker copied out of the public
  // issue was adoptable — and with a lower number it became canonical.
  const issues = [
    { number: 4, title: HEARTBEAT_TITLE, body: OWNED_BODY, pull_request: { url: 'x' } },
    { number: 99, title: HEARTBEAT_TITLE, body: OWNED_BODY },
  ];
  assert.equal(findOwnedIssue(issues).number, 99);
});

test('drift reads the SAME issue the upsert rewrites', async () => {
  // Selecting the previous body with `find` while updating the lowest-numbered
  // issue read one issue's gates and rewrote another's, inventing regressions.
  const issues = [
    { number: 90, title: HEARTBEAT_TITLE, body: `${OWNER_MARKER}\nlater duplicate` },
    { number: 12, title: HEARTBEAT_TITLE, body: `${OWNER_MARKER}\ncanonical` },
  ];
  const client = stubClient(issues);
  const result = await upsertHeartbeatIssue({ client, body: body() });

  assert.equal(findOwnedIssue(issues).number, 12);
  assert.equal(result.number, 12);
});

test('AN UNVALIDATED QUEUE SHAPE IS NEVER "nothing is blocked"', () => {
  // `{}` and `[]` both parse. Spreading either into a default of integrity OK
  // rendered the all-clear with no anomaly and a green run.
  for (const value of [{}, [], null, 'a string', { openCount: 'many' }]) {
    const { queue, anomalies } = reconcileQueue({ ok: true, value });
    assert.equal(queue.integrity, 'UNAVAILABLE', JSON.stringify(value));
    assert.ok(anomalies.length > 0, JSON.stringify(value));
  }
});

test('A MALFORMED QUEUE MAKES THE RUN DEGRADED, not merely annotated', () => {
  // The integrity flag was printed in the body and never reached `anomalies`, so
  // the banner was absent and the workflow exited green. A flag that does not
  // travel with its anomaly is decoration.
  const result = composeHeartbeat({
    date: '2026-08-16',
    gateEvidence: { ok: true, value: CAPTURE_GREEN },
    queueEvidence: { ok: true, value: { openCount: 0, oldest: null, integrity: 'MALFORMED', malformed: ['Line 9'] } },
    previousBody: null,
    provenance,
  });

  assert.equal(result.degraded, true);
  assert.ok(result.body.includes('DEGRADED'), result.body);
  assert.ok(result.anomalies.some((a) => a.includes('Line 9')), result.anomalies.join('\n'));
});

test('a clean queue is still clean, so the guard does not cry wolf', () => {
  const result = composeHeartbeat({
    date: '2026-08-16',
    gateEvidence: { ok: true, value: CAPTURE_GREEN },
    queueEvidence: { ok: true, value: QUEUE },
    previousBody: null,
    provenance,
  });
  assert.equal(result.degraded, false, result.anomalies.join('\n'));
});

test('a queue claiming integrity OK while listing malformed rows is contradictory', () => {
  const { anomalies } = reconcileQueue({
    ok: true, value: { openCount: 1, oldest: null, integrity: 'OK', malformed: ['x'] },
  });
  assert.ok(anomalies.some((a) => a.includes('contradict') || a.includes('while also listing')), anomalies.join('\n'));
});

test('the workflow carries pull_request through so ownership can exclude PRs', () => {
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
  assert.ok(workflow.includes('pull_request: issue.pull_request'), 'PRs cannot be told apart');
  assert.ok(workflow.includes('findOwnedIssue'), 'the workflow must use the shared selector');
  assert.ok(
    !/issues\.find\(/u.test(workflow),
    'the workflow selects the previous issue by its own rule again',
  );
});

test('THE RENDER PATH also refuses a prototype-chain status', () => {
  // reconcileGates downgrades unknown statuses first, but buildHeartbeatBody is
  // exported and renders whatever it is handed. `STATUS_LABEL[status] ?? 'NOT RUN'`
  // returns a FUNCTION for "toString", so `??` never fires and the body gets
  // "function toString() { [native code] }" where a verdict belongs.
  for (const status of ['toString', 'constructor', 'valueOf']) {
    const rendered = buildHeartbeatBody({
      date: '2026-08-16',
      gates: [{ name: 'verify:readiness', status, exitCode: 0 }],
      queue: QUEUE,
      drift: null,
    });
    assert.ok(rendered.includes('NOT RUN'), `${status}: ${rendered}`);
    assert.ok(!rendered.includes('native code'), `${status}: ${rendered}`);
    assert.ok(!rendered.includes('function '), `${status}: ${rendered}`);
  }

  // Same lookup, drift side.
  const drift = detectDrift(
    [{ name: 'verify:readiness', status: 'PASS' }],
    [{ name: 'verify:readiness', status: 'toString' }],
  );
  assert.ok(drift.includes('NOT RUN'), drift);
});

// ---------------------------------------------------------------------------
// ROUND THREE (qwen, independent). Each demonstrated open before being fixed.
// ---------------------------------------------------------------------------

test('AN IMPOSSIBLE QUEUE SUMMARY IS AN ANOMALY, not an all-clear', () => {
  // The shape check accepted `{openCount: 5, oldest: null}` and a negative count,
  // then rendered "No open founder decisions. Nothing is blocked on Phill."
  const cases = [
    { openCount: 5, oldest: null, integrity: 'OK', malformed: [] },
    { openCount: -1, oldest: null, integrity: 'OK', malformed: [] },
    { openCount: 0, oldest: { id: 'F1' }, integrity: 'OK', malformed: [] },
  ];
  for (const value of cases) {
    const { anomalies } = reconcileQueue({ ok: true, value });
    assert.ok(anomalies.length > 0, JSON.stringify(value));
  }
});

test('a coherent queue produces no anomaly, so the guard does not cry wolf', () => {
  const { anomalies } = reconcileQueue({ ok: true, value: QUEUE });
  assert.deepEqual(anomalies, []);
});

test('a pull_request normalised to null still disqualifies the issue', () => {
  // `issue.pull_request === undefined` was too narrow: any client normalising the
  // field to null put every PR back in scope.
  for (const pull_request of [null, { url: 'x' }, false, 0]) {
    assert.equal(
      findOwnedIssue([{ number: 4, title: HEARTBEAT_TITLE, body: OWNED_BODY, pull_request }]),
      null,
      JSON.stringify(pull_request),
    );
  }
  // An issue that simply does not carry the key is still ours.
  assert.equal(findOwnedIssue([ownedIssue(4)]).number, 4);
});

test('THE DRIFT READ AND THE WRITE USE ONE LISTING, so they cannot race', async () => {
  // Two lookups race: the issue drift was measured against can be closed between
  // them, and the report is then written to a new issue while claiming a
  // regression measured against the old one.
  const first = [ownedIssue(12)];
  // The store starts holding #12 so the readback can succeed; `listOpenIssues`
  // is overridden to return an EMPTY page, so a second listing would lose the
  // target and create instead of update — which is the race being asserted away.
  const client = stubClient(first);
  let listCalls = 0;
  client.listOpenIssues = async () => { listCalls += 1; return []; };

  const result = await upsertHeartbeatIssue({ client, body: body(), issues: first });

  assert.equal(listCalls, 0, 'the upsert re-listed instead of using the caller listing');
  assert.equal(result.action, 'updated');
  assert.equal(result.number, 12);
});

test('the workflow reads the issue list exactly once', () => {
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
  const listings = workflow.split('await client.listOpenIssues()').length - 1;

  assert.equal(listings, 1, 'the workflow lists issues more than once; the two can disagree');
  assert.ok(workflow.includes('upsertHeartbeatIssue({ client, body, issues })'),
    'the upsert must be given the listing the drift read used');
});

test('THE THREAT MODEL IS STATED, not implied', () => {
  // Review round three raised three P0s that cannot be closed from inside the
  // repository being audited. A guard that silently fails to cover them is worse
  // than a paragraph that says so, and this test keeps the paragraph honest.
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

  assert.ok(workflow.includes('THREAT MODEL'), 'the threat model must be stated');
  assert.ok(/arbitrary code/iu.test(workflow), 'the arbitrary-code limit must be named');
  assert.ok(/NOT RUNNING AT ALL|not running at all/u.test(workflow), 'the silence limit must be named');
  assert.ok(/marker is public/iu.test(workflow), 'the public-marker limit must be named');
});

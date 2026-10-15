import assert from 'node:assert/strict';
import test from 'node:test';
import { formatStatus, main, parseArguments, readStatus, statusView } from '../idea-lifecycle-status.mjs';

const taskId = 'ca20d7c2-fbc7-4d84-af4c-f3781e560b65';
const args = ['--task-id', taskId, '--cookie-env', 'TEST_SESSION'];
const options = parseArguments(args);
const env = { TEST_SESSION: 'session=synthetic-test-value' };
const fixture = () => ({ taskId, source: 'supabase', lifecycle: {
  kind: 'idea_to_done', title: 'A new idea', revision: 2, checkpoint: { status: 'partial', summary: 'Research saved', nextStep: 'Verify sources' },
  mandate: { maximumSources: 5 }, sources: [{ id: 'source' }], brief: null, approval: null,
}, progress: { revision: 2, stage: 'research', nextAction: 'Record evidence', blockers: ['Missing source'],
  milestones: [{ id: 'research', label: 'Research', status: 'blocked', evidence: ['One source recorded'] }] } });
const response = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });

test('validates named cookie input, UUID, HTTPS and local origin', () => {
  assert.equal(options.origin, 'http://127.0.0.1:3008');
  for (const origin of ['https://example.test', 'http://localhost:3008', 'http://[::1]:3008']) assert.equal(parseArguments([...args, '--origin', origin]).origin, origin);
  for (const origin of ['http://example.test', 'https://user:secret@example.test', 'https://@example.test', 'https://example.test/a', 'https://example.test/?secret=x', 'https://example.test/#x', 'https://example.test/?', 'https://example.test/#', 'file:///tmp']) assert.throws(() => parseArguments([...args, '--origin', origin]));
  for (const bad of [[], ['--task-id', 'wrong', '--cookie-env', 'TEST_SESSION'], [...args, '--cookie', 'secret'], [...args, '--json', '--json'], ['--task-id', taskId, '--cookie-env', 'bad-name']]) assert.throws(() => parseArguments(bad));
});

test('requests only the authenticated lifecycle endpoint, forbids redirects and bounds time', async () => {
  let calls = 0;
  const view = await readStatus(options, { env, fetcher: async (url, init) => {
    calls++;
    assert.equal(url.href, `http://127.0.0.1:3008/api/command-centre/missions/lifecycle?taskId=${taskId}&view=status`);
    assert.equal(init.headers.cookie, env.TEST_SESSION);
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.method, undefined);
    return response(fixture());
  } });
  assert.equal(calls, 1);
  assert.equal(view.remainingSources, 4);
  assert.equal(view.stage, 'research');
});

test('formats shared state and strips terminal control characters', () => {
  const data = fixture(); data.lifecycle.title = 'Idea\x1b[2J\r\nfor review';
  const formatted = formatStatus(statusView(data, taskId));
  for (const fragment of ['revision 2 | research', 'partial — Research saved; next: Verify sources', 'Brief: not proposed', 'Source allowance remaining: 4', 'Blockers: Missing source', '[blocked] Research — One source recorded']) assert.ok(formatted.includes(fragment));
  assert.doesNotMatch(formatted, /\x1b|\r/);
  assert.doesNotMatch(formatted, /synthetic-test-value/);
});

test('fails closed on task mismatch, stale revision and malformed server fields', () => {
  for (const mutate of [data => { data.taskId = 'other'; }, data => { data.progress.revision++; }, data => { data.lifecycle.mandate.maximumSources = 0; }, data => { data.progress.milestones[0].status = 'done'; }, data => { data.lifecycle.checkpoint = {}; }, data => { data.lifecycle.brief = { hash: 'invalid' }; }]) {
    const data = fixture(); mutate(data); assert.throws(() => statusView(data, taskId), /Invalid lifecycle response/);
  }
});

test('displays immutable brief binding and distinguishes stale research', () => {
  const data = fixture();
  data.lifecycle.brief = { hash: 'a'.repeat(64), snapshot: { revision: 2 } };
  data.lifecycle.approval = { scope: 'research_brief_only', revision: 2, briefHash: 'a'.repeat(64) };
  assert.match(formatStatus(statusView(data, taskId)), /research approved/);
  data.lifecycle.approval = null;
  data.lifecycle.brief.snapshot.revision = 1;
  assert.match(formatStatus(statusView(data, taskId)), /\(stale\)/);
  data.lifecycle.approval = { scope: 'research_brief_only', revision: 1, briefHash: 'a'.repeat(64) };
  assert.throws(() => statusView(data, taskId), /Invalid lifecycle response/);
});

test('compact status preserves large brief parity without fetching or exporting raw input', async () => {
  const full = fixture();
  const rawIdea = 'PRIVATE_RAW_IDEA '.repeat(3125);
  const sources = Array.from({ length: 30 }, (_, index) => ({ id: `source-${index}`, label: 'r'.repeat(4000), reference: 'https://example.test', kind: 'primary', independenceGroup: `group-${index}`, limitations: [], capturedAt: '2026-10-15T00:00:00Z' }));
  const snapshot = { revision: 2, rawIdea, title: full.lifecycle.title, sources, claims: [], openDecisions: [], mandate: { ...full.lifecycle.mandate, maximumSources: 30 }, checkpoint: full.lifecycle.checkpoint, outcome: null,
    brief: { objective: 'Verify idea', user: 'Founder', payer: 'Client', nonGoals: [], acceptanceCriteria: [{ id: 'test', criterion: 'Works', validation: 'Exercise flow' }], outputs: Array.from({ length: 13 }, (_, index) => ({ id: index + 1, status: 'included', content: 'b'.repeat(4000) })), design: { summary: 'Existing app', sourceIds: [] }, target: { repository: 'example/product', baseBranch: 'main' }, risks: [], openDecisions: [] } };
  Object.assign(full.lifecycle, { rawIdea, sources, mandate: snapshot.mandate, brief: { hash: 'a'.repeat(64), snapshot } });
  full.handoff = { manifest: { snapshot }, prompt: JSON.stringify(snapshot) };
  full.mission = { metadata: { lifecycle: full.lifecycle } };
  assert.ok(Buffer.byteLength(JSON.stringify(full.lifecycle)) < 512 * 1024);
  assert.ok(Buffer.byteLength(JSON.stringify(full)) > 1_048_576);
  const compact = { taskId, source: full.source, progress: full.progress, lifecycle: {
    kind: full.lifecycle.kind, title: full.lifecycle.title, revision: full.lifecycle.revision,
    checkpoint: full.lifecycle.checkpoint, mandate: full.lifecycle.mandate, sources: sources.map(({ id }) => ({ id })),
    brief: { hash: full.lifecycle.brief.hash, snapshot: { revision: snapshot.revision } }, approval: null,
  } };
  const logs = [];
  assert.equal(await main([...args, '--json'], { env, output: { log: value => logs.push(value), error: assert.fail }, fetcher: async url => {
    assert.equal(url.searchParams.get('view'), 'status');
    assert.ok(Buffer.byteLength(JSON.stringify(compact)) < 10_000);
    assert.ok(!JSON.stringify(compact).includes('PRIVATE_RAW_IDEA'));
    return response(compact);
  } }), 0);
  assert.deepEqual(JSON.parse(logs[0]), statusView(full, taskId));
  assert.doesNotMatch(logs[0], /PRIVATE_RAW_IDEA|rawIdea|handoff|manifest/);
});

test('missing or invalid cookie fails before fetch without exposing its value', async () => {
  for (const cookie of [undefined, 'session=secret\r\nheader=value', 'x'.repeat(16385)]) await assert.rejects(readStatus(options, { env: { TEST_SESSION: cookie }, fetcher: () => assert.fail('must not fetch') }), /^Error: Session cookie environment value is missing or invalid\.$/);
});

test('HTTP failures and network exception text cannot disclose server payloads or credentials', async () => {
  for (const status of [401, 403, 404, 409, 500, 503]) {
    await assert.rejects(readStatus(options, { env, fetcher: async () => new Response('credential=secret', { status }) }), error => !error.message.includes('secret') && !error.message.includes(env.TEST_SESSION));
  }
  await assert.rejects(readStatus(options, { env, fetcher: async () => { throw new Error(env.TEST_SESSION); } }), /Lifecycle request unavailable or timed out/);
});

test('rejects oversized, non-JSON, and malformed response bodies', async () => {
  for (const reply of [new Response('x', { headers: { 'content-type': 'text/html' } }), response('x'.repeat(1_048_576)), new Response('{broken', { headers: { 'content-type': 'application/json' } })]) await assert.rejects(readStatus(options, { env, fetcher: async () => reply }), /Invalid lifecycle response|exceeds size limit/);
});

test('CLI emits status JSON and nonzero failures without logging secrets', async () => {
  const logs = [], errors = [];
  const output = { log: value => logs.push(value), error: value => errors.push(value) };
  assert.equal(await main([...args, '--json'], { env, fetcher: async () => response(fixture()), output }), 0);
  assert.equal(JSON.parse(logs[0]).taskId, taskId);
  assert.equal(await main([...args, '--cookie', 'do-not-print'], { output }), 1);
  assert.doesNotMatch(JSON.stringify({ logs, errors }), /synthetic-test-value|do-not-print/);
});

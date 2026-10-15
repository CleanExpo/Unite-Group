import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { approvedUrl, childEnvironment, killProcessTree, main, prepareWindowsContainment, requestResearch, researchArguments, researchHash, researchPrompt, ResearchWorkerError, runOnce, runResearchProcess, streamObserver, validateClaim, windowsArgumentsFit, workerConfig } from './research.mjs';

const taskId = 'ca20d7c2-fbc7-4d84-af4c-f3781e560b65';
const runId = '8f3daf48-d362-42f1-95c2-1eeec280a65c';
const leaseToken = '11111111-1111-4111-8111-111111111111';
const now = Date.parse('2026-10-15T02:00:00Z');
const env = { NEXUS_APP_URL: 'http://127.0.0.1:3008', AGENT_EVENTS_SECRET: 'synthetic-runner-secret', RUNNER_ID: 'research-test' };
const args = ['--once', '--task-id', taskId, '--run-id', runId];
const config = workerConfig(args, env);
const proposal = () => ({ schemaVersion: 1, kind: 'untrusted_research_proposal', summary: 'Public evidence proposal', sources: [], claims: [], openDecisions: [], options: [], proposedBrief: null });
const formatterSchema = () => ({ type: 'object', properties: { kind: { const: 'untrusted_research_proposal' }, schemaVersion: { const: 1 } } });
const help = '--safe-mode --restricted --permission-mode --tools --allowedTools --disallowedTools --strict-mcp-config --no-chrome --no-session-persistence --json-schema --output-format --setting-sources';
const fixture = () => {
  const input = { title: 'Research idea', rawIdea: 'Compare public options', sources: [], claims: [], openDecisions: [], mandate: { objective: 'Research', maximumSources: 3, spendLimitMinor: 0, currency: 'AUD', allowedSources: ['public web'], paidApiAllowed: false } };
  const { mandate, ...binding } = input;
  const authority = { runId, taskId, founderId: taskId, actorId: taskId, lifecycleRevision: 2, inputHash: researchHash(binding), mandateHash: researchHash(mandate), approvedAt: new Date(now).toISOString(), expiresAt: new Date(now + 30 * 60_000).toISOString(), scope: 'public_research_only', limits: { maximumSources: 3, timeLimitMinutes: 2, maxTurns: 4, concurrency: 1 }, allowedDomains: ['example.test'], paidApiAllowed: false, subscriptionCredits: 'unknown' };
  return { taskId, source: 'supabase', continue: true, input, resultSchema: formatterSchema(), research: { schemaVersion: 1, id: runId, taskId, founderId: taskId, state: 'running', authority, authorityHash: researchHash(authority), lease: { token: leaseToken, runnerId: config.runnerId, expiresAt: new Date(now + 90_000).toISOString() }, startedAt: new Date(now).toISOString(), deadlineAt: new Date(now + 120_000).toISOString(), checkpoint: null } };
};
const claim = () => validateClaim(fixture(), config, now);
const event = (type, content, id = 'turn-1') => ({ type, message: { id, content } });
const tool = (name = 'WebFetch', url = 'https://example.test/source', id = 'fetch-1') => event('assistant', [{ type: 'tool_use', id, name, input: { url } }]);
const toolResult = (id = 'fetch-1', is_error = false) => event('user', [{ type: 'tool_result', tool_use_id: id, is_error, content: 'Public content' }]);
const final = (data = proposal(), num_turns = 1) => ({ type: 'result', subtype: 'success', is_error: false, num_turns, structured_output: data });
const formatter = (data = proposal(), id = 'format-1') => event('assistant', [{ type: 'tool_use', id, name: 'StructuredOutput', input: data }], 'turn-2');
const fakeChild = () => Object.assign(new EventEmitter(), { pid: 1234, stdout: new PassThrough(), stderr: new PassThrough(), stdin: new PassThrough() });
const writeEvents = (child, events) => { child.stdout.write(events.map(value => JSON.stringify(value)).join('\n') + '\n'); child.emit('close', 0); };
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const subscriptionLimit = () => ({ type: 'result', subtype: 'success', is_error: true, result: "You've hit your weekly limit · resets Oct 20, 5am (Australia/Brisbane)", num_turns: 1 });
const subscriptionLimitReason = 'The monthly subscription research allowance is exhausted. Check the provider account for its reset time before starting another approved run. Paid API fallback is disabled.';

test('worker requires explicit single run and rejects secret-bearing or remote HTTP origins', () => {
  assert.equal(config.origin, env.NEXUS_APP_URL);
  assert.throws(() => workerConfig(args.slice(1), env), /usage_requires_once/);
  for (const origin of ['http://remote.test', 'https://user:password@remote.test', 'https://remote.test/path', 'https://remote.test/?', 'https://remote.test/#']) assert.throws(() => workerConfig(args, { ...env, NEXUS_APP_URL: origin }), /invalid_app_origin/);
  assert.throws(() => workerConfig([...args, '--cookie', 'never-print'], env), /invalid_options/);
});

test('OS environment preserves subscription identity while dropping all API, nested session and repo secrets', () => {
  const clean = childEnvironment({ PATH: 'native-bin', USERPROFILE: 'identity-home', HOME: 'identity-home', APPDATA: 'os-appdata', SystemRoot: 'os-system', ANTHROPIC_API_KEY: 'paid', ANTHROPIC_AUTH_TOKEN: 'paid', ANTHROPIC_BASE_URL: 'redirect', CLAUDE_CONFIG_DIR: 'alternate-auth', CLAUDECODE: 'nested', NODE_OPTIONS: '--require=evil', OPENAI_API_KEY: 'paid', OPENROUTER_API_KEY: 'paid', AGENT_EVENTS_SECRET: 'runner', SUPABASE_SERVICE_ROLE_KEY: 'db', MCP_CONFIG: 'injected', HTTPS_PROXY: 'proxy', NEXUS_REPO_ROOT: 'repo' });
  assert.deepEqual(clean, { PATH: 'native-bin', USERPROFILE: 'identity-home', HOME: 'identity-home', APPDATA: 'os-appdata', SystemRoot: 'os-system', TERM: 'dumb', NO_COLOR: '1' });
});

test('claim validates immutable input and authority, live lease and bounded allowance', () => {
  assert.equal(claim().remainingMs, 120_000);
  for (const change of [data => { data.input.rawIdea = 'changed'; }, data => { data.research.lease.expiresAt = 'invalid'; }, data => { data.research.authority.paidApiAllowed = true; }, data => { data.research.authority.allowedDomains = ['localhost']; }, data => { data.research.authority.limits.maxTurns = 100; }, data => { data.research.id = taskId; }]) { const data = fixture(); change(data); assert.throws(() => validateClaim(data, config, now)); }
  const resumed = fixture(); resumed.research.checkpoint = { turnsUsed: 2 }; assert.equal(validateClaim(resumed, config, now).limits.maxTurns, 2);
});

test('Claude args expose only public research tools without permission bypass, shell or custom config', () => {
  const values = researchArguments(claim());
  assert.equal(values[values.indexOf('--permission-mode') + 1], 'dontAsk');
  assert.equal(values[values.indexOf('--tools') + 1], 'WebSearch,WebFetch');
  assert.equal(values[values.indexOf('--max-turns') + 1], '4');
  for (const value of ['--safe-mode', '--restricted', '--strict-mcp-config', 'mcp__*', 'WebFetch(domain:example.test)', '--no-session-persistence', '--no-chrome']) assert.ok(values.includes(value));
  assert.ok(!values.some(value => /bypassPermissions|--bare|--chrome|dangerously-skip/.test(value)));
  assert.ok(!values.join(' ').includes('Compare public options'));
  assert.ok(researchPrompt(claim()).includes('Compare public options'));
  assert.equal(values[values.indexOf('--input-format') + 1], 'text');
  assert.equal(windowsArgumentsFit('C:\\claude.exe', values), true);
  assert.equal(windowsArgumentsFit('C:\\claude.exe', ['x'.repeat(40_000)]), false);
});

test('schema-valid 50000-character idea stays complete in stdin and absent from native argv', async () => {
  const data = fixture(); data.input.rawIdea = '研究🦘'.repeat(12500); assert.equal(data.input.rawIdea.length, 50000);
  const { mandate, ...binding } = data.input; data.research.authority.inputHash = researchHash(binding); data.research.authorityHash = researchHash(data.research.authority);
  const largeClaim = validateClaim(data, config, now), child = fakeChild(), nativeDirectory = join(tmpdir(), 'unite-research-test-native'); let request;
  const containment = await prepareWindowsContainment({ PATH: nativeDirectory, SystemRoot: 'C:\\Windows' }, { platform: 'win32', exists: async candidate => { assert.equal(candidate, join(nativeDirectory, 'claude.exe')); }, spawn: () => {
    let encoded = ''; child.stdin.on('data', chunk => { encoded += chunk; }); child.stdin.on('finish', () => { request = JSON.parse(encoded); writeEvents(child, [final()]); }); return child;
  } });
  await containment.execute(largeClaim, { cwd: 'isolated', env: {} });
  assert.equal(request.executable, join(nativeDirectory, 'claude.exe'));
  assert.equal(JSON.parse(request.input).input.rawIdea, data.input.rawIdea);
  assert.ok(!request.arguments.join(' ').includes(data.input.rawIdea)); assert.equal(windowsArgumentsFit(request.executable, request.arguments), true);
});

test('tool observations require actual matching success events; search discovery and proposed URLs do not prove fetch', () => {
  const observer = streamObserver(['example.test'], 4, () => '2026-10-15T02:00:01Z');
  observer.accept(tool()); assert.equal(observer.snapshot().observations.length, 0);
  observer.accept(toolResult());
  observer.accept(tool('WebSearch', undefined, 'search-1')); observer.accept(toolResult('search-1'));
  observer.accept(tool('WebFetch', 'https://example.test/failure', 'fetch-2')); observer.accept(toolResult('fetch-2', true));
  observer.accept(final());
  assert.deepEqual(observer.snapshot().observations, [
    { toolUseId: 'fetch-1', tool: 'WebFetch', url: 'https://example.test/source', observedAt: '2026-10-15T02:00:01Z', status: 'success' },
    { toolUseId: 'search-1', tool: 'WebSearch', observedAt: '2026-10-15T02:00:01Z', status: 'success' },
    { toolUseId: 'fetch-2', tool: 'WebFetch', url: 'https://example.test/failure', observedAt: '2026-10-15T02:00:01Z', status: 'error' },
  ]);
  assert.equal(observer.result().kind, 'untrusted_research_proposal');
  assert.equal(observer.snapshot().usageReconciled, true);
});

test('domain lookalikes, operational tool events, factual claims and unknown usage fail closed', () => {
  assert.equal(approvedUrl('https://example.test.evil.test', ['example.test']), null);
  assert.equal(approvedUrl('https://user:secret@example.test', ['example.test']), null);
  assert.equal(approvedUrl('https://sub.example.test', ['example.test']), 'https://sub.example.test/');
  assert.throws(() => streamObserver(['example.test'], 1).accept(tool('Bash')), /unexpected_tool/);
  assert.throws(() => streamObserver(['example.test'], 1).accept(tool('StructuredOutput')), /unexpected_formatter/);
  assert.throws(() => streamObserver(['example.test'], 1).accept(tool('WebFetch', 'https://evil.test')), /fetch_domain_not_approved/);
  const factual = streamObserver(['example.test'], 1), data = proposal(); data.claims = [{ classification: 'reported_fact' }]; factual.accept(final(data)); assert.throws(() => factual.result(), /invalid_research_proposal/);
  const unknown = streamObserver(['example.test'], 1); const output = final(); delete output.num_turns; unknown.accept(output); assert.throws(() => unknown.result(), /research_usage_unknown/);
});

test('native schema formatter binds the final reply and never becomes fetched-source evidence or an operational grant', async () => {
  const child = fakeChild(), data = proposal();
  data.sources = [{ id: 'public-source', label: 'Official page', reference: 'https://example.test/source', kind: 'primary', independenceGroup: 'official', limitations: ['Unreviewed proposal'], capturedAt: '2026-10-15T02:00:01Z' }];
  const output = await runResearchProcess(claim(), { cwd: 'isolated', env: {}, spawn: (_command, values) => {
    assert.equal(values[values.indexOf('--tools') + 1], 'WebSearch,WebFetch');
    assert.ok(!values.includes('StructuredOutput'));
    queueMicrotask(() => writeEvents(child, [tool(), toolResult(), formatter(data), toolResult('format-1'), final(data, 2)])); return child;
  } });
  assert.deepEqual(output.result, data); assert.equal(output.toolCalls, 1); assert.equal(output.turnsUsed, 2);
  assert.equal(output.observations.length, 1); assert.equal(output.observations[0].tool, 'WebFetch');
  assert.ok(!output.observations.some(observation => observation.toolUseId === 'format-1'));
});

test('formatter without research schema, duplicate formatter, changed schema and changed final payload are rejected', () => {
  const absent = streamObserver(['example.test'], 4); assert.throws(() => absent.accept(formatter()), /unexpected_formatter/);
  const duplicate = streamObserver(['example.test'], 4, undefined, formatterSchema()); duplicate.accept(formatter()); assert.throws(() => duplicate.accept(formatter(proposal(), 'format-2')), /unexpected_formatter/);
  const schema = formatterSchema(), changed = streamObserver(['example.test'], 4, undefined, schema); changed.accept(formatter()); schema.properties.kind.const = 'authoritative'; changed.accept(final()); assert.throws(() => changed.result(), /formatter_payload_changed/);
  const mismatch = streamObserver(['example.test'], 4, undefined, formatterSchema()); mismatch.accept(formatter()); const other = proposal(); other.summary = 'Changed after formatting'; mismatch.accept(final(other)); assert.throws(() => mismatch.result(), /formatter_payload_changed/);
});

test('formatter cannot hide operational tools, incomplete fetches, excess bytes or formatter errors', () => {
  for (const name of ['Bash', 'Read', 'mcp__arbitrary', 'WebSearch']) {
    const observer = streamObserver(['example.test'], 4, undefined, formatterSchema()); observer.accept(formatter()); assert.throws(() => observer.accept(tool(name, undefined, 'other')), /unexpected_tool/);
  }
  const pending = streamObserver(['example.test'], 4, undefined, formatterSchema()); pending.accept(tool()); assert.throws(() => pending.accept(formatter()), /unexpected_formatter/);
  const oversized = streamObserver(['example.test'], 4, undefined, formatterSchema()), data = proposal(); data.summary = 'x'.repeat(128 * 1024); assert.throws(() => oversized.accept(formatter(data)), /invalid_research_proposal/);
  const failed = streamObserver(['example.test'], 4, undefined, formatterSchema()); failed.accept(formatter()); assert.throws(() => failed.accept(toolResult('format-1', true)), /formatter_result_rejected/);
  const ended = streamObserver(['example.test'], 4, undefined, formatterSchema()); ended.accept(final()); assert.throws(() => ended.accept(formatter()), /event_after_cli_result/);
});

test('streamed process handles split UTF-8 and never exposes stderr secrets', async () => {
  const child = fakeChild(), data = proposal(); data.summary = 'Public café evidence';
  const result = await runResearchProcess(claim(), { cwd: 'isolated', env: {}, spawn: (command, values, options) => {
    assert.equal(command, 'claude'); assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
    queueMicrotask(() => { child.stderr.write('synthetic-private-value'); const bytes = Buffer.from(JSON.stringify(final(data)) + '\n'), split = bytes.indexOf(Buffer.from('é')) + 1; child.stdout.write(bytes.subarray(0, split)); child.stdout.write(bytes.subarray(split)); child.emit('close', 0); }); return child;
  } });
  assert.equal(result.result.summary, data.summary); assert.equal(result.usageReconciled, true); assert.doesNotMatch(JSON.stringify(result), /synthetic-private-value/);
});

test('deadline, output overflow and cancellation terminate the entire child tree', async () => {
  for (const cause of ['deadline', 'output', 'abort']) {
    const child = fakeChild(), controller = new AbortController(); let timer, kills = 0;
    const running = runResearchProcess(claim(), { cwd: 'isolated', env: {}, signal: controller.signal, setTimer: callback => { timer = callback; return 1; }, clearTimer: () => {}, spawn: () => child, terminate: async target => { assert.equal(target, child); kills++; child.emit('close', 1); } });
    if (cause === 'deadline') timer(); else if (cause === 'output') child.stdout.write(Buffer.alloc(1_048_577)); else controller.abort();
    await assert.rejects(running, /research_time_limit|research_output_limit|worker_cancelled/); assert.equal(kills, 1);
  }
});

test('low-level research process cannot run without an explicit containment spawn capability', async () => {
  await assert.rejects(runResearchProcess(claim(), { cwd: 'isolated', env: {} }), /research_kernel_containment_unavailable/);
});

test('broker cleanup failure cannot reconcile usage even after a provider final result', async () => {
  const child = fakeChild();
  await assert.rejects(runResearchProcess(claim(), { cwd: 'isolated', env: {}, spawn: () => {
    queueMicrotask(() => { child.stdout.write(JSON.stringify(final()) + '\n'); child.emit('close', 125); }); return child;
  } }), error => error.code === 'process_containment_unconfirmed' && error.progress.usageReconciled === false);
});

test('broker preflight refusal records known zero usage without accepting any proposal', async () => {
  const child = fakeChild();
  await assert.rejects(runResearchProcess(claim(), { cwd: 'isolated', env: {}, spawn: () => { queueMicrotask(() => child.emit('close', 126)); return child; } }), error => error.code === 'research_commandline_limit' && error.progress.usageReconciled === true && error.progress.turnsUsed === 0);
});

test('forced abort or deadline after provider final usage never reconciles an unconfirmed job tree', async () => {
  for (const reason of ['abort', 'deadline']) {
    const child = fakeChild(), controller = new AbortController(); let timer, kills = 0;
    const running = runResearchProcess(claim(), { cwd: 'isolated', env: {}, signal: controller.signal,
      setTimer: callback => { timer = callback; return 1; }, clearTimer: () => {}, spawn: () => child,
      terminate: async () => { kills++; child.emit('close', 1); },
    });
    child.stdout.write(JSON.stringify(final()) + '\n');
    if (reason === 'abort') controller.abort(); else timer();
    await assert.rejects(running, error => ['worker_cancelled', 'research_time_limit'].includes(error.code) && error.progress.usageReconciled === false);
    assert.equal(kills, 1);
  }
});

test('kill cleanup uses process group or fixed hidden taskkill and rejects uncertain termination', async () => {
  const calls = [];
  await killProcessTree({ pid: 1234 }, { platform: 'linux', kill: (...values) => calls.push(values) });
  assert.deepEqual(calls, [[-1234, 'SIGKILL']]);
  await killProcessTree({ pid: 1234 }, { platform: 'win32', env: { SystemRoot: 'C:\\Windows' }, execute: async (file, values, options) => { assert.ok(file.endsWith('taskkill.exe')); assert.deepEqual(values, ['/PID', '1234', '/T', '/F']); assert.equal(options.windowsHide, true); } });
  await assert.rejects(killProcessTree({ pid: 0 }), /process_containment_unconfirmed/);
  await assert.rejects(killProcessTree({ pid: 1234 }, { platform: 'win32', execute: async () => { throw new Error('private'); } }), /process_containment_unconfirmed/);
});

test('HTTP retries preserve identical checkpoint and finish bodies; terminal refusal stops without secret output', async () => {
  const bodies = []; let attempts = 0;
  const body = { action: 'finish', taskId, runId, result: proposal(), toolObservations: [] };
  assert.deepEqual(await requestResearch(config, body, { sleep: async () => {}, fetcher: async (url, options) => {
    assert.equal(url, `${env.NEXUS_APP_URL}/api/agents/runner/research`); assert.equal(options.redirect, 'error'); assert.ok(options.signal instanceof AbortSignal); bodies.push(options.body);
    if (++attempts === 1) throw new Error(env.AGENT_EVENTS_SECRET);
    return attempts === 2 ? response({}, 503) : response({ acknowledged: true });
  } }), { acknowledged: true });
  assert.equal(new Set(bodies).size, 1);
  for (const status of [401, 403, 409]) { let calls = 0; await assert.rejects(requestResearch(config, body, { sleep: async () => assert.fail('must not retry'), fetcher: async () => { calls++; return response({ error: env.AGENT_EVENTS_SECRET }, status); } }), error => !error.message.includes(env.AGENT_EVENTS_SECRET)); assert.equal(calls, 1); }
});

test('a lost claim acknowledgement is never retried into another model process', async () => {
  let calls = 0;
  await assert.rejects(requestResearch(config, { action: 'claim', taskId, runId }, { sleep: async () => assert.fail('must not retry claim'), fetcher: async () => { calls++; throw new Error('private'); } }), /research_claim_unconfirmed/);
  assert.equal(calls, 1);
});

function runHarness(overrides = {}) {
  const data = fixture(), commands = [], removed = [];
  const call = async body => {
    commands.push(structuredClone(body));
    assert.equal(body.platform, 'win32'); assert.equal(body.containment, 'job-object');
    if (body.action === 'checkpoint') data.research.checkpoint = body.checkpoint;
    if (body.action === 'finish') { data.research.state = 'completed'; data.research.result = body.result; data.research.toolObservations = body.toolObservations; data.continue = false; }
    if (body.action === 'block') { data.research.state = 'blocked'; data.continue = false; }
    return structuredClone(data);
  };
  const dependencies = { env: { ...env, ANTHROPIC_API_KEY: 'forbidden' }, now: () => now, isStopped: () => false, createScratch: async () => join(tmpdir(), 'unite-research-test'), removeScratch: async path => removed.push(path), call,
    prepare: async clean => {
      assert.equal(clean.ANTHROPIC_API_KEY, undefined);
      return { platform: 'win32', mechanism: 'job-object', probe: async (_file, values) => ({ stdout: values.includes('--help') ? help : JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty', subscriptionType: 'max' }) }), execute: async (_claim, options) => {
        assert.equal(options.env.ANTHROPIC_API_KEY, undefined);
        return { result: proposal(), observations: [], toolCalls: 0, turnsUsed: 1, usageReconciled: true };
      } };
    }, ...overrides };
  return { dependencies, commands, removed, data };
}

test('serial worker claims, checkpoints and confirms exact terminal proposal without build authority', async () => {
  const harness = runHarness(); const result = await runOnce(config, harness.dependencies);
  assert.deepEqual(harness.commands.map(command => command.action), ['claim', 'checkpoint', 'checkpoint', 'finish']);
  assert.equal(harness.commands[2].checkpoint.turnsUsed, 1); assert.equal(harness.commands[2].checkpoint.usageFinal, true); assert.equal(result.proposal, true); assert.equal(harness.removed.length, 1);
});

test('subscription auth fallback or unavailable kernel containment prevents claim and model invocation', async () => {
  await assert.rejects(prepareWindowsContainment({}, { platform: 'darwin' }), /research_kernel_containment_unavailable/);
  for (const auth of [{ loggedIn: false }, { loggedIn: true, authMethod: 'api_key', apiProvider: 'firstParty', subscriptionType: 'max' }]) {
    const harness = runHarness({ prepare: async () => ({ platform: 'win32', mechanism: 'job-object', probe: async (_file, values) => ({ stdout: values.includes('--help') ? help : JSON.stringify(auth) }), execute: async () => assert.fail('must not execute') }) });
    await assert.rejects(runOnce(config, harness.dependencies), /subscription_auth_unavailable/); assert.equal(harness.commands.length, 0);
  }
});

test('existing local HARD_STOP prevents all CLI probes and claims', async () => {
  const harness = runHarness({ isStopped: () => true, prepare: async () => assert.fail('must not prepare a CLI probe') });
  await assert.rejects(runOnce(config, harness.dependencies), /research_local_hard_stop/);
  assert.equal(harness.commands.length, 0);
});

test('existing local HARD_STOP aborts running research with unknown usage and no finish', async () => {
  let stopped = false, tick, startedResolve; const started = new Promise(resolve => { startedResolve = resolve; });
  const harness = runHarness({ isStopped: () => stopped, setTimer: callback => { tick = callback; return 1; }, clearTimer: () => {} });
  const prepare = harness.dependencies.prepare;
  harness.dependencies.prepare = async clean => ({ ...await prepare(clean), execute: async (_claim, { signal }) => new Promise((_resolve, reject) => { signal.addEventListener('abort', () => { const error = new ResearchWorkerError('worker_cancelled'); error.progress = { toolCalls: 1, turnsUsed: 1, usageReconciled: false, observations: [] }; reject(error); }, { once: true }); startedResolve(); }) });
  const running = runOnce(config, harness.dependencies); await started; stopped = true; tick();
  await assert.rejects(running, /research_local_hard_stop/);
  assert.equal(harness.commands.at(-1).action, 'block'); assert.equal(harness.commands.at(-1).usageReconciled, false);
  assert.ok(!harness.commands.some(command => command.action === 'finish'));
});

test('stale heartbeat aborts active child, and no finish or block writes follow the lost lease', async () => {
  let tick, startedResolve; const started = new Promise(resolve => { startedResolve = resolve; });
  const harness = runHarness();
  const original = harness.dependencies.call;
  harness.dependencies.setTimer = callback => { tick = callback; return 1; }; harness.dependencies.clearTimer = () => {};
  harness.dependencies.call = async body => { if (body.action === 'heartbeat') { harness.commands.push(body); throw new ResearchWorkerError('research_lease_stopped'); } return original(body); };
  const prepare = harness.dependencies.prepare;
  harness.dependencies.prepare = async clean => ({ ...await prepare(clean), execute: async (_claim, { signal }) => new Promise((_resolve, reject) => { signal.addEventListener('abort', () => reject(new ResearchWorkerError('worker_cancelled')), { once: true }); startedResolve(); }) });
  const running = runOnce(config, harness.dependencies); await started; tick();
  await assert.rejects(running, /research_lease_stopped/);
  assert.deepEqual(harness.commands.map(command => command.action), ['claim', 'checkpoint', 'heartbeat']);
});

test('worker does not recycle unknown usage and records a blocked interruption', async () => {
  const harness = runHarness(); const prepare = harness.dependencies.prepare;
  harness.dependencies.prepare = async clean => ({ ...await prepare(clean), execute: async () => { throw new ResearchWorkerError('research_usage_unknown'); } });
  await assert.rejects(runOnce(config, harness.dependencies), /research_usage_unknown/);
  const blocked = harness.commands.at(-1); assert.equal(blocked.action, 'block'); assert.equal(blocked.usageReconciled, false); assert.ok(!harness.commands.some(command => command.action === 'finish'));
});

test('final usage is checkpointed only after the provider process stopped and before a reconciled block', async () => {
  const harness = runHarness(); const prepare = harness.dependencies.prepare; let stopped = false;
  harness.dependencies.prepare = async clean => ({ ...await prepare(clean), execute: async () => {
    stopped = true; const error = new ResearchWorkerError('invalid_research_proposal'); error.progress = { toolCalls: 2, turnsUsed: 3, usageReconciled: true, observations: [] }; throw error;
  } });
  const original = harness.dependencies.call;
  harness.dependencies.call = async body => { if (body.checkpoint?.usageFinal) assert.equal(stopped, true); return original(body); };
  await assert.rejects(runOnce(config, harness.dependencies), /invalid_research_proposal/);
  assert.equal(harness.commands.at(-2).checkpoint.usageFinal, true); assert.equal(harness.commands.at(-2).checkpoint.turnsUsed, 3); assert.equal(harness.commands.at(-1).usageReconciled, true);
});

test('terminal subscription quota is safely classified after process exit and saved with reconciled usage', async () => {
  for (const exitCode of [0, 1]) {
    const child = fakeChild(), harness = runHarness(); const prepare = harness.dependencies.prepare;
    harness.dependencies.prepare = async clean => ({ ...await prepare(clean), execute: async () => runResearchProcess(claim(), {
      cwd: 'isolated', env: {}, spawn: () => { queueMicrotask(() => { child.stdout.write(JSON.stringify(subscriptionLimit()) + '\n'); child.emit('close', exitCode); }); return child; },
    }) });
    await assert.rejects(runOnce(config, harness.dependencies), error => error.code === 'research_subscription_limit' && error.message === subscriptionLimitReason);
    assert.equal(harness.commands.at(-2).checkpoint.turnsUsed, 1);
    assert.equal(harness.commands.at(-2).checkpoint.toolCalls, 0);
    assert.equal(harness.commands.at(-2).checkpoint.usageFinal, true);
    assert.equal(harness.commands.at(-1).reason, subscriptionLimitReason);
    assert.equal(harness.commands.at(-1).usageReconciled, true);
    assert.equal(harness.commands.filter(command => command.action === 'claim').length, 1);
    assert.ok(!harness.commands.some(command => command.action === 'finish'));
    assert.doesNotMatch(JSON.stringify(harness.commands), /Oct 20|Brisbane/);
  }
});

test('unrecognised provider errors stay generic and never leak raw result text', async () => {
  for (const result of ['synthetic-provider-secret', "You've hit your weekly limit · resets synthetic-secret\nprivate-token", 'Quota exhausted: synthetic-provider-secret']) {
    const child = fakeChild();
    await assert.rejects(runResearchProcess(claim(), { cwd: 'isolated', env: {}, spawn: () => {
      queueMicrotask(() => writeEvents(child, [{ ...subscriptionLimit(), result }])); return child;
    } }), error => error.code === 'research_cli_failed' && error.message === 'research_cli_failed' && !JSON.stringify(error).includes('synthetic-provider-secret'));
  }
});

test('quota-like assistant text is untrusted content, and terminal quota without known turns keeps usage unknown', async () => {
  const child = fakeChild();
  const output = await runResearchProcess(claim(), { cwd: 'isolated', env: {}, spawn: () => {
    queueMicrotask(() => writeEvents(child, [event('assistant', [{ type: 'text', text: subscriptionLimit().result }]), final()])); return child;
  } });
  assert.deepEqual(output.result, proposal());
  const unknown = fakeChild(), terminal = subscriptionLimit(); delete terminal.num_turns;
  await assert.rejects(runResearchProcess(claim(), { cwd: 'isolated', env: {}, spawn: () => {
    queueMicrotask(() => writeEvents(unknown, [terminal])); return unknown;
  } }), error => error.code === 'research_subscription_limit' && error.progress.usageReconciled === false);
});

test('subscription quota CLI reports its safe internal code without provider reset text', async () => {
  const harness = runHarness(), errors = [], prepare = harness.dependencies.prepare;
  harness.dependencies.prepare = async clean => ({ ...await prepare(clean), execute: async () => {
    const child = fakeChild(); return runResearchProcess(claim(), { cwd: 'isolated', env: {}, spawn: () => {
      queueMicrotask(() => writeEvents(child, [subscriptionLimit()])); return child;
    } });
  } });
  assert.equal(await main(args, { ...harness.dependencies, output: { log: assert.fail, error: value => errors.push(value) } }), 1);
  assert.deepEqual(errors, ['Public research stopped: research_subscription_limit.']);
});

test('unconfirmed checkpoint does not start a model or claim false final acknowledgement', async () => {
  const harness = runHarness(); const original = harness.dependencies.call;
  harness.dependencies.call = async body => { const data = await original(body); if (body.action === 'checkpoint') data.research.checkpoint.sequence++; return data; };
  const prepare = harness.dependencies.prepare;
  harness.dependencies.prepare = async clean => ({ ...await prepare(clean), execute: async () => assert.fail('must not execute') });
  await assert.rejects(runOnce(config, harness.dependencies), /research_persistence_unconfirmed/);
  assert.ok(!harness.commands.some(command => command.action === 'finish'));
});

test('CLI errors never disclose credentials or raw provider exception messages', async () => {
  const errors = [];
  assert.equal(await main([...args, '--secret', 'private'], { env, output: { log: assert.fail, error: value => errors.push(value) } }), 1);
  assert.doesNotMatch(errors.join(' '), /synthetic-runner-secret|private/);
});

const broker = fileURLToPath(new URL('./research-containment.ps1', import.meta.url));
const powershell = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
async function harmlessBroker(code, timeoutMs, cwd, input = '', nativeArgs = ['-e', code]) {
  return new Promise((resolveBroker, rejectBroker) => {
    const child = spawn(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', broker], { env: childEnvironment(), cwd, windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', value => { stdout += value; }); child.stderr.on('data', value => { stderr += value; }); child.on('error', rejectBroker); child.on('close', status => resolveBroker({ status, stdout, stderr }));
    child.stdin.end(JSON.stringify({ executable: process.execPath, arguments: nativeArgs, input, cwd, timeoutMs, parentPid: process.pid }));
  });
}

test('Windows native Job Object runs harmless quoted arguments and kills descendants on child exit', { skip: process.platform !== 'win32', timeout: 20_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'unite-research-broker-test-'));
  try {
    const quote = 'spaces "quotes" \\ tail\\ Unicode café 漢字 🦘';
    const code = `const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{detached:true,stdio:'ignore'}); child.unref(); console.log(JSON.stringify({pid:child.pid,quoted:${JSON.stringify(quote)}}));`;
    const output = await harmlessBroker(code, 5000, cwd);
    assert.equal(output.status, 0, output.stderr);
    const value = JSON.parse(output.stdout.trim()); assert.equal(value.quoted, quote);
    assert.throws(() => process.kill(value.pid, 0), error => error.code === 'ESRCH');
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('Windows native Job Object deadline terminates a harmless long-running child', { skip: process.platform !== 'win32', timeout: 20_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'unite-research-broker-test-'));
  try {
    const output = await harmlessBroker('console.log(process.pid);setInterval(()=>{},1000)', 1500, cwd);
    assert.equal(output.status, 124, output.stderr); const pid = Number(output.stdout.trim()); assert.ok(pid > 0);
    assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('Windows broker transports more than 50000 Unicode prompt characters exactly through child stdin', { skip: process.platform !== 'win32', timeout: 20_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'unite-research-broker-test-'));
  try {
    const input = '研究 café 🦘 '.repeat(6000); assert.ok(input.length >= 50_000);
    const code = 'let input="";process.stdin.setEncoding("utf8");process.stdin.on("data",chunk=>input+=chunk);process.stdin.on("end",()=>console.log(JSON.stringify({length:input.length,hash:require("node:crypto").createHash("sha256").update(input).digest("hex")})));';
    const output = await harmlessBroker(code, 5000, cwd, input);
    assert.equal(output.status, 0, output.stderr);
    assert.deepEqual(JSON.parse(output.stdout), { length: input.length, hash: createHash('sha256').update(input).digest('hex') });
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('Windows broker rejects oversized argv before creating any native child and reserves preflight exit code', { skip: process.platform !== 'win32', timeout: 20_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'unite-research-broker-test-'));
  try {
    const code = 'console.log("NATIVE_CHILD_STARTED")';
    const output = await harmlessBroker(code, 5000, cwd, '', ['-e', code, 'x'.repeat(40_000)]);
    assert.equal(output.status, 126, output.stderr); assert.equal(output.stdout, '');
    const nativeExit = await harmlessBroker('process.exit(126)', 5000, cwd);
    assert.equal(nativeExit.status, 127);
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('Windows broker remains deadline-responsive when a harmless child never reads its large stdin', { skip: process.platform !== 'win32', timeout: 20_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'unite-research-broker-test-'));
  try {
    const output = await harmlessBroker('console.log(process.pid);setInterval(()=>{},1000)', 1500, cwd, '研究🦘'.repeat(100_000));
    assert.equal(output.status, 124, output.stderr); const pid = Number(output.stdout.trim()); assert.ok(pid > 0);
    assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('Windows native Job Object kills a harmless child when its owning worker process disconnects', { skip: process.platform !== 'win32', timeout: 20_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'unite-research-broker-test-'));
  let host;
  try {
    const code = `const {spawn}=require('node:child_process'); const broker=spawn(${JSON.stringify(powershell)},['-NoLogo','-NoProfile','-NonInteractive','-File',${JSON.stringify(broker)}],{windowsHide:true,stdio:['pipe','pipe','pipe']}); broker.stdout.pipe(process.stdout); broker.stderr.pipe(process.stderr); broker.stdin.end(JSON.stringify({executable:process.execPath,arguments:['-e','console.log(process.pid);setInterval(()=>{},1000)'],cwd:${JSON.stringify(cwd)},timeoutMs:15000,parentPid:process.pid}));`;
    host = spawn(process.execPath, ['-e', code], { cwd, env: childEnvironment(), windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    const pid = await new Promise((resolvePid, rejectPid) => { let output = ''; host.stdout.on('data', value => { output += value; if (/^\d+\r?\n/.test(output)) resolvePid(Number(output.trim())); }); host.on('error', rejectPid); host.on('close', status => rejectPid(new Error(`Host exited early: ${status}`))); });
    host.kill();
    await new Promise(resolveDelay => setTimeout(resolveDelay, 200));
    assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
  } finally { if (host?.exitCode === null) host.kill(); await rm(cwd, { recursive: true, force: true }); }
});

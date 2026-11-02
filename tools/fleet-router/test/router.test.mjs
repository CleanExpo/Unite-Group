import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  chooseMachine, checkHeartbeat, createBrokerClient, createDeadman, createRouterState, eligibleMachines, ensureDirs,
  isFresh, loopOnce, parseBrokerUrl, readConfig, recoverClaims, routeOnce, validateRequest, writeHeartbeat,
} from '../router.mjs';
import { parseArgs, submit } from '../submit.mjs';
import { renderPlist, renderToFile } from '../render-plist.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROUTER = path.join(HERE, '..', 'router.mjs');
const NOW = 1_800_000_000_000;

const machine = (machineId, extra = {}) => ({
  machineId,
  lastSeen: NOW - 1_000,
  state: 'idle',
  repos: { 'unite-group': { available: true }, 'pi-dev-ops': { available: true } },
  ...extra,
});
const ALL = () => [machine('mac-mini'), machine('macbook-pro'), machine('windows-pc')];

describe('validateRequest', () => {
  it('accepts every valid shape', () => {
    for (const value of [
      { type: 'probe' },
      { type: 'probe', repo: 'unite-group' },
      { type: 'probe', repo: 'pi-dev-ops', machineId: 'windows-pc', note: 'x' },
    ]) assert.equal(validateRequest(value).ok, true, JSON.stringify(value));
  });

  it('rejects anything but a probe', () => {
    for (const type of ['spm-harness', 'PROBE', '', undefined, null]) {
      assert.equal(validateRequest({ type }).error, 'only_probe_is_accepted');
    }
  });

  it('rejects unknown fields, including ones the broker would act on', () => {
    assert.equal(validateRequest({ type: 'probe', engine: 'claude' }).error, 'unknown_field:engine');
    assert.equal(validateRequest(JSON.parse('{"type":"probe","__proto__":{}}')).error, 'unknown_field:__proto__');
  });

  it('rejects a bad repo, machine or note and non-objects', () => {
    assert.equal(validateRequest({ type: 'probe', repo: 'synthex' }).error, 'invalid_repo');
    assert.equal(validateRequest({ type: 'probe', repo: null }).error, 'invalid_repo');
    assert.equal(validateRequest({ type: 'probe', machineId: 'toaster' }).error, 'invalid_machine');
    assert.equal(validateRequest({ type: 'probe', note: 7 }).error, 'invalid_note');
    assert.equal(validateRequest({ type: 'probe', note: 'n'.repeat(201) }).error, 'invalid_note');
    for (const value of [null, [], 'probe', 3]) assert.equal(validateRequest(value).error, 'request_must_be_object');
  });
});

describe('eligibility', () => {
  it('uses the broker freshness window, strict at 45 seconds', () => {
    assert.equal(isFresh({ lastSeen: NOW - 44_999 }, NOW), true);
    assert.equal(isFresh({ lastSeen: NOW - 45_000 }, NOW), false);
    assert.equal(isFresh({}, NOW), false);
    assert.equal(isFresh({ lastSeen: NOW + 1 }, NOW), false);
  });

  it('requires the repo to be available when one is named', () => {
    const machines = [
      machine('mac-mini', { repos: { 'unite-group': { available: false } } }),
      machine('macbook-pro', { repos: {} }),
      machine('windows-pc', { repos: { 'unite-group': { available: 'true' } } }),
    ];
    assert.deepEqual(eligibleMachines(machines, { type: 'probe', repo: 'unite-group' }, NOW), []);
    assert.equal(eligibleMachines(machines, { type: 'probe' }, NOW).length, 3);
    assert.deepEqual(
      eligibleMachines(ALL(), { type: 'probe', repo: 'unite-group' }, NOW).map((m) => m.machineId),
      ['mac-mini', 'macbook-pro', 'windows-pc'],
    );
  });

  it('honours a pinned machine, even when another is idle', () => {
    const picked = eligibleMachines(ALL(), { type: 'probe', machineId: 'macbook-pro' }, NOW);
    assert.deepEqual(picked.map((m) => m.machineId), ['macbook-pro']);
    const stale = [machine('macbook-pro', { lastSeen: NOW - 50_000 }), machine('mac-mini')];
    assert.deepEqual(eligibleMachines(stale, { type: 'probe', machineId: 'macbook-pro' }, NOW), []);
  });

  it('ignores a machine it does not know', () => {
    const picked = eligibleMachines([machine('intruder'), machine('mac-mini')], { type: 'probe' }, NOW);
    assert.deepEqual(picked.map((m) => m.machineId), ['mac-mini']);
  });
});

describe('chooseMachine', () => {
  it('prefers idle over working, even when idle was routed more recently', () => {
    const machines = [machine('mac-mini', { state: 'working' }), machine('windows-pc')];
    assert.equal(chooseMachine(machines, { 'windows-pc': 9 }).machineId, 'windows-pc');
  });

  it('falls back to a working machine when nothing is idle', () => {
    assert.equal(chooseMachine([machine('windows-pc', { state: 'working' })]).machineId, 'windows-pc');
  });

  it('prefers the least recently routed, then id order', () => {
    assert.equal(chooseMachine(ALL()).machineId, 'mac-mini');
    assert.equal(chooseMachine(ALL(), { 'mac-mini': 2, 'macbook-pro': 1 }).machineId, 'windows-pc');
    assert.equal(chooseMachine(ALL(), { 'mac-mini': 3, 'macbook-pro': 1, 'windows-pc': 2 }).machineId, 'macbook-pro');
  });

  it('returns null with nothing to choose', () => {
    assert.equal(chooseMachine([]), null);
  });
});

describe('broker address', () => {
  it('refuses anything that is not loopback http', () => {
    for (const bad of ['https://127.0.0.1:1', 'http://example.com', 'http://u:p@127.0.0.1:1', 'not a url']) {
      assert.throws(() => parseBrokerUrl(bad), /FLEET_BROKER/, bad);
    }
    for (const good of ['http://127.0.0.1:42137', 'http://localhost:1', 'http://[::1]:1']) {
      assert.equal(parseBrokerUrl(good).protocol, 'http:');
    }
  });
});

describe('with a loopback fake broker', () => {
  let home;
  let server;
  let client;
  let requests;
  let machines;
  let failStatus;
  let failEnqueue;
  const logs = [];
  const realLog = console.log;

  beforeEach(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-router-'));
    requests = [];
    machines = ALL();
    failStatus = false;
    failEnqueue = false;
    logs.length = 0;
    console.log = (line) => logs.push(JSON.parse(line));
    server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => { raw += chunk; });
      req.on('end', () => {
        const reply = (code, value) => {
          res.writeHead(code, { 'content-type': 'application/json' });
          res.end(JSON.stringify(value));
        };
        if (req.method === 'GET' && req.url === '/status') {
          return failStatus ? reply(500, { error: 'broker_error' }) : reply(200, { machines, jobs: [] });
        }
        if (req.method === 'POST' && req.url === '/enqueue') {
          requests.push(JSON.parse(raw));
          if (failEnqueue) return reply(500, { error: 'broker_error' });
          return reply(201, { id: `job-${requests.length}`, status: 'pending' });
        }
        return reply(404, {});
      });
    });
    await new Promise((resolve) => { server.listen(0, '127.0.0.1', resolve); });
    client = createBrokerClient(`http://127.0.0.1:${server.address().port}`);
  });

  afterEach(async () => {
    console.log = realLog;
    await new Promise((resolve) => { server.close(resolve); });
    fs.rmSync(home, { recursive: true, force: true });
  });

  const dir = (name) => fs.readdirSync(path.join(home, name)).sort();
  const once = (state = createRouterState(home)) => routeOnce({ home, broker: client, state, now: () => NOW });
  const drop = (file, value) => {
    fs.mkdirSync(path.join(home, 'inbox'), { recursive: true });
    fs.writeFileSync(path.join(home, 'inbox', file), typeof value === 'string' ? value : JSON.stringify(value));
  };

  it('routes a valid request, rejects a bad one and leaves an unroutable one waiting', async () => {
    machines = [machine('mac-mini'), machine('windows-pc', { lastSeen: NOW - 60_000 })];
    drop('a-good.json', { type: 'probe', repo: 'unite-group', note: 'keep me out of the broker' });
    drop('b-bad.json', { type: 'spm-harness' });
    drop('c-broken.json', '{not json');
    drop('d-waits.json', { type: 'probe', machineId: 'windows-pc' });

    assert.deepEqual(await once(), { routed: 1, waiting: 1 });

    assert.deepEqual(requests, [{ type: 'probe', machineId: 'mac-mini' }]);
    const routed = JSON.parse(fs.readFileSync(path.join(home, 'routed', 'a-good.json'), 'utf8'));
    assert.equal(routed.machineId, 'mac-mini');
    assert.equal(routed.jobId, 'job-1');
    assert.equal(routed.request.note, 'keep me out of the broker');
    assert.ok(!Number.isNaN(Date.parse(routed.at)));
    assert.deepEqual(dir('inbox'), ['d-waits.json']);
    assert.deepEqual(dir('claimed'), []);
    assert.deepEqual(dir('rejected'), [
      'b-bad.json', 'b-bad.json.error.json', 'c-broken.json', 'c-broken.json.error.json',
    ]);
    const error = JSON.parse(fs.readFileSync(path.join(home, 'rejected', 'b-bad.json.error.json'), 'utf8'));
    assert.equal(error.error, 'only_probe_is_accepted');
    assert.equal(fs.readFileSync(path.join(home, 'rejected', 'c-broken.json'), 'utf8'), '{not json');
  });

  it('rejects a symlink and an oversized file without reading what they point at', async () => {
    fs.mkdirSync(path.join(home, 'inbox'));
    const outside = path.join(home, 'outside.json');
    fs.writeFileSync(outside, JSON.stringify({ type: 'probe' }));
    fs.symlinkSync(outside, path.join(home, 'inbox', 'link.json'));
    drop('big.json', { type: 'probe', note: 'x'.repeat(20_000) });
    drop('notes.txt', 'hello');
    await once();
    assert.deepEqual(requests, []);
    const reason = (file) => JSON.parse(fs.readFileSync(path.join(home, 'rejected', `${file}.error.json`), 'utf8')).error;
    assert.equal(reason('link.json'), 'not_a_regular_file');
    assert.equal(reason('big.json'), 'request_too_large');
    assert.equal(reason('notes.txt'), 'not_a_json_file');
    assert.ok(fs.existsSync(outside));
  });

  it('never overwrites an earlier record when a file name comes round again', async () => {
    drop('same.json', { type: 'probe', note: 'first' });
    const state = createRouterState(home);
    await once(state);
    drop('same.json', { type: 'probe', note: 'second' });
    await once(state);
    assert.equal(dir('routed').length, 2);
    assert.equal(JSON.parse(fs.readFileSync(path.join(home, 'routed', 'same.json'), 'utf8')).request.note, 'first');
  });

  it('logs a waiting file once, however many polls it waits', async () => {
    machines = [];
    drop('wait.json', { type: 'probe' });
    const state = createRouterState(home);
    await once(state);
    await once(state);
    await once(state);
    assert.equal(logs.filter((line) => line.event === 'no_eligible_machine').length, 1);
    assert.deepEqual(dir('inbox'), ['wait.json']);
  });

  it('routes a waiting file as soon as a machine becomes eligible', async () => {
    machines = [];
    drop('wait.json', { type: 'probe', machineId: 'mac-mini' });
    const state = createRouterState(home);
    await once(state);
    machines = ALL();
    await once(state);
    assert.deepEqual(requests, [{ type: 'probe', machineId: 'mac-mini' }]);
    assert.deepEqual(dir('inbox'), []);
  });

  it('rotates across machines within one pass and across a restart', async () => {
    for (const file of ['1.json', '2.json', '3.json', '4.json']) drop(file, { type: 'probe' });
    await once();
    assert.deepEqual(requests.map((r) => r.machineId), ['mac-mini', 'macbook-pro', 'windows-pc', 'mac-mini']);
    drop('5.json', { type: 'probe' });
    await once(createRouterState(home));
    assert.equal(requests[4].machineId, 'macbook-pro');
  });

  it('starts a fresh rotation when the saved one is unreadable', async () => {
    fs.writeFileSync(path.join(home, 'rotation.json'), '{broken');
    assert.deepEqual(createRouterState(home).rotation, { seq: 0, lastRouted: {} });
  });

  it('keeps the request and throws when the broker refuses it', async () => {
    drop('keep.json', { type: 'probe' });
    failEnqueue = true;
    await assert.rejects(once(), /HTTP 500/);
    assert.deepEqual(dir('inbox'), ['keep.json']);
    assert.deepEqual(dir('claimed'), []);
    assert.deepEqual(dir('routed'), []);
  });

  it('sends nothing when it cannot claim the request', async () => {
    drop('keep.json', { type: 'probe' });
    fs.mkdirSync(path.join(home, 'claimed'));
    fs.mkdirSync(path.join(home, 'claimed', 'keep.json'));
    fs.writeFileSync(path.join(home, 'claimed', 'keep.json', 'occupied'), '');
    await assert.rejects(once());
    assert.deepEqual(requests, []);
  });

  it('moves a crash-orphaned claim to rejected rather than sending it again', async () => {
    fs.mkdirSync(path.join(home, 'claimed'), { recursive: true });
    fs.writeFileSync(path.join(home, 'claimed', 'orphan.json'), JSON.stringify({ type: 'probe' }));
    recoverClaims(home);
    await once();
    assert.deepEqual(requests, []);
    assert.deepEqual(dir('claimed'), []);
    const error = JSON.parse(fs.readFileSync(path.join(home, 'rejected', 'orphan.json.error.json'), 'utf8'));
    assert.equal(error.error, 'interrupted_outcome_unknown');
  });

  it('refreshes the heartbeat on a healthy pass, including one with nothing eligible', async () => {
    machines = [];
    drop('wait.json', { type: 'probe' });
    const context = { home, broker: client, state: createRouterState(home), now: () => NOW };
    assert.equal(await loopOnce(context), true);
    const beat = JSON.parse(fs.readFileSync(path.join(home, 'heartbeat.json'), 'utf8'));
    assert.equal(beat.lastLoopAt, NOW);
    assert.equal(beat.pid, process.pid);
  });

  it('does not refresh the heartbeat on a broker error, with or without work', async () => {
    const context = { home, broker: client, state: createRouterState(home), now: () => NOW };
    ensureDirs(home);
    writeHeartbeat(home, 5);
    failStatus = true;
    assert.equal(await loopOnce(context), false);
    assert.equal(JSON.parse(fs.readFileSync(path.join(home, 'heartbeat.json'), 'utf8')).lastLoopAt, 5);

    failStatus = false;
    failEnqueue = true;
    drop('x.json', { type: 'probe' });
    assert.equal(await loopOnce(context), false);
    assert.equal(JSON.parse(fs.readFileSync(path.join(home, 'heartbeat.json'), 'utf8')).lastLoopAt, 5);
  });

  it('treats a status reply without a machines list as a failure, not as no machines', async () => {
    const original = machines;
    machines = undefined;
    await assert.rejects(client.status(), /no machines list/);
    machines = original;
  });

  it('refuses a redirect away from the broker', async () => {
    const redirecting = http.createServer((req, res) => {
      res.writeHead(302, { location: `http://127.0.0.1:${server.address().port}/status` });
      res.end();
    });
    await new Promise((resolve) => { redirecting.listen(0, '127.0.0.1', resolve); });
    try {
      await assert.rejects(createBrokerClient(`http://127.0.0.1:${redirecting.address().port}`).status());
    } finally {
      await new Promise((resolve) => { redirecting.close(resolve); });
    }
  });
});

describe('deadman', () => {
  it('expires only after the whole window with no healthy pass', () => {
    let t = 1_000;
    const deadman = createDeadman({ windowMs: 90_000, clock: () => t });
    t += 90_000;
    assert.equal(deadman.expired(), false);
    t += 1;
    assert.equal(deadman.expired(), true);
    deadman.alive();
    assert.equal(deadman.expired(), false);
  });

  describe('heartbeat check', () => {
    let home;
    beforeEach(() => {
      home = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-router-'));
      fs.mkdirSync(path.join(home, 'tmp'));
    });
    afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

    it('fails when missing, unreadable, stale or far in the future', () => {
      assert.equal(checkHeartbeat(home, 90_000, NOW).reason, 'heartbeat_missing');
      fs.writeFileSync(path.join(home, 'heartbeat.json'), '{broken');
      assert.equal(checkHeartbeat(home, 90_000, NOW).reason, 'heartbeat_unreadable');
      fs.writeFileSync(path.join(home, 'heartbeat.json'), '{"lastLoopAt":"soon"}');
      assert.equal(checkHeartbeat(home, 90_000, NOW).reason, 'heartbeat_unreadable');
      writeHeartbeat(home, NOW - 90_001);
      assert.equal(checkHeartbeat(home, 90_000, NOW).reason, 'heartbeat_stale');
      writeHeartbeat(home, NOW + 90_001);
      assert.equal(checkHeartbeat(home, 90_000, NOW).reason, 'heartbeat_stale');
      writeHeartbeat(home, NOW - 90_000);
      assert.equal(checkHeartbeat(home, 90_000, NOW).ok, true);
    });

    it('--check exits 1 when missing or stale and 0 when fresh', () => {
      const check = () => spawnSync(process.execPath, [ROUTER, '--check'], {
        env: { ...process.env, FLEET_ROUTER_HOME: home },
      }).status;
      assert.equal(check(), 1);
      writeHeartbeat(home, Date.now() - 200_000);
      assert.equal(check(), 1);
      writeHeartbeat(home);
      assert.equal(check(), 0);
    });

    it('the running process exits non-zero when its broker is unreachable past the window', async () => {
      const child = spawn(process.execPath, [ROUTER], {
        env: {
          ...process.env,
          FLEET_ROUTER_HOME: home,
          FLEET_BROKER: 'http://127.0.0.1:9',
          FLEET_ROUTER_POLL_MS: '50',
          FLEET_ROUTER_DEADMAN_MS: '300',
        },
        stdio: 'ignore',
      });
      const killer = setTimeout(() => child.kill('SIGKILL'), 20_000);
      const code = await new Promise((resolve) => { child.on('exit', (exit) => resolve(exit)); });
      clearTimeout(killer);
      assert.equal(code, 1);
      assert.equal(fs.existsSync(path.join(home, 'heartbeat.json')), false);
    });
  });
});

describe('settings', () => {
  it('refuses a bad number and a deadman not longer than the poll', () => {
    assert.throws(() => readConfig({ FLEET_ROUTER_POLL_MS: 'soon' }), /POLL_MS/);
    assert.throws(() => readConfig({ FLEET_ROUTER_DEADMAN_MS: '-1' }), /DEADMAN_MS/);
    assert.throws(() => readConfig({ FLEET_ROUTER_POLL_MS: '100', FLEET_ROUTER_DEADMAN_MS: '100' }), /longer/);
    const config = readConfig({});
    assert.equal(config.pollMs, 5_000);
    assert.equal(config.deadmanMs, 90_000);
    assert.equal(config.brokerUrl, 'http://127.0.0.1:42137');
  });
});

describe('submit', () => {
  let home;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-router-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  it('drops a valid request and leaves no temp file', () => {
    const file = submit(parseArgs(['--machine', 'mac-mini', '--repo', 'unite-group', '--note', 'n']), home);
    assert.deepEqual(fs.readdirSync(path.join(home, 'inbox')), [file]);
    assert.deepEqual(fs.readdirSync(path.join(home, 'tmp')), []);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, 'inbox', file), 'utf8')), {
      type: 'probe', machineId: 'mac-mini', repo: 'unite-group', note: 'n',
    });
  });

  it('refuses a bad request and writes nothing', () => {
    assert.throws(() => submit({ type: 'probe', machineId: 'toaster' }, home), /invalid_machine/);
    assert.throws(() => submit({ type: 'spm-harness' }, home), /only_probe/);
    assert.equal(fs.existsSync(path.join(home, 'inbox')), false);
    assert.throws(() => parseArgs(['--engine', 'claude']), /unknown/);
    assert.throws(() => parseArgs(['--machine']), /incomplete/);
  });

  it('names files so earlier submissions sort first', () => {
    const first = submit({ type: 'probe' }, home);
    const start = Date.now();
    while (Date.now() === start) { /* next millisecond */ }
    const second = submit({ type: 'probe' }, home);
    assert.deepEqual(fs.readdirSync(path.join(home, 'inbox')).sort(), [first, second]);
  });
});

describe('launchd template', () => {
  const template = fs.readFileSync(path.join(HERE, '..', 'com.unite.fleet-router.plist.template'), 'utf8');
  const options = { node: '/opt/n/node', routerDir: '/srv/My Router & Co', logDir: '/var/log/r' };

  it('keeps placeholders in the tracked file', () => {
    for (const name of ['__NODE_PATH__', '__ROUTER_DIR__', '__LOG_DIR__']) assert.ok(template.includes(name), name);
    for (const key of ['KeepAlive', 'RunAtLoad', 'ThrottleInterval', 'StandardOutPath', 'StandardErrorPath']) {
      assert.ok(template.includes(`<key>${key}</key>`), key);
    }
    assert.ok(template.includes('<string>com.unite.fleet-router</string>'));
  });

  it('fills every placeholder and escapes XML', () => {
    const rendered = renderPlist(template, options);
    assert.ok(!/__[A-Z_]+__/.test(rendered));
    assert.ok(rendered.includes('<string>/srv/My Router &amp; Co/router.mjs</string>'));
    assert.ok(rendered.includes('<string>/opt/n/node</string>'));
  });

  it('refuses a relative path and an unfilled placeholder', () => {
    assert.throws(() => renderPlist(template, { ...options, node: 'node' }), /absolute/);
    assert.throws(() => renderPlist('__SURPRISE__', options), /not filled/);
  });

  it('lints what it writes with plutil', { skip: process.platform !== 'darwin' && 'plutil is macOS only' }, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-router-'));
    try {
      const out = path.join(dir, 'out.plist');
      renderToFile({ ...options, logDir: path.join(dir, 'logs'), out });
      execFileSync('/usr/bin/plutil', ['-lint', out], { stdio: 'ignore' });
      assert.ok(fs.statSync(path.join(dir, 'logs')).isDirectory());
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

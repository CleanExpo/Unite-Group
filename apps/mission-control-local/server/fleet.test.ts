import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { BROKER_HOST, BROKER_PATH, BROKER_PORT, createFleetSource } from './broker.ts';
import { healthFor, MAX_JOBS, OFFLINE_AFTER_MS, STALE_AFTER_MS, toFleetView } from './fleet.ts';
import { redactDeep, redactText } from './redact.ts';

const FIXTURE_PATH = fileURLToPath(new URL('../fixtures/status.json', import.meta.url));
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
const NOW = fixture.capturedAt as number;

test('health changes at each threshold', () => {
  assert.equal(healthFor(null), 'not-reporting');
  assert.equal(healthFor(STALE_AFTER_MS - 1), 'online');
  assert.equal(healthFor(STALE_AFTER_MS), 'stale');
  assert.equal(healthFor(OFFLINE_AFTER_MS - 1), 'stale');
  assert.equal(healthFor(OFFLINE_AFTER_MS), 'offline');
});

test('the view holds three known machines and shows each state', () => {
  const view = toFleetView(fixture, NOW);
  assert.ok(view);
  assert.deepEqual(
    view.machines.map((m) => [m.id, m.health]),
    [['mac-mini', 'online'], ['macbook-pro', 'stale'], ['windows-pc', 'offline']],
  );
  assert.deepEqual(view.machines[1]?.repos[1], { name: 'pi-dev-ops', available: false, headSha: null });
});

test('a machine missing from the payload is shown as not reporting', () => {
  const view = toFleetView({ machines: [], jobs: [] }, NOW);
  assert.deepEqual(view?.machines.map((m) => m.health), ['not-reporting', 'not-reporting', 'not-reporting']);
});

test('refs, roots, IPs, hostnames and job results do not reach the view', () => {
  const out = JSON.stringify(toFleetView(fixture, NOW));
  for (const banned of ['refs', 'root', '/opt/fixture', '100.64.0', 'tailscaleIp', 'hostname', 'fixture-mini', 'not for the browser', 'freeMemoryMb', 'aaaaaaaabbbb']) {
    assert.ok(!out.includes(banned), `leaked ${banned}`);
  }
  // Positive control: the same search finds these in the raw fixture.
  assert.ok(JSON.stringify(fixture).includes('100.64.0'));
  assert.ok(JSON.stringify(fixture).includes('not for the browser'));
});

test('head SHA is cut to 8 characters and a non-SHA is dropped', () => {
  const view = toFleetView(fixture, NOW);
  assert.equal(view?.machines[0]?.repos[0]?.headSha, '11111111');
  const odd = toFleetView(
    { machines: [{ machineId: 'mac-mini', repos: { 'unite-group': { available: true, headSha: 'not a sha' } } }], jobs: [] },
    NOW,
  );
  assert.equal(odd?.machines[0]?.repos[0]?.headSha, null);
});

test('tailscaleIp appears only on opt-in', () => {
  assert.equal(toFleetView(fixture, NOW)?.machines[0]?.tailscaleIp, undefined);
  assert.equal(toFleetView(fixture, NOW, { showTailscaleIp: true })?.machines[0]?.tailscaleIp, '100.64.0.1');
});

test('a broker value that is not a short name never reaches the browser, whatever its format', () => {
  // A long token no scrubber rule knows, in every field the broker names.
  const planted = 'Unknownprefix' + 'x'.repeat(30);
  const spaced = 'run 10.1.2.3';
  for (const bad of [planted, spaced]) {
    const view = toFleetView(
      {
        machines: [
          {
            machineId: 'mac-mini',
            label: bad,
            state: bad,
            capabilities: { [bad]: true, claude: true },
            repos: { [bad]: { available: true }, 'unite-group': { available: true } },
          },
        ],
        jobs: [{ id: bad, machineId: bad, type: bad, status: bad }],
      },
      NOW,
    );
    assert.ok(!JSON.stringify(view).includes(bad), bad);
    assert.equal(view?.machines[0]?.state, 'unknown');
    assert.deepEqual(view?.machines[0]?.capabilities, [{ name: 'claude', enabled: true }]);
    assert.deepEqual(view?.machines[0]?.repos.map((r) => r.name), ['unite-group']);
    assert.deepEqual(view?.jobs[0], { id: 'unknown', type: 'unknown', status: 'unknown', machineId: null, createdAt: null, ageMs: null });
  }
});

test('real broker names pass the name rule unchanged', () => {
  const view = toFleetView(
    {
      machines: [{ machineId: 'mac-mini', state: 'idle', capabilities: { workspaceGuard: true }, repos: { 'pi-dev-ops': { available: true } } }],
      jobs: [{ id: 'cbeaca5e-e8ec-4ff6-a292-9aaa3a2ade51', machineId: 'macbook-pro', type: 'probe', status: 'completed' }],
    },
    NOW,
  );
  assert.equal(view?.machines[0]?.state, 'idle');
  assert.equal(view?.machines[0]?.capabilities[0]?.name, 'workspaceGuard');
  assert.equal(view?.machines[0]?.repos[0]?.name, 'pi-dev-ops');
  assert.deepEqual(view?.jobs[0], { id: 'cbeaca5e', machineId: 'macbook-pro', type: 'probe', status: 'completed', createdAt: null, ageMs: null });
});

test('a short unprefixed token in a named field does not reach the browser', () => {
  const planted = 'Qwerty1234567890AbCd';
  const view = toFleetView(
    {
      machines: [{ machineId: 'mac-mini', state: planted, capabilities: { [planted]: true }, repos: { [planted]: {} } }],
      jobs: [{ id: planted, machineId: planted, type: planted, status: planted }],
    },
    NOW,
  );
  assert.ok(!JSON.stringify(view).includes(planted));
});

test('redaction covers each rule and leaves plain words alone', () => {
  const home = '/Us' + 'ers/someone/secret.txt';
  const cases: [string, string][] = [
    ['ip 192.168.1.20', '[ip]'],
    ['mail a.person@example.com', '[email]'],
    ['Authorization: Bearer abc.def', '[secret]'],
    ['api_key=abc123', '[secret]'],
    [`at ${home}`, '[path]'],
    ['tok ey' + 'Jabc.eyJdef.ghi', '[secret]'],
  ];
  for (const [input, marker] of cases) assert.ok(redactText(input).includes(marker), input);
  assert.equal(redactText('verify queued on mac-mini'), 'verify queued on mac-mini');
  assert.deepEqual(redactDeep({ a: ['ip 10.0.0.1'], n: 5 }), { a: ['ip [ip]'], n: 5 });
});

test('jobs come newest first and are capped, with the true total kept', () => {
  const jobs = Array.from({ length: MAX_JOBS + 5 }, (_, n) => ({ id: `${n}`.padStart(8, '0'), createdAt: 1000 + n }));
  const view = toFleetView({ machines: [], jobs }, NOW);
  assert.equal(view?.jobs.length, MAX_JOBS);
  assert.equal(view?.jobsTotal, MAX_JOBS + 5);
  assert.equal(view?.jobs[0]?.id, `${MAX_JOBS + 4}`.padStart(8, '0'));
});

test('an opted-in tailscaleIp that is not a bare IP is dropped', () => {
  const planted = '100.64.0.1 Bearer illustrative-value';
  const view = toFleetView(
    { machines: [{ machineId: 'mac-mini', tailscaleIp: planted }], jobs: [] },
    NOW,
    { showTailscaleIp: true },
  );
  assert.equal(view?.machines[0]?.tailscaleIp, undefined);
  assert.ok(!JSON.stringify(view).includes('illustrative-value'));
});

test('a malformed record reads as a failed broker, through to the snapshot', async () => {
  await withBroker(
    (_url, res) => res.end('{"machines":[null],"jobs":[null]}'),
    async (brokerPort) => {
      const snapshot = await createFleetSource({ brokerPort })();
      assert.equal(snapshot.status === 'down' && snapshot.reason, 'bad-payload');
    },
  );
});

test('a payload of the wrong shape is a failure, not an empty fleet', () => {
  const machine = { machineId: 'mac-mini' };
  const job = { id: 'j1' };
  for (const bad of [
    null,
    [],
    {},
    { machines: [] },
    { machines: 'x', jobs: [] },
    { machines: [null], jobs: [] },
    { machines: [{ label: 'no id' }], jobs: [] },
    { machines: [machine, 'x'], jobs: [] },
    { machines: [{ ...machine, capabilities: 'invalid' }], jobs: [] },
    { machines: [{ ...machine, capabilities: { claude: 'yes' } }], jobs: [] },
    { machines: [{ ...machine, repos: 'invalid' }], jobs: [] },
    { machines: [{ ...machine, repos: { 'unite-group': 'invalid' } }], jobs: [] },
    { machines: [], jobs: [null] },
    { machines: [], jobs: [{ status: 'no id' }] },
    { machines: [], jobs: [job, 5] },
  ]) {
    assert.equal(toFleetView(bad, NOW), null);
  }
});

test('the broker address is loopback, port 42137, path /status', () => {
  assert.equal(BROKER_HOST, '127.0.0.1');
  assert.equal(BROKER_PORT, 42137);
  assert.equal(BROKER_PATH, '/status');
});

async function withBroker(
  handler: (url: string, res: import('node:http').ServerResponse) => void,
  run: (port: number, calls: string[]) => Promise<void>,
) {
  const calls: string[] = [];
  const server = createServer((req, res) => {
    calls.push(`${req.method} ${req.url}`);
    handler(req.url ?? '', res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run((server.address() as AddressInfo).port, calls);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('the proxy only ever sends GET /status, and repeat reads inside the cache cost nothing', async () => {
  await withBroker(
    (_url, res) => res.end(JSON.stringify(fixture)),
    async (brokerPort, calls) => {
      let clock = NOW;
      const read = createFleetSource({ brokerPort, now: () => clock });
      const first = await read();
      assert.equal(first.status, 'live');
      assert.equal(first.status === 'live' && first.source, 'broker');
      await read();
      assert.deepEqual(calls, ['GET /status']);
      clock += 2_001;
      await read();
      assert.deepEqual(calls, ['GET /status', 'GET /status']);
    },
  );
});

test('concurrent reads share one broker request', async () => {
  await withBroker(
    (_url, res) => res.end(JSON.stringify(fixture)),
    async (brokerPort, calls) => {
      const read = createFleetSource({ brokerPort });
      await Promise.all([read(), read(), read()]);
      assert.equal(calls.length, 1);
    },
  );
});

test('each broker failure is reported by class and holds no broker text', async () => {
  const cases: [(res: import('node:http').ServerResponse) => void, string][] = [
    [(res) => { res.statusCode = 500; res.end('internal detail'); }, 'bad-status'],
    [(res) => res.end('internal detail, not json'), 'bad-payload'],
    [(res) => res.end('{"machines":"nope"}'), 'bad-payload'],
    [(res) => { res.statusCode = 302; res.setHeader('Location', 'http://example.com/'); res.end(); }, 'unreachable'],
  ];
  for (const [reply, reason] of cases) {
    await withBroker(
      (_url, res) => reply(res),
      async (brokerPort) => {
        const snapshot = await createFleetSource({ brokerPort })();
        assert.equal(snapshot.status, 'down');
        assert.equal(snapshot.status === 'down' && snapshot.reason, reason);
        assert.ok(!JSON.stringify(snapshot).includes('internal detail'));
      },
    );
  }
});

test('broker down is a down snapshot, and lastGoodAt survives the fall', async () => {
  let clock = NOW;
  let read: ReturnType<typeof createFleetSource> | undefined;
  await withBroker(
    (_url, res) => res.end(JSON.stringify(fixture)),
    async (brokerPort) => {
      read = createFleetSource({ brokerPort, now: () => clock });
      assert.equal((await read()).status, 'live');
    },
  );
  // The helper has closed the broker by now, and the cache window has passed.
  clock += 5_000;
  const snapshot = await read!();
  assert.equal(snapshot.status, 'down');
  assert.equal(snapshot.status === 'down' && snapshot.reason, 'unreachable');
  assert.equal(snapshot.status === 'down' && snapshot.lastGoodAt, NOW);
});

test('a dead broker with no history reports no last good reading', async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const brokerPort = (server.address() as AddressInfo).port;
  await new Promise((resolve) => server.close(resolve));
  const snapshot = await createFleetSource({ brokerPort })();
  assert.equal(snapshot.status === 'down' && snapshot.lastGoodAt, null);
});

test('fixture mode labels itself and moves timestamps to now', async () => {
  const snapshot = await createFleetSource({ fixturePath: FIXTURE_PATH, now: () => NOW + 1_000_000 })();
  assert.equal(snapshot.status === 'live' && snapshot.source, 'fixture');
  assert.equal(snapshot.status === 'live' && snapshot.machines[0]?.ageMs, 5_000);
});

test('a missing fixture is a failure, not a live empty fleet', async () => {
  const snapshot = await createFleetSource({ fixturePath: '/nonexistent/status.json' })();
  assert.equal(snapshot.status, 'down');
});

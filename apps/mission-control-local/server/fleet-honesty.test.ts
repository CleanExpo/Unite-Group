// UNI-3150: a machine card must never read as live when its heartbeat is old, and each
// card shows the job its machine claimed. Broker payloads here are mocked; one test goes
// through a fake broker over HTTP so the whole proxy path is covered.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createFleetSource } from './broker.ts';
import { CLOCK_SKEW_MS, MAX_JOBS, OFFLINE_AFTER_MS, STALE_AFTER_MS, toFleetView } from './fleet.ts';
import { NEEDS_SOCKET } from './test-transport.ts';

const FIXTURE_PATH = fileURLToPath(new URL('../fixtures/status.json', import.meta.url));
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
const NOW = fixture.capturedAt as number;

type Raw = Record<string, unknown>;

function one(machine: Raw, jobs: Raw[] = []) {
  const view = toFleetView({ machines: [{ machineId: 'windows-pc', ...machine }], jobs }, NOW);
  assert.ok(view, 'payload should be accepted');
  const m = view.machines.find((x) => x.id === 'windows-pc');
  assert.ok(m);
  return m;
}

function job(id: number, fields: Raw): Raw {
  return { id: `${id.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`, type: 'probe', ...fields };
}

// ---------- stale and offline override the broker ----------

test('fleet honesty: a machine the broker calls idle loses Online and its state word at 45s', () => {
  const fresh = one({ state: 'idle', lastSeen: NOW - (STALE_AFTER_MS - 1), fresh: true });
  assert.equal(fresh.health, 'online');
  assert.equal(fresh.state, 'idle');
  // The broker's own fresh flag is ignored: the age decides.
  const stale = one({ state: 'idle', lastSeen: NOW - STALE_AFTER_MS, fresh: true });
  assert.equal(stale.health, 'stale');
  assert.equal(stale.state, null);
  assert.equal(stale.ageMs, STALE_AFTER_MS);
});

test('fleet honesty: after 5 minutes without a heartbeat the machine is offline and idle is withheld', () => {
  // The case from the brief: the Windows PC was off and the screen still said idle.
  const almost = one({ state: 'idle', lastSeen: NOW - (OFFLINE_AFTER_MS - 1) });
  assert.equal(almost.health, 'stale');
  assert.equal(almost.state, null);
  const off = one({ state: 'idle', lastSeen: NOW - OFFLINE_AFTER_MS });
  assert.equal(off.health, 'offline');
  assert.equal(off.state, null);
  assert.ok(!JSON.stringify(off).includes('idle'));
});

test('fleet honesty: a working machine with an old heartbeat does not read as working', () => {
  for (const ageMs of [STALE_AFTER_MS, OFFLINE_AFTER_MS, 86_400_000]) {
    const m = one({ state: 'working', lastSeen: NOW - ageMs });
    assert.notEqual(m.health, 'online');
    assert.equal(m.state, null, `age ${ageMs}`);
  }
});

test('fleet honesty: a heartbeat time in the future cannot make a machine online', () => {
  const ahead = one({ state: 'idle', lastSeen: NOW + 60_000 });
  assert.equal(ahead.health, 'not-reporting');
  assert.equal(ahead.lastSeenAt, null);
  assert.equal(ahead.ageMs, null);
  assert.equal(ahead.state, null);
  // Just over the allowance is refused; a small clock difference inside it is not.
  assert.equal(one({ state: 'idle', lastSeen: NOW + CLOCK_SKEW_MS + 1 }).health, 'not-reporting');
  const near = one({ state: 'idle', lastSeen: NOW + CLOCK_SKEW_MS });
  assert.equal(near.health, 'online');
  assert.equal(near.ageMs, 0);
});

test('fleet honesty: a missing or unusable heartbeat is not reporting and has no state', () => {
  for (const lastSeen of [undefined, null, 0, -5, '1799999999000', Number.NaN, Number.POSITIVE_INFINITY]) {
    const m = one({ state: 'idle', lastSeen });
    assert.equal(m.health, 'not-reporting', `lastSeen ${String(lastSeen)}`);
    assert.equal(m.state, null);
  }
  // A machine absent from the payload is the same.
  const view = toFleetView({ machines: [], jobs: [] }, NOW);
  assert.deepEqual(view?.machines.map((m) => m.state), [null, null, null]);
});

test('fleet honesty: the fixture shows the stale MacBook and offline PC without their broker state', () => {
  const view = toFleetView(fixture, NOW);
  assert.deepEqual(
    view?.machines.map((m) => [m.id, m.health, m.state]),
    [
      ['mac-mini', 'online', 'idle'],
      ['macbook-pro', 'stale', null],
      ['windows-pc', 'offline', null],
    ],
  );
  // Positive control: the raw fixture does say idle and working for those two.
  assert.deepEqual(fixture.machines.map((m: Raw) => m.state), ['idle', 'working', 'idle']);
});

test('fleet honesty: through the proxy, an offline PC the broker calls idle arrives offline with no state', { skip: NEEDS_SOCKET }, async () => {
  const payload = {
    machines: [
      { machineId: 'mac-mini', state: 'idle', lastSeen: NOW - 1_000, fresh: true },
      { machineId: 'windows-pc', state: 'idle', lastSeen: NOW - 7 * 60_000, fresh: false },
    ],
    jobs: [],
  };
  const calls: string[] = [];
  const server = createServer((req, res) => {
    calls.push(`${req.method} ${req.url}`);
    res.end(JSON.stringify(payload));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const brokerPort = (server.address() as AddressInfo).port;
    const snapshot = await createFleetSource({ brokerPort, now: () => NOW })();
    assert.equal(snapshot.status, 'live');
    if (snapshot.status !== 'live') return;
    const pc = snapshot.machines.find((m) => m.id === 'windows-pc');
    assert.equal(pc?.health, 'offline');
    assert.equal(pc?.state, null);
    assert.equal(snapshot.machines.find((m) => m.id === 'mac-mini')?.state, 'idle');
    assert.deepEqual(calls, ['GET /status']);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

// ---------- current job per machine ----------

test('current job: each machine gets the running job it claimed, and never another machine\'s', () => {
  const view = toFleetView(fixture, NOW);
  const byId = Object.fromEntries((view?.machines ?? []).map((m) => [m.id, m]));
  assert.deepEqual(byId['mac-mini']?.currentJob, { id: 'aaaa1111', type: 'spm-harness', claimedAgeMs: 50_000 });
  // The MacBook has a pending and a blocked job: neither is claimed.
  assert.equal(byId['macbook-pro']?.currentJob, null);
  assert.equal(byId['macbook-pro']?.claimedJobs, 0);
  // The offline PC still holds a claim; the view carries it, the card labels it.
  assert.deepEqual(byId['windows-pc']?.currentJob, { id: 'aaaa5555', type: 'spm-harness', claimedAgeMs: 1_900_000 });
  assert.equal(byId['windows-pc']?.claimedJobs, 1);
});

test('current job: pending, completed, failed, blocked and unassigned jobs are not a current job', () => {
  const jobs = ['pending', 'completed', 'failed', 'blocked', 'paused'].map((status, n) =>
    job(n + 1, { machineId: 'windows-pc', status, createdAt: NOW - 1_000, claimedAt: NOW - 500 }),
  );
  jobs.push(job(9, { status: 'running', createdAt: NOW - 1_000, claimedAt: NOW - 500 }));
  const m = one({ state: 'idle', lastSeen: NOW - 1_000 }, jobs);
  assert.equal(m.currentJob, null);
  assert.equal(m.claimedJobs, 0);
});

test('current job: a claimed job older than the newest 50 jobs still shows on its machine', () => {
  const jobs = Array.from({ length: MAX_JOBS + 10 }, (_, n) =>
    job(100 + n, { status: 'pending', machineId: 'mac-mini', createdAt: NOW - 1_000 + n }),
  );
  jobs.push(job(7, { status: 'running', machineId: 'windows-pc', createdAt: NOW - 3_600_000, claimedAt: NOW - 3_000_000 }));
  const view = toFleetView({ machines: [{ machineId: 'windows-pc', lastSeen: NOW - 1_000 }], jobs }, NOW);
  assert.equal(view?.jobs.length, MAX_JOBS);
  assert.ok(!view?.jobs.some((j) => j.id === '00000007'), 'the old job is outside the list sent');
  assert.equal(view?.machines.find((m) => m.id === 'windows-pc')?.currentJob?.id, '00000007');
});

test('current job: with two claimed jobs the newest claim shows and the count says 2', () => {
  const m = one({ state: 'working', lastSeen: NOW - 1_000 }, [
    job(1, { status: 'running', machineId: 'windows-pc', createdAt: NOW - 9_000, claimedAt: NOW - 2_000 }),
    job(2, { status: 'running', machineId: 'windows-pc', createdAt: NOW - 5_000, claimedAt: NOW - 4_000 }),
  ]);
  assert.equal(m.currentJob?.id, '00000001');
  assert.equal(m.claimedJobs, 2);
});

test('current job: a running job with no claim time still shows, with its claim age unknown', () => {
  const m = one({ state: 'working', lastSeen: NOW - 1_000 }, [
    job(3, { status: 'running', machineId: 'windows-pc', createdAt: NOW - 9_000 }),
  ]);
  assert.deepEqual(m.currentJob, { id: '00000003', type: 'probe', claimedAgeMs: null });
});

// ---------- job queue: phase and age ----------

test('job queue: each broker status maps to queued, claimed or done, and anything else to unknown', () => {
  const statuses = ['pending', 'running', 'completed', 'failed', 'blocked', 'paused'];
  const view = toFleetView(
    { machines: [], jobs: statuses.map((status, n) => job(n + 1, { status, createdAt: NOW - n })) },
    NOW,
  );
  assert.deepEqual(
    view?.jobs.map((j) => [j.status, j.phase]),
    [
      ['pending', 'queued'],
      ['running', 'claimed'],
      ['completed', 'done'],
      ['failed', 'done'],
      ['blocked', 'done'],
      ['unknown', 'unknown'],
    ],
  );
});

test('job queue: the age shown is the time in the current phase', () => {
  const view = toFleetView(
    {
      machines: [],
      jobs: [
        job(1, { status: 'pending', createdAt: NOW - 10_000 }),
        job(2, { status: 'running', createdAt: NOW - 20_000, claimedAt: NOW - 15_000 }),
        job(3, { status: 'completed', createdAt: NOW - 90_000, claimedAt: NOW - 80_000, completedAt: NOW - 70_000 }),
        // Blocked jobs carry no completion time, so the phase age is unknown, not invented.
        job(4, { status: 'blocked', createdAt: NOW - 100_000 }),
      ],
    },
    NOW,
  );
  assert.deepEqual(
    view?.jobs.map((j) => [j.phase, j.phaseAgeMs, j.ageMs]),
    [
      ['queued', 10_000, 10_000],
      ['claimed', 15_000, 20_000],
      ['done', 70_000, 90_000],
      ['done', null, 100_000],
    ],
  );
});

test('job queue: counts cover every job, not just the newest 50 sent', () => {
  const jobs = [
    ...Array.from({ length: MAX_JOBS }, (_, n) => job(100 + n, { status: 'pending', createdAt: NOW - n })),
    ...Array.from({ length: 7 }, (_, n) => job(300 + n, { status: 'completed', createdAt: NOW - 1_000_000 - n })),
    job(9, { status: 'running', createdAt: NOW - 2_000_000 }),
    job(8, { status: 'mystery', createdAt: NOW - 3_000_000 }),
  ];
  const view = toFleetView({ machines: [], jobs }, NOW);
  assert.equal(view?.jobs.length, MAX_JOBS);
  assert.deepEqual(view?.jobCounts, { queued: MAX_JOBS, claimed: 1, done: 7, unknown: 1 });
  assert.equal(view?.jobsTotal, MAX_JOBS + 9);
});

test('job queue: fixture mode moves claim and completion times to now as well', async () => {
  const later = NOW + 1_000_000;
  const snapshot = await createFleetSource({ fixturePath: FIXTURE_PATH, now: () => later })();
  assert.equal(snapshot.status, 'live');
  if (snapshot.status !== 'live') return;
  assert.equal(snapshot.machines[0]?.currentJob?.claimedAgeMs, 50_000);
  const completed = snapshot.jobs.find((j) => j.id === 'aaaa3333');
  assert.equal(completed?.phaseAgeMs, 3_590_000);
  assert.deepEqual(snapshot.jobCounts, { queued: 1, claimed: 2, done: 3, unknown: 0 });
});

test('job queue: lease, attempt and blocked-reason fields stay on the server', () => {
  const out = JSON.stringify(toFleetView(fixture, NOW));
  for (const banned of ['leaseUntil', 'blockedReason', 'lease_expired_twice', 'attempt', 'claimedAt', 'completedAt', '1800003550000']) {
    assert.ok(!out.includes(banned), `leaked ${banned}`);
  }
  // Positive control: the raw fixture carries each of them.
  for (const planted of ['leaseUntil', 'blockedReason', 'claimedAt', 'completedAt']) {
    assert.ok(JSON.stringify(fixture).includes(planted));
  }
});

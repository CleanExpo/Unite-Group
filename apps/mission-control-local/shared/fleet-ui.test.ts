// UNI-3150: what a machine card says, and how the browser's fleet read behaves when the
// server stops answering. Both run without a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { readFleet } from './fleet-poll.ts';
import { machineCardText } from './machine-card.ts';
import type { MachineHealth, MachineView } from './types.ts';

function machine(fields: Partial<MachineView>): MachineView {
  return {
    id: 'windows-pc',
    state: null,
    health: 'online',
    lastSeenAt: 1,
    ageMs: 3_000,
    currentJob: null,
    claimedJobs: 0,
    capabilities: [],
    repos: [],
    ...fields,
  };
}

const allWords = (m: MachineView) => Object.values(machineCardText(m)).filter(Boolean).join(' | ');

// ---------- card words ----------

test('card words: an online machine shows its state, heartbeat and current job', () => {
  const card = machineCardText(
    machine({
      state: 'working',
      ageMs: 3_000,
      currentJob: { id: 'aaaa1111', type: 'spm-harness', claimedAgeMs: 50_000 },
      claimedJobs: 1,
    }),
  );
  assert.deepEqual(card, {
    health: 'Online',
    tone: 'go',
    state: 'State: working',
    heartbeat: 'Heartbeat 3s ago',
    job: 'Current job: spm-harness aaaa1111, claimed 50s ago',
    warning: null,
  });
  assert.equal(machineCardText(machine({ state: 'idle' })).job, 'No claimed job');
});

test('card words: a stale, offline or not-reporting machine never says Online, idle or working', () => {
  const cases: [MachineHealth, number | null][] = [
    ['stale', 45_000],
    ['offline', 7 * 60_000],
    ['not-reporting', null],
  ];
  for (const [health, ageMs] of cases) {
    // Even if a state word reached the browser, the card must not show it.
    for (const state of ['idle', 'working', null]) {
      const words = allWords(
        machine({ health, ageMs, state, currentJob: { id: 'aaaa5555', type: 'spm-harness', claimedAgeMs: 60_000 }, claimedJobs: 1 }),
      );
      assert.doesNotMatch(words, /\bonline\b|\bidle\b|\bworking\b/i, `${health}/${state}: ${words}`);
    }
  }
  // Positive control: the same search finds the words on an online card.
  assert.match(allWords(machine({ state: 'idle' })), /\bOnline\b/);
  assert.match(allWords(machine({ state: 'idle' })), /\bidle\b/);
});

test('card words: each health has its own label, light and reason the state is hidden', () => {
  assert.deepEqual(
    (['stale', 'offline', 'not-reporting'] as const).map((health) => {
      const c = machineCardText(machine({ health, ageMs: health === 'not-reporting' ? null : 400_000 }));
      return [c.health, c.tone, c.state];
    }),
    [
      ['Stale', 'amber', 'State not shown: last heartbeat is over 45s old.'],
      ['Offline', 'abort', 'State not shown: no heartbeat for over 5 minutes.'],
      ['Not reporting', 'abort', 'State not shown: no usable heartbeat.'],
    ],
  );
});

test('card words: a claimed job on a machine without a fresh heartbeat is labelled not confirmed', () => {
  const card = machineCardText(
    machine({
      health: 'offline',
      ageMs: 7 * 60_000,
      currentJob: { id: 'aaaa5555', type: 'spm-harness', claimedAgeMs: 1_900_000 },
      claimedJobs: 1,
    }),
  );
  assert.equal(card.job, 'Claimed job, not confirmed running: spm-harness aaaa5555, claimed 31m ago');
  assert.equal(card.heartbeat, 'Heartbeat 7m ago');
  assert.ok(!card.job.startsWith('Current job'));
});

test('card words: no usable heartbeat says so instead of "never", and unknown claim times say so', () => {
  const card = machineCardText(
    machine({
      health: 'not-reporting',
      ageMs: null,
      lastSeenAt: null,
      currentJob: { id: 'aaaa5555', type: 'probe', claimedAgeMs: null },
      claimedJobs: 1,
    }),
  );
  assert.equal(card.heartbeat, 'No usable heartbeat');
  assert.equal(card.job, 'Claimed job, not confirmed running: probe aaaa5555, claim time unknown');
});

test('card words: more than one claimed job raises a warning', () => {
  const card = machineCardText(
    machine({ state: 'working', currentJob: { id: 'aaaa1111', type: 'probe', claimedAgeMs: 1_000 }, claimedJobs: 2 }),
  );
  assert.equal(card.warning, 'The broker shows 2 claimed jobs for this machine.');
});

test('card words: the machine widget prints only card words, never the raw state or age', () => {
  const src = readFileSync(new URL('../src/widgets/MachineWidget.tsx', import.meta.url), 'utf8');
  assert.match(src, /machineCardText\(machine\)/);
  // The widget may read health for styling, but the words on screen come from the card.
  assert.doesNotMatch(src, /machine\.state|machine\.ageMs|machine\.lastSeenAt|formatAge/);
});

// ---------- fleet poll ----------

// A poll that ignores its timeout would hang; the test limit turns that into a failure.
const LIMIT = { timeout: 5_000 };

const live = { status: 'live', source: 'broker', fetchedAt: 1, machines: [], jobs: [], jobsTotal: 0 };
const reply = (status: number, body: unknown) => async () => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});

test('fleet poll: a server that never answers reads as unreachable within the timeout, and the request is aborted', LIMIT, async () => {
  let signal: AbortSignal | undefined;
  const started = Date.now();
  const result = await readFleet((_url, init) => {
    signal = init.signal;
    return new Promise(() => {}); // never settles and ignores the signal
  }, 30);
  assert.deepEqual(result, { kind: 'server-unreachable' });
  assert.ok(Date.now() - started < 2_000, 'settled near the timeout');
  assert.equal(signal?.aborted, true);
});

test('fleet poll: a reply whose body never finishes reads as unreachable', LIMIT, async () => {
  const result = await readFleet(
    async () => ({ status: 200, ok: true, json: () => new Promise(() => {}) }),
    30,
  );
  assert.deepEqual(result, { kind: 'server-unreachable' });
});

test('fleet poll: 401 is signed out, errors and odd bodies are unreachable, a snapshot passes through', LIMIT, async () => {
  assert.deepEqual(await readFleet(reply(401, {})), { kind: 'signed-out' });
  assert.deepEqual(await readFleet(reply(500, live)), { kind: 'server-unreachable' });
  assert.deepEqual(await readFleet(reply(200, { status: 'live' })), { kind: 'server-unreachable' });
  assert.deepEqual(await readFleet(reply(200, null)), { kind: 'server-unreachable' });
  assert.deepEqual(
    await readFleet(async () => {
      throw new TypeError('network');
    }),
    { kind: 'server-unreachable' },
  );
  assert.deepEqual(await readFleet(reply(200, live)), { kind: 'snapshot', snapshot: live });
  const down = { status: 'down', reason: 'timeout', fetchedAt: 1, lastGoodAt: null };
  assert.deepEqual(await readFleet(reply(200, down)), { kind: 'snapshot', snapshot: down });
});

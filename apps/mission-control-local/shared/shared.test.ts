import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAge } from './format.ts';
import { createLatestWins } from './latest-wins.ts';
import { DEFAULT_LAYOUTS, GRID_COLS, parseLayoutItems } from './widget-catalogue.ts';

function harness() {
  const calls: string[] = [];
  const pending: { resolve: (v: string) => void; reject: (e: Error) => void }[] = [];
  const outcomes: unknown[] = [];
  const write = createLatestWins<string, string>(
    (op) =>
      new Promise((resolve, reject) => {
        calls.push(op);
        pending.push({ resolve, reject });
      }),
    (outcome) => outcomes.push(outcome),
  );
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  return { calls, pending, outcomes, write, tick };
}

test('writes run one at a time and only the newest waiting write is sent', async () => {
  const { calls, pending, write, tick } = harness();
  write('a');
  write('b');
  write('c');
  assert.deepEqual(calls, ['a']);
  pending[0]?.resolve('a');
  await tick();
  assert.deepEqual(calls, ['a', 'c']);
});

test('an older success cannot hide a failure of the newest write', async () => {
  const { pending, outcomes, write, tick } = harness();
  write('old');
  write('new');
  pending[0]?.resolve('old');
  await tick();
  assert.deepEqual(outcomes, []);
  pending[1]?.reject(new Error('disk'));
  await tick();
  assert.deepEqual(outcomes, [{ ok: false }]);
});

test('an older failure is not shown once the newest write succeeds', async () => {
  const { pending, outcomes, write, tick } = harness();
  write('old');
  write('new');
  pending[0]?.reject(new Error('disk'));
  await tick();
  pending[1]?.resolve('new');
  await tick();
  assert.deepEqual(outcomes, [{ ok: true, result: 'new' }]);
});

test('the queue works again after it has gone idle', async () => {
  const { calls, pending, write, tick } = harness();
  write('a');
  pending[0]?.resolve('a');
  await tick();
  write('b');
  assert.deepEqual(calls, ['a', 'b']);
});

test('formatAge covers each unit and the missing value', () => {
  assert.equal(formatAge(null), 'never');
  assert.equal(formatAge(5_000), '5s ago');
  assert.equal(formatAge(120_000), '2m ago');
  assert.equal(formatAge(7_200_000), '2h ago');
  assert.equal(formatAge(172_800_000), '2d ago');
});

test('both default layouts pass the same validation as a saved layout', () => {
  for (const items of Object.values(DEFAULT_LAYOUTS)) {
    assert.deepEqual(parseLayoutItems(items), items);
  }
});

test('parseLayoutItems refuses bad layouts', () => {
  const box = { i: 'clock', x: 0, y: 0, w: 2, h: 2 };
  assert.equal(parseLayoutItems('nope'), null);
  assert.equal(parseLayoutItems([{ ...box, i: 'not-a-widget' }]), null);
  assert.equal(parseLayoutItems([box, box]), null);
  assert.equal(parseLayoutItems([{ ...box, x: -1 }]), null);
  assert.equal(parseLayoutItems([{ ...box, x: GRID_COLS }]), null);
  assert.equal(parseLayoutItems([{ ...box, w: 1.5 }]), null);
  assert.equal(parseLayoutItems([{ ...box, h: 0 }]), null);
});

test('parseLayoutItems drops extra fields', () => {
  const parsed = parseLayoutItems([{ i: 'clock', x: 0, y: 0, w: 2, h: 2, extra: 'x' }]);
  assert.deepEqual(parsed, [{ i: 'clock', x: 0, y: 0, w: 2, h: 2 }]);
});

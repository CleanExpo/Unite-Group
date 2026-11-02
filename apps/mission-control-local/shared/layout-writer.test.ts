import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLayoutWriter } from './layout-writer.ts';
import type { Conflict, LayoutOp, SendResult } from './layout-writer.ts';
import type { LayoutItem, LayoutResponse } from './types.ts';

const layout = (revision: number, items: LayoutItem[] = []): LayoutResponse => ({
  screen: '1',
  revision,
  items,
  source: 'saved',
});
const clock = (x: number): LayoutItem[] => [{ i: 'clock', x, y: 0, w: 2, h: 2 }];
const tick = () => new Promise((resolve) => setImmediate(resolve));

function harness() {
  const sent: { op: LayoutOp; revision: number }[] = [];
  const pending: { resolve: (r: SendResult) => void; reject: (e: Error) => void }[] = [];
  const shown: LayoutResponse[] = [];
  const conflicts: Conflict[] = [];
  const signedOut: LayoutOp[] = [];
  const unsaved: boolean[] = [];
  let failed = 0;
  const writer = createLayoutWriter(
    (op, revision) =>
      new Promise((resolve, reject) => {
        sent.push({ op, revision });
        pending.push({ resolve, reject });
      }),
    {
      onLayout: (l) => shown.push(l),
      onConflict: (c) => conflicts.push(c),
      onSignedOut: (op) => signedOut.push(op),
      onUnsaved: (value) => unsaved.push(value),
      onFailed: () => (failed += 1),
    },
  );
  return { sent, pending, shown, conflicts, signedOut, unsaved, writer, failed: () => failed };
}

test('layout writer: sends the loaded revision and bases each next write on the last success', async () => {
  const h = harness();
  h.writer.loaded(layout(4));
  h.writer.write({ kind: 'save', items: clock(1) });
  h.writer.write({ kind: 'save', items: clock(2) });
  assert.deepEqual(h.sent.map((s) => s.revision), [4]);
  h.pending[0]?.resolve({ status: 'ok', layout: layout(5, clock(1)) });
  await tick();
  // The second write waited, and is based on the revision the first one produced.
  assert.deepEqual(h.sent.map((s) => s.revision), [4, 5]);
  h.pending[1]?.resolve({ status: 'ok', layout: layout(6, clock(2)) });
  await tick();
  assert.deepEqual(h.shown.map((l) => l.revision), [6]);
  h.writer.write({ kind: 'reset' });
  assert.deepEqual(h.sent[2], { op: { kind: 'reset' }, revision: 6 });
});

test('layout writer: nothing is sent before the layout has loaded', async () => {
  const h = harness();
  h.writer.write({ kind: 'save', items: clock(1) });
  await tick();
  assert.equal(h.sent.length, 0);
  assert.equal(h.failed(), 1);
});

test('layout writer: a 409 holds this window\'s change and asks, and later changes are held too, not sent', async () => {
  const h = harness();
  h.writer.loaded(layout(2));
  const mine: LayoutOp = { kind: 'save', items: clock(3) };
  h.writer.write(mine);
  const theirs = layout(3, clock(9));
  h.pending[0]?.resolve({ status: 'conflict', current: theirs });
  await tick();
  assert.equal(h.conflicts.length, 1);
  assert.deepEqual(h.conflicts[0], { current: theirs, mine });
  assert.deepEqual(h.shown, []); // The other window's layout is not forced onto the screen.

  const newer: LayoutOp = { kind: 'save', items: clock(4) };
  h.writer.write(newer);
  await tick();
  assert.equal(h.sent.length, 1);
  assert.deepEqual(h.conflicts.at(-1), { current: theirs, mine: newer });
  assert.equal(h.failed(), 0);
});

test('layout writer: reload shows the other layout and the next write is based on its revision', async () => {
  const h = harness();
  h.writer.loaded(layout(2));
  h.writer.write({ kind: 'save', items: clock(3) });
  const theirs = layout(7, clock(9));
  h.pending[0]?.resolve({ status: 'conflict', current: theirs });
  await tick();
  h.writer.reload();
  assert.deepEqual(h.shown, [theirs]);
  assert.equal(h.sent.length, 1);
  h.writer.write({ kind: 'save', items: clock(5) });
  assert.equal(h.sent[1]?.revision, 7);
});

test('layout writer: overwrite sends the held change on the current revision, and can conflict again', async () => {
  const h = harness();
  h.writer.loaded(layout(2));
  const mine: LayoutOp = { kind: 'save', items: clock(3) };
  h.writer.write(mine);
  h.pending[0]?.resolve({ status: 'conflict', current: layout(7, clock(9)) });
  await tick();
  h.writer.overwrite();
  assert.deepEqual(h.sent[1], { op: mine, revision: 7 });
  // A third window saved in between: the question comes back, still holding mine.
  const third = layout(8, clock(6));
  h.pending[1]?.resolve({ status: 'conflict', current: third });
  await tick();
  assert.deepEqual(h.conflicts.at(-1), { current: third, mine });
  h.writer.overwrite();
  assert.deepEqual(h.sent[2], { op: mine, revision: 8 });
  h.pending[2]?.resolve({ status: 'ok', layout: layout(9, clock(3)) });
  await tick();
  assert.deepEqual(h.shown.map((l) => l.revision), [9]);
});

test('layout writer: when a queued write follows a conflicted one, the newest change is the one held', async () => {
  const h = harness();
  h.writer.loaded(layout(1));
  h.writer.write({ kind: 'save', items: clock(1) });
  const newest: LayoutOp = { kind: 'save', items: clock(2) };
  h.writer.write(newest);
  const theirs = layout(2, clock(9));
  h.pending[0]?.resolve({ status: 'conflict', current: theirs });
  await tick();
  // The queued write still names revision 1, so the server refuses it too.
  assert.equal(h.sent[1]?.revision, 1);
  h.pending[1]?.resolve({ status: 'conflict', current: theirs });
  await tick();
  assert.equal(h.conflicts.length, 1);
  assert.deepEqual(h.conflicts[0]?.mine, newest);
});

test('layout writer: a failed send reports a failure and does not open a conflict', async () => {
  const h = harness();
  h.writer.loaded(layout(1));
  h.writer.write({ kind: 'save', items: clock(1) });
  h.pending[0]?.reject(new Error('500'));
  await tick();
  assert.equal(h.failed(), 1);
  assert.equal(h.conflicts.length, 0);
  h.writer.write({ kind: 'save', items: clock(2) });
  assert.equal(h.sent[1]?.revision, 1);
});

test('layout writer: a signed-out reply holds the change and says so, and later changes are held too', async () => {
  const h = harness();
  h.writer.loaded(layout(3));
  const mine: LayoutOp = { kind: 'save', items: clock(1) };
  h.writer.write(mine);
  h.pending[0]?.resolve({ status: 'signed-out' });
  await tick();
  assert.deepEqual(h.signedOut, [mine]);
  assert.equal(h.failed(), 0);
  assert.deepEqual(h.shown, []);
  assert.equal(h.unsaved.at(-1), true); // Still unsaved, so nothing may leave the page.
  const newer: LayoutOp = { kind: 'reset' };
  h.writer.write(newer);
  assert.equal(h.sent.length, 1);
  assert.deepEqual(h.signedOut.at(-1), newer);
});

test('layout writer: retry after signing back in sends the held change on the known revision', async () => {
  const h = harness();
  h.writer.loaded(layout(3));
  const mine: LayoutOp = { kind: 'save', items: clock(1) };
  h.writer.write(mine);
  h.pending[0]?.resolve({ status: 'signed-out' });
  await tick();
  h.writer.retry();
  assert.deepEqual(h.sent[1], { op: mine, revision: 3 });
  h.pending[1]?.resolve({ status: 'ok', layout: layout(4, clock(1)) });
  await tick();
  assert.deepEqual(h.shown.map((l) => l.revision), [4]);
  assert.equal(h.unsaved.at(-1), false);
});

test('layout writer: unsaved is true from the first write until it lands, and abandon clears it', async () => {
  const h = harness();
  h.writer.loaded(layout(1));
  h.writer.write({ kind: 'save', items: clock(1) });
  assert.deepEqual(h.unsaved, [true]);
  h.pending[0]?.resolve({ status: 'conflict', current: layout(2) });
  await tick();
  assert.equal(h.unsaved.at(-1), true);
  h.writer.abandon();
  assert.equal(h.unsaved.at(-1), false);
  h.writer.write({ kind: 'save', items: clock(2) });
  assert.equal(h.sent.length, 2); // Abandoned means no longer held: new writes are sent again.
  h.pending[1]?.reject(new Error('500'));
  await tick();
  assert.equal(h.unsaved.at(-1), false);
  assert.equal(h.failed(), 1);
});

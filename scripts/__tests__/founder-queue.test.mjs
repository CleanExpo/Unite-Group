import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  computeAgeDays,
  oldestOpen,
  parseFounderQueue,
  renderQueue,
} from '../founder-queue.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const QUEUE_PATH = join(repositoryRoot, 'FOUNDER-QUEUE.md');

const NOW = '2026-08-16T00:00:00Z';

test('age is computed in whole days from the opened date', () => {
  assert.equal(computeAgeDays('2026-08-16', NOW), 0);
  assert.equal(computeAgeDays('2026-08-15', NOW), 1);
  assert.equal(computeAgeDays('2026-07-17', NOW), 30);
});

test('age is never negative, and a future date is refused rather than silently clamped', () => {
  assert.throws(() => computeAgeDays('2026-08-17', NOW), /future/i);
});

test('an unparseable opened date is refused, not treated as age zero', () => {
  // Age zero would read as "opened today, nothing is stale" — the exact false
  // reassurance this ledger exists to prevent.
  assert.throws(() => computeAgeDays('not-a-date', NOW), /opened date/i);
  assert.throws(() => computeAgeDays('', NOW), /opened date/i);
});

test('the shipped FOUNDER-QUEUE.md parses and carries the seeded decisions', () => {
  const parsed = parseFounderQueue(readFileSync(QUEUE_PATH, 'utf8'));
  const ids = parsed.open.map((row) => row.id);

  for (const expected of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'P9', 'D19']) {
    assert.ok(ids.includes(expected), `${expected} missing from ${ids.join(', ')}`);
  }
  for (const row of parsed.open) {
    assert.match(row.opened, /^\d{4}-\d{2}-\d{2}$/, row.id);
    assert.notEqual(row.blocks.trim(), '', row.id);
    assert.notEqual(row.decision.trim(), '', row.id);
  }
});

test('every seeded row computes a real age against the shipped file', () => {
  const parsed = parseFounderQueue(readFileSync(QUEUE_PATH, 'utf8'));
  for (const row of parsed.open) {
    const age = computeAgeDays(row.opened, NOW);
    assert.ok(Number.isInteger(age) && age >= 0, `${row.id} -> ${age}`);
  }
});

test('oldestOpen returns the longest-blocking decision, not the first row', () => {
  const rows = [
    { id: 'A', opened: '2026-08-10', decision: 'a', blocks: 'x', context: '', status: 'open' },
    { id: 'B', opened: '2026-06-01', decision: 'b', blocks: 'y', context: '', status: 'open' },
    { id: 'C', opened: '2026-08-01', decision: 'c', blocks: 'z', context: '', status: 'open' },
  ];
  const oldest = oldestOpen(rows, NOW);
  assert.equal(oldest.id, 'B');
  assert.equal(oldest.ageDays, computeAgeDays('2026-06-01', NOW));
});

test('oldestOpen on an empty queue is null, not a crash and not a fake row', () => {
  assert.equal(oldestOpen([], NOW), null);
});

test('resolved rows are excluded from the open set and from oldestOpen', () => {
  const markdown = [
    '| ID | Decision | Opened | Age (days) | Blocks | Context | Status |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| F1 | flip it | 2026-06-01 | — | UNI-1 | ctx | open |',
    '',
    '## Resolved',
    '',
    '| ID | Decision | Opened | Resolved | Decision text |',
    '| --- | --- | --- | --- | --- |',
    '| F0 | old thing | 2026-05-01 | 2026-05-02 | did it |',
  ].join('\n');

  const parsed = parseFounderQueue(markdown);
  assert.deepEqual(parsed.open.map((r) => r.id), ['F1']);
  assert.deepEqual(parsed.resolved.map((r) => r.id), ['F0']);
  assert.equal(oldestOpen(parsed.open, NOW).id, 'F1');
});

test('renderQueue recomputes the age column rather than trusting the file', () => {
  // Age is computed, not hand-edited: a stale or fabricated number in the file
  // must be overwritten, never carried through.
  const markdown = [
    '| ID | Decision | Opened | Age (days) | Blocks | Context | Status |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| F1 | flip it | 2026-08-06 | 999 | UNI-1 | ctx | open |',
  ].join('\n');

  const rendered = renderQueue(parseFounderQueue(markdown), NOW);
  assert.ok(rendered.includes('| 10 |'), rendered);
  assert.ok(!rendered.includes('999'), rendered);
});

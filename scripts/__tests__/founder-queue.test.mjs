import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  computeAgeDays,
  main,
  oldestOpen,
  parseFounderQueue,
  renderQueue,
  summarise,
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

test('AN ISO-SHAPED DATE THAT DOES NOT EXIST IS REFUSED, not rolled forward', () => {
  // Date.parse normalises 2026-02-31 to 3 March and hands back a plausible age.
  // ISO shape is not calendar validity, and a fabricated age is worse than none.
  assert.throws(() => computeAgeDays('2026-02-31', '2026-03-05T00:00:00Z'), /real calendar date/i);
  assert.throws(() => computeAgeDays('2026-13-01', NOW), /real calendar date|opened date/i);
  assert.throws(() => computeAgeDays('2025-02-29', NOW), /real calendar date/i);
});

test('a real leap day is still accepted', () => {
  // Guard the other direction: refusing valid dates would be its own defect.
  assert.equal(computeAgeDays('2024-02-29', '2024-03-01T00:00:00Z'), 1);
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
  const { oldest } = oldestOpen(rows, NOW);
  assert.equal(oldest.id, 'B');
  assert.equal(oldest.ageDays, computeAgeDays('2026-06-01', NOW));
});

test('oldestOpen on an empty queue is null, not a crash and not a fake row', () => {
  assert.equal(oldestOpen([], NOW).oldest, null);
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
  assert.equal(oldestOpen(parsed.open, NOW).oldest.id, 'F1');
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

// ---------------------------------------------------------------------------
// Fail closed: a row that does not parse must never become reassurance
// ---------------------------------------------------------------------------

const HEADER = '| ID | Decision | Opened | Age (days) | Blocks | Context | Status |';
const RULE = '| --- | --- | --- | --- | --- | --- | --- |';

test('A MALFORMED ROW IS REPORTED, never silently discarded', () => {
  // Dropping it turned a typo into "No open founder decisions. Nothing is
  // blocked on Phill." — a false all-clear produced by a parse miss.
  const markdown = [HEADER, RULE, '| F9 | decide something | 2026-08-01 |'].join('\n');
  const parsed = parseFounderQueue(markdown);

  assert.equal(parsed.open.length, 0);
  assert.equal(parsed.malformed.length, 1);
  assert.match(parsed.malformed[0], /3 cells/);
  assert.equal(summarise(parsed, NOW).integrity, 'MALFORMED');
});

test('a table written without the optional outer pipes still parses', () => {
  // GFM makes the outer pipes optional. Slicing them off unconditionally ate the
  // first and last cell of every borderless row and returned an empty queue.
  const markdown = [
    'ID | Decision | Opened | Age (days) | Blocks | Context | Status',
    '--- | --- | --- | --- | --- | --- | ---',
    'F1 | flip it | 2026-06-01 | — | UNI-1 | ctx | open',
  ].join('\n');

  const parsed = parseFounderQueue(markdown);
  assert.deepEqual(parsed.open.map((r) => r.id), ['F1']);
  assert.equal(parsed.open[0].status, 'open');
  assert.equal(parsed.malformed.length, 0);
});

test('a file with no Open table at all is an anomaly, not an empty queue', () => {
  // An empty queue must be PROVEN empty — header present, no data rows — never
  // inferred from a parse that simply matched nothing.
  const parsed = parseFounderQueue('# FOUNDER QUEUE\n\nnothing tabular here\n');

  assert.equal(parsed.open.length, 0);
  assert.equal(summarise(parsed, NOW).integrity, 'MALFORMED');
  assert.match(parsed.malformed.join('\n'), /header was never found/i);
});

test('a genuinely empty table is clean, so the guard does not cry wolf', () => {
  const parsed = parseFounderQueue([HEADER, RULE].join('\n'));

  assert.equal(parsed.open.length, 0);
  assert.equal(summarise(parsed, NOW).integrity, 'OK');
});

test('the shipped ledger parses with zero malformed rows', () => {
  const parsed = parseFounderQueue(readFileSync(QUEUE_PATH, 'utf8'));
  assert.deepEqual(parsed.malformed, []);
});

test('--render REFUSES to rewrite a ledger it could not fully read', () => {
  // The render emits only what it parsed, so rewriting a malformed file would
  // DELETE the row that failed to parse and leave the file looking clean.
  const io = { logs: [], errors: [], log(m) { this.logs.push(m); }, error(m) { this.errors.push(m); } };
  const written = [];
  const code = main(['--render'], {
    io,
    now: NOW,
    readFile: () => [HEADER, RULE, '| F9 | broken |'].join('\n'),
    writeFile: (path, contents) => written.push({ path, contents }),
  });

  assert.equal(code, 2);
  assert.equal(written.length, 0);
  assert.match(io.errors.join('\n'), /refusing to rewrite/i);
});

test('the summary exit code refuses to call a malformed ledger clean', () => {
  const io = { logs: [], errors: [], log(m) { this.logs.push(m); }, error(m) { this.errors.push(m); } };
  const code = main([], {
    io,
    now: NOW,
    readFile: () => [HEADER, RULE, '| F9 | broken |'].join('\n'),
  });

  // The JSON is still printed — the heartbeat reads it and renders the integrity
  // failure — but exit 0 would tell every other caller the ledger was fine.
  assert.equal(code, 1);
  assert.match(io.logs.join('\n'), /"integrity": "MALFORMED"/);
});

test('a clean ledger still exits 0', () => {
  const io = { logs: [], errors: [], log(m) { this.logs.push(m); }, error(m) { this.errors.push(m); } };
  const code = main([], {
    io,
    now: NOW,
    readFile: () => [HEADER, RULE, '| F1 | flip it | 2026-08-01 | — | UNI-1 | ctx | open |'].join('\n'),
  });

  assert.equal(code, 0);
  assert.match(io.logs.join('\n'), /"integrity": "OK"/);
});

// ---------------------------------------------------------------------------
// ROUND TWO (qwen, independent). Each demonstrated open before being fixed.
// ---------------------------------------------------------------------------

test('A ROW THAT LOST ITS PIPES IS REPORTED, not skipped into an all-clear', () => {
  // `looksLikeRow` required a `|`, so a row whose separators an editor ate was
  // invisible: integrity OK, openCount 0, and the heartbeat printed
  // "No open founder decisions."
  const markdown = [HEADER, RULE, 'F1 flip it 2026-08-16 0 identity ctx open'].join('\n');
  const parsed = parseFounderQueue(markdown);

  assert.equal(parsed.open.length, 0);
  assert.equal(summarise(parsed, NOW).integrity, 'MALFORMED');
  assert.match(parsed.malformed.join('\n'), /no cell separators/);
});

test('prose between sections is not mistaken for a lost row', () => {
  // The guard above must not fire on ordinary text, or it becomes noise and gets
  // switched off.
  const markdown = [
    HEADER, RULE, '| F1 | flip it | 2026-08-16 | 0 | x | y | open |',
    '', 'Some explanatory prose about the queue.', 'Another sentence entirely.',
  ].join('\n');

  assert.deepEqual(parseFounderQueue(markdown).malformed, []);
});

test('a table row appearing before any header is reported, not dropped', () => {
  const markdown = ['| F9 | orphan | 2026-08-01 | 0 | x | y | open |', HEADER, RULE].join('\n');
  const parsed = parseFounderQueue(markdown);

  assert.match(parsed.malformed.join('\n'), /before any header/);
});

test('AN IMPOSSIBLE DATE NAMES ITS ROW instead of killing the whole summary', () => {
  // computeAgeDays throwing uncaught took the entire summary with it, so the
  // heartbeat got a generic JSON parse error rather than "F9 has a bad date".
  // The refusal is kept; only the blast radius changes.
  const markdown = [
    HEADER, RULE,
    '| F1 | fine | 2026-08-01 | 0 | x | y | open |',
    '| F9 | broken date | 2026-02-31 | 0 | x | y | open |',
  ].join('\n');

  const summary = summarise(parseFounderQueue(markdown), NOW);
  assert.equal(summary.integrity, 'MALFORMED');
  assert.match(summary.malformed.join('\n'), /F9/);
  assert.equal(summary.oldest.id, 'F1', 'the readable rows are still summarised');
});

test('--render cannot be made to splice its own match into the file', () => {
  // String.replace expands `$&`, `$'` and `$1` inside the REPLACEMENT, so a
  // Context cell containing `$&` rewrote the table into itself.
  const written = [];
  const io = { logs: [], errors: [], log(m) { this.logs.push(m); }, error(m) { this.errors.push(m); } };
  const code = main(['--render'], {
    io,
    now: NOW,
    readFile: () => [HEADER, RULE, "| F1 | pay $& and $` | 2026-08-01 | 0 | x | ctx | open |"].join('\n'),
    writeFile: (path, contents) => written.push(contents),
  });

  assert.equal(code, 0);
  assert.equal(written.length, 1);

  // The naive assertion "the output still contains `$&`" is SELF-DEFEATING: `$&`
  // expands to the matched table, which itself contains `$&`, so it passes either
  // way. Count the header instead — expansion splices a second copy of the whole
  // table into the file, and that is visible.
  const headers = written[0].split('| ID | Decision | Opened | Age (days)').length - 1;
  assert.equal(headers, 1, `the table was spliced into itself:\n${written[0]}`);
  assert.ok(written[0].includes('pay $& and $`'), written[0]);
});

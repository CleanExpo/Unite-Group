import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  AGE_IS_COMPUTED,
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

test('A FUTURE BRISBANE DATE IS REFUSED — no tolerance, because none is needed', () => {
  // The previous revision forgave one day, to absorb the gap between a UTC `now`
  // and a Brisbane ledger date. Round four showed what the forgiveness cost: a
  // genuinely future row, `2026-08-17` at 10:00 Brisbane on the 16th, was
  // accepted and reported as "opened today, age 0" — the exact false
  // reassurance the refusal exists to prevent. Comparing Brisbane calendar dates
  // removes the gap, so the tolerance has nothing left to absorb.
  assert.throws(() => computeAgeDays('2026-08-17', NOW), /after the current Brisbane date/u);
  assert.throws(() => computeAgeDays('2026-08-18', NOW), /after the current Brisbane date/u);
  assert.throws(() => computeAgeDays('2027-01-01', NOW), /after the current Brisbane date/u);
});

test('THE AGE IS A BRISBANE CALENDAR AGE at the moment the workflow actually runs', () => {
  // 19:00 UTC is 05:00 the NEXT day in Brisbane (UTC+10, no DST) — the moment
  // the cron is documented to fire. Flooring elapsed UTC milliseconds reported
  // 41 days here for a row whose Brisbane age is 42, so every scheduled run
  // published every age one day short.
  const scheduled = '2026-08-16T19:00:00Z'; // 17/08/2026 05:00 Brisbane
  assert.equal(computeAgeDays('2026-07-06', scheduled), 42);
  assert.equal(computeAgeDays('2026-08-17', scheduled), 0, 'the Brisbane date has already rolled');
  assert.throws(() => computeAgeDays('2026-08-18', scheduled), /after the current Brisbane date/u);

  // And one second earlier it has NOT rolled: the boundary is a real boundary,
  // not a rounding artefact.
  assert.equal(computeAgeDays('2026-07-06', '2026-08-16T13:59:59Z'), 41);
  assert.equal(computeAgeDays('2026-07-06', '2026-08-16T14:00:00Z'), 42);
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

test('THE FILE DOES NOT HOLD AN AGE AT ALL: render writes the computed marker', () => {
  /*
   * This test used to assert that render wrote the RIGHT number. Round six
   * showed that storing any number is the defect: F2 and F6 read 41 in the
   * committed register while the computed answer was 42, one day after the
   * numbers were written, and `CLAUDE.md` tells every session to read this file
   * and state the age. An age is neither state nor event — it is derived, and
   * derived values are recomputed on read, never stored.
   */
  const markdown = [
    '| ID | Decision | Opened | Age (days) | Blocks | Context | Status |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| F1 | flip it | 2026-08-06 | 999 | UNI-1 | ctx | open |',
  ].join('\n');

  const rendered = renderQueue(parseFounderQueue(markdown), NOW);
  assert.ok(rendered.includes(`| ${AGE_IS_COMPUTED} |`), rendered);
  assert.ok(!rendered.includes('999'), 'a hand-typed age must be erased');
  assert.ok(!/\|\s*\d+\s*\|/u.test(rendered.split('\n')[2]), `a number survived: ${rendered}`);

  // Rendering twice changes nothing — the marker is a fixed point, so no run
  // can reintroduce a decaying value.
  assert.equal(renderQueue(parseFounderQueue(rendered), NOW), rendered);

  // The age is still COMPUTED during render, so an impossible date is still
  // refused rather than quietly normalised into a clean-looking row.
  const future = markdown.replace('2026-08-06', '2027-01-01');
  assert.throws(() => renderQueue(parseFounderQueue(future), NOW), /Brisbane date/u);
});

test('the committed register carries no age number for a session to misread', () => {
  // The real file, not a fixture. CLAUDE.md sends every session here.
  const open = readFileSync(QUEUE_PATH, 'utf8').split('## Resolved')[0];
  const rows = open.split('\n').filter((line) => /^\|\s*[A-Z]/u.test(line) && !line.includes('ID |'));

  assert.ok(rows.length > 0, 'no open rows found — the check would be vacuous');
  for (const row of rows) {
    const age = row.split('|')[4]?.trim();
    assert.equal(age, AGE_IS_COMPUTED, `row carries a stored age: ${row.slice(0, 80)}`);
  }
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

// ---------------------------------------------------------------------------
// ROUND FOUR (codex, independent). Demonstrated open before being fixed.
// ---------------------------------------------------------------------------

const openTable = (status) => [
  '## Open',
  '',
  '| ID | Decision | Opened | Age (days) | Blocks | Context | Status |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  `| D19 | Secret vs ephemeral Postgres | 2026-07-06 | 0 | UNI-2567 arming | ctx | ${status} |`,
  '',
].join('\n');

test('A STATUS TYPO NEVER PUBLISHES AN ALL-CLEAR: `opne` is malformed, not excluded', () => {
  // THE round-four P0. The previous revision kept rows whose status read exactly
  // `open` and silently dropped the rest, so one transposed letter removed a
  // live founder blocker from the count, left `malformed` empty, reported
  // integrity OK, and published "No open founder decisions."
  const summary = summarise(parseFounderQueue(openTable('opne')), NOW);

  assert.equal(summary.openCount, 0, 'a row with an unknown status is not counted as open');
  assert.equal(summary.integrity, 'MALFORMED', 'and the queue may not be called clean');
  assert.equal(summary.malformed.length, 1);
  assert.match(summary.malformed[0], /D19/u);
  assert.match(summary.malformed[0], /neither `open` nor `resolved`/u);
});

test('every non-`open` status is classified, never silently discarded', () => {
  for (const status of ['opne', '', 'OPEN?', 'pending', 'closed']) {
    const summary = summarise(parseFounderQueue(openTable(status)), NOW);
    assert.equal(summary.integrity, 'MALFORMED', JSON.stringify(status));
    assert.ok(summary.malformed.length > 0, JSON.stringify(status));
  }

  // `resolved` is excluded from the count — a decided row is not a blocker — but
  // it is still reported, because the ledger's rules say it should have MOVED to
  // the Resolved section rather than being marked in place.
  const resolved = summarise(parseFounderQueue(openTable('resolved')), NOW);
  assert.equal(resolved.openCount, 0);
  assert.equal(resolved.integrity, 'MALFORMED');
  assert.match(resolved.malformed[0], /moves to the Resolved section/u);

  // And the good value is still good, so the guard does not cry wolf.
  const clean = summarise(parseFounderQueue(openTable('open')), NOW);
  assert.equal(clean.openCount, 1);
  assert.equal(clean.integrity, 'OK');
  assert.equal(clean.malformed.length, 0);
});

test('an open row with no ID or no Decision cannot be reported, so it is flagged', () => {
  const noId = [
    '## Open', '',
    '| ID | Decision | Opened | Age (days) | Blocks | Context | Status |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '|  | Secret vs ephemeral Postgres | 2026-07-06 | 0 | UNI-2567 | ctx | open |',
    '',
  ].join('\n');
  const summary = summarise(parseFounderQueue(noId), NOW);
  assert.equal(summary.integrity, 'MALFORMED');
  assert.match(summary.malformed.join('\n'), /empty ID cell/u);
});

test('the real FOUNDER-QUEUE.md parses clean, so these guards do not block the ledger', () => {
  // A guard that cannot pass the real file is a guard that gets switched off.
  const summary = summarise(parseFounderQueue(readFileSync(QUEUE_PATH, 'utf8')), NOW);
  assert.equal(summary.integrity, 'OK', summary.malformed.join('\n'));
  assert.ok(summary.openCount > 0, 'the ledger has open founder decisions');
  assert.equal(summary.oldest.ageDays >= 0, true);
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

test('A SEMANTICALLY MALFORMED LEDGER ALSO EXITS NON-ZERO, not just an unparseable one', () => {
  /*
   * THE DEFECT THE TWO TESTS ABOVE COULD NOT SEE, and the reason they could not.
   *
   * Both of them feed `| F9 | broken |` — a row the table parser cannot read at
   * all, which lands in `parsed.malformed`. The exit code consulted exactly that
   * list, so those tests passed against a `main()` that ignored every SEMANTIC
   * anomaly: an unknown status, an empty required cell, a date that cannot be
   * aged. Round eleven ran a valid row with status `opne` and got
   * `{integrity: "MALFORMED", openCount: 0}` printed alongside exit 0 — the run
   * telling a human the blocker was excluded and telling a gate the queue was
   * clean, in the same breath.
   *
   * Every input below parses perfectly. That is the point: the fixture must be
   * valid in every respect except the one under test, or it proves nothing about
   * which list the exit code reads.
   */
  const semantic = [
    ['an unknown status', '| F1 | flip it | 2026-08-01 | — | UNI-1 | ctx | opne |', /neither/u],
    ['a resolved row left in the Open table',
      '| F1 | flip it | 2026-08-01 | — | UNI-1 | ctx | resolved |', /moves to the Resolved/u],
    ['an empty Decision cell',
      '| F1 |  | 2026-08-01 | — | UNI-1 | ctx | open |', /empty Decision cell/u],
    ['an empty ID cell',
      '|  | flip it | 2026-08-01 | — | UNI-1 | ctx | open |', /empty ID cell/u],
    /*
     * `/./u` LIVED HERE, AND IT MATCHES ANYTHING.
     *
     * The commit that added this table said every case "asserts that the printed
     * REASON matches the anomaly under test". For this one row that was false: a
     * pattern of a single unescaped dot is satisfied by the first character of
     * any output at all. The reviewer proved it by changing the source to push
     * the literal string 'wrong unrelated reason' — the test still passed, 1/1,
     * exit 0.
     *
     * I wrote a control, wrote down what it controlled, and the control was
     * vacuous — in the very table added to demonstrate that a fixture must be
     * wrong in exactly one respect and assert the reason for it. It names the id,
     * the fault and the offending value now, so the wrong-reason mutant fails.
     */
    ['an unageable opened date',
      '| F1 | flip it | not-a-date | — | UNI-1 | ctx | open |',
      // The reason is read out of the JSON the CLI prints, so the quotes around
      // the offending value arrive backslash-escaped. Matching the raw spelling
      // silently never matched — which is how a vacuous pattern gets written in
      // the first place.
      /F1: Unparseable opened date: \\"not-a-date\\"/u],
  ];

  for (const [label, row, note] of semantic) {
    const io = { logs: [], errors: [], log(m) { this.logs.push(m); }, error(m) { this.errors.push(m); } };
    const code = main([], { io, now: NOW, readFile: () => [HEADER, RULE, row].join('\n') });
    assert.equal(code, 1, label);
    assert.match(io.logs.join('\n'), /"integrity": "MALFORMED"/u, label);
    // The printed reason and the exit code must be about the SAME anomaly, or
    // the exit is right by accident.
    assert.match(io.logs.join('\n'), note, label);

    /*
     * AND THE RENDER REFUSES THE SAME LEDGER. Its guard read the narrow list too,
     * so it would have rewritten every Age cell in a ledger holding a row nobody
     * could interpret — deriving a fact from a file it admits it cannot read.
     */
    const written = [];
    const renderIo = { logs: [], errors: [], log() {}, error(m) { this.errors.push(m); } };
    const renderCode = main(['--render'], {
      io: renderIo,
      now: NOW,
      readFile: () => [HEADER, RULE, row].join('\n'),
      writeFile: (path, contents) => written.push({ path, contents }),
    });
    assert.equal(renderCode, 2, `${label} (render)`);
    assert.equal(written.length, 0, `${label} (render must not write)`);
  }
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

test('a table row sitting outside any table body is reported, not dropped', () => {
  const markdown = ['| F9 | orphan | 2026-08-01 | 0 | x | y | open |', HEADER, RULE].join('\n');
  const parsed = parseFounderQueue(markdown);

  assert.match(parsed.malformed.join('\n'), /outside any table body/);
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

// ---------------------------------------------------------------------------
// ROUND THREE (qwen, independent). Each demonstrated open before being fixed.
// ---------------------------------------------------------------------------

test('EXTRA PIPES SHIFT EVERY CELL, so a wrong cell count is malformed both ways', () => {
  // `see | notes` in the Context cell became the Status column and the real
  // status was dropped, with no malformed flag. Too FEW cells was caught; too
  // many was not.
  const markdown = [HEADER, RULE, '| F1 | d | 2026-08-16 | 0 | b | see | notes | open |'].join('\n');
  const parsed = parseFounderQueue(markdown);

  assert.equal(parsed.open.length, 0);
  assert.match(parsed.malformed.join('\n'), /has 8 cells, expected exactly 7/);
});

test('THE LOST-PIPES HEURISTIC IS GONE: a two-letter id is caught and prose is not', () => {
  // `/^\s*[A-Z]\d+\s/` was a detect-the-bad-thing guess and lost both ways:
  // it MISSED `SEC1 ...` and FIRED on `F1 is waiting on legal.` The table body is
  // now the contiguous block after the separator — positive proof, no guessing.
  const missed = parseFounderQueue([HEADER, RULE, 'SEC1 decide 2026-08-16 0 x y open'].join('\n'));
  assert.match(missed.malformed.join('\n'), /no cell separators/);

  const prose = parseFounderQueue([
    HEADER, RULE, '| F1 | d | 2026-08-16 | 0 | b | c | open |', '', 'F1 is waiting on legal.',
  ].join('\n'));
  assert.deepEqual(prose.malformed, [], 'prose after a blank line is not a row');

  const pipedProse = parseFounderQueue([
    HEADER, RULE, '| F1 | d | 2026-08-16 | 0 | b | c | open |', '', 'Context: see | notes',
  ].join('\n'));
  assert.deepEqual(pipedProse.malformed, [], 'a stray pipe in prose is not a row');
});

test('--RENDER MUST NOT DELETE THE RESOLVED SECTION ON A CRLF FILE', () => {
  // The lookahead never matched `\r\n\r\n`, so the match ran to end-of-file and
  // the rewrite deleted everything after the Open table — including Resolved,
  // which the ledger's own rules promise is never removed.
  const crlf = [
    '# FOUNDER QUEUE', '', '## Open', '', HEADER, RULE,
    '| F1 | d | 2026-08-01 | 0 | b | c | open |', '',
    '## Resolved', '', '| ID | Decision | Opened | Resolved | Decision text |',
    '| --- | --- | --- | --- | --- |', '| F0 | old | 2026-05-01 | 2026-05-02 | did it |',
  ].join('\r\n');

  const written = [];
  const io = { logs: [], errors: [], log(m) { this.logs.push(m); }, error(m) { this.errors.push(m); } };
  const code = main(['--render'], {
    io, now: NOW, readFile: () => crlf, writeFile: (path, contents) => written.push(contents),
  });

  assert.equal(code, 0, io.errors.join('\n'));
  assert.equal(written.length, 1);
  assert.ok(written[0].includes('## Resolved'), `Resolved was deleted:\n${written[0]}`);
  assert.ok(written[0].includes('F0'), `the resolved row was deleted:\n${written[0]}`);
});

test('A ROW MARKED RESOLVED IN THE OPEN TABLE IS NOT AN ACTIVE BLOCKER', () => {
  // The Status column was ignored, so a decided row was still counted open and
  // could be reported as the oldest founder blocker.
  const markdown = [
    HEADER, RULE,
    '| F1 | decided already | 2026-01-01 | 0 | x | y | resolved |',
    '| F2 | still waiting | 2026-08-01 | 0 | x | y | open |',
  ].join('\n');

  const summary = summarise(parseFounderQueue(markdown), NOW);
  assert.equal(summary.openCount, 1);
  assert.equal(summary.oldest.id, 'F2');
});

test('a single-hyphen separator is a separator, and an ID data row is not a header', () => {
  const single = parseFounderQueue([
    HEADER, '| - | - | - | - | - | - | - |', '| F1 | d | 2026-08-01 | 0 | b | c | open |',
  ].join('\n'));
  assert.deepEqual(single.malformed, []);
  assert.deepEqual(single.open.map((r) => r.id), ['F1']);

  const idRow = parseFounderQueue([
    HEADER, RULE, '| ID | legit | 2026-08-01 | 0 | x | y | open |',
  ].join('\n'));
  assert.deepEqual(idRow.open.map((r) => r.id), ['ID'], 'the data row was swallowed as a header');
});

test('the shipped ledger still parses clean after all of this', () => {
  const parsed = parseFounderQueue(readFileSync(QUEUE_PATH, 'utf8'));
  assert.deepEqual(parsed.malformed, []);
  assert.equal(summarise(parsed, NOW).integrity, 'OK');
  assert.equal(parsed.open.length, 9);
});

test('A RESOLVED ROW THAT RESOLVES NOTHING IS NOT RESOLVED', () => {
  /*
   * ROUND-FOURTEEN P1. Only the OPEN table was ever validated. Resolved rows
   * were checked for cell COUNT and then trusted, so
   * `| F9 | Still needs a decision | 2026-08-01 |  |  |` — five cells, therefore
   * "well-formed" — sat in the Resolved section with no resolution date and no
   * decision text, and the summary reported integrity OK while the heartbeat
   * printed "Nothing is blocked on Phill."
   *
   * The Resolved section is where decisions go to be FORGOTTEN, so an unchecked
   * row there is worse than an unchecked row in Open: nobody looks at it again.
   */
  const ledger = (resolvedRow) => [
    '# FOUNDER QUEUE', '', '## Open', '', HEADER, RULE, '',
    '## Resolved', '', '| ID | Decision | Opened | Resolved | Decision text |',
    '| --- | --- | --- | --- | --- |', resolvedRow,
  ].join('\n');

  const broken = [
    ['no resolution date and no decision text',
      '| F9 | Still needs a decision | 2026-08-01 |  |  |', /empty Resolved cell/u],
    ['no decision text',
      '| F9 | Ship it | 2026-08-01 | 2026-08-02 |  |', /empty decision text cell/u],
    ['no ID', '|  | Ship it | 2026-08-01 | 2026-08-02 | shipped |', /empty ID cell/u],
    // The reason is read out of printed JSON, so the quotes around the offending
    // value arrive backslash-escaped. Second time this exact spelling has bitten
    // in this file; matching the raw form silently never matches.
    ['an unreadable resolved date',
      '| F9 | Ship it | 2026-08-01 | someday | shipped |', /Resolved date \\"someday\\"/u],
  ];
  for (const [label, row, reason] of broken) {
    const io = { logs: [], errors: [], log(m) { this.logs.push(m); }, error(m) { this.errors.push(m); } };
    const code = main([], { io, now: NOW, readFile: () => ledger(row) });
    assert.equal(code, 1, label);
    assert.match(io.logs.join('\n'), /"integrity": "MALFORMED"/u, label);
    assert.match(io.logs.join('\n'), reason, label);
  }

  /*
   * THE POSITIVE CONTROL MATTERS MORE THAN USUAL HERE: the shipped ledger has
   * ZERO resolved rows, so it cannot prove this validator does not simply refuse
   * every resolved row it sees. A complete one must pass.
   */
  const io = { logs: [], errors: [], log(m) { this.logs.push(m); }, error(m) { this.errors.push(m); } };
  const code = main([], {
    io, now: NOW, readFile: () => ledger('| F0 | Ship it | 2026-05-01 | 2026-05-02 | shipped it |'),
  });
  assert.equal(code, 0, io.logs.join('\n'));
  assert.match(io.logs.join('\n'), /"integrity": "OK"/u);
  assert.match(io.logs.join('\n'), /"resolvedCount": 1/u);
});

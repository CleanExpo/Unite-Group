#!/usr/bin/env node

/**
 * FOUNDER-QUEUE.md reader (UNI-2523).
 *
 * The ledger's only claim is that ages are real. A hand-typed age would decay
 * into reassurance the moment anyone forgot to update it, so the age column is
 * computed here and the file's own numbers are discarded on render.
 *
 * Every failure mode below refuses rather than defaults. An unparseable date
 * returning 0 would read as "opened today, nothing is stale" — precisely the
 * false-reassurance shape this ledger exists to remove.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const QUEUE_PATH = join(repositoryRoot, 'FOUNDER-QUEUE.md');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const MS_PER_DAY = 86_400_000;

/**
 * The ledger's dates are Brisbane calendar dates, so the age is a difference of
 * Brisbane calendar dates. Round four demonstrated why that distinction is not
 * pedantry: flooring elapsed UTC milliseconds reported 41 days at the workflow's
 * own scheduled moment (19:00 UTC = 05:00 the next Brisbane day) for a row whose
 * Brisbane age was 42. Every scheduled run published an age one day short.
 *
 * The previous revision met the same symptom with a one-day tolerance and a floor
 * at zero. A tolerance is a parameter, and a parameter invites the next reviewer
 * to observe that any tolerance can be exceeded — it also silently accepted a
 * genuinely future date as "opened today". Converting both sides to a Brisbane
 * calendar date removes the skew instead of forgiving it, so no tolerance is
 * needed and a future date is refused outright.
 */
const BRISBANE_TZ = 'Australia/Brisbane';
const BRISBANE_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: BRISBANE_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** `Date` -> the `YYYY-MM-DD` a wall clock in Brisbane would read. */
export function brisbaneCalendarDate(instant) {
  const parts = Object.fromEntries(
    BRISBANE_PARTS.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  if (!parts.year || !parts.month || !parts.day) {
    throw new Error('Could not resolve a Brisbane calendar date for the current instant.');
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** `YYYY-MM-DD` -> its UTC-midnight epoch, refusing anything that is not a real date. */
function calendarDateToEpoch(value, label) {
  if (typeof value !== 'string' || !ISO_DATE.test(value.trim())) {
    throw new Error(`Unparseable ${label} date: ${JSON.stringify(value)}`);
  }
  const trimmed = value.trim();
  const ms = Date.parse(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(ms)) {
    throw new Error(`Unparseable ${label} date: ${JSON.stringify(value)}`);
  }
  // ISO shape is not calendar validity: Date.parse silently rolls 2026-02-31
  // forward to 3 March and hands back a plausible age for a date that does not
  // exist. Round-tripping is the only check that catches it.
  if (new Date(ms).toISOString().slice(0, 10) !== trimmed) {
    throw new Error(`Not a real calendar date: ${JSON.stringify(value)}`);
  }
  return ms;
}

export function computeAgeDays(opened, now) {
  const openedMs = calendarDateToEpoch(opened, 'opened');

  const nowMs = Date.parse(now);
  if (Number.isNaN(nowMs)) throw new Error(`Unparseable now: ${JSON.stringify(now)}`);
  const todayMs = calendarDateToEpoch(brisbaneCalendarDate(new Date(nowMs)), 'current');

  // Both operands are UTC midnights of calendar dates, so the division is exact
  // whole days and no flooring artefact can appear.
  const days = (todayMs - openedMs) / MS_PER_DAY;
  if (days < 0) {
    throw new Error(
      `Opened date ${opened} is after the current Brisbane date `
      + `${brisbaneCalendarDate(new Date(nowMs))}.`,
    );
  }
  return days;
}

/**
 * Splits a GFM table row. The outer pipes are optional in GFM, so they are
 * stripped only when present — slicing them off unconditionally ate the first and
 * last real cell of every borderless table and returned zero rows, which the
 * heartbeat then rendered as "nothing is blocked on Phill".
 */
function splitRow(line) {
  const trimmed = line.trim().replace(/^\|/u, '').replace(/\|$/u, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

/** GFM allows a single hyphen, and optional alignment colons. */
function isSeparator(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/u.test(cell));
}

/**
 * A header row is the WHOLE header, not merely a first cell reading "ID".
 * Matching on `cells[0] === 'ID'` alone swallowed a legitimate data row whose ID
 * happened to be the literal string `ID`, and counted it as the header.
 */
function isHeaderRow(cells, section) {
  const expected = section === 'resolved'
    ? ['id', 'decision', 'opened', 'resolved', 'decision text']
    : ['id', 'decision', 'opened', 'age (days)', 'blocks', 'context', 'status'];
  if (cells.length !== expected.length) return false;
  return cells.every((cell, index) => cell.trim().toLowerCase() === expected[index]);
}

function looksLikeRow(line) {
  return line.includes('|');
}

/**
 * Parses the ledger, FAILING CLOSED.
 *
 * A row that is inside a table but does not have enough cells is NOT skipped —
 * it is recorded in `malformed`. Silently discarding it turned a typo into the
 * reassuring message "No open founder decisions", which is the exact
 * false-success shape this ledger exists to remove. Absence of the header row is
 * itself an anomaly: an empty queue must be PROVEN empty (header found, no data
 * rows), never inferred from a parse that matched nothing.
 */
export function parseFounderQueue(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const open = [];
  const resolved = [];
  const malformed = [];
  const headersSeen = new Set();
  const separatorsSeen = new Set();
  let section = 'open';
  let lineNumber = 0;

  /*
   * THE TABLE BODY IS A CONTIGUOUS BLOCK, AND THAT IS POSITIVE PROOF.
   *
   * The previous revision guessed at lost rows with `/^\s*[A-Z]\d+\s/`, which is
   * a detect-the-bad-thing heuristic and lost both ways in review: it MISSED
   * `SEC1 decide 2026-08-16 ...` (two letters) and FIRED on the prose
   * `F1 is waiting on legal.` A gate that cries wolf gets switched off, and one
   * that misses the real row prints "nothing is blocked" over a blocker.
   *
   * A GFM table body runs from the separator to the first blank line. Inside that
   * block every non-blank line IS a row and must parse; outside it, nothing is.
   * No guessing at what a row looks like.
   */
  let inBody = false;

  for (const line of lines) {
    lineNumber += 1;
    const heading = /^##\s+(.+?)\s*$/u.exec(line);
    if (heading) {
      section = /^resolved$/iu.test(heading[1]) ? 'resolved' : 'open';
      inBody = false;
      continue;
    }
    if (line.trim() === '') {
      inBody = false;
      continue;
    }

    const cells = splitRow(line);
    if (looksLikeRow(line) && isSeparator(cells)) {
      inBody = headersSeen.has(section);
      if (inBody) separatorsSeen.add(section);
      continue;
    }
    if (looksLikeRow(line) && isHeaderRow(cells, section)) {
      headersSeen.add(section);
      continue;
    }

    if (!inBody) {
      /*
       * Outside a table body. Prose with a stray pipe is not this parser's
       * business — but a line with EXACTLY a row's worth of cells is a real row
       * that has drifted out of its table, and dropping it loses a decision.
       * Cell count is a precise test, not a guess at what a row looks like.
       */
      /*
       * ANY DRIFTED ROW, NOT ONLY ONE OF THE RIGHT WIDTH.
       *
       * This reported lines with EXACTLY 7 or 5 cells, so a blocker that drifted
       * out of its table AND lost a separator — six cells — was invisible in
       * both directions at once. Confirmed: a `| F-1 | urgent blocker | ... |`
       * row with six cells produced integrity OK and zero malformed notes.
       *
       * Three or more cells is still a structural test rather than a guess about
       * content: `Context: see | notes` yields two, and prose with no pipe at all
       * yields none, so both stay out. What changed is that the width no longer
       * has to be RIGHT for the row to be seen — a wrong width is exactly what a
       * damaged row has.
       */
      if (looksLikeRow(line) && cells.length >= 3) {
        malformed.push(
          `Line ${lineNumber} looks like a table row but sits outside any table body: `
          + `${line.trim()}`,
        );
      }
      continue;
    }

    if (!looksLikeRow(line)) {
      malformed.push(
        `Line ${lineNumber} of the ${section} table has no cell separators: ${line.trim()}`,
      );
      continue;
    }

    const required = section === 'resolved' ? 5 : 7;
    if (cells.length !== required) {
      // BOTH directions. Too few loses a value; too MANY shifts every cell after
      // the extra pipe, so `see | notes` silently became the Status column and
      // the real status was dropped.
      malformed.push(
        `Line ${lineNumber} of the ${section} table has ${cells.length} cells, `
        + `expected exactly ${required}: ${line.trim()}`,
      );
      continue;
    }

    if (section === 'resolved') {
      resolved.push({
        id: cells[0], decision: cells[1], opened: cells[2], resolved: cells[3], text: cells[4] ?? '',
      });
    } else {
      open.push({
        id: cells[0],
        decision: cells[1],
        opened: cells[2],
        blocks: cells[4] ?? '',
        context: cells[5] ?? '',
        status: cells[6] ?? 'open',
      });
    }
  }

  /*
   * A HEADER WITH NO SEPARATOR IS NOT AN EMPTY TABLE.
   *
   * `inBody` only becomes true when a separator follows the header, so a table
   * whose separator was deleted parsed zero rows and reported a CLEAN EMPTY
   * QUEUE — integrity OK, openCount 0, "Nothing is blocked on Phill" — over a
   * file whose structure nobody could read. An empty queue must be PROVEN empty,
   * and the proof is a well-formed table with no data rows, not a table this
   * parser gave up on.
   */
  for (const seen of headersSeen) {
    if (!separatorsSeen.has(seen)) {
      malformed.push(
        `The ${seen} table has a header row but no separator beneath it, so no row under it `
        + 'could be attributed to the table; an empty result here is not proof of an empty queue.',
      );
    }
  }

  if (!headersSeen.has('open')) {
    malformed.push('The Open table header was never found; no row could be attributed to it.');
  }

  return { open, resolved, malformed };
}

/**
 * Returns `{ oldest, unaged }`. A row whose date does not compute is NAMED rather
 * than thrown past: an uncaught throw here killed the whole summary, so the
 * heartbeat got a generic JSON error instead of "row F9 has an impossible date".
 * The refusal is kept — a fabricated age is worse than none — but it is now a
 * reported row rather than a dead process.
 */
export function oldestOpen(rows, now) {
  let oldest = null;
  const unaged = [];
  for (const row of rows) {
    let ageDays;
    try {
      ageDays = computeAgeDays(row.opened, now);
    } catch (error) {
      unaged.push(`${row.id}: ${error.message}`);
      continue;
    }
    if (!oldest || ageDays > oldest.ageDays) oldest = { ...row, ageDays };
  }
  return { oldest, unaged };
}

/**
 * The marker that stands where a committed age used to.
 *
 * AN AGE IS NOT A FACT A FILE CAN HOLD. Round six found F2 and F6 reading 41 in
 * the committed register while the computed answer was 42 — one day after the
 * numbers were written. Nothing was broken: the value simply decays every
 * midnight, and only the explicit mutating `--render` path ever refreshed it.
 * `CLAUDE.md` tells every session to read this file and state the age, so a
 * register that stores the number is a register that lies for 23 hours out of
 * every 24.
 *
 * This is the state-versus-event rule applied to its hardest case. An age is
 * neither: it is DERIVED, and derived values are recomputed on read, never
 * stored. `opened` is the state — one date, changing only if it was wrong — and
 * it is what the file keeps.
 */
export const AGE_IS_COMPUTED = '—';

/**
 * Writes the Open table with the age column blanked to the computed marker.
 *
 * `--render` used to write the numbers in. It now writes the marker in, which
 * makes running it idempotent and makes a stale number impossible to reintroduce
 * by hand: the next render erases it.
 */
export function renderQueue(parsed, now) {
  const header = '| ID | Decision | Opened | Age (days) | Blocks | Context | Status |';
  const rule = '| --- | --- | --- | --- | --- | --- | --- |';
  const rows = parsed.open.map((row) => {
    // Still computed, and still refused if the date is impossible — the render
    // must not quietly normalise a row whose age cannot be derived at all.
    computeAgeDays(row.opened, now);
    return [
      '', row.id, row.decision, row.opened, AGE_IS_COMPUTED,
      row.blocks, row.context, row.status, '',
    ].join(' | ').trim();
  });

  return [header, rule, ...rows].join('\n');
}

/**
 * Every open row is checked against the ledger's own rules; nothing is excluded
 * by failing to match.
 *
 * THE DIFFERENCE MATTERS AND ROUND FOUR PROVED IT. The previous revision kept the
 * rows whose status read exactly `open` and dropped the rest. A single typo —
 * `opne` — therefore removed a live blocker from the count, left `malformed`
 * empty, reported integrity OK, and published "No open founder decisions.
 * Nothing is blocked on Phill." over a founder-held decision. A filter that
 * selects the good value silently discards every unrecognised one; a validator
 * that classifies each value cannot.
 *
 * `resolved` in the Open table is itself an anomaly, not a quiet exclusion: the
 * ledger's rules say a resolved row MOVES to the Resolved section with its
 * decision text. Counting it as open would report a decided item as a blocker;
 * dropping it silently would hide a row that is in the wrong place. It is
 * excluded from the count AND reported.
 */
const OPEN_STATUS = 'open';
const MISPLACED_STATUS = 'resolved';

export function classifyOpenRows(rows) {
  const stillOpen = [];
  const notes = [];
  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    const label = id === '' ? '(a row with no ID)' : id;
    const status = typeof row.status === 'string' ? row.status.trim().toLowerCase() : '';

    if (id === '') {
      notes.push('An Open-table row has an empty ID cell, so it cannot be named in a report.');
    }
    if (typeof row.decision !== 'string' || row.decision.trim() === '') {
      notes.push(`Row ${label} has an empty Decision cell, so there is nothing to report.`);
    }

    if (status === OPEN_STATUS) {
      stillOpen.push(row);
      continue;
    }
    if (status === MISPLACED_STATUS) {
      notes.push(
        `Row ${label} is marked \`resolved\` inside the Open table; the ledger's rules say a `
        + 'resolved row moves to the Resolved section with its decision text.',
      );
      continue;
    }
    notes.push(
      `Row ${label} has status ${JSON.stringify(row.status)}, which is neither \`open\` nor `
      + '`resolved`; it is not counted and the queue cannot be called clean.',
    );
  }
  return { stillOpen, notes };
}

/**
 * Every Resolved row is checked too, for the same reason every Open row is.
 *
 * ONLY THE OPEN TABLE WAS EVER VALIDATED. Resolved rows were parsed for cell
 * COUNT and then trusted, so
 * `| F9 | Still needs a decision | 2026-08-01 |  |  |` — five cells, therefore
 * well-formed — sat in the Resolved section with no resolution date and no
 * decision text, and the summary reported `integrity: OK` with the heartbeat
 * printing "Nothing is blocked on Phill."
 *
 * A decision filed as resolved with nothing recorded about how it was resolved
 * is exactly the state the founder queue exists to make visible. The Resolved
 * section is where decisions go to be FORGOTTEN, so an unchecked row there is
 * worse than an unchecked row in Open: nobody looks at it again.
 */
export function classifyResolvedRows(rows) {
  const notes = [];
  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    const label = id === '' ? '(a resolved row with no ID)' : id;
    if (id === '') {
      notes.push('A Resolved-table row has an empty ID cell, so it cannot be named in a report.');
    }
    const required = [
      ['Decision', row.decision],
      ['Opened', row.opened],
      ['Resolved', row.resolved],
      // The whole point of moving a row here: what was actually decided.
      ['decision text', row.text],
    ];
    for (const [cell, value] of required) {
      if (typeof value !== 'string' || value.trim() === '') {
        notes.push(
          `Resolved row ${label} has an empty ${cell} cell, so it records a decision nobody can `
          + 'read; a row filed as resolved with no resolution is still open.',
        );
      }
    }
    // The dates must be dates, on the same rule the Open table uses — a resolved
    // row whose dates cannot be read cannot be checked for ordering either.
    let bothDatesReadable = true;
    for (const [cell, value] of [['Opened', row.opened], ['Resolved', row.resolved]]) {
      if (typeof value === 'string' && value.trim() !== '' && !ISO_DATE.test(value.trim())) {
        notes.push(
          `Resolved row ${label} has ${cell} date ${JSON.stringify(value)}, which is not an `
          + 'ISO date.',
        );
        bothDatesReadable = false;
      } else if (typeof value !== 'string' || value.trim() === '') {
        bothDatesReadable = false;
      }
    }
    /*
     * AND THE ORDER MUST BE POSSIBLE. Checking that both dates PARSE says
     * nothing about whether they describe a real sequence: a row resolved on
     * 2026-05-01 that was opened on 2026-08-10 passed every check and reported
     * integrity OK. A decision cannot be resolved before it was raised, so that
     * row is either a typo or a fabrication, and either way the ledger's own
     * history is wrong. Found by an independent panel.
     */
    if (bothDatesReadable && row.resolved.trim() < row.opened.trim()) {
      notes.push(
        `Resolved row ${label} was resolved on ${row.resolved.trim()} but opened on `
        + `${row.opened.trim()}, which is impossible; the ledger's own history is wrong.`,
      );
    }
  }
  return { notes };
}

export function summarise(parsed, now) {
  const { stillOpen, notes } = classifyOpenRows(parsed.open);
  const { notes: resolvedNotes } = classifyResolvedRows(parsed.resolved);
  const { oldest, unaged } = oldestOpen(stillOpen, now);
  const malformed = [...(parsed.malformed ?? []), ...notes, ...resolvedNotes, ...unaged];
  return {
    openCount: stillOpen.length,
    resolvedCount: parsed.resolved.length,
    oldest,
    integrity: malformed.length === 0 ? 'OK' : 'MALFORMED',
    malformed,
  };
}

export function main(argv = process.argv.slice(2), {
  io = console,
  now = new Date().toISOString(),
  readFile = (path) => readFileSync(path, 'utf8'),
  writeFile = (path, contents) => writeFileSync(path, contents),
} = {}) {
  const markdown = readFile(QUEUE_PATH);
  const parsed = parseFounderQueue(markdown);
  /*
   * ONE AUTHORITY ON WHETHER THE LEDGER IS CLEAN, AND IT IS THE ONE PRINTED.
   *
   * Both exits below used to consult `parsed.malformed` — the SYNTACTIC list, the
   * rows the table parser could not read at all — while the summary they print
   * calls the ledger MALFORMED on a wider basis: that list PLUS the semantic
   * notes from `classifyOpenRows` and the unaged rows from `oldestOpen`. So a
   * row whose status read `opne` printed `{integrity: "MALFORMED", openCount: 0}`
   * and exited 0. A caller reading the process status was told the queue was
   * clean by the same run whose own output said the blocker had been excluded —
   * and the exit code is what a gate reads.
   *
   * Computing it once and deriving both the output and the exit from that single
   * value is the structural fix. Two lists that must agree is a defect waiting
   * to be reintroduced; one list cannot disagree with itself.
   */
  const summary = summarise(parsed, now);
  const malformed = summary.malformed;

  if (argv.includes('--render')) {
    // Never rewrite a file we could not fully read. This refusal was narrower
    // than its own comment for the same reason the exit code was: it guarded
    // against rows that failed to PARSE, and rendering happily rewrote a ledger
    // holding a row whose status nobody could interpret. The render writes a
    // derived Age over every row; deriving anything from a ledger we cannot
    // fully read is the thing this is here to refuse.
    if (malformed.length > 0) {
      for (const note of malformed) io.error(note);
      io.error('Refusing to rewrite FOUNDER-QUEUE.md while the ledger does not read cleanly.');
      return 2;
    }
    const table = renderQueue(parsed, now);
    /*
     * `\r?` ON BOTH BOUNDARIES. Round three reported that a CRLF ledger made this
     * match swallow the Resolved section and the rewrite delete it. That does NOT
     * reproduce — `\n## ` still matches the `\n` of `\r\n## `, so the match stops
     * correctly and Resolved survives; it was checked before anything changed.
     * What IS true is narrower: `\n\n` cannot match `\r\n\r\n`, so on a CRLF file
     * whose Open table is followed by a blank line and then ordinary prose rather
     * than a heading, the match would overrun. `\r?` closes that, and the test
     * below pins the Resolved section surviving a CRLF render either way.
     */
    const pattern = /\| ID \| Decision \| Opened \| Age \(days\)[\s\S]*?(?=\r?\n\r?\n|\r?\n## |$)/u;
    const match = pattern.exec(markdown);
    if (!match) {
      io.error('Refusing to rewrite FOUNDER-QUEUE.md: the Open table header was not found.');
      return 2;
    }
    // A FUNCTION REPLACEMENT, NOT A STRING. String.replace expands `$&`, `$'`,
    // `` $` `` and `$1` inside the replacement, so a Context cell containing `$&`
    // would splice the matched table back into the file. A function returns the
    // replacement verbatim.
    writeFile(QUEUE_PATH, markdown.replace(pattern, () => table));
    io.log(`Rewrote ${parsed.open.length} age values.`);
    return 0;
  }

  // The summary is still printed when the ledger is malformed — the heartbeat
  // reads it and reports the integrity failure — but the exit code refuses to
  // call it clean, and it is the SAME summary that decides both.
  io.log(JSON.stringify(summary, null, 2));
  return summary.integrity === 'OK' ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}

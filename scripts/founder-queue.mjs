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

export function computeAgeDays(opened, now) {
  if (typeof opened !== 'string' || !ISO_DATE.test(opened.trim())) {
    throw new Error(`Unparseable opened date: ${JSON.stringify(opened)}`);
  }
  const trimmed = opened.trim();
  const openedMs = Date.parse(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(openedMs)) {
    throw new Error(`Unparseable opened date: ${JSON.stringify(opened)}`);
  }
  // ISO shape is not calendar validity: Date.parse silently rolls 2026-02-31
  // forward to 3 March and hands back a plausible age for a date that does not
  // exist. Round-tripping is the only check that catches it.
  if (new Date(openedMs).toISOString().slice(0, 10) !== trimmed) {
    throw new Error(`Not a real calendar date: ${JSON.stringify(opened)}`);
  }
  const nowMs = Date.parse(now);
  if (Number.isNaN(nowMs)) throw new Error(`Unparseable now: ${JSON.stringify(now)}`);

  /*
   * ONE DAY OF TOLERANCE, BECAUSE THE DATES ARE BRISBANE AND `now` IS UTC. The
   * cron fires at 19:00 UTC, which is already 05:00 the next day in Brisbane
   * (UTC+10, no DST). A row a founder opens "today" in local time is therefore
   * up to a day ahead of a UTC `now`, and refusing it rendered a false DEGRADED
   * on a perfectly valid ledger. A genuinely fabricated future date is still
   * refused; only the timezone's own width is forgiven, and the age floors at 0.
   */
  const days = Math.floor((nowMs - openedMs) / MS_PER_DAY);
  if (days < -1) {
    throw new Error(`Opened date ${opened} is in the future relative to ${now}.`);
  }
  return Math.max(0, days);
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
      if (looksLikeRow(line) && (cells.length === 7 || cells.length === 5)) {
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

/** Rewrites the age column from `opened`, discarding whatever the file said. */
export function renderQueue(parsed, now) {
  const header = '| ID | Decision | Opened | Age (days) | Blocks | Context | Status |';
  const rule = '| --- | --- | --- | --- | --- | --- | --- |';
  const rows = parsed.open.map((row) => [
    '', row.id, row.decision, row.opened, String(computeAgeDays(row.opened, now)),
    row.blocks, row.context, row.status, '',
  ].join(' | ').trim());

  return [header, rule, ...rows].join('\n');
}

export function summarise(parsed, now) {
  /*
   * THE STATUS COLUMN IS DATA, NOT DECORATION. A row in the Open table marked
   * `resolved` was still counted as open and could be reported as the oldest
   * founder blocker — an active blocker that had already been decided.
   */
  const stillOpen = parsed.open.filter((row) => row.status.trim().toLowerCase() === 'open');
  const { oldest, unaged } = oldestOpen(stillOpen, now);
  const malformed = [...(parsed.malformed ?? []), ...unaged];
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
  const malformed = parsed.malformed ?? [];

  if (argv.includes('--render')) {
    // Never rewrite a file we could not fully read: the render drops whatever it
    // did not parse, so rendering a malformed ledger would DELETE the row that
    // failed to parse and leave the file looking clean.
    if (malformed.length > 0) {
      for (const note of malformed) io.error(note);
      io.error('Refusing to rewrite FOUNDER-QUEUE.md while rows do not parse.');
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

  // The summary is still printed when rows are malformed — the heartbeat reads it
  // and reports the integrity failure — but the exit code refuses to call it clean.
  io.log(JSON.stringify(summarise(parsed, now), null, 2));
  return malformed.length === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}

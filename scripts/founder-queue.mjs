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

  const days = Math.floor((nowMs - openedMs) / MS_PER_DAY);
  if (days < 0) {
    throw new Error(`Opened date ${opened} is in the future relative to ${now}.`);
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

function isSeparator(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/u.test(cell));
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

  for (const line of lines) {
    lineNumber += 1;
    const heading = /^##\s+(.+?)\s*$/u.exec(line);
    if (heading) {
      section = /^resolved$/iu.test(heading[1]) ? 'resolved' : 'open';
      continue;
    }
    if (!looksLikeRow(line)) {
      /*
       * A NON-EMPTY LINE INSIDE A TABLE THAT HAS NO PIPES AT ALL. `| F1 | ... |`
       * with the pipes lost to an editor is not a row this parser can read, and
       * skipping it silently is how "No open founder decisions" gets printed over
       * a real blocker. Only lines that follow a header and look like content are
       * flagged; prose between sections is not a table row.
       */
      if (headersSeen.has(section) && /^\s*[A-Z]\d+\s/u.test(line)) {
        malformed.push(
          `Line ${lineNumber} of the ${section} table looks like a row but has no cell `
          + `separators: ${line.trim()}`,
        );
      }
      continue;
    }

    const cells = splitRow(line);
    if (isSeparator(cells)) continue;
    if (/^id$/iu.test(cells[0])) {
      headersSeen.add(section);
      continue;
    }
    if (!headersSeen.has(section)) {
      // A table row BEFORE any header cannot be attributed to a section. Skipping
      // it silently loses it; the row is real even if its placement is wrong.
      malformed.push(
        `Line ${lineNumber} is a table row appearing before any header: ${line.trim()}`,
      );
      continue;
    }

    const required = section === 'resolved' ? 5 : 7;
    if (cells.length < required) {
      malformed.push(
        `Line ${lineNumber} of the ${section} table has ${cells.length} cells, `
        + `expected at least ${required}: ${line.trim()}`,
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
  const { oldest, unaged } = oldestOpen(parsed.open, now);
  const malformed = [...(parsed.malformed ?? []), ...unaged];
  return {
    openCount: parsed.open.length,
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
    const pattern = /\| ID \| Decision \| Opened \| Age \(days\)[\s\S]*?(?=\n\n|\n## |$)/u;
    if (!pattern.test(markdown)) {
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

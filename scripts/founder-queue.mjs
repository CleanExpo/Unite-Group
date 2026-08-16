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
  const openedMs = Date.parse(`${opened.trim()}T00:00:00Z`);
  if (Number.isNaN(openedMs)) {
    throw new Error(`Unparseable opened date: ${JSON.stringify(opened)}`);
  }
  const nowMs = Date.parse(now);
  if (Number.isNaN(nowMs)) throw new Error(`Unparseable now: ${JSON.stringify(now)}`);

  const days = Math.floor((nowMs - openedMs) / MS_PER_DAY);
  if (days < 0) {
    throw new Error(`Opened date ${opened} is in the future relative to ${now}.`);
  }
  return days;
}

function splitRow(line) {
  return line.split('|').slice(1, -1).map((cell) => cell.trim());
}

function isSeparator(cells) {
  return cells.every((cell) => /^-{2,}$/u.test(cell));
}

export function parseFounderQueue(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const open = [];
  const resolved = [];
  let section = 'open';

  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/u.exec(line);
    if (heading) {
      section = /^resolved$/iu.test(heading[1]) ? 'resolved' : 'open';
      continue;
    }
    if (!line.trim().startsWith('|')) continue;

    const cells = splitRow(line);
    if (cells.length < 5 || isSeparator(cells)) continue;
    if (/^id$/iu.test(cells[0])) continue;

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

  return { open, resolved };
}

export function oldestOpen(rows, now) {
  let oldest = null;
  for (const row of rows) {
    const ageDays = computeAgeDays(row.opened, now);
    if (!oldest || ageDays > oldest.ageDays) oldest = { ...row, ageDays };
  }
  return oldest;
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
  return {
    openCount: parsed.open.length,
    resolvedCount: parsed.resolved.length,
    oldest: oldestOpen(parsed.open, now),
  };
}

export function main(argv = process.argv.slice(2), { io = console, now = new Date().toISOString() } = {}) {
  const markdown = readFileSync(QUEUE_PATH, 'utf8');
  const parsed = parseFounderQueue(markdown);

  if (argv.includes('--render')) {
    const table = renderQueue(parsed, now);
    const rebuilt = markdown.replace(
      /\| ID \| Decision \| Opened \| Age \(days\)[\s\S]*?(?=\n\n|\n## |$)/u,
      table,
    );
    writeFileSync(QUEUE_PATH, rebuilt);
    io.log(`Rewrote ${parsed.open.length} age values.`);
    return 0;
  }

  io.log(JSON.stringify(summarise(parsed, now), null, 2));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}

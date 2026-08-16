#!/usr/bin/env node

/**
 * Nexus heartbeat (UNI-2523) — the scheduled pulse that keeps distance-to-goal
 * visible while nobody is watching.
 *
 * It OBSERVES AND REPORTS. Waterline Class 0/1: it must not deploy, merge, or arm
 * anything (UNI-2542 merge is not deploy; UNI-2562 one release authority). Its
 * only write is one pinned issue.
 *
 * It degrades honestly. A gate that failed says FAIL with its exit code, and a
 * gate that never ran says NOT RUN — never omitted, never silently green. That is
 * the UNI-2567 lesson applied to this surface: a job whose evidence did not
 * execute must not read the same as one that passed.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HEARTBEAT_TITLE = 'Heartbeat — distance to North Star';

const STATUS_LABEL = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_RUN: 'NOT RUN',
});

/**
 * Finds the pinned issue by EXACT title and updates it; creates only when no
 * exact match exists. Substring matching would let "Re: Heartbeat …" absorb the
 * update and leave the real pin stale, so the comparison is deliberately strict.
 */
export async function upsertHeartbeatIssue({ client, body, title = HEARTBEAT_TITLE }) {
  const issues = await client.listOpenIssues();
  const matches = issues.filter((issue) => issue.title === title);

  if (matches.length === 0) {
    const created = await client.createIssue({ title, body });
    return { action: 'created', number: created.number };
  }

  // Deterministic when the repo already contains duplicates: oldest wins, so
  // repeated runs converge on one issue instead of alternating between them.
  const target = matches.reduce((low, issue) => (issue.number < low.number ? issue : low));
  await client.updateIssue(target.number, { title, body });
  return { action: 'updated', number: target.number };
}

export function buildHeartbeatBody({ date, gates, queue, drift }) {
  const lines = [
    `**${date}** — automated observation. This issue is rewritten in place each run.`,
    '',
    '## Gates',
    '',
    '| Gate | Result | Exit |',
    '| --- | --- | --- |',
  ];

  for (const gate of gates) {
    const label = STATUS_LABEL[gate.status] ?? gate.status;
    const exit = gate.exitCode === null || gate.exitCode === undefined
      ? '—'
      : `exit ${gate.exitCode}`;
    lines.push(`| \`${gate.name}\` | ${label} | ${exit} |`);
  }

  lines.push('', '## Founder decisions', '');
  if (!queue.oldest || queue.openCount === 0) {
    lines.push('No open founder decisions. Nothing is blocked on Phill.');
  } else {
    lines.push(
      `**${queue.openCount} open.** Oldest: **${queue.oldest.id}** — `
      + `${queue.oldest.decision} — **${queue.oldest.ageDays} days**, blocking `
      + `${queue.oldest.blocks}.`,
    );
    lines.push('', 'See `FOUNDER-QUEUE.md`.');
  }

  lines.push('', '## Drift', '');
  lines.push(drift ?? 'No gate regressed since the previous run.');

  return lines.join('\n');
}

/** A gate that passed before and fails now. Recovery is not drift. */
export function detectDrift(previousGates, currentGates) {
  if (!previousGates) return null;

  const previous = new Map(previousGates.map((gate) => [gate.name, gate.status]));
  const regressed = currentGates
    .filter((gate) => previous.get(gate.name) === 'PASS' && gate.status !== 'PASS')
    .map((gate) => `\`${gate.name}\` (${STATUS_LABEL[gate.status] ?? gate.status})`);

  if (regressed.length === 0) return null;
  return `Regressed since the previous run: ${regressed.join(', ')}.`;
}

/** Reads the gate results a CI step wrote out, refusing a malformed file. */
export function readGateResults(path) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${path} is not an array of gate results.`);
  for (const gate of parsed) {
    if (typeof gate.name !== 'string' || !(gate.status in STATUS_LABEL)) {
      throw new Error(`${path} contains a gate with no name or an unknown status.`);
    }
  }
  return parsed;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // The workflow drives this through the GitHub Script action, which supplies the
  // authenticated client. Running it directly is a no-op by design: this file
  // must never be able to write to the repository from a developer machine.
  console.log(`${HEARTBEAT_TITLE}: library module; invoked by .github/workflows/nexus-heartbeat.yml`);
}

#!/usr/bin/env node

/**
 * Nexus heartbeat (UNI-2523) — the scheduled pulse that keeps distance-to-goal
 * visible while nobody is watching.
 *
 * It OBSERVES AND REPORTS. Waterline Class 0/1: it must not deploy, merge, or arm
 * anything (UNI-2542 merge is not deploy; UNI-2562 one release authority).
 *
 * It degrades honestly. A gate that failed says FAIL with its exit code, a gate
 * that never ran says NOT RUN, and a gate whose evidence file never arrived says
 * NOT RUN with the reason stated at the top of the report. Never omitted, never
 * silently green. That is the UNI-2567 lesson applied to this surface: a job
 * whose evidence did not execute must not read the same as one that passed.
 *
 * EVERY DECISION LIVES IN THIS FILE, NOT IN THE WORKFLOW YAML. Round one of the
 * independent review found the NOT RUN reconstruction inlined in
 * `.github/workflows/nexus-heartbeat.yml` while the test that claimed to cover it
 * exercised a different copy here: mutating the workflow's fallback to
 * `{ status: 'PASS' }` left the suite green. Logic that only exists in YAML is
 * logic no test can reach, so the YAML is now a thin caller and
 * `nexus-heartbeat.test.mjs` asserts that it stays one.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HEARTBEAT_TITLE = 'Heartbeat — distance to North Star';

/**
 * Ownership marker. An exact title match is NOT proof of ownership — a human can
 * open an issue with the same title, and the review demonstrated the upsert
 * overwriting one. Only an issue whose body carries this marker was written by
 * this workflow, so only such an issue may be rewritten.
 */
export const OWNER_MARKER = '<!-- nexus-heartbeat:v1 -->';

export const DECLARED_GATES = Object.freeze([
  'verify:readiness',
  'verify:docs-watch',
  'verify:docs-review',
]);

const STATUS_LABEL = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_RUN: 'NOT RUN',
});

/**
 * Rebuilds the full declared gate list from whatever the capture step produced.
 *
 * A gate missing from the capture NEVER RAN — it is reported NOT RUN rather than
 * dropped, because a dropped row reads exactly like a passing one. A gate present
 * with an unrecognised status is also NOT RUN: an unknown token must not be
 * rendered verbatim into a table a human scans for the word PASS.
 *
 * Returns `{ gates, anomalies }`. `anomalies` is non-empty whenever the capture
 * disagreed with the declaration, and the caller must surface it.
 */
export function reconcileGates(declared, captured) {
  const anomalies = [];
  const list = Array.isArray(captured) ? captured : [];
  if (!Array.isArray(captured)) {
    anomalies.push('The gate capture was not a JSON array; every gate is reported NOT RUN.');
  }

  const byName = new Map();
  for (const entry of list) {
    if (!entry || typeof entry.name !== 'string') {
      anomalies.push('A captured gate had no name and was discarded.');
      continue;
    }
    if (byName.has(entry.name)) {
      anomalies.push(`\`${entry.name}\` appeared more than once in the capture; the first was kept.`);
      continue;
    }
    byName.set(entry.name, entry);
  }

  for (const name of byName.keys()) {
    if (!declared.includes(name)) {
      anomalies.push(`\`${name}\` was captured but is not a declared gate.`);
    }
  }

  const gates = declared.map((name) => {
    const entry = byName.get(name);
    if (!entry) {
      anomalies.push(`\`${name}\` is declared but absent from the capture.`);
      return { name, status: 'NOT_RUN', exitCode: null };
    }
    if (!(entry.status in STATUS_LABEL)) {
      anomalies.push(`\`${name}\` had unrecognised status ${JSON.stringify(entry.status)}.`);
      return { name, status: 'NOT_RUN', exitCode: null };
    }
    const exitCode = Number.isInteger(entry.exitCode) ? entry.exitCode : null;
    return { name, status: entry.status, exitCode };
  });

  return { gates, anomalies };
}

/**
 * Reads the previous run's gate results back out of the issue body it wrote.
 *
 * Only PASS is recognised affirmatively; anything else — FAIL, NOT RUN, a row
 * that is not there at all — is treated as not-passing, so a body this function
 * cannot read can never manufacture a regression that did not happen, nor a
 * clean baseline that was never proven.
 */
export function parsePreviousGates(body, declared) {
  if (typeof body !== 'string' || !body.includes(OWNER_MARKER)) return null;
  return declared.map((name) => ({
    name,
    // A backtick is not a regex metacharacter and must NOT be escaped: `\`` is an
    // invalid identity escape under the `u` flag and throws at construction.
    status: new RegExp(`\`${escapeForRegExp(name)}\`\\s*\\|\\s*PASS\\s*\\|`, 'u').test(body)
      ? 'PASS'
      : 'FAIL',
  }));
}

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Finds this workflow's own pinned issue and updates it; creates one only when no
 * owned issue exists.
 *
 * Ownership is the body marker, not the title. `listOpenIssues` must return EVERY
 * open issue — the caller paginates — because a heartbeat sitting on page two
 * would otherwise be invisible and a duplicate would be opened every run.
 */
export async function upsertHeartbeatIssue({ client, body, title = HEARTBEAT_TITLE }) {
  if (!body.includes(OWNER_MARKER)) {
    throw new Error('Refusing to write a heartbeat body with no ownership marker.');
  }

  const issues = await client.listOpenIssues();
  const owned = issues.filter(
    (issue) => issue.title === title && typeof issue.body === 'string' && issue.body.includes(OWNER_MARKER),
  );

  if (owned.length === 0) {
    const created = await client.createIssue({ title, body });
    return { action: 'created', number: created.number };
  }

  // Deterministic when duplicates exist: oldest wins, so repeated runs converge
  // on one issue instead of alternating between them.
  const target = owned.reduce((low, issue) => (issue.number < low.number ? issue : low));
  await client.updateIssue(target.number, { title, body });
  return { action: 'updated', number: target.number };
}

export function buildHeartbeatBody({ date, gates, queue, drift, anomalies = [], provenance }) {
  const lines = [
    OWNER_MARKER,
    `**${date}** — automated observation. This issue is rewritten in place each run.`,
    '',
  ];

  if (provenance) {
    lines.push(
      `Generated by run [${provenance.runId}](${provenance.runUrl}) at ${provenance.generatedAt}.`,
      'If that timestamp is more than 25 hours old, the heartbeat itself has stopped and '
      + 'everything below is stale — the workflow cannot report its own silence.',
      '',
    );
  }

  if (anomalies.length > 0) {
    lines.push(
      '> **DEGRADED — this report is incomplete.** The observations below are missing '
      + 'evidence and must not be read as a clean run:',
      '>',
      ...anomalies.map((note) => `> - ${note}`),
      '',
    );
  }

  lines.push('## Gates', '', '| Gate | Result | Exit |', '| --- | --- | --- |');

  for (const gate of gates) {
    const label = STATUS_LABEL[gate.status] ?? 'NOT RUN';
    const exit = gate.exitCode === null || gate.exitCode === undefined
      ? '—'
      : `exit ${gate.exitCode}`;
    lines.push(`| \`${gate.name}\` | ${label} | ${exit} |`);
  }

  lines.push('', '## Founder decisions', '');
  if (queue?.integrity && queue.integrity !== 'OK') {
    lines.push(
      `**Queue integrity ${queue.integrity}.** \`FOUNDER-QUEUE.md\` did not parse cleanly, `
      + 'so the count is not trustworthy and an empty queue must not be inferred from it.',
    );
    for (const note of queue.malformed ?? []) lines.push(`- ${note}`);
  } else if (!queue?.oldest || queue.openCount === 0) {
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
    .map((gate) => `\`${gate.name}\` (${STATUS_LABEL[gate.status] ?? 'NOT RUN'})`);

  if (regressed.length === 0) return null;
  return `Regressed since the previous run: ${regressed.join(', ')}.`;
}

/**
 * Reads a JSON evidence file, returning the reason it could not be read rather
 * than a default that looks like data. A missing gate capture and an empty gate
 * capture are different facts and are reported differently.
 */
export function readEvidence(path, { readFile = (p) => readFileSync(p, 'utf8') } = {}) {
  let raw;
  try {
    raw = readFile(path);
  } catch {
    return { ok: false, reason: `\`${path}\` was never written — the step that produces it did not complete.` };
  }
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, reason: `\`${path}\` is present but not valid JSON — the producing step died mid-write.` };
  }
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

/**
 * The whole report, assembled from evidence files. The workflow calls exactly
 * this — it owns no logic of its own — so a mutation anywhere in the decision
 * path is reachable by a test.
 */
export function composeHeartbeat({
  date, gateEvidence, queueEvidence, previousBody, provenance, declared = DECLARED_GATES,
}) {
  const anomalies = [];

  let captured = [];
  if (gateEvidence.ok) {
    captured = gateEvidence.value;
  } else {
    anomalies.push(gateEvidence.reason);
  }

  const { gates, anomalies: gateAnomalies } = reconcileGates(declared, captured);
  anomalies.push(...gateAnomalies);

  let queue = { openCount: 0, oldest: null, integrity: 'UNAVAILABLE', malformed: [] };
  if (queueEvidence.ok) {
    queue = { integrity: 'OK', malformed: [], ...queueEvidence.value };
  } else {
    anomalies.push(queueEvidence.reason);
  }

  const previous = parsePreviousGates(previousBody, declared);
  const body = buildHeartbeatBody({
    date, gates, queue, drift: detectDrift(previous, gates), anomalies, provenance,
  });

  return { body, gates, anomalies, degraded: anomalies.length > 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // The workflow drives this through the GitHub Script action, which supplies the
  // authenticated client. Running it directly is a no-op by design: this file
  // must never be able to write to the repository from a developer machine.
  console.log(`${HEARTBEAT_TITLE}: library module; invoked by .github/workflows/nexus-heartbeat.yml`);
}

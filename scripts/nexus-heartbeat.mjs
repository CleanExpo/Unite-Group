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
 * The report's date, as a Brisbane wall clock would read it, in en-AU order.
 *
 * The workflow used `new Date().toISOString().slice(0, 10)`. At the schedule's
 * own documented moment — 19:00 UTC, which is 05:00 the next Brisbane day — that
 * stamps the PREVIOUS calendar date on a body whose queue ages were computed in
 * Brisbane. One report, two timezones, and the header disagreeing with the
 * content it heads. It was also ISO where the repo's locale is DD/MM/YYYY.
 *
 * Exported and used by the workflow rather than inlined there, for the same
 * reason every other decision lives in this file: logic in YAML is logic no
 * test can reach.
 */
const BRISBANE_REPORT_DATE = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function brisbaneReportDate(instant = new Date()) {
  const parts = Object.fromEntries(
    BRISBANE_REPORT_DATE.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  if (!parts.year || !parts.month || !parts.day) {
    throw new Error('Could not resolve a Brisbane report date.');
  }
  return `${parts.day}/${parts.month}/${parts.year}`;
}

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
    /*
     * THE VERDICT IS DERIVED HERE, NOT READ FROM THE CAPTURE. The capture step
     * used to decide `status=PASS` in shell inside the workflow YAML, which is
     * the round-one P0 one layer down: a verdict living where no test can reach
     * it. The capture now records exit codes only, and an entry that carries a
     * `status` at all is treated as untrusted rather than believed.
     */
    if (Object.hasOwn(entry, 'status')) {
      anomalies.push(
        `\`${name}\` arrived with a pre-decided status ${JSON.stringify(entry.status)}; `
        + 'the capture records exit codes only and the verdict is derived here.',
      );
      return { name, status: 'NOT_RUN', exitCode: null };
    }
    if (!Number.isInteger(entry.exitCode)) {
      anomalies.push(
        `\`${name}\` has no integer exit code (${JSON.stringify(entry.exitCode)}), so whether `
        + 'it ran cannot be told from whether it passed.',
      );
      return { name, status: 'NOT_RUN', exitCode: null };
    }
    return {
      name,
      status: entry.exitCode === 0 ? 'PASS' : 'FAIL',
      exitCode: entry.exitCode,
    };
  });

  return { gates, anomalies };
}

/**
 * Validates the founder-queue evidence and reports what is wrong with it.
 *
 * Round two found two holes here, both of the same shape: a queue that could not
 * be trusted still rendered "No open founder decisions. Nothing is blocked on
 * Phill." An unvalidated `{}` spread into a default of `integrity: 'OK'`, and a
 * MALFORMED integrity flag was printed in the body but never reached `anomalies`,
 * so the run finished green. The flag has to travel with the anomaly or it is
 * decoration.
 */
/**
 * THE STATE IS THE VERDICT, AND EVERY RENDER SWITCHES ON IT.
 *
 * `UNTRUSTWORTHY` is the default and the only value that needs no proof. The
 * other two are earned: `CLEAN_EMPTY` requires a summary that positively proves
 * there is nothing open, and `CLEAN_OPEN` requires a fully-formed oldest record.
 *
 * Round four found three separate ways an untrustworthy summary still reached the
 * founder all-clear, and they were all the same defect: the renderer re-derived
 * its own answer from `openCount` and `oldest` instead of consulting the
 * validation that had just run. `{openCount: 5, oldest: null}` was flagged as an
 * anomaly and then printed "Nothing is blocked on Phill" in the same body;
 * `{oldest: {}}` and `{ageDays: -99}` were never flagged at all. One verdict,
 * computed once, consulted everywhere, makes that class unreachable rather than
 * unlikely.
 */
export const QUEUE_STATE = Object.freeze({
  CLEAN_EMPTY: 'CLEAN_EMPTY',
  CLEAN_OPEN: 'CLEAN_OPEN',
  UNTRUSTWORTHY: 'UNTRUSTWORTHY',
});

const OLDEST_TEXT_FIELDS = Object.freeze(['id', 'decision', 'blocks']);

/** Returns the reasons `oldest` is not a usable record — empty means it is. */
function faultsInOldest(oldest) {
  const faults = [];
  if (oldest === null || typeof oldest !== 'object' || Array.isArray(oldest)) {
    return ['the oldest entry is not an object'];
  }
  for (const field of OLDEST_TEXT_FIELDS) {
    if (typeof oldest[field] !== 'string' || oldest[field].trim() === '') {
      faults.push(`its \`${field}\` is missing or empty`);
    }
  }
  if (!Number.isInteger(oldest.ageDays) || oldest.ageDays < 0) {
    faults.push(`its \`ageDays\` is ${JSON.stringify(oldest.ageDays)}, not a whole number of days`);
  }
  return faults;
}

export function reconcileQueue(queueEvidence) {
  const anomalies = [];
  const unavailable = {
    openCount: 0, oldest: null, integrity: 'UNAVAILABLE', malformed: [], state: QUEUE_STATE.UNTRUSTWORTHY,
  };

  if (!queueEvidence.ok) {
    anomalies.push(queueEvidence.reason);
    return { queue: unavailable, anomalies };
  }

  const value = queueEvidence.value;
  // Shape first. `{}` and `[]` both parse as JSON and neither is a queue summary.
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || !Number.isInteger(value.openCount)) {
    anomalies.push(
      '`/tmp/heartbeat/queue.json` parsed but is not a founder-queue summary, so the '
      + 'number of open decisions is unknown.',
    );
    return { queue: unavailable, anomalies };
  }

  const integrity = typeof value.integrity === 'string' ? value.integrity : 'UNKNOWN';
  const malformed = Array.isArray(value.malformed) ? value.malformed : [];
  if (!Array.isArray(value.malformed)) {
    anomalies.push('The queue summary carries no `malformed` list, so a clean parse cannot be proven.');
  }

  // A SHAPE CHECK THAT ACCEPTS AN IMPOSSIBLE SUMMARY IS NOT A SHAPE CHECK.
  if (value.openCount < 0) {
    anomalies.push(`The queue reports a negative open count (${value.openCount}).`);
  }
  if (value.openCount > 0) {
    const faults = faultsInOldest(value.oldest ?? null);
    if (faults.length > 0) {
      anomalies.push(
        `The queue reports ${value.openCount} open decisions but ${faults.join(', ')}, so the `
        + 'count and the detail disagree.',
      );
    }
  }
  if (value.openCount === 0 && value.oldest !== null && value.oldest !== undefined) {
    anomalies.push('The queue reports zero open decisions while naming an oldest one.');
  }

  if (integrity !== 'OK') {
    anomalies.push(
      `\`FOUNDER-QUEUE.md\` did not parse cleanly (integrity ${integrity}); the open count `
      + 'below is not trustworthy.',
    );
    for (const note of malformed) anomalies.push(note);
  }
  // A clean parse claiming zero open rows is possible, but a clean parse that
  // ALSO lists malformed rows is self-contradictory evidence.
  if (integrity === 'OK' && malformed.length > 0) {
    anomalies.push('The queue reports integrity OK while also listing malformed rows.');
  }

  /*
   * The state is derived from THIS run's anomaly list, not from a second reading
   * of the same fields. If anything above objected, nothing below is clean.
   */
  let state = QUEUE_STATE.UNTRUSTWORTHY;
  if (anomalies.length === 0 && integrity === 'OK' && malformed.length === 0) {
    if (value.openCount === 0 && (value.oldest === null || value.oldest === undefined)) {
      state = QUEUE_STATE.CLEAN_EMPTY;
    } else if (value.openCount > 0 && faultsInOldest(value.oldest ?? null).length === 0) {
      state = QUEUE_STATE.CLEAN_OPEN;
    }
  }

  return { queue: { ...value, integrity, malformed, state }, anomalies };
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
export function findOwnedIssue(issues, title = HEARTBEAT_TITLE) {
  const owned = issues.filter(
    (issue) => issue.title === title
      // A PULL REQUEST IS AN ISSUE to this API: `issues.listForRepo` returns PRs,
      // and `issues.update` will happily rewrite a PR's body. An open PR titled
      // like the heartbeat, carrying the marker copied out of the public issue,
      // was adoptable — and if its number were lower it became canonical.
      // Round three claimed `=== undefined` let a client normalising the field
      // to null put PRs back in scope. It does not: `null === undefined` is
      // false, so a null field already disqualifies. Probed before changing
      // anything, and left alone.
      && issue.pull_request === undefined
      && typeof issue.body === 'string'
      && issue.body.includes(OWNER_MARKER),
  );
  if (owned.length === 0) return null;
  // Deterministic when duplicates exist: oldest wins, so repeated runs converge
  // on one issue instead of alternating between them. THE CALLER MUST USE THIS
  // FUNCTION for the drift read too — picking the previous body with `find` while
  // updating the lowest-numbered issue read one issue and rewrote another,
  // manufacturing regressions that never happened.
  return owned.reduce((low, issue) => (issue.number < low.number ? issue : low));
}

export async function upsertHeartbeatIssue({ client, body, title = HEARTBEAT_TITLE, issues = null }) {
  if (!body.includes(OWNER_MARKER)) {
    throw new Error('Refusing to write a heartbeat body with no ownership marker.');
  }

  /*
   * The caller passes the listing it already read for the drift comparison. Two
   * separate lookups race: the issue drift was computed from could be closed
   * between them, and the report would then be written to a NEW issue while
   * claiming a regression measured against the old one.
   */
  const target = findOwnedIssue(issues ?? await client.listOpenIssues(), title);

  if (target === null) {
    const created = await client.createIssue({ title, body });
    await confirmWrite(client, created?.number, { title, body }, 'created');
    return { action: 'created', number: created.number };
  }

  await client.updateIssue(target.number, { title, body });
  await confirmWrite(client, target.number, { title, body }, 'updated');
  return { action: 'updated', number: target.number };
}

/**
 * Reads the issue back and proves the body that is now live is the body we sent.
 *
 * A mutation response is a claim about a request, not an observation of state.
 * Round four demonstrated the gap with a client whose `createIssue` returned
 * `{number: 123}` while persisting nothing: the run reported `created #123` and
 * the workflow exited green over an issue that did not exist. That is precisely
 * the failure this heartbeat exists to detect in other systems, so it may not
 * ship with it.
 *
 * The readback is REQUIRED. A client that cannot supply `getIssue` is a client
 * that cannot confirm its own writes, and a heartbeat that cannot confirm its
 * write must fail loudly rather than report success it did not observe.
 */
async function confirmWrite(client, number, expected, action) {
  if (typeof client.getIssue !== 'function') {
    throw new Error(
      `Heartbeat issue ${action} cannot be confirmed: the client provides no \`getIssue\`, so `
      + 'the write was never read back.',
    );
  }
  if (!Number.isInteger(number)) {
    throw new Error(
      `Heartbeat issue ${action} returned no issue number (${JSON.stringify(number)}), so there `
      + 'is nothing to read back.',
    );
  }

  const live = await client.getIssue(number);
  if (!live || typeof live !== 'object') {
    throw new Error(`Heartbeat issue #${number} was ${action} but could not be read back.`);
  }
  if (live.number !== number) {
    throw new Error(
      `Heartbeat readback asked for #${number} and received #${JSON.stringify(live.number)}.`,
    );
  }
  if (live.title !== expected.title) {
    throw new Error(
      `Heartbeat issue #${number} was ${action} but its live title is `
      + `${JSON.stringify(live.title)}, not ${JSON.stringify(expected.title)}.`,
    );
  }
  if (typeof live.body !== 'string' || !live.body.includes(OWNER_MARKER)) {
    throw new Error(
      `Heartbeat issue #${number} was ${action} but its live body carries no ownership marker.`,
    );
  }
  if (live.body !== expected.body) {
    throw new Error(
      `Heartbeat issue #${number} was ${action} but its live body differs from the body sent; `
      + 'the write did not land as written.',
    );
  }
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
    const label = Object.hasOwn(STATUS_LABEL, gate.status) ? STATUS_LABEL[gate.status] : 'NOT RUN';
    const exit = gate.exitCode === null || gate.exitCode === undefined
      ? '—'
      : `exit ${gate.exitCode}`;
    lines.push(`| \`${gate.name}\` | ${label} | ${exit} |`);
  }

  /*
   * ONE SWITCH ON THE VALIDATED STATE. Not on `openCount`, not on the truthiness
   * of `oldest`, and above all not on a second opinion formed here — those are
   * how an already-flagged impossible summary still printed the all-clear.
   * `UNTRUSTWORTHY` is the default arm, so a state this function does not
   * recognise degrades rather than reassures.
   */
  lines.push('', '## Founder decisions', '');
  if (queue?.state === QUEUE_STATE.CLEAN_EMPTY) {
    lines.push('No open founder decisions. Nothing is blocked on Phill.');
  } else if (queue?.state === QUEUE_STATE.CLEAN_OPEN) {
    lines.push(
      `**${queue.openCount} open.** Oldest: **${queue.oldest.id}** — `
      + `${queue.oldest.decision} — **${queue.oldest.ageDays} days**, blocking `
      + `${queue.oldest.blocks}.`,
    );
    lines.push('', 'See `FOUNDER-QUEUE.md`.');
  } else {
    lines.push(
      `**Queue not trustworthy (integrity ${queue?.integrity ?? 'UNKNOWN'}).** `
      + '`FOUNDER-QUEUE.md` could not be read as a clean summary, so the open count is not '
      + 'reported and an empty queue must not be inferred from this section. Read the file.',
    );
    for (const note of queue?.malformed ?? []) lines.push(`- ${note}`);
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
    .map((gate) => `\`${gate.name}\` (${Object.hasOwn(STATUS_LABEL, gate.status) ? STATUS_LABEL[gate.status] : 'NOT RUN'})`);

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

/*
 * `readGateResults` WAS DELETED HERE, and its absence is the point.
 *
 * It read the gate artefact and required every entry to carry a `status`. The
 * capture step stopped emitting `status` when the shell was forbidden from
 * deciding PASS or FAIL — it writes `{name, exitCode}` now and the derivation
 * happens in `reconcileGates`, where a test can reach it. Nothing ever updated
 * this function, and nothing called it: a repository search found it only at its
 * own declaration, and feeding it the CURRENT artefact shape threw.
 *
 * So it was a second, exported authority on the same question, disagreeing with
 * the live one and provably unreachable. Dead code that encodes a retired
 * contract is worse than no code: the next reader finds two answers and the
 * export makes the wrong one look supported. The live path is `readEvidence`
 * (which fails soft, because a missing file must publish NOT RUN rather than
 * crash the report) followed by `reconcileGates`.
 */

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

  const { queue, anomalies: queueAnomalies } = reconcileQueue(queueEvidence);
  anomalies.push(...queueAnomalies);

  const previous = parsePreviousGates(previousBody, declared);
  const body = buildHeartbeatBody({
    date, gates, queue, drift: detectDrift(previous, gates), anomalies, provenance,
  });

  /*
   * `degraded` AND `failed` ARE DIFFERENT QUESTIONS, AND ONLY ONE WAS BEING ASKED.
   *
   * `degraded` means THE REPORT IS UNTRUSTWORTHY — evidence missing, malformed,
   * self-contradictory. It drives the DEGRADED banner.
   *
   * A gate that RAN and FAILED produces a perfectly trustworthy report. It raises
   * no anomaly, because nothing about the evidence is wrong. So `degraded` was
   * false, the workflow called `core.setFailed` only when degraded, and a red
   * gate published a body saying FAIL while the run went GREEN.
   *
   * That is the exact false-assurance class this whole epic exists to kill — a
   * required signal green while the thing it certifies is not — living inside the
   * instrument built to detect it. Round twelve found it with a four-line probe.
   *
   * `failed` is derived from THE SAME `gates` array the body renders, so the
   * published rows and the run's verdict cannot disagree. Anything that is not
   * PASS fails the run: FAIL because the gate is red, NOT_RUN because a gate that
   * did not run is not evidence that it passed.
   */
  const notPassing = gates.filter((gate) => gate.status !== 'PASS');
  const failureReasons = [
    ...anomalies,
    ...notPassing.map((gate) => `\`${gate.name}\` is ${gate.status}`
      + `${gate.exitCode === null ? '' : ` (exit ${gate.exitCode})`}.`),
  ];

  return {
    body,
    gates,
    anomalies,
    degraded: anomalies.length > 0,
    failed: failureReasons.length > 0,
    failureReasons,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // The workflow drives this through the GitHub Script action, which supplies the
  // authenticated client. Running it directly is a no-op by design: this file
  // must never be able to write to the repository from a developer machine.
  console.log(`${HEARTBEAT_TITLE}: library module; invoked by .github/workflows/nexus-heartbeat.yml`);
}

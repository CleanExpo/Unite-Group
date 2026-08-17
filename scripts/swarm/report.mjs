#!/usr/bin/env node
/**
 * Turn swarm-findings.json into a PR comment.
 *
 * Separate from swarm.mjs so the formatting is a pure function of the artefact
 * and can be tested without a network, a key, or a run. It also means a human
 * can re-render an old run's findings without paying to reproduce them.
 *
 *   node scripts/swarm/report.mjs                    # markdown to stdout
 *   node scripts/swarm/report.mjs --in path.json
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

// The artefact contract, mirroring writeFindings() in swarm.mjs. Kept as data so
// a field added there and forgotten here fails loudly rather than rendering as
// an absence.
export const ARRAY_FIELDS = ['models', 'roles', 'corroborated', 'single', 'questions', 'errors'];
export const NUMBER_FIELDS = ['quorum', 'lineages'];
export const SCALAR_FIELDS = ['ranAt', 'cost'];

/**
 * Check the artefact against the contract, returning the reason it fails or
 * null when it holds.
 *
 * WHY THIS IS NOT JUST A NULL CHECK. `{}` is an object, and every collection
 * read below used to fall back to `[]` — so an empty or truncated artefact
 * rendered a normal heading and "No corroborated findings", i.e. a run that
 * never happened presented as a clean review. That is the precise lie this
 * whole programme has been removing, reintroduced by a defaulting operator.
 * A partially-written file (killed runner, full disk, half-flushed JSON) is
 * exactly the case that produces it, so the check has to cover the SHAPE, not
 * just the null.
 *
 * It names the offending field because "malformed artefact" sends a reader to
 * read the whole JSON, and `corroborated is not an array` sends them to the line.
 */
export function contractViolation(run) {
  if (!run || typeof run !== 'object' || Array.isArray(run)) {
    return 'the artefact is not a JSON object';
  }
  for (const f of ARRAY_FIELDS) {
    if (!Array.isArray(run[f])) return `\`${f}\` is missing or not an array`;
  }
  for (const f of NUMBER_FIELDS) {
    if (!Number.isFinite(run[f])) return `\`${f}\` is missing or not a number`;
  }
  if (typeof run.ranAt !== 'string' || run.ranAt === '') {
    return '`ranAt` is missing or empty';
  }
  const cost = run.cost;
  if (!cost || typeof cost !== 'object' || Array.isArray(cost)) {
    return '`cost` is missing or not an object';
  }
  if (typeof cost.wasFree !== 'boolean') return '`cost.wasFree` is missing or not a boolean';
  if (!Number.isFinite(cost.totalUsd)) return '`cost.totalUsd` is missing or not a number';
  if (!Array.isArray(cost.billed)) return '`cost.billed` is missing or not an array';

  // COHERENCE, not just types. Well-typed but self-contradictory cost data is
  // the same false-clean bug wearing a different hat: `wasFree: true` beside a
  // populated `billed` list renders "Cost: $0.00 — every model reported zero"
  // over an artefact that says money changed hands, and the reader believes the
  // headline, not the field they cannot see.
  //
  // The rule is exactly ledger()'s own invariant — `wasFree === (billed.length
  // === 0)` — and deliberately NOT the tighter "a free run must have totalUsd
  // of 0". ledger() only treats a row as billed above 1e-9, so a run of many
  // sub-threshold calls legitimately sums to a tiny non-zero total with an
  // empty billed list. Demanding an exact zero there would reject real runs —
  // over-tightening a check is the same failure as under-tightening it, just
  // louder.
  if (cost.wasFree !== (cost.billed.length === 0)) {
    return cost.wasFree
      ? '`cost` contradicts itself: wasFree is true but billed is not empty'
      : '`cost` contradicts itself: wasFree is false but nothing is listed as billed';
  }
  if (!cost.wasFree && !(cost.totalUsd > 0)) {
    return '`cost` contradicts itself: a billed run reports a total of zero or less';
  }
  return null;
}

/**
 * Render the artefact as markdown.
 *
 * DESIGNED TO BE IGNORABLE. This posts on every PR, so it has to earn its space
 * or it becomes noise people learn to scroll past — at which point a real
 * finding is invisible for exactly the same reason a NUL byte was. So:
 * corroborated findings first and nothing above them, single-lineage findings
 * folded away, questions folded away, and an explicit "nothing to report" when
 * there is nothing to report.
 */
export function renderMarkdown(run) {
  const violation = contractViolation(run);
  if (violation) {
    // No heading, no counts, no cost line — nothing that pattern-matches to a
    // finished review. A reader skimming must not be able to mistake this for
    // one, so it states the negative outright rather than leaving it implied.
    return [
      '## ⚠️ Free-model review swarm — DID NOT COMPLETE',
      '',
      `The findings artefact is missing or malformed: ${violation}.`,
      '',
      '**This is not a clean review.** Nothing was checked. Do not read the absence of findings below as the absence of problems — there is no "below".',
      '',
      '<sub>Usually means the run was killed before it finished writing, or the artefact was truncated. Check the workflow logs for the run itself.</sub>',
    ].join('\n');
  }

  const { corroborated, single, questions, errors, models } = run;

  const out = [];
  out.push('## 🐝 Free-model review swarm');
  out.push('');
  out.push(
    `${models.length} model(s) across ${run.lineages} lineage(s) · roles: ${run.roles.join(', ') || '?'} · ` +
    `quorum ${run.quorum} independent lineage(s)`,
  );
  out.push('');

  // ── the only part that should ever cost a reader time ───────────────────
  if (corroborated.length === 0) {
    out.push('**No corroborated findings.**');
  } else {
    out.push(`### ${corroborated.length} corroborated finding(s)`);
    out.push('');
    out.push('Each was reported independently by models from different lineages, and survived a challenge from a lineage that did not raise it.');
    out.push('');
    const sorted = [...corroborated].sort(
      (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
    );
    for (const f of sorted) {
      const where = `${f.file ?? '?'}${f.line ? `:${f.line}` : ''}`;
      const challenge = !f.refutation ? ''
        : f.refutation.votes === 0 ? ' · not challenged (no eligible refuter)'
          : ` · survived ${f.refutation.votes - f.refutation.refuted}/${f.refutation.votes}`;
      out.push(`**\`${(f.severity ?? '?').toUpperCase()}\` ${where}**${challenge}`);
      out.push('');
      out.push(`${f.claim ?? ''}`);
      if (f.why) out.push(`> ${f.why}`);
      out.push('');
      out.push(`<sub>${(f.lineages ?? '?')} lineage(s) · ${(f.models ?? []).join(', ')} · roles: ${(f.roles ?? []).join(', ')}</sub>`);
      out.push('');
    }
  }

  if (single.length) {
    out.push(details(
      `${single.length} single-lineage finding(s) — below quorum, shown for completeness`,
      single.map((f) => `- \`${f.severity ?? '?'}\` ${f.file ?? '?'} — ${f.claim ?? ''}  <sub>(${(f.models ?? []).join(', ')})</sub>`),
    ));
  }

  if (questions.length) {
    out.push(details(
      `${questions.length} question(s) — never counted towards quorum`,
      questions.map((q) => `- ${q.claim ?? ''}${q.why ? `\n  <sub>↳ ${q.why}</sub>` : ''}`),
    ));
  }

  // Errors are not a footnote. A model that errored did not vote, so the
  // effective quorum was lower than the header claims — the reader has to be
  // able to see that without opening the artefact.
  if (errors.length) {
    const byModel = {};
    for (const e of errors) byModel[e.model] = (byModel[e.model] ?? 0) + 1;
    out.push(details(
      `⚠️ ${errors.length} failed call(s) — these models did not vote, so the effective quorum was lower here`,
      Object.entries(byModel).map(([m, n]) => `- \`${m}\` — ${n} failure(s)`),
    ));
  }

  // contractViolation() has already guaranteed cost is an object with a boolean
  // wasFree, a finite totalUsd and an array billed — so no defaulting here. The
  // defaulting is what let a malformed artefact render as a free, clean run.
  const cost = run.cost;
  out.push('');
  out.push(
    cost.wasFree
      ? '> Cost: **$0.00** — every model reported zero.'
      : `> 💸 **This run cost $${cost.totalUsd.toFixed(6)}.** Billed: ${cost.billed.map((b) => `\`${b.model}\``).join(', ')}. Re-run \`bench.mjs --list\` — these are not free any more.`,
  );
  out.push('');
  out.push('<sub>Advisory only. This is a filter for attention, not a gate — it says *look here*, and a human decides. Never make it a required check without evidence it has earned it.</sub>');

  return out.join('\n');
}

const details = (summary, lines) =>
  ['', '<details>', `<summary>${summary}</summary>`, '', ...lines, '', '</details>'].join('\n');

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--in');
  const path = i >= 0 && argv[i + 1] ? argv[i + 1] : join(HERE, 'swarm-findings.json');
  let run;
  try {
    run = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    // Deliberately not silent: a missing artefact means the run did not finish,
    // and rendering a cheerful empty report for it would be the same lie the
    // swarm's own exit-code bug told.
    console.error(`Could not read ${path}: ${err.message}`);
    process.exit(1);
  }
  process.stdout.write(`${renderMarkdown(run)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

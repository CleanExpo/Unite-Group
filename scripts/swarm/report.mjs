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
  if (!run || typeof run !== 'object') {
    return '**Swarm review** — no artefact was produced. The run did not complete.';
  }

  const corroborated = run.corroborated ?? [];
  const single = run.single ?? [];
  const questions = run.questions ?? [];
  const errors = run.errors ?? [];
  const models = run.models ?? [];

  const out = [];
  out.push('## 🐝 Free-model review swarm');
  out.push('');
  out.push(
    `${models.length} model(s) across ${run.lineages ?? '?'} lineage(s) · roles: ${(run.roles ?? []).join(', ') || '?'} · ` +
    `quorum ${run.quorum ?? '?'} independent lineage(s)`,
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

  const cost = run.cost ?? {};
  out.push('');
  out.push(
    cost.wasFree === false
      ? `> 💸 **This run cost $${Number(cost.totalUsd ?? 0).toFixed(6)}.** Billed: ${(cost.billed ?? []).map((b) => `\`${b.model}\``).join(', ')}. Re-run \`bench.mjs --list\` — these are not free any more.`
      : '> Cost: **$0.00** — every model reported zero.',
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

#!/usr/bin/env node
/**
 * Second-opinion review swarm over OpenRouter.
 *
 * Fans a diff out to several cheap models in parallel, then keeps only findings
 * that MORE THAN ONE model independently reports. That threshold is the whole
 * design: a single cheap model produces confident nonsense often enough to be
 * useless as a gate, but two models inventing the SAME false finding about the
 * same line is rare. Corroboration converts unreliable reviewers into a usable
 * signal without paying for a strong one.
 *
 * This is a filter for attention, not an oracle. It says "look here", and the
 * expensive reviewer or the human decides.
 *
 *   export OPENROUTER_API_KEY=sk-or-...
 *   node scripts/swarm/swarm.mjs --diff                      # staged + unstaged vs HEAD
 *   node scripts/swarm/swarm.mjs --diff --base origin/main   # whole branch
 *   node scripts/swarm/swarm.mjs --files a.ts b.ts
 *   node scripts/swarm/swarm.mjs --diff --models x,y,z --quorum 2
 *
 * Pick the models with bench.mjs first. Do not guess which ones are good.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { familyOf, validateRoster } from './lib/lineage.mjs';
import { callModel, ledger } from './lib/openrouter.mjs';
import { REFUTE, REVIEW_ROLES, ROLES, isQuestion } from './lib/roles.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.OPENROUTER_API_KEY;

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const QUORUM = Number(val('--quorum', '2'));
const CONCURRENCY = Number(val('--concurrency', '6'));
const TIMEOUT_MS = Number(val('--timeout', '120000'));
const MAX_CHARS = Number(val('--max-chars', '24000'));
const ATTEMPTS = Number(val('--attempts', '4'));
const REFUTERS = Number(val('--refuters', '3'));
const ROLE_KEYS = val('--roles', REVIEW_ROLES.join(','))
  .split(',').map((s) => s.trim()).filter(Boolean);
const NO_REFUTE = has('--no-refute');

/**
 * Default roster.
 *
 * Deliberately NOT hard-coded to specific ids: ids churn on OpenRouter and a
 * stale one 404s in a way that looks like a model with nothing to say. If
 * bench-results.json exists, the top scorers from your own measured run are
 * used. Otherwise the run stops and tells you to benchmark first — picking
 * reviewers by reputation is the habit this tool exists to replace.
 */
function defaultModels() {
  try {
    const bench = JSON.parse(readFileSync(join(HERE, 'bench-results.json'), 'utf8'));
    const picked = bench.rows
      .filter((r) => r.errors === 0 && r.total > 0)
      .slice(0, 5)
      .map((r) => r.model);
    if (picked.length >= 2) return picked;
  } catch {
    /* no benchmark yet */
  }
  return null;
}

// ── input ───────────────────────────────────────────────────────────────────

function gatherDiff() {
  const base = val('--base', '');
  const cmd = base ? `git diff ${base}...HEAD` : 'git diff HEAD';
  const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (!out.trim()) throw new Error(`No changes from \`${cmd}\`.`);
  return out;
}

function gatherFiles(paths) {
  return paths
    .map((p) => `--- ${p} ---\n${readFileSync(p, 'utf8')}`)
    .join('\n\n');
}

/**
 * Split oversized input on file boundaries.
 *
 * A silently truncated diff is the worst outcome available here: the swarm
 * returns "no issues" for code it never saw, and that reads exactly like a
 * clean review. Chunking keeps every hunk in front of some model, and the
 * chunk count is printed so a large review never looks like a small one.
 */
export function chunk(text, max) {
  if (text.length <= max) return [text];
  const parts = text.split(/(?=^diff --git )/m);
  const chunks = [];
  let cur = '';
  for (const p of parts) {
    if (cur && cur.length + p.length > max) {
      chunks.push(cur);
      cur = '';
    }
    // A single file larger than the budget still has to go somewhere; send it
    // whole and let the model's own context limit be the constraint.
    cur += p;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// ── calling ─────────────────────────────────────────────────────────────────

/** One model, one role, one chunk. Prompts live in lib/roles.mjs. */
async function review(model, role, text, idx) {
  const r = await callModel({
    model,
    system: ROLES[role].system,
    user: `Review this change:\n\n${text}`,
    key: KEY,
    timeoutMs: TIMEOUT_MS,
    maxAttempts: ATTEMPTS,
  });
  if (!r.ok) return { model, role, idx, error: r.error, attempts: r.attempts, usage: r.usage, findings: [] };
  return {
    model, role, idx,
    attempts: r.attempts,
    usage: r.usage,
    findings: parseFindings(r.content).map((f) => ({ ...f, _role: role })),
  };
}

/**
 * Stage two: ask a model to REFUTE a finding another model made.
 *
 * The refuter is shown the same diff, so it can check the claim against the code
 * rather than judging it on plausibility — which is what a model asked to grade
 * a confident assertion will otherwise do.
 */
async function refute(model, finding, text) {
  const r = await callModel({
    model,
    system: REFUTE.system,
    user: `Finding to refute:\nfile: ${finding.file ?? '?'}\nclaim: ${finding.claim}\nwhy: ${finding.why ?? ''}\n\nThe diff:\n\n${text}`,
    key: KEY,
    timeoutMs: TIMEOUT_MS,
    maxAttempts: ATTEMPTS,
    maxTokens: 400,
  });
  if (!r.ok) return { model, error: r.error, attempts: r.attempts, usage: r.usage, verdict: null };
  return { model, attempts: r.attempts, usage: r.usage, verdict: parseVerdict(r.content) };
}

/**
 * Parse a refutation verdict.
 *
 * Returns null when the reply cannot be understood, and null is NOT treated as
 * a refutation by the caller — an unparseable verdict is an absent vote, not a
 * "no". Conflating the two would let a model that merely formats badly delete
 * real findings.
 */
export function parseVerdict(content) {
  const tryParse = (s) => {
    try {
      const o = JSON.parse(s);
      if (typeof o?.refuted === 'boolean') return { refuted: o.refuted, reason: String(o.reason ?? '') };
    } catch { /* fall through */ }
    return null;
  };
  const raw = String(content ?? '').trim();
  return (
    tryParse(raw) ??
    tryParse(raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() ?? '') ??
    tryParse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '')
  );
}

/**
 * Does a finding survive its refuters?
 *
 * Majority rule over the verdicts that actually parsed. A tie refutes: the cost
 * of a surviving false finding is a human's attention, which is the resource
 * this whole tool exists to conserve, so an even split should fall towards
 * dropping it.
 *
 * With no usable verdicts at all the finding SURVIVES — refutation is a filter
 * bolted onto corroboration, and a filter that cannot run must not silently
 * delete the corroborated findings underneath it.
 */
export function survivesRefutation(verdicts) {
  const usable = verdicts.filter((v) => v && typeof v.refuted === 'boolean');
  if (usable.length === 0) return { survives: true, refuted: 0, votes: 0, reason: 'no usable verdicts' };
  const refuted = usable.filter((v) => v.refuted).length;
  return { survives: refuted * 2 < usable.length, refuted, votes: usable.length };
}

/**
 * Extract JSON from a response that was asked for JSON but may not comply.
 *
 * Cheap models fence their JSON, prepend "Here is the review:", or emit one
 * object instead of the wrapper. Each of those is a formatting failure, not a
 * failure to find the bug — discarding them would throw away real findings and
 * quietly bias the swarm toward whichever models happen to be tidiest.
 */
export function parseFindings(content) {
  const tryParse = (s) => {
    try {
      const o = JSON.parse(s);
      if (Array.isArray(o?.findings)) return o.findings;
      if (Array.isArray(o)) return o;
      if (o?.claim) return [o];
    } catch { /* fall through */ }
    return null;
  };

  let out = tryParse(content.trim());
  if (out) return out;

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    out = tryParse(fenced[1].trim());
    if (out) return out;
  }
  const braced = content.match(/\{[\s\S]*\}/);
  if (braced) {
    out = tryParse(braced[0]);
    if (out) return out;
  }
  return [];
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

// ── consensus ───────────────────────────────────────────────────────────────

const STOP = new Set(['this', 'that', 'with', 'from', 'when', 'will', 'would', 'could', 'have', 'been', 'they', 'their', 'there', 'which', 'while', 'code', 'value', 'function', 'should']);

const shingle = (f) =>
  new Set(
    `${f.claim ?? ''} ${f.why ?? ''}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );

/**
 * Overlap (containment) coefficient, NOT Jaccard.
 *
 * Jaccard was the first implementation and it failed the self-test on a real
 * pair: two models describing the same missing-ORDER-BY defect scored 0.294
 * against a 0.30 threshold and were split into separate clusters, each landing
 * below quorum and being dropped. The cause is structural rather than a bad
 * constant — Jaccard divides by the UNION, so the wordier finding's extra terms
 * inflate the denominator and a model is penalised for explaining itself at
 * length. Dividing by the SMALLER set asks the question actually being posed:
 * is the shorter finding contained in the longer one?
 *
 * Measured on that same pair: overlap 0.50 for the true match, 0.10 for two
 * unrelated findings. The 0.4 threshold sits between them with margin on both
 * sides, and both cases are pinned in selftest.mjs.
 */
const overlap = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / Math.min(a.size, b.size);
};

/**
 * Cluster findings that describe the same defect in different words.
 *
 * Same file plus overlapping vocabulary is a deliberately loose test. Being too
 * strict is the dangerous direction: two models that genuinely found the same
 * bug but phrased it differently would each be left below quorum and dropped,
 * which loses exactly the corroborated findings this tool exists to surface.
 * Over-clustering merely groups two real findings under one heading, which a
 * reader notices immediately.
 */
export function cluster(all) {
  const clusters = [];
  for (const f of all) {
    const sh = shingle(f);
    const file = (f.file ?? '').trim();
    const hit = clusters.find(
      (c) => (c.file === file || !file || !c.file) && overlap(c.shingle, sh) >= 0.4,
    );
    if (hit) {
      hit.members.push(f);
      hit.models.add(f._model);
      hit.families.add(familyOf(f._model));
      hit.roles.add(f._role ?? 'defect');
      // Deliberately NOT merging shingles into the cluster: a growing set makes
      // the min() denominator drift upward as members join, so later findings
      // face a harder test than earlier ones purely by arrival order. The
      // cluster keeps its first member's vocabulary as a stable representative.
    } else {
      clusters.push({
        file,
        shingle: sh,
        members: [f],
        models: new Set([f._model]),
        // Lineages, not ids. Two checkpoints from one vendor are correlated
        // reviewers, so counting them as two independent votes would make the
        // quorum easier to satisfy than it claims to be — see lib/lineage.mjs.
        families: new Set([familyOf(f._model)]),
        roles: new Set([f._role ?? 'defect']),
      });
    }
  }
  return clusters;
}

const RANK = { critical: 0, high: 1, medium: 2, low: 3 };

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!KEY) {
    console.error('OPENROUTER_API_KEY is not set.');
    process.exit(1);
  }

  let models;
  if (has('--models')) {
    models = val('--models', '').split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    models = defaultModels();
    if (!models) {
      console.error('No model roster. Run bench.mjs first so the roster is chosen by measurement,');
      console.error('or pass --models a,b,c explicitly.');
      process.exit(1);
    }
    console.log(`Roster from bench-results.json: ${models.join(', ')}`);
  }
  // Checked BEFORE any request. Discovering that five reviewers were one model
  // wearing five hats is cheap now and expensive after you have acted on their
  // agreement.
  const roster = validateRoster(models, QUORUM);
  if (!roster.ok) {
    console.error(roster.reason);
    process.exit(1);
  }
  if (roster.collapsed > 0) {
    console.log(`Note: ${roster.collapsed} roster entr(y/ies) collapsed as routing variants of a model already listed.`);
  }
  models = roster.models;

  const badRole = ROLE_KEYS.find((r) => !ROLES[r]);
  if (badRole) {
    console.error(`Unknown role "${badRole}". Known: ${Object.keys(ROLES).join(', ')}`);
    process.exit(1);
  }

  const text = has('--files')
    ? gatherFiles(argv.slice(argv.indexOf('--files') + 1).filter((a) => !a.startsWith('--')))
    : gatherDiff();

  const chunks = chunk(text, MAX_CHARS);
  console.log(
    `Reviewing ${text.length} chars in ${chunks.length} chunk(s)\n` +
    `  models  : ${models.length} across ${roster.families} lineage(s)\n` +
    `  roles   : ${ROLE_KEYS.join(', ')}\n` +
    `  quorum  : ${QUORUM} independent lineages\n` +
    `  refute  : ${NO_REFUTE ? 'off' : `${REFUTERS} challenger(s) per finding`}\n`,
  );

  // ── stage one: review ─────────────────────────────────────────────────────
  const jobs = models.flatMap((m) => ROLE_KEYS.flatMap((role) => chunks.map((c, i) => ({ m, role, c, i }))));
  let done = 0;
  const results = await pool(jobs, CONCURRENCY, async ({ m, role, c, i }) => {
    const r = await review(m, role, c, i);
    done++;
    process.stdout.write(`\r  review ${done}/${jobs.length}   `);
    return r;
  });
  process.stdout.write('\n\n');

  const errored = results.filter((r) => r.error);
  if (errored.length) {
    // Surfaced, never swallowed: a model that errored did not vote, so quorum
    // was effectively lower than requested and the reader must know that.
    const byModel = {};
    for (const e of errored) byModel[e.model] = (byModel[e.model] ?? 0) + 1;
    console.log('Errors (these models did not vote — effective quorum was lower here):');
    for (const [m, n] of Object.entries(byModel)) console.log(`  ${m}: ${n}`);
    console.log();
  }

  const all = results.flatMap((r) => r.findings.map((f) => ({ ...f, _model: r.model })));
  const questions = all.filter(isQuestion);
  const claims = all.filter((f) => !isQuestion(f));

  if (all.length === 0) {
    console.log('No findings or questions returned by any model.');
    reportLedger(results);
    return;
  }

  const clusters = cluster(claims)
    .map((c) => {
      const best = c.members.slice().sort((a, b) => (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9))[0];
      // Votes are LINEAGES, not ids — see lib/lineage.mjs.
      return { ...c, votes: c.families.size, ids: c.models.size, best };
    })
    .sort((a, b) => b.votes - a.votes || (RANK[a.best.severity] ?? 9) - (RANK[b.best.severity] ?? 9));

  let corroborated = clusters.filter((c) => c.votes >= QUORUM);
  const single = clusters.filter((c) => c.votes < QUORUM);

  // ── stage two: refutation ─────────────────────────────────────────────────
  const refuteResults = [];
  if (!NO_REFUTE && corroborated.length) {
    // Challengers exclude the lineages that RAISED the finding. A model grading
    // its own family's claim is not an independent check, and it is the one
    // most likely to agree.
    const tasks = corroborated.flatMap((c) => {
      const challengers = models
        .filter((m) => !c.families.has(familyOf(m)))
        .slice(0, REFUTERS);
      return challengers.map((m) => ({ c, m }));
    });
    let rdone = 0;
    const verdicts = await pool(tasks, CONCURRENCY, async ({ c, m }) => {
      const r = await refute(m, c.best, chunks[0]);
      rdone++;
      process.stdout.write(`\r  refute ${rdone}/${tasks.length}   `);
      return { c, ...r };
    });
    process.stdout.write(tasks.length ? '\n\n' : '');
    refuteResults.push(...verdicts);

    for (const c of corroborated) {
      const mine = verdicts.filter((v) => v.c === c).map((v) => v.verdict);
      c.refutation = survivesRefutation(mine);
    }
    const dropped = corroborated.filter((c) => !c.refutation.survives);
    corroborated = corroborated.filter((c) => c.refutation.survives);
    if (dropped.length) {
      console.log(`REFUTED — ${dropped.length} corroborated finding(s) dropped by challengers`);
      console.log('─'.repeat(100));
      for (const c of dropped) {
        console.log(`  [${c.best.severity ?? '?'}] ${c.best.file ?? '?'} — ${c.best.claim}  (${c.refutation.refuted}/${c.refutation.votes} refuted)`);
      }
      console.log();
    }
  }

  // ── output ────────────────────────────────────────────────────────────────
  console.log(`CORROBORATED — ${corroborated.length} finding(s) from ${QUORUM}+ independent lineages${NO_REFUTE ? '' : ', surviving refutation'}`);
  console.log('─'.repeat(100));
  for (const c of corroborated) {
    const surv = c.refutation ? `, survived ${c.refutation.votes - c.refutation.refuted}/${c.refutation.votes}` : '';
    console.log(`\n[${c.best.severity ?? '?'}] ${c.best.file ?? '?'}${c.best.line ? `:${c.best.line}` : ''}   ${c.votes} lineage(s), ${c.ids} model(s)${surv}`);
    console.log(`  roles: ${[...c.roles].join(', ')}   models: ${[...c.models].join(', ')}`);
    console.log(`  ${c.best.claim}`);
    if (c.best.why) console.log(`  why: ${c.best.why}`);
  }
  if (!corroborated.length) console.log('  (none)');

  console.log(`\n\nSINGLE-LINEAGE — ${single.length} finding(s) below quorum, shown for completeness`);
  console.log('─'.repeat(100));
  for (const c of single.slice(0, 20)) {
    console.log(`  [${c.best.severity ?? '?'}] ${c.best.file ?? '?'} — ${c.best.claim}  (${[...c.models][0]})`);
  }
  if (single.length > 20) console.log(`  … and ${single.length - 20} more`);

  // Questions are listed, never counted. Deduped so five models asking the same
  // thing reads as one question, not five.
  const qClusters = cluster(questions).sort((a, b) => b.models.size - a.models.size);
  console.log(`\n\nQUESTIONS — ${qClusters.length} distinct, from the questioner role (never counted towards quorum)`);
  console.log('─'.repeat(100));
  for (const q of qClusters.slice(0, 15)) {
    console.log(`  ${q.best?.claim ?? q.members[0].claim}  (${q.models.size} model(s))`);
    const why = q.members[0].why;
    if (why) console.log(`      ↳ ${why}`);
  }
  if (qClusters.length > 15) console.log(`  … and ${qClusters.length - 15} more`);

  const cost = reportLedger([...results, ...refuteResults]);

  const out = join(HERE, 'swarm-findings.json');
  writeFileSync(out, JSON.stringify({
    ranAt: new Date().toISOString(),
    models, roles: ROLE_KEYS, quorum: QUORUM, lineages: roster.families, chunks: chunks.length,
    refutation: NO_REFUTE ? null : { challengersPerFinding: REFUTERS },
    cost: { totalUsd: cost.totalUsd, wasFree: cost.wasFree, billed: cost.billed },
    errors: errored.map((e) => ({ model: e.model, role: e.role, error: e.error, attempts: e.attempts })),
    corroborated: corroborated.map((c) => ({ lineages: c.votes, models: [...c.models], roles: [...c.roles], refutation: c.refutation ?? null, ...c.best })),
    single: single.map((c) => ({ lineages: c.votes, models: [...c.models], ...c.best })),
    questions: qClusters.map((q) => ({ models: [...q.models], claim: q.members[0].claim, why: q.members[0].why })),
  }, null, 2));
  console.log(`\nFull output → ${out}`);
}

/**
 * Print the cost ledger.
 *
 * This programme exists to reduce spend, so a swarm that quietly started billing
 * would be the most embarrassing possible outcome. The ledger names every model
 * that charged rather than reporting one comforting total.
 */
function reportLedger(results) {
  const l = ledger(results);
  const retries = l.rows.reduce((n, r) => n + r.retries, 0);
  console.log(`\n\nCOST — ${l.wasFree ? 'zero, as intended' : `$${l.totalUsd.toFixed(6)} USD`}${retries ? `   (${retries} retr${retries === 1 ? 'y' : 'ies'} after rate limits)` : ''}`);
  console.log('─'.repeat(100));
  if (!l.wasFree) {
    console.log('  These models BILLED — they are not free any more, or never were:');
    for (const r of l.billed) console.log(`    ${r.model}: $${r.costUsd.toFixed(6)} over ${r.calls} call(s)`);
    console.log('  Re-run bench.mjs --list to refresh what is genuinely zero-cost.');
  }
  const tokens = l.rows.reduce((n, r) => n + r.promptTokens + r.completionTokens, 0);
  console.log(`  ${l.rows.length} model(s), ${l.rows.reduce((n, r) => n + r.calls, 0)} call(s), ${tokens.toLocaleString()} tokens`);
  return l;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch((e) => {
    console.error('\nFAILED:', e.message);
    process.exit(1);
  });
}

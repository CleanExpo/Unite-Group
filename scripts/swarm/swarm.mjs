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

const HERE = dirname(fileURLToPath(import.meta.url));
const API = 'https://openrouter.ai/api/v1';
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

// ── prompting ───────────────────────────────────────────────────────────────

const SYSTEM = `You are a rigorous code reviewer giving a SECOND OPINION on a change another reviewer has already approved.

Report only defects you can point at in the diff shown. Do not report style preferences, naming, or missing tests unless the absence causes a concrete failure.

Prioritise:
- logic that silently produces a WRONG value rather than an error
- concurrency, retries, and partial failure
- database queries: ordering, pagination, boundaries, uniqueness
- serverless lifecycle: work that may not complete after a response is sent
- tests that assert less than their name claims

Return STRICT JSON, no prose, no markdown fence:
{"findings":[{"file":"path","line":123,"severity":"critical|high|medium|low","claim":"one sentence","why":"how it fails concretely"}]}

Return {"findings":[]} if you find nothing real. An empty list is a valid and useful answer.`;

// ── calling ─────────────────────────────────────────────────────────────────

async function review(model, text, idx) {
  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/CleanExpo/Unite-Group',
        'X-Title': 'Unite-Group review swarm',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Review this change:\n\n${text}` },
        ],
        temperature: 0,
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { model, idx, error: `HTTP ${res.status}`, findings: [] };
    const json = await res.json();
    if (json.error) return { model, idx, error: 'api_error', findings: [] };
    const content = json.choices?.[0]?.message?.content ?? '';
    return { model, idx, findings: parseFindings(content), rawLen: content.length };
  } catch (err) {
    return { model, idx, error: err.name === 'TimeoutError' ? 'timeout' : 'exception', findings: [] };
  }
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
      // Deliberately NOT merging shingles into the cluster: a growing set makes
      // the min() denominator drift upward as members join, so later findings
      // face a harder test than earlier ones purely by arrival order. The
      // cluster keeps its first member's vocabulary as a stable representative.
    } else {
      clusters.push({ file, shingle: sh, members: [f], models: new Set([f._model]) });
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
  if (models.length < QUORUM) {
    console.error(`Quorum ${QUORUM} needs at least ${QUORUM} models; got ${models.length}.`);
    process.exit(1);
  }

  const text = has('--files')
    ? gatherFiles(argv.slice(argv.indexOf('--files') + 1).filter((a) => !a.startsWith('--')))
    : gatherDiff();

  const chunks = chunk(text, MAX_CHARS);
  console.log(`Reviewing ${text.length} chars in ${chunks.length} chunk(s) across ${models.length} models, quorum ${QUORUM}\n`);

  const jobs = models.flatMap((m) => chunks.map((c, i) => ({ m, c, i })));
  let done = 0;
  const results = await pool(jobs, CONCURRENCY, async ({ m, c, i }) => {
    const r = await review(m, c, i);
    done++;
    process.stdout.write(`\r  ${done}/${jobs.length}   `);
    return r;
  });
  process.stdout.write('\n\n');

  const errored = results.filter((r) => r.error);
  if (errored.length) {
    // Surfaced, never swallowed: a model that errored did not vote, so quorum
    // was effectively lower than requested and the reader must know that.
    const byModel = {};
    for (const e of errored) byModel[e.model] = (byModel[e.model] ?? 0) + 1;
    console.log('Errors (these models did not vote):');
    for (const [m, n] of Object.entries(byModel)) console.log(`  ${m}: ${n}`);
    console.log();
  }

  const all = results.flatMap((r) => r.findings.map((f) => ({ ...f, _model: r.model })));
  if (all.length === 0) {
    console.log('No findings returned by any model.');
    return;
  }

  const clusters = cluster(all)
    .map((c) => {
      const best = c.members.slice().sort((a, b) => (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9))[0];
      return { ...c, votes: c.models.size, best };
    })
    .sort((a, b) => b.votes - a.votes || (RANK[a.best.severity] ?? 9) - (RANK[b.best.severity] ?? 9));

  const corroborated = clusters.filter((c) => c.votes >= QUORUM);
  const single = clusters.filter((c) => c.votes < QUORUM);

  console.log(`CORROBORATED — ${corroborated.length} finding(s) reported by ${QUORUM}+ models independently`);
  console.log('─'.repeat(100));
  for (const c of corroborated) {
    console.log(`\n[${c.best.severity ?? '?'}] ${c.best.file ?? '?'}${c.best.line ? `:${c.best.line}` : ''}   ${c.votes} votes (${[...c.models].join(', ')})`);
    console.log(`  ${c.best.claim}`);
    if (c.best.why) console.log(`  why: ${c.best.why}`);
  }
  if (!corroborated.length) console.log('  (none)');

  console.log(`\n\nSINGLE-MODEL — ${single.length} finding(s) below quorum, shown for completeness`);
  console.log('─'.repeat(100));
  for (const c of single.slice(0, 20)) {
    console.log(`  [${c.best.severity ?? '?'}] ${c.best.file ?? '?'} — ${c.best.claim}  (${[...c.models][0]})`);
  }
  if (single.length > 20) console.log(`  … and ${single.length - 20} more`);

  const out = join(HERE, 'swarm-findings.json');
  writeFileSync(out, JSON.stringify({
    ranAt: new Date().toISOString(),
    models, quorum: QUORUM, chunks: chunks.length,
    errors: errored.map((e) => ({ model: e.model, error: e.error })),
    corroborated: corroborated.map((c) => ({ votes: c.votes, models: [...c.models], ...c.best })),
    single: single.map((c) => ({ votes: c.votes, models: [...c.models], ...c.best })),
  }, null, 2));
  console.log(`\nFull output → ${out}`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch((e) => {
    console.error('\nFAILED:', e.message);
    process.exit(1);
  });
}

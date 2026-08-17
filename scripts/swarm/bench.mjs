#!/usr/bin/env node
/**
 * Benchmark OpenRouter models against REAL defects from this repo.
 *
 * WHY THIS EXISTS. We pay for a second-opinion reviewer. Before trusting a
 * cheaper swarm to replace any of that, it has to be measured — and measured on
 * defects that actually shipped here, not a synthetic quiz. Five of the eight
 * cases in defects.json were missed by Claude and caught only in review, which
 * is precisely the job a second opinion is being hired to do.
 *
 * NO DEPENDENCIES. Node 18+ built-in fetch only. Run it anywhere with an
 * OPENROUTER_API_KEY and network access to openrouter.ai.
 *
 *   export OPENROUTER_API_KEY=sk-or-...
 *   node scripts/swarm/bench.mjs --free                  # every zero-cost model
 *   node scripts/swarm/bench.mjs --models a,b,c          # specific models
 *   node scripts/swarm/bench.mjs --free --concurrency 4  # be gentler on limits
 *   node scripts/swarm/bench.mjs --list                  # just show free models
 *
 * Output: a scoreboard, plus bench-results.json with every raw response so a
 * score can be re-derived without paying for the run twice.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const API = 'https://openrouter.ai/api/v1';
const KEY = process.env.OPENROUTER_API_KEY;

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const CONCURRENCY = Number(val('--concurrency', '6'));
const TIMEOUT_MS = Number(val('--timeout', '90000'));
const MAX_MODELS = Number(val('--max-models', '25'));

// ── model catalogue ─────────────────────────────────────────────────────────

/**
 * Fetch the live catalogue rather than hard-coding ids.
 *
 * Model ids churn constantly on OpenRouter — a hard-coded list is stale within
 * weeks and fails as a 404 that looks like a model refusing the task. Asking
 * the API which models exist, and which are actually zero-cost right now, is
 * the only way this stays honest over time.
 */
async function fetchModels() {
  const res = await fetch(`${API}/models`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`GET /models -> ${res.status} ${res.statusText}`);
  const { data } = await res.json();
  return data ?? [];
}

export const isFree = (m) => {
  const p = m.pricing ?? {};
  // Every price field must be zero. A model can be free on prompt but charge
  // for completion or for internal reasoning tokens; treating that as "free"
  // is how a benchmark quietly becomes a bill.
  return ['prompt', 'completion', 'request', 'internal_reasoning']
    .every((k) => p[k] === undefined || Number(p[k]) === 0);
};

// ── prompting ───────────────────────────────────────────────────────────────

const SYSTEM = `You are a senior code reviewer. You are shown ONE code snippet that may contain exactly one significant defect.

Report only a defect that is actually present in the code shown. If the code is correct, say so.

Answer in this exact format, nothing else:

DEFECT: <one sentence naming the specific bug>
WHY: <two sentences maximum on how it fails in practice>
FIX: <one sentence>`;

const userPrompt = (c) => `Language: ${c.language}
Context: ${c.context}

\`\`\`${c.language}
${c.code}
\`\`\`

What is the defect?`;

// ── scoring ─────────────────────────────────────────────────────────────────

/**
 * Keyword scoring, deliberately crude and deliberately transparent.
 *
 * An LLM judge would score better but costs money and introduces a second model
 * whose own errors are invisible — self-defeating for a benchmark whose whole
 * purpose is establishing trust cheaply. So: `mustMention` terms are the
 * non-negotiable anchors of the real defect, `acceptAny` phrasings give partial
 * credit for finding it in different words. Raw responses are always written to
 * disk so any disputed score can be re-read by a human.
 */
/** An answer shorter than this cannot be a defect claim, only a word list. */
const MIN_CONTENT_WORDS = 8;

export function score(answer, c) {
  const text = (answer ?? '').toLowerCase();
  if (!text.trim()) return { score: 0, hits: [], verdict: 'empty' };

  const hits = c.mustMention.filter((k) => text.includes(k.toLowerCase()));
  const mustRatio = hits.length / c.mustMention.length;

  // A paraphrase, matched on content words so word order and connectives do
  // not decide a model's score.
  const paraphrase = (c.acceptAny ?? []).some((p) => {
    const words = p.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    if (words.length === 0) return false;
    const found = words.filter((w) => text.includes(w)).length;
    return found / words.length >= 0.6;
  });

  // ── ANTI-STUFFING ────────────────────────────────────────────────────────
  // The first version of this scorer awarded 1.0 whenever every mustMention
  // term appeared, with no requirement that the answer CLAIM anything. Review
  // on PR #1017 demonstrated the break: simply joining the mustMention terms
  // scored full marks on 8 of 8 cases — "end day" was a perfect answer for the
  // timestamptz boundary defect. That ranks a model which extracts nouns from
  // the prompt above one that actually explains the bug, which inverts the
  // benchmark's entire purpose.
  //
  // Two independent requirements now:
  //   1. enough content words to constitute a claim rather than a word list
  //   2. full credit needs the anchors AND a recognised explanation
  //
  // What this does NOT do, deliberately: distinguish a shallow-but-real finding
  // from a fluent non-claim that happens to contain every anchor. Both land on
  // 0.5. Telling them apart needs semantics, which is exactly the LLM judge this
  // benchmark refuses to hire. So 0.5 is the proven CEILING for stuffing rather
  // than 0 — a stuffer ranks mid-table, never top — and defects.json carries a
  // `negativeControl` per case so that ceiling is pinned by selftest.mjs instead
  // of merely asserted here.
  const contentWords = new Set(
    text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3),
  );
  if (contentWords.size < MIN_CONTENT_WORDS) {
    return { score: 0, hits, verdict: 'too-short' };
  }

  let s = 0;
  if (mustRatio === 1 && paraphrase) s = 1.0;      // names it AND explains it
  else if (mustRatio === 1 || paraphrase) s = 0.5; // one without the other

  return {
    score: s,
    hits,
    verdict: s === 1 ? 'found' : s > 0 ? 'partial' : 'missed',
  };
}

// ── the call ────────────────────────────────────────────────────────────────

async function ask(model, c) {
  const started = Date.now();
  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        // OpenRouter attributes traffic by these; harmless and good practice.
        'HTTP-Referer': 'https://github.com/CleanExpo/Unite-Group',
        'X-Title': 'Unite-Group defect swarm benchmark',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userPrompt(c) },
        ],
        temperature: 0,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const ms = Date.now() - started;
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { model, caseId: c.id, ms, error: `HTTP ${res.status}`, detail: body.slice(0, 300), answer: '' };
    }
    const json = await res.json();
    // A 200 with an error body is a real OpenRouter response shape; treating it
    // as a valid empty answer would score an outage as a model failure.
    if (json.error) {
      return { model, caseId: c.id, ms, error: 'api_error', detail: JSON.stringify(json.error).slice(0, 300), answer: '' };
    }
    const answer = json.choices?.[0]?.message?.content ?? '';
    return { model, caseId: c.id, ms, answer, usage: json.usage ?? null };
  } catch (err) {
    return { model, caseId: c.id, ms: Date.now() - started, error: err.name === 'TimeoutError' ? 'timeout' : 'exception', detail: String(err.message).slice(0, 200), answer: '' };
  }
}

/** Bounded-concurrency map. Free tiers rate-limit hard; a naive Promise.all trips them. */
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

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  const corpus = JSON.parse(readFileSync(join(HERE, 'defects.json'), 'utf8'));
  const cases = corpus.cases;

  console.log('Fetching live model catalogue…');
  const all = await fetchModels();
  const free = all.filter(isFree);
  console.log(`  ${all.length} models total, ${free.length} currently zero-cost\n`);

  if (has('--list')) {
    for (const m of free.slice(0, 200)) {
      console.log(`  ${m.id}${m.context_length ? `  (ctx ${m.context_length})` : ''}`);
    }
    return;
  }

  let models;
  if (has('--models')) {
    models = val('--models', '').split(',').map((s) => s.trim()).filter(Boolean);
    const known = new Set(all.map((m) => m.id));
    // Fail loudly on an unknown id. A 404 mid-run looks identical to a model
    // that answered nothing, and would be scored as incompetence.
    const bad = models.filter((m) => !known.has(m));
    if (bad.length) {
      console.error(`Unknown model id(s): ${bad.join(', ')}`);
      console.error('Run with --list to see what is actually available.');
      process.exit(1);
    }
  } else if (has('--free')) {
    models = free.map((m) => m.id).slice(0, MAX_MODELS);
  } else {
    console.error('Pass --free, or --models a,b,c, or --list. See the header of this file.');
    process.exit(1);
  }

  if (!KEY) {
    console.error('OPENROUTER_API_KEY is not set — cannot run the benchmark.');
    process.exit(1);
  }

  const jobs = models.flatMap((m) => cases.map((c) => ({ model: m, c })));
  console.log(`Running ${models.length} models × ${cases.length} defects = ${jobs.length} calls (concurrency ${CONCURRENCY})\n`);

  let done = 0;
  const raw = await pool(jobs, CONCURRENCY, async ({ model, c }) => {
    const r = await ask(model, c);
    done++;
    process.stdout.write(`\r  ${done}/${jobs.length}   `);
    return { ...r, ...score(r.answer, c) };
  });
  process.stdout.write('\n\n');

  // ── scoreboard ────────────────────────────────────────────────────────────
  const byModel = new Map();
  for (const r of raw) {
    const e = byModel.get(r.model) ?? { model: r.model, total: 0, found: 0, partial: 0, missed: 0, errors: 0, ms: [] };
    e.total += r.score ?? 0;
    if (r.error) e.errors++;
    else if (r.verdict === 'found') e.found++;
    else if (r.verdict === 'partial') e.partial++;
    else e.missed++;
    if (!r.error) e.ms.push(r.ms);
    byModel.set(r.model, e);
  }

  const rows = [...byModel.values()]
    .map((e) => ({
      ...e,
      pct: Math.round((e.total / cases.length) * 100),
      medMs: e.ms.length ? e.ms.sort((a, b) => a - b)[Math.floor(e.ms.length / 2)] : null,
    }))
    .sort((a, b) => b.total - a.total || (a.medMs ?? 1e9) - (b.medMs ?? 1e9));

  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('MODEL', 46), pad('SCORE', 12), pad('FOUND', 7), pad('PART', 6), pad('MISS', 6), pad('ERR', 5), 'MED ms');
  console.log('─'.repeat(100));
  for (const r of rows) {
    console.log(
      pad(r.model.slice(0, 45), 46),
      pad(`${r.total.toFixed(1)}/${cases.length} (${r.pct}%)`, 12),
      pad(r.found, 7), pad(r.partial, 6), pad(r.missed, 6), pad(r.errors, 5),
      r.medMs ?? '—',
    );
  }

  // Per-defect difficulty: which real bugs does the whole field miss? Those are
  // the ones a swarm cannot be trusted with, no matter how good the averages.
  console.log('\nPER-DEFECT DETECTION RATE');
  console.log('─'.repeat(100));
  for (const c of cases) {
    const rs = raw.filter((r) => r.caseId === c.id && !r.error);
    const hit = rs.filter((r) => r.verdict === 'found').length;
    const rate = rs.length ? Math.round((hit / rs.length) * 100) : 0;
    const flag = c.claudeMissed ? ' [Claude missed this one]' : '';
    console.log(`  ${pad(c.id, 32)} ${pad(`${hit}/${rs.length} (${rate}%)`, 14)} ${c.severity}${flag}`);
  }

  const outPath = join(HERE, 'bench-results.json');
  writeFileSync(outPath, JSON.stringify({ ranAt: new Date().toISOString(), models, corpusVersion: corpus.version, rows, raw }, null, 2));
  console.log(`\nRaw responses → ${outPath}`);
  console.log('Read them before trusting a score: keyword scoring is crude by design.');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch((e) => {
    console.error('\nFAILED:', e.message);
    process.exit(1);
  });
}

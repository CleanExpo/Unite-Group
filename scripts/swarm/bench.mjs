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

/**
 * Explicit "there is nothing wrong here" verdicts.
 *
 * WHY THIS MATTERS. The SYSTEM prompt above tells models "If the code is
 * correct, say so", so denials are a routine model output, not a hypothetical.
 * Requiring anchors AND a recognised explanation was still not requiring a
 * CLAIM: an answer naming every anchor, offering an accepted explanation, and
 * concluding the code is fine scored full marks on 8 of 8 cases. A model that
 * reliably says "looks fine" while restating the context would have topped the
 * leaderboard — the worst possible outcome for a benchmark hiring a second
 * opinion.
 *
 * PATTERNS, NOT A PHRASE LIST — AND THAT IS STILL NOT ENOUGH. The first attempt
 * was a list of literals; review broke it with four phrasings nobody had listed
 * ("This is expected behavior, not an error", "requires no modification", "I
 * cannot identify a problem", "not problematic"). These patterns match the
 * GRAMMAR of a no-defect verdict instead — negation attached to a defect noun,
 * inability to find one, an assertion of correctness — which is a better shape
 * but is NOT complete, and it would be dishonest to claim otherwise. Attacking
 * them with 29 plausible denials found 17 that still slipped through:
 * "The snippet is bug-free", "Everything checks out", "This passes review",
 * "No action is required", "All paths are handled properly". Enumerating grammar
 * is still enumerating.
 *
 * So this list is one of THREE defences, and the weakest of them. See
 * `score()`: answers are scored on the DEFECT/WHY payload rather than the whole
 * blob (so framing outside the claim cannot inflate anything), and verbatim
 * reproduction of an accepted explanation is treated as contamination. Those two
 * are structural; this one is a heuristic backstop for unformatted answers.
 */
const NO_DEFECT_VERDICTS = [
  // "no defect", "no issues", "requires no modification", "no changes needed"
  /\bno\s+(\w+\s+){0,3}(defect|defects|bug|bugs|issue|issues|problem|problems|error|errors|flaw|flaws|fault|faults|change|changes|modification|modifications|fix|fixes)\b/,
  // "not a bug", "not an error", "not problematic", "not incorrect"
  /\bnot\s+(a|an|the)?\s*(defect|bug|issue|problem|problematic|error|erroneous|flaw|flawed|broken|incorrect|wrong|buggy)\b/,
  // "cannot identify a problem", "I don't see any issue", "unable to find a bug"
  /\b(cannot|can not|can't|could not|couldn't|do not|don't|does not|doesn't|unable to|failed to)\s+(\w+\s+){0,2}(identify|find|see|spot|detect|locate|observe)\b/,
  // "is correct", "looks fine", "appears valid", "seems intentional"
  /\b(is|are|looks?|appears?|seems?)\s+(\w+\s+){0,2}(correct|correctly|fine|valid|safe|sound|okay|intentional|deliberate|expected|acceptable|harmless|reasonable and correct)\b/,
  // "expected behaviour", "intended behaviour", "by design"
  /\b(expected|intended|intentional|normal|standard)\s+behaviou?r\b/,
  /\bby\s+design\b/,
  // "works as intended", "behaves correctly", "functions correctly"
  /\b(works?|working|behaves?|functions?|performs?)\s+(as\s+(intended|expected|designed|documented)|correctly|properly|fine)\b/,
  // "should not change", "no need to change", "requires no changes"
  /\b(should|need|needs|has|have)\s+not\s+(be\s+)?(change|changed|modified|fixed|altered)\b/,
  /\b(requires?|needs?)\s+no\s+\w+\b/,
  /\bnothing\s+(wrong|to\s+fix|to\s+change|of\s+concern)\b/,
];

/**
 * The part of an answer that actually makes the claim.
 *
 * The SYSTEM prompt mandates `DEFECT: … WHY: … FIX: …`. When a model honours it,
 * scoring the DEFECT+WHY payload rather than the whole reply makes the score
 * NON-MONOTONE in the right way: framing wrapped around the claim — a preamble
 * denying the defect, a trailing caveat, a restatement of the prompt — stops
 * counting entirely, because it is not part of what the model asserted. That
 * closes the whole family of prefix attacks at once, rather than one phrasing at
 * a time.
 *
 * Returns null when the model ignored the format, which cheap models often do;
 * `score()` then falls back to the whole reply plus the denial patterns.
 */
export function claimPayload(text) {
  const defect = /\bdefect\s*:\s*([\s\S]*?)(?=\bwhy\s*:|\bfix\s*:|$)/i.exec(text);
  if (!defect) return null;
  const claim = defect[1].trim();
  // "DEFECT: none" is a denial in the format's own vocabulary, and a denial
  // beats an incomplete format: it is scored 0, not merely capped.
  if (/^(none|n\/?a|no\b|nothing\b|-|—)/i.test(claim)) return '';

  // ALL THREE fields, not just DEFECT:.
  //
  // The first version required only `DEFECT:`, which made the justification for
  // the unformatted cap incoherent — review put it exactly right: a model could
  // omit two mandated fields and still rank as fully compliant. If the penalty
  // is for ignoring the output contract, then the contract is all of it.
  const why = /\bwhy\s*:\s*([\s\S]*?)(?=\bfix\s*:|$)/i.exec(text);
  const fix = /\bfix\s*:\s*(\S[\s\S]*)$/i.exec(text);
  if (!why?.[1].trim() || !fix?.[1].trim()) return null;

  // DEFECT + WHY is the assertion. FIX is a remedy, not a claim about the
  // defect, so it is required for compliance but excluded from what is scored —
  // otherwise a model could earn paraphrase credit from its suggested fix
  // without ever having stated what is wrong.
  return `${claim} ${why[1].trim()}`;
}

/**
 * Verbatim reproduction of an accepted explanation, with NO claim of its own.
 *
 * Every constructed bypass found in review works the same way: paste an
 * `acceptAny` phrase in to satisfy the paraphrase test, then wrap whatever
 * framing you like around it. Those phrases exist only in defects.json, so
 * reproducing one is weak evidence the text came from the answer key rather than
 * from reviewing the code.
 *
 * WEAK evidence, which is why this only applies when the answer offers no
 * `DEFECT:` claim at all. The first version of this rule applied it always, and
 * probing it immediately showed the cost: a genuine, correctly formatted answer
 * — "DEFECT: .range() offset pagination with no ORDER BY / WHY: … pages can skip
 * or duplicate rows …" — was demoted to 0.5, because "pages can skip or
 * duplicate rows" is exactly the phrase a competent reviewer writes. The
 * `acceptAny` entries were authored as natural descriptions of each defect, so
 * treating natural wording as proof of cheating punishes the best answers, which
 * is worse than the attack it prevents.
 *
 * A model that files a claim AND explains it in accepted terms has done the job,
 * whatever the provenance of its wording. A model that files no claim and merely
 * contains corpus strings has offered nothing else to judge, and those strings
 * are all the evidence there is — so there, they are not trusted.
 */
export function isContaminated(text, c) {
  return (c.acceptAny ?? []).some((p) => text.includes(p.toLowerCase()));
}

export function score(answer, c) {
  const full = (answer ?? '').toLowerCase();
  if (!full.trim()) return { score: 0, hits: [], verdict: 'empty' };

  // Score the claim when the model gave us one; fall back to the whole reply.
  const payload = claimPayload(full);
  if (payload === '') return { score: 0, hits: [], verdict: 'no-claim' };
  const text = payload ?? full;

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
  //
  // Measured on the WHOLE reply, not the extracted payload. This floor exists to
  // reject a bare word list, and probing caught it doing the opposite once the
  // payload split landed: a correctly formatted answer whose DEFECT line was
  // terse got rejected as "too-short" even though the full reply was
  // substantial. The floor is about whether an answer was written at all; the
  // payload is about what it asserted. Different questions, different inputs.
  const contentWords = new Set(
    full.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3),
  );
  if (contentWords.size < MIN_CONTENT_WORDS) {
    return { score: 0, hits, verdict: 'too-short' };
  }

  // An answer that states the code is fine has not found the defect, however
  // many of the right nouns it happens to contain. Checked against the WHOLE
  // reply, not just the payload — a model that files a claim and then retracts
  // it in the FIX line has not found anything either.
  const disclaimed = NO_DEFECT_VERDICTS.some((re) => re.test(full));
  // Only when the model filed no claim of its own — see isContaminated.
  const contaminated = payload == null && isContaminated(full, c);

  // ── NO CLAIM STRUCTURE, NO FULL CREDIT ───────────────────────────────────
  // A reply that ignores the mandated DEFECT/WHY/FIX format gives nothing to
  // scope the score to, so the fallback path is pure monotone containment and
  // every defence on it is lexical. Review proved that concretely: doubling ONE
  // space inside a quoted `acceptAny` phrase defeated the exact-substring
  // contamination check while preserving every paraphrase word, and the attack
  // went back to 1.0 on 8 of 8 cases. Reordering the words does the same.
  //
  // Patching the comparison (normalise whitespace, then fuzzy-match, then…) is
  // the same losing race that the literal phrase list and the grammar patterns
  // already lost twice. So: an unformatted reply caps at 0.5.
  //
  // THE COST, stated rather than hidden: a cheap model that identifies the
  // defect correctly in plain prose is capped at 0.5 and ranks below one that
  // follows the format. That is a real penalty, and it is the right direction
  // of error — the benchmark exists to decide whether cheap models can be
  // TRUSTED, so it should understate rather than overstate them. Format
  // compliance is also directly load-bearing downstream: swarm.mjs parses
  // structured JSON findings, so a model that cannot follow an output contract
  // is genuinely less useful here, not merely differently styled.
  //
  // `verdict: 'unformatted'` makes the penalty visible in bench-results.json
  // rather than silently depressing a score.
  const unformatted = payload == null;

  let s = 0;
  if (mustRatio === 1 && paraphrase && !disclaimed && !contaminated && !unformatted) s = 1.0;
  else if (mustRatio === 1 || paraphrase) s = 0.5;

  return {
    score: s,
    hits,
    verdict:
      s === 1 ? 'found'
        : s > 0
          ? (contaminated ? 'contaminated' : disclaimed ? 'disclaimed' : unformatted ? 'unformatted' : 'partial')
          : 'missed',
  };
}

/**
 * Roll per-case results up into one scoreboard row per model.
 *
 * Exported ONLY so selftest.mjs can test it, and it is exported because it
 * shipped a lying column while it was inline and untested. It tallied on the
 * `verdict` string — `verdict === 'partial'` — so every 0.5 that carried a more
 * specific verdict ('unformatted', 'disclaimed', 'contaminated') was counted in
 * the MISS column instead. The SCORE total stayed correct, which is what made it
 * dangerous: the row looked internally consistent enough that nobody would think
 * to distrust the breakdown. Tallying on the score itself cannot drift from the
 * total it sits next to.
 */
export function tally(raw, caseCount) {
  const byModel = new Map();
  for (const r of raw) {
    const e = byModel.get(r.model) ?? { model: r.model, total: 0, found: 0, partial: 0, missed: 0, unformatted: 0, errors: 0, ms: [] };
    e.total += r.score ?? 0;
    if (r.error) e.errors++;
    else if ((r.score ?? 0) >= 1) e.found++;
    else if ((r.score ?? 0) > 0) e.partial++;
    else e.missed++;
    // Format compliance is its own axis now that it caps the score, so it gets
    // its own column rather than hiding inside PART.
    if (!r.error && r.verdict === 'unformatted') e.unformatted++;
    if (!r.error) e.ms.push(r.ms);
    byModel.set(r.model, e);
  }

  return [...byModel.values()]
    .map((e) => ({
      ...e,
      pct: Math.round((e.total / caseCount) * 100),
      medMs: e.ms.length ? e.ms.sort((a, b) => a - b)[Math.floor(e.ms.length / 2)] : null,
    }))
    .sort((a, b) => b.total - a.total || (a.medMs ?? 1e9) - (b.medMs ?? 1e9));
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
  const rows = tally(raw, cases.length);

  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('MODEL', 46), pad('SCORE', 12), pad('FOUND', 7), pad('PART', 6), pad('MISS', 6), pad('UNFMT', 6), pad('ERR', 5), 'MED ms');
  console.log('─'.repeat(100));
  for (const r of rows) {
    console.log(
      pad(r.model.slice(0, 45), 46),
      pad(`${r.total.toFixed(1)}/${cases.length} (${r.pct}%)`, 12),
      pad(r.found, 7), pad(r.partial, 6), pad(r.missed, 6), pad(r.unformatted, 6), pad(r.errors, 5),
      r.medMs ?? '—',
    );
  }
  console.log('\nUNFMT = ignored the mandated DEFECT/WHY/FIX contract, so capped at 0.5 regardless of content.');

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

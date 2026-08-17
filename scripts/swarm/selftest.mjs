#!/usr/bin/env node
/**
 * Self-test for the swarm's PURE logic — no network, no API key.
 *
 * Every one of these is a negative control as much as a positive one. Three
 * separate times on PR #1009 a test was written whose NAME claimed more than
 * its BODY exercised, and each was caught in review rather than by me. The
 * lesson is that a scorer which cannot be shown to reject a wrong answer is
 * worthless — it will happily award marks to a model that found nothing.
 *
 *   node scripts/swarm/selftest.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { score, isFree, claimPayload, isContaminated, tally } from './bench.mjs';
import { cluster, parseFindings, chunk, parseVerdict, survivesRefutation, chunkOf } from './swarm.mjs';
import { baseModelId, familyOf, distinctFamilies, validateRoster } from './lib/lineage.mjs';
import { backoffMs, parseRetryAfter, usageOf, ledger, callModel } from './lib/openrouter.mjs';
import { ROLES, REFUTE, REVIEW_ROLES, isQuestion } from './lib/roles.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(readFileSync(join(HERE, 'defects.json'), 'utf8'));

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ── scoring: does ground truth score full marks? ────────────────────────────
//
// Scored THROUGH the mandated answer format, because that is what a correct
// model reply looks like: the SYSTEM prompt demands `DEFECT: … WHY: … FIX: …`,
// and score() caps anything unformatted at 0.5. `groundTruth` is prose written
// to document the defect for a human reading defects.json, so wrapping it in a
// DEFECT: line is what turns it into the answer it is standing in for.
const asAnswer = (c) => `DEFECT: ${c.groundTruth}\nWHY: ${c.groundTruth}\nFIX: apply the correction described above`;
console.log('\nscore() — a correct answer must score 1.0');
for (const c of corpus.cases) {
  const r = score(asAnswer(c), c);
  check(`${c.id} scores 1.0 on its own ground truth`, r.score === 1.0, `got ${r.score}, hits=${r.hits.join('|')}`);
}
check(
  'the same ground truth WITHOUT the mandated format caps at 0.5',
  corpus.cases.every((c) => score(c.groundTruth, c).score <= 0.5),
);

// ── FORMAT CONTRACT ────────────────────────────────────────────────────────
// The cap is justified by ignoring the output contract, so the contract has to
// be all three fields. Requiring only DEFECT: let a model omit two mandated
// fields and still rank as fully compliant — an incoherence review named
// exactly. One control per omitted field.
console.log('\nscore() — full credit requires ALL of DEFECT/WHY/FIX');
const partialFormats = (c) => ({
  'DEFECT: only': `DEFECT: ${c.groundTruth}`,
  'DEFECT + WHY, no FIX': `DEFECT: ${c.groundTruth}\nWHY: ${c.groundTruth}`,
  'DEFECT + FIX, no WHY': `DEFECT: ${c.groundTruth}\nFIX: apply the correction described above`,
  'WHY + FIX, no DEFECT': `WHY: ${c.groundTruth}\nFIX: apply the correction described above`,
  'empty FIX': `DEFECT: ${c.groundTruth}\nWHY: ${c.groundTruth}\nFIX:`,
  'empty WHY': `DEFECT: ${c.groundTruth}\nWHY:\nFIX: apply the correction described above`,
  // Order and multiplicity are part of the contract, not decoration. Two
  // versions of the parser searched for each field independently and so
  // accepted both of these at full credit.
  'fields out of order (DEFECT/FIX/WHY)': `DEFECT: ${c.groundTruth}\nFIX: apply the correction described above\nWHY: ${c.groundTruth}`,
  'duplicate WHY after FIX': `DEFECT: ${c.groundTruth}\nWHY: ${c.groundTruth}\nFIX: apply the correction described above\nWHY: trailing unrelated text`,
  'duplicate DEFECT': `DEFECT: ${c.groundTruth}\nDEFECT: ${c.groundTruth}\nWHY: ${c.groundTruth}\nFIX: apply the correction described above`,
  'labels inline rather than line-anchored': `DEFECT: ${c.groundTruth} WHY: ${c.groundTruth} FIX: do it`,
  // "Answer in this exact format, nothing else" — so nothing may precede
  // DEFECT:, and nothing may follow the FIX sentence. Both were accepted at
  // full credit until review pointed out that the parser validated only the
  // labels it found, never the whole response.
  'preamble before DEFECT': `Here is my assessment:\nDEFECT: ${c.groundTruth}\nWHY: ${c.groundTruth}\nFIX: apply the correction`,
  'trailing prose after FIX': `DEFECT: ${c.groundTruth}\nWHY: ${c.groundTruth}\nFIX: apply the correction\nAdditional context follows.`,
});
for (const [label] of Object.entries(partialFormats(corpus.cases[0]))) {
  const leaked = corpus.cases.filter((c) => score(partialFormats(c)[label], c).score >= 1.0);
  check(`"${label}" never reaches full credit`, leaked.length === 0, `leaked on ${leaked.map((c) => c.id).join(', ')}`);
}
// FIX is required for compliance but excluded from what is scored, so a model
// cannot earn paraphrase credit from its remedy without stating the defect.
check(
  'FIX: content does not contribute to the score',
  corpus.cases.every((c) => score(`DEFECT: something is off\nWHY: something is off\nFIX: ${c.groundTruth} ${c.acceptAny.join('. ')}`, c).score < 1.0),
);

// ── WHAT IS DELIBERATELY *NOT* ENFORCED ────────────────────────────────────
// Sentence counts. The prompt asks for one sentence in DEFECT and FIX and two
// at most in WHY, but that is brevity guidance, not a validated constraint —
// see the reasoning in bench.mjs. These assertions pin the ACCEPTED outcome so
// it is a recorded decision rather than an unnoticed gap, and so that anyone
// later adding enforcement is told which tests they are changing.
//
// The decisive evidence is right here in the corpus: every groundTruth is 2-4
// sentences, so a one-sentence DEFECT rule would make the reference answers
// unable to score full marks against their own benchmark.
console.log('\nscore() — sentence limits are advisory, and provably so');
const overLong = (c) => ({
  'two-sentence DEFECT': `DEFECT: ${c.groundTruth} This is an extra defect sentence.\nWHY: ${c.groundTruth}\nFIX: apply the correction`,
  'three-sentence WHY': `DEFECT: ${c.groundTruth}\nWHY: ${c.groundTruth} An extra explanation sentence. A second extra one.\nFIX: apply the correction`,
  'two-sentence FIX': `DEFECT: ${c.groundTruth}\nWHY: ${c.groundTruth}\nFIX: apply the correction. Add a regression test.`,
});
for (const [label] of Object.entries(overLong(corpus.cases[0]))) {
  const accepted = corpus.cases.filter((c) => score(overLong(c)[label], c).score === 1.0);
  check(`"${label}" still scores 1.0 — accepted by design, not overlooked`, accepted.length === corpus.cases.length, `${accepted.length}/${corpus.cases.length}`);
}
check(
  'every groundTruth is longer than one sentence — why the limit cannot be enforced',
  corpus.cases.every((c) => c.groundTruth.split(/(?<=[.!?])\s+/).filter(Boolean).length > 1),
);

// ── scoring: NEGATIVE CONTROLS ─────────────────────────────────────────────
console.log('\nscore() — wrong answers must NOT score');
const WRONG = [
  'DEFECT: The variable names are unclear and should be more descriptive.',
  'DEFECT: This code is missing error handling for the network request.',
  'DEFECT: The function should be split into smaller functions for readability.',
  'This code looks correct to me, no defects found.',
];
for (const c of corpus.cases) {
  const worst = Math.max(...WRONG.map((w) => score(w, c).score));
  check(`${c.id} rejects all 4 generic wrong answers`, worst === 0, `best wrong answer scored ${worst}`);
}

// ── scoring: ANTI-STUFFING NEGATIVE CONTROLS ───────────────────────────────
// The first version of this scorer awarded 1.0 for merely containing every
// mustMention term, with no requirement that the answer claim anything. Joining
// the terms scored full marks on 8 of 8 cases — "end day" was a perfect answer
// for the timestamptz bound. Review on PR #1017 found it; these three attacks
// are pinned so it cannot come back.
console.log('\nscore() — keyword stuffing must never reach full marks');
// Long enough to clear the content-word floor without asserting anything.
const PADDING = ' The implementation is written in typescript and lives inside this repository module today.';
for (const c of corpus.cases) {
  const join = score(c.mustMention.join(' '), c).score;
  const padded = score(c.mustMention.join(' ') + PADDING, c).score;
  const control = score(c.negativeControl, c).score;
  const worst = Math.max(join, padded, control);
  check(`${c.id} caps all three stuffing attacks below 1.0`, worst < 1.0, `best stuffed answer scored ${worst}`);
}
// ── REFUTATION CONTROLS ────────────────────────────────────────────────────
// Requiring anchors AND an explanation was still not requiring a CLAIM. The
// second review pass on PR #1017 showed this scoring 1.0 on 8 of 8 cases:
// every anchor, an accepted explanation, and a verdict of "the code is fine".
// A model that says "looks correct" while quoting the surrounding docs would
// otherwise have topped the leaderboard.
console.log('\nscore() — an answer that REFUTES the defect must never score full marks');
for (const c of corpus.cases) {
  const r = score(c.refutationControl, c);
  check(`${c.id} denies full marks to an explicit non-claim`, r.score < 1.0, `scored ${r.score} (${r.verdict})`);
}
check('every case carries a refutationControl', corpus.cases.every((c) => typeof c.refutationControl === 'string' && c.refutationControl.length > 0));

// The FIRST denial fix was a list of literal phrases; review broke it with four
// wordings nobody had listed. The SECOND was a set of grammar patterns, which is
// a better shape — but attacking it with 29 plausible denials found 17 still
// leaking ("The snippet is bug-free", "Everything checks out", "This passes
// review"). Enumerating grammar is still enumerating.
//
// What closed the family was structural, not lexical: score() reads the
// DEFECT/WHY payload rather than the whole reply, so framing wrapped AROUND a
// claim stops counting. All 29 are pinned here, including the 17 that once
// leaked and the 4 review supplied.
const DENIAL_FRAMINGS = [
  // supplied by review to break the literal-phrase version
  'This is expected behavior, not an error.',
  'The implementation is valid and requires no modification.',
  'I cannot identify a problem in this code.',
  'This behavior is intentional and not problematic.',
  // caught by the grammar patterns
  'This code has no defect.', 'No defect found.', 'This is fine.',
  'The code looks correct to me.', 'Everything here works as intended.',
  'I could not spot anything wrong.', 'There is no issue with this snippet.',
  'The snippet is safe as written.',
  // leaked past the grammar patterns; closed by payload scoping
  'DEFECT: none.', 'The snippet is bug-free.', 'Nothing here needs attention.',
  'The logic holds in all cases.', 'The code performs its stated function accurately.',
  'I find the implementation acceptable as written.',
  'The behaviour matches the documented contract.', 'This is a false positive.',
  'The concern raised does not apply.', 'All paths are handled properly.',
  'This implementation follows best practice.', 'The code is production-ready.',
  'Everything checks out.', 'The reviewer concern is unfounded.',
  'No action is required.', 'This passes review.', 'I see nothing that would fail.',
];
// Each framing is tried THREE ways. The first two exist because the earlier
// version of this loop used only the verbatim `acceptAny[0]`, which meant the
// exact-substring contamination check was doing all the work — the loop passed
// while proving nothing about the fallback path. Review found that by doubling
// a single space: every paraphrase word survived, the substring check missed,
// and all 29 framings went back to 1.0 on 8 of 8 cases. A test that passes for
// a reason other than the one in its name is the exact defect this file exists
// to prevent, so both evasions are now first-class controls.
const EVASIONS = [
  ['verbatim', (p) => p],
  ['whitespace-altered', (p) => p.replace(' ', '  ')],
  ['word-reordered', (p) => p.split(' ').reverse().join(' ')],
];
const denialLeaks = [];
for (const framing of DENIAL_FRAMINGS) {
  for (const c of corpus.cases) {
    for (const [label, mangle] of EVASIONS) {
      // Everything a full-credit answer needs, prefixed by a denial: all anchors,
      // an accepted explanation, and enough content words to clear the floor.
      const answer = `${framing} It handles ${c.mustMention.join(' and ')}. Review note: ${mangle(c.acceptAny[0])}. Further implementation details are documented.`;
      if (score(answer, c).score >= 1.0) denialLeaks.push(`${framing} [${label}] @ ${c.id}`);
    }
  }
}
check(
  `no denial framing scores full marks (${DENIAL_FRAMINGS.length} framings x ${corpus.cases.length} cases x ${EVASIONS.length} evasions)`,
  denialLeaks.length === 0,
  `${denialLeaks.length} leaks, first: ${denialLeaks[0]}`,
);
// The load-bearing property, asserted directly rather than inferred from the
// sweep above: an unformatted reply can never reach full credit, whatever it
// contains. This is what makes the fallback path safe without lexical patching.
check(
  'an unformatted reply containing EVERYTHING a perfect answer needs still caps at 0.5',
  corpus.cases.every((c) => score(`${c.groundTruth} ${c.acceptAny.join('. ')}`, c).score <= 0.5),
);

// ── STRUCTURAL PROPERTIES ──────────────────────────────────────────────────
// These are what actually closed the denial family; the pattern list is only a
// backstop for answers that ignore the mandated format.
console.log('\nscore() — claim-payload scoping');
const pag = corpus.cases.find((c) => c.id === 'offset-pagination-no-order');
check('DEFECT: none is a denial in the format\'s own vocabulary', claimPayload('defect: none\nwhy: x\nfix: y') === '');
check('a missing DEFECT: line falls back to whole-text scoring', claimPayload('the pagination lacks an order by') === null);
check(
  'a correct, well-formatted answer scores 1.0',
  score(
    'DEFECT: .range() offset pagination with no ORDER BY\nWHY: no ORDER BY means non-deterministic row order, so pages can skip or duplicate rows across round trips and the summed ledger is wrong\nFIX: add a total order on created_at plus id',
    pag,
  ).score === 1.0,
);
check(
  'DEFECT: none scores 0, not partial credit for its surrounding prose',
  score('DEFECT: none\nWHY: the pagination and order are handled correctly here\nFIX: none', pag).score === 0,
);
// Contamination is WEAK evidence, applied only when no claim was filed. Applying
// it unconditionally demoted the correct answer above to 0.5, because "pages can
// skip or duplicate rows" is simply what a competent reviewer writes.
check(
  'a verbatim accepted phrase does NOT penalise an answer that files a claim',
  score(`DEFECT: pagination is unordered\nWHY: ${pag.acceptAny[1]}\nFIX: add an order by`, pag).score === 1.0,
);
check(
  'no ground truth reproduces an accepted phrase verbatim',
  corpus.cases.every((c) => !isContaminated(c.groundTruth.toLowerCase(), c)),
);
// A refutation control only tests the negation rule if it would OTHERWISE have
// scored 1.0 — it must carry every anchor and a recognised explanation, so the
// only thing standing between it and full marks is the "no defect" verdict.
check(
  'every refutationControl contains all of its mustMention anchors',
  corpus.cases.every((c) => c.mustMention.every((k) => c.refutationControl.toLowerCase().includes(k.toLowerCase()))),
);

// The corpus is only a control if every case actually has one.
check('every case carries a negativeControl', corpus.cases.every((c) => typeof c.negativeControl === 'string' && c.negativeControl.length > 0));
// A negativeControl that misses an anchor would pass the check above for the
// wrong reason — it has to be the HARD case: all anchors present, no claim made.
check(
  'every negativeControl contains all of its mustMention anchors',
  corpus.cases.every((c) => c.mustMention.every((k) => c.negativeControl.toLowerCase().includes(k.toLowerCase()))),
  corpus.cases.filter((c) => !c.mustMention.every((k) => c.negativeControl.toLowerCase().includes(k.toLowerCase()))).map((c) => c.id).join(','),
);

console.log('\nscore() — degenerate inputs');
check('empty string scores 0', score('', corpus.cases[0]).score === 0);
check('null scores 0', score(null, corpus.cases[0]).score === 0);
check('whitespace scores 0', score('   \n  ', corpus.cases[0]).score === 0);
// Keyword-stuffing: the scorer is crude, so prove it is not TRIVIALLY gameable
// by a model that merely repeats the prompt's own context back.
const stuffed = corpus.cases[0].context;
check('echoing the prompt context does not score full marks', score(stuffed, corpus.cases[0]).score < 1.0);

// ── scoreboard tally ───────────────────────────────────────────────────────
// This shipped a lying column: it counted on the `verdict` string, so every 0.5
// carrying a specific verdict ('unformatted', 'disclaimed', 'contaminated') was
// reported under MISS. The SCORE total stayed correct, which is exactly what
// made it dangerous — the row looked self-consistent. Review caught it. The
// invariant below is the one that cannot drift: the columns must add up.
console.log('\ntally() — the breakdown must agree with the score beside it');
const RAW = [
  { model: 'm', score: 1, verdict: 'found', ms: 10 },
  { model: 'm', score: 0.5, verdict: 'partial', ms: 20 },
  { model: 'm', score: 0.5, verdict: 'unformatted', ms: 30 },
  { model: 'm', score: 0.5, verdict: 'disclaimed', ms: 40 },
  { model: 'm', score: 0.5, verdict: 'contaminated', ms: 50 },
  { model: 'm', score: 0, verdict: 'missed', ms: 60 },
  { model: 'm', score: 0, verdict: 'no-claim', ms: 70 },
  { model: 'm', error: 'timeout', ms: 0 },
];
const [row] = tally(RAW, 7);
check('every 0.5 counts as PARTIAL, whatever its verdict', row.partial === 4, `got ${row.partial}`);
check('only real zeroes count as MISS', row.missed === 2, `got ${row.missed}`);
check('full marks count as FOUND', row.found === 1, `got ${row.found}`);
check('errors are counted separately, not as misses', row.errors === 1, `got ${row.errors}`);
check('unformatted gets its own column', row.unformatted === 1, `got ${row.unformatted}`);
check('found + partial + missed + errors == total responses', row.found + row.partial + row.missed + row.errors === RAW.length);
check('score total is unchanged by the tally', row.total === 3, `got ${row.total}`);
// An errored response contributes no latency sample — a timeout would otherwise
// masquerade as the model's typical speed.
check('errored responses contribute no latency sample', row.ms.length === RAW.length - 1);

// ── isFree ─────────────────────────────────────────────────────────────────
console.log('\nisFree() — a model is free only if EVERY price is zero');
check('all-zero is free', isFree({ pricing: { prompt: '0', completion: '0', request: '0' } }) === true);
check('paid completion is NOT free', isFree({ pricing: { prompt: '0', completion: '0.0000012' } }) === false);
check('paid prompt is NOT free', isFree({ pricing: { prompt: '0.0000005', completion: '0' } }) === false);
// The trap this guard exists for: reasoning tokens billed separately while
// prompt and completion both read zero.
check('paid internal_reasoning is NOT free', isFree({ pricing: { prompt: '0', completion: '0', internal_reasoning: '0.000003' } }) === false);
check('missing pricing object does not crash', typeof isFree({}) === 'boolean');

// ── parseFindings: cheap models format badly ───────────────────────────────
console.log('\nparseFindings() — tolerate the ways cheap models mangle JSON');
const F = '{"findings":[{"file":"a.ts","line":1,"severity":"high","claim":"x","why":"y"}]}';
check('bare JSON', parseFindings(F).length === 1);
check('fenced with json tag', parseFindings('```json\n' + F + '\n```').length === 1);
check('fenced without tag', parseFindings('```\n' + F + '\n```').length === 1);
check('prose preamble then JSON', parseFindings('Here is my review:\n' + F).length === 1);
check('bare array instead of wrapper', parseFindings('[{"claim":"x","file":"a.ts"}]').length === 1);
check('single object instead of wrapper', parseFindings('{"claim":"x","file":"a.ts"}').length === 1);
check('empty findings parses to empty', parseFindings('{"findings":[]}').length === 0);
check('unparseable prose yields empty, not a throw', parseFindings('I could not review this.').length === 0);

// ── clustering: the consensus mechanism ────────────────────────────────────
console.log('\ncluster() — same defect in different words must merge');
const paraphrases = [
  { _model: 'm1', file: 'f.ts', severity: 'high', claim: 'Pagination lacks ORDER BY so pages may repeat rows', why: 'offset pagination without ordering is unstable' },
  { _model: 'm2', file: 'f.ts', severity: 'high', claim: 'Missing ORDER BY makes offset pagination return duplicate rows', why: 'postgres does not guarantee ordering' },
];
const merged = cluster(paraphrases);
check('two paraphrases merge into ONE cluster', merged.length === 1, `got ${merged.length}`);
check('merged cluster has 2 distinct model votes', merged[0]?.models.size === 2);

console.log('\ncluster() — NEGATIVE CONTROL: different defects must NOT merge');
const distinct = [
  { _model: 'm1', file: 'a.ts', severity: 'high', claim: 'Pagination lacks ORDER BY so rows repeat', why: 'unstable offset paging' },
  { _model: 'm2', file: 'b.ts', severity: 'low', claim: 'Timezone conversion drops daylight saving offset', why: 'wrong local time rendered' },
];
const sep = cluster(distinct);
check('two unrelated findings stay separate', sep.length === 2, `got ${sep.length}`);

// Same model reporting twice must not manufacture a quorum — this is the
// failure that would make the whole corroboration design a lie.
console.log('\ncluster() — one model cannot form its own quorum');
const selfEcho = [
  { _model: 'm1', file: 'f.ts', severity: 'high', claim: 'Pagination lacks ORDER BY so pages may repeat rows', why: 'offset pagination without ordering is unstable' },
  { _model: 'm1', file: 'f.ts', severity: 'high', claim: 'Missing ORDER BY makes offset pagination return duplicate rows', why: 'postgres does not guarantee ordering' },
];
const echo = cluster(selfEcho);
check('duplicate findings from ONE model count as 1 vote', echo[0]?.models.size === 1, `got ${echo[0]?.models.size}`);

// ── chunking ───────────────────────────────────────────────────────────────
console.log('\nchunk() — never silently drop input');
const small = 'diff --git a/x b/x\nhunk';
check('small input stays as one chunk', chunk(small, 1000).length === 1);
const big = Array.from({ length: 8 }, (_, i) => `diff --git a/f${i} b/f${i}\n${'x'.repeat(400)}`).join('\n');
const chunks = chunk(big, 1000);
check('large input splits into several chunks', chunks.length > 1, `got ${chunks.length}`);
check('no content is lost when chunking', chunks.join('').length === big.length, `${chunks.join('').length} vs ${big.length}`);

// ── corpus integrity ───────────────────────────────────────────────────────
console.log('\ncorpus');
check('at least 8 cases', corpus.cases.length >= 8);
check('records which cases Claude missed', corpus.cases.some((c) => c.claudeMissed));
check('every case cites a real source', corpus.cases.every((c) => c.source?.includes('PR #')));

// ════════════════════════════════════════════════════════════════════════════
// PHASE 2 — lineage-aware quorum, free-tier resilience, roles, refutation, cost
// ════════════════════════════════════════════════════════════════════════════

// ── lineage: what makes two votes INDEPENDENT ──────────────────────────────
// The quorum is the entire premise of this tool, so the thing it counts has to
// be right. Phase 1 counted distinct model IDS, which meant a roster of
// `x`, `x:free`, `x:nitro` looked like three independent reviewers and was one
// model polled three times.
console.log('\nlineage — quorum must count independent lineages, not ids');
check('routing variants collapse to one model', baseModelId('qwen/qwen3.8-27b:free') === baseModelId('qwen/qwen3.8-27b'));
check(':nitro / :extended / :batch all collapse too', new Set(['a/b:nitro', 'a/b:extended', 'a/b:batch', 'a/b'].map(baseModelId)).size === 1);
check('ids are case-insensitive', baseModelId('Qwen/Qwen3.8-27B') === 'qwen/qwen3.8-27b');
check('family is the vendor prefix', familyOf('meta-llama/llama-3.3-70b:free') === 'meta-llama');
check('two vendors are two lineages', distinctFamilies(['qwen/a', 'mistralai/b']) === 2);
// NEGATIVE CONTROL — the failure this exists to prevent.
check('two checkpoints from ONE vendor are ONE lineage', distinctFamilies(['qwen/a', 'qwen/b-instruct', 'qwen/c:free']) === 1);
check(
  'a single-vendor roster is REJECTED at quorum 2',
  validateRoster(['qwen/a', 'qwen/b', 'qwen/c'], 2).ok === false,
);
check(
  'and the rejection says why, not just no',
  /lineage/i.test(validateRoster(['qwen/a', 'qwen/b'], 2).reason ?? ''),
);
check('a two-vendor roster is accepted at quorum 2', validateRoster(['qwen/a', 'mistralai/b'], 2).ok === true);
check(
  'a roster that is one model in three costumes is rejected',
  validateRoster(['qwen/a', 'qwen/a:free', 'qwen/a:nitro'], 2).ok === false,
);
check(
  'and reports how many entries collapsed',
  validateRoster(['qwen/a', 'qwen/a:free', 'mistralai/b'], 2).collapsed === 1,
);
// Found by attacking this module, not by review. NaN comparisons are always
// false, so a NaN quorum validated fine and then made `votes >= NaN` false for
// every cluster: the swarm corroborated NOTHING and printed a clean review.
// A silent zero-findings result is indistinguishable from success, which makes
// it the worst failure mode available here.
check('a NaN quorum is REJECTED, not silently accepted', validateRoster(['a/x', 'b/y'], Number('abc')).ok === false);
check('a zero quorum is rejected — it removes the premise while keeping the label', validateRoster(['a/x', 'b/y'], 0).ok === false);
check('a fractional quorum is rejected', validateRoster(['a/x', 'b/y'], 1.5).ok === false);
check('an empty roster is rejected at every quorum', validateRoster([], 1).ok === false);
// Degenerate ids must not manufacture lineages. Both collapse to '' — one
// lineage, which is the SAFE direction (harder quorum, never easier).
check('unparseable ids collapse rather than inventing lineages', distinctFamilies(['', null, undefined]) === 1);
check('a vendorless id is its own lineage', familyOf('gpt-4') === 'gpt-4');
check('a vendorless id and its :free variant are ONE model', baseModelId('gpt-4:free') === baseModelId('gpt-4'));
check('a three-segment id takes the first segment as vendor', familyOf('a/b/c') === 'a');

// ── free-tier resilience ───────────────────────────────────────────────────
// "Run free models in parallel" is mostly a rate-limit problem. A 429 that
// removes a model's vote silently lowers the effective quorum.
console.log('\nbackoff — free tiers 429 hard, and a lost vote lowers the quorum silently');
check('Retry-After in seconds wins over the guess', backoffMs(1, 7) === 7000);
check('an absurd Retry-After is capped so one model cannot stall the run', backoffMs(1, 99999) === 60_000);
check('Retry-After of 0 is honoured, not treated as absent', backoffMs(3, 0) === 0);
check('without Retry-After, backoff grows with the attempt', backoffMs(4, null, () => 1) > backoffMs(1, null, () => 1));
check('backoff is capped', backoffMs(50, null, () => 1) === 30_000);
// FULL JITTER is the point: without it a synchronised fleet retries in lockstep.
check('jitter can be near zero', backoffMs(5, null, () => 0) === 0);
check('jitter never exceeds the ceiling', backoffMs(3, null, () => 0.999) <= 4000);
check('parseRetryAfter reads seconds', parseRetryAfter('12') === 12);
// Fixed clock, not Date.now(). The first version built the header from
// Date.now()+5000 and compared against 5 — but toUTCString() truncates to whole
// seconds, so the real delta was anywhere in (4,5] and the assertion flaked on
// sub-second timing. A test that fails on the clock teaches nothing about the
// code, and would have burned a CI run to say so.
check(
  'parseRetryAfter reads an HTTP date',
  parseRetryAfter('Sun, 17 Aug 2026 02:00:05 GMT', Date.parse('Sun, 17 Aug 2026 02:00:00 GMT')) === 5,
);
check(
  'an HTTP date already in the past clamps to 0, never negative',
  parseRetryAfter('Sun, 17 Aug 2026 01:59:50 GMT', Date.parse('Sun, 17 Aug 2026 02:00:00 GMT')) === 0,
);
check('parseRetryAfter rejects garbage rather than guessing', parseRetryAfter('soon') === null);
check('parseRetryAfter on an absent header is null', parseRetryAfter(null) === null);

console.log('\ncallModel — a rate-limited model must retry, not vanish');
const fakeRes = (status, body = {}, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => body,
});
const OKBODY = { choices: [{ message: { content: '{"findings":[]}' } }], usage: { prompt_tokens: 10, completion_tokens: 2, cost: 0 } };
{
  let calls = 0;
  const r = await callModel({
    model: 'a/b', system: 's', user: 'u', key: 'k', sleep: async () => {},
    fetchImpl: async () => (++calls < 3 ? fakeRes(429, {}, { 'retry-after': '0' }) : fakeRes(200, OKBODY)),
  });
  check('two 429s then success → ok', r.ok === true, JSON.stringify(r));
  check('and the retries are counted, not hidden', r.attempts === 3, `attempts=${r.attempts}`);
}
{
  const r = await callModel({
    model: 'a/b', system: 's', user: 'u', key: 'k', maxAttempts: 3, sleep: async () => {},
    fetchImpl: async () => fakeRes(429, {}, { 'retry-after': '0' }),
  });
  check('a model that 429s forever reports an error rather than a silent empty review', r.ok === false && r.error === 'HTTP 429');
}
{
  // NEGATIVE CONTROL: a 200 carrying an error body must NOT read as "found nothing".
  const r = await callModel({
    model: 'a/b', system: 's', user: 'u', key: 'k', sleep: async () => {},
    fetchImpl: async () => fakeRes(200, { error: { message: 'upstream refused' } }),
  });
  check('a 200 with an error body is an error, not an empty review', r.ok === false && r.error === 'api_error');
}
{
  let calls = 0;
  const r = await callModel({
    model: 'a/b', system: 's', user: 'u', key: 'k', maxAttempts: 4, sleep: async () => {},
    fetchImpl: async () => { calls++; return fakeRes(400, {}); },
  });
  check('a 400 is NOT retried — retrying a bad request just burns quota', calls === 1 && r.ok === false);
}

// ── cost ledger ────────────────────────────────────────────────────────────
// This whole programme is about spend. A swarm that quietly started billing is
// the most embarrassing possible outcome.
console.log('\nledger — prove "free" was actually free');
const LED = [
  { model: 'a/x', usage: { promptTokens: 100, completionTokens: 10, costUsd: 0 }, attempts: 1 },
  { model: 'a/x', usage: { promptTokens: 100, completionTokens: 10, costUsd: 0 }, attempts: 3 },
  { model: 'b/y', usage: { promptTokens: 50, completionTokens: 5, costUsd: 0 }, attempts: 1 },
];
{
  const l = ledger(LED);
  check('an all-zero run reports free', l.wasFree === true && l.totalUsd === 0);
  check('retries are counted from attempts', l.rows.find((r) => r.model === 'a/x').retries === 2);
  check('calls are counted per model', l.rows.find((r) => r.model === 'a/x').calls === 2);
}
{
  // NEGATIVE CONTROL — the case the ledger exists for.
  const l = ledger([...LED, { model: 'c/z', usage: { promptTokens: 1, completionTokens: 1, costUsd: 0.0004 }, attempts: 1 }]);
  check('a model that BILLED is caught', l.wasFree === false);
  check('and is named, not buried in a total', l.billed.length === 1 && l.billed[0].model === 'c/z');
}
{
  // Float noise from summing 6-dp values must not be reported as spend.
  const l = ledger([{ model: 'a/x', usage: { promptTokens: 0, completionTokens: 0, costUsd: 1e-12 }, attempts: 1 }]);
  check('float noise is not reported as billing', l.wasFree === true);
}
check('usageOf tolerates a response with no usage block', usageOf({}).promptTokens === 0 && usageOf(null).costUsd === 0);

// ── roles ──────────────────────────────────────────────────────────────────
console.log('\nroles — perspective diversity, and questions that never become votes');
check('three review roles are defined', REVIEW_ROLES.length === 3);
check('every review role has a system prompt', REVIEW_ROLES.every((r) => ROLES[r]?.system?.length > 100));
check('the roles are genuinely different prompts', new Set(REVIEW_ROLES.map((r) => ROLES[r].system)).size === 3);
check('the refuter is told to default to refuted when unsure', /default to \{"refuted": true\}/i.test(REFUTE.system));
check('a question is recognised', isQuestion({ severity: 'question' }) === true);
check('severity case does not matter', isQuestion({ severity: 'Question' }) === true);
// NEGATIVE CONTROL — this is the rule that stops uncertainty becoming consensus.
check('a real finding is NOT a question', isQuestion({ severity: 'high' }) === false);
check('a missing severity is not a question', isQuestion({}) === false);

// ── the prompt must not contradict its own classifier ──────────────────────
// The shared schema listed only defect severities, so a model FOLLOWING THE
// PROMPT CORRECTLY emitted `severity: "high"` for a question — and the filter,
// which keyed off severity alone, sent it to the claims pile where two of them
// could form a quorum. Uncertainty becoming consensus, via the schema.
// Raised in review on PR #1018 and reproduced before fixing.
check('the question schema permits the severity its classifier looks for', /"question"/.test(ROLES.question.system));
check('the question schema does NOT offer defect severities instead', !/critical\|high\|medium\|low/.test(ROLES.question.system));
check('the defect schema still offers defect severities', /critical\|high\|medium\|low/.test(ROLES.defect.system));
check('the weakness schema still offers defect severities', /critical\|high\|medium\|low/.test(ROLES.weakness.system));
// Belt and braces: provenance is KNOWN, compliance is only hoped for. Even a
// model that ignores the schema entirely cannot get a question into the quorum.
check(
  'a question-role finding is a question whatever severity the model chose',
  isQuestion({ _role: 'question', severity: 'critical' }) === true,
);
check(
  'and a defect-role finding is never reclassified as a question by its role',
  isQuestion({ _role: 'defect', severity: 'high' }) === false,
);
// The end-to-end consequence, asserted directly rather than inferred.
{
  const asQ = (model) => ({ _model: model, _role: 'question', severity: 'high', file: 'f.ts', claim: 'What happens to in-flight rows', why: 'existing work may be lost' });
  const claims = [asQ('a/x'), asQ('b/y')].filter((f) => !isQuestion(f));
  check('two non-compliant questions can no longer reach the claims pile', claims.length === 0);
}

// ── refutation ─────────────────────────────────────────────────────────────
console.log('\nrefutation — a majority of challengers can drop a corroborated finding');
check('bare JSON verdict parses', parseVerdict('{"refuted":true,"reason":"not in diff"}')?.refuted === true);
check('fenced verdict parses', parseVerdict('```json\n{"refuted":false,"reason":"real"}\n```')?.refuted === false);
check('prose then JSON parses', parseVerdict('Sure:\n{"refuted":true,"reason":"x"}')?.refuted === true);
check('unparseable verdict is null, NOT a refutation', parseVerdict('I think it is probably fine') === null);
check('a non-boolean refuted field is rejected', parseVerdict('{"refuted":"yes"}') === null);
const V = (b) => ({ refuted: b, reason: '' });
check('majority refuted drops the finding', survivesRefutation([V(true), V(true), V(false)]).survives === false);
check('minority refuted keeps it', survivesRefutation([V(true), V(false), V(false)]).survives === true);
// A tie must drop: the cost of a surviving false finding is a human's attention.
check('a TIE refutes', survivesRefutation([V(true), V(false)]).survives === false);
// ...but a filter that cannot run must not silently delete what it cannot judge.
check('no usable verdicts → the finding SURVIVES', survivesRefutation([null, null]).survives === true);
check('unparseable verdicts are ignored, not counted as refusals', survivesRefutation([null, V(false)]).survives === true);
check('vote counts report only usable verdicts', survivesRefutation([null, V(true), V(true)]).votes === 2);
// Zero eligible challengers is NOT a passed challenge. The output must say so
// rather than printing "survived 0/0", which reads as endorsement.
check('zero challengers reports zero votes, so the caller can label it honestly', survivesRefutation([]).votes === 0);

// ── refutation judges a finding against ITS OWN chunk ──────────────────────
// Stage one reviews every chunk; stage two originally passed chunks[0] to every
// refuter. A finding from chunk 3 was therefore challenged against chunk 1's
// diff — which does not contain its code — and the refuter is told to refute
// when the diff is insufficient. That deleted valid findings from every chunk
// after the first, worst on the largest reviews, where a second opinion is
// worth most. Found in review on PR #1018.
console.log('\nchunkOf() — a refuter must see the code the finding is about');
const CH = ['diff --git a/one\n+one', 'diff --git a/two\n+two', 'diff --git a/three\n+three'];
check('a finding from chunk 2 is judged against chunk 2', chunkOf({ _chunk: 2 }, CH) === CH[2]);
check('a finding from chunk 0 is judged against chunk 0', chunkOf({ _chunk: 0 }, CH) === CH[0]);
// NEGATIVE CONTROL — the bug itself. Before the fix this returned CH[0].
check('a later-chunk finding is NOT judged against the first chunk', chunkOf({ _chunk: 1 }, CH) !== CH[0]);
check('a finding with no origin falls back to chunk 0 rather than throwing', chunkOf({}, CH) === CH[0]);
check('an out-of-range chunk index falls back rather than returning undefined', chunkOf({ _chunk: 99 }, CH) === CH[0]);
check('a non-integer chunk index falls back', chunkOf({ _chunk: '2' }, CH) === CH[0]);
// The origin has to survive clustering, or chunkOf() has nothing to read.
{
  const at = (model, _chunk) => ({
    _model: model, _role: 'defect', _chunk, file: 'f.ts', severity: 'high',
    claim: 'Pagination lacks ORDER BY so pages may repeat rows',
    why: 'offset pagination without ordering is unstable',
  });
  const c = cluster([at('qwen/a', 2), at('mistralai/b', 2)])[0];
  check('cluster members keep the chunk they were found in', c.members.every((m) => m._chunk === 2));
  check('...so chunkOf can route the refuter to it', chunkOf(c.members[0], CH) === CH[2]);
}

// ── lineage-aware clustering ───────────────────────────────────────────────
// The integration point where the whole thing could still be wrong: cluster()
// must track lineages so main() can require independent ones.
console.log('\ncluster() — votes are lineages, so one vendor cannot form a quorum');
const sameDefect = (model) => ({
  _model: model, _role: 'defect', file: 'f.ts', severity: 'high',
  claim: 'Pagination lacks ORDER BY so pages may repeat rows',
  why: 'offset pagination without ordering is unstable',
});
{
  const c = cluster([sameDefect('qwen/a'), sameDefect('qwen/b')])[0];
  check('two models from one vendor merge into one cluster', c.members.length === 2);
  check('...and count as 2 model ids', c.models.size === 2);
  // THE control. Without this, a single-vendor roster manufactures a quorum.
  check('...but only ONE lineage, so quorum 2 is NOT met', c.families.size === 1, `families=${c.families.size}`);
}
{
  const c = cluster([sameDefect('qwen/a'), sameDefect('mistralai/b')])[0];
  check('two vendors reporting the same defect DO make 2 lineages', c.families.size === 2);
}
{
  const c = cluster([sameDefect('qwen/a'), sameDefect('qwen/a:free')])[0];
  check('a model and its :free variant are one lineage', c.families.size === 1);
}
{
  const mixed = cluster([
    { ...sameDefect('qwen/a'), _role: 'defect' },
    { ...sameDefect('mistralai/b'), _role: 'weakness' },
  ])[0];
  check('a cluster records which roles found it', mixed.roles.size === 2);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

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
import { score, isFree, claimPayload, isContaminated } from './bench.mjs';
import { cluster, parseFindings, chunk } from './swarm.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(readFileSync(join(HERE, 'defects.json'), 'utf8'));

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ── scoring: does ground truth score full marks? ────────────────────────────
console.log('\nscore() — a correct answer must score 1.0');
for (const c of corpus.cases) {
  const r = score(c.groundTruth, c);
  check(`${c.id} scores 1.0 on its own ground truth`, r.score === 1.0, `got ${r.score}, hits=${r.hits.join('|')}`);
}

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
const denialLeaks = [];
for (const framing of DENIAL_FRAMINGS) {
  for (const c of corpus.cases) {
    // Everything a full-credit answer needs, prefixed by a denial: all anchors,
    // an accepted explanation, and enough content words to clear the floor.
    const answer = `${framing} It handles ${c.mustMention.join(' and ')}. Review note: ${c.acceptAny[0]}. Further implementation details are documented.`;
    if (score(answer, c).score >= 1.0) denialLeaks.push(`${framing} @ ${c.id}`);
  }
}
check(
  `no denial framing scores full marks (${DENIAL_FRAMINGS.length} framings x ${corpus.cases.length} cases)`,
  denialLeaks.length === 0,
  `${denialLeaks.length} leaks, first: ${denialLeaks[0]}`,
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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

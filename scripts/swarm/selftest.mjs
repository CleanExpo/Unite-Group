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
import { score, isFree } from './bench.mjs';
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

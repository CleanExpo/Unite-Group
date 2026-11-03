import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseArgs, parseFindings, renderReport, tokensUsedToday, loadApproved } from '../buster.mjs';

test('parseFindings rejects replies without findings (never silently clean)', () => {
  assert.throws(() => parseFindings('looks fine to me'));
  assert.throws(() => parseFindings('{"ok":true}'));
  assert.deepEqual(parseFindings('```json\n{"findings":[]}\n```'), []);
});

test('report marks unreviewed files UNKNOWN and sorts by severity', () => {
  const md = renderReport([
    { file: 'a.ts', status: 'reviewed', findings: [{ severity: 'low', title: 'L' }, { severity: 'critical', title: 'C' }] },
    { file: 'b.ts', status: 'error', error: 'HTTP 500' },
  ]);
  assert.match(md, /Reviewed 1\/2 files/);
  assert.match(md, /NOT reviewed \(status UNKNOWN/);
  assert.ok(md.indexOf('[critical]') < md.indexOf('[low]'));
});

test('daily token ledger only counts today', () => {
  const d = mkdtempSync(join(tmpdir(), 'sb-'));
  const f = join(d, 'l.jsonl');
  writeFileSync(f, '{"date":"2026-11-03","tokens":100}\n{"date":"2026-11-02","tokens":999}\n');
  assert.equal(tokensUsedToday(f, '2026-11-03'), 100);
});

test('bad caps are refused', () => {
  assert.throws(() => parseArgs(['--max-requests', '0']));
  assert.throws(() => parseArgs(['--daily-token-cap', 'x']));
});

test('approved list must be an array', () => {
  const d = mkdtempSync(join(tmpdir(), 'sb-'));
  writeFileSync(join(d, 'a.json'), '{"files":"x"}');
  assert.throws(() => loadApproved(join(d, 'a.json')));
});

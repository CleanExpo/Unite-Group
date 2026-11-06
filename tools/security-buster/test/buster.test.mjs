import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseArgs, parseFindings, renderReport, tokensUsedToday, loadApproved, review, readApprovedFile, missedControlHoles } from '../buster.mjs';

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

test('--max-requests caps real API calls, including retries', async () => {
  const d = mkdtempSync(join(tmpdir(), 'sb-'));
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }], usage: { total_tokens: 1 } }), { status: 200 });
  };
  try {
    const budget = { remaining: 1, ledger: join(d, 'l.jsonl') };
    await assert.rejects(() => review('a.ts', 'x', 'k', budget), /request cap/);
    assert.equal(calls, 1, 'a malformed reply must not trigger a retry past the cap');
    assert.equal(budget.remaining, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('an option missing its operand is refused, not swallowed', () => {
  assert.throws(() => parseArgs(['--out', '--dry-run']), /--out/);
  assert.throws(() => parseArgs(['--out']), /--out/);
  assert.throws(() => parseArgs(['--max-requests']), /max-requests|maxRequests/);
});

test('fractional request limits are refused', () => {
  assert.throws(() => parseArgs(['--max-requests', '1.5']));
  assert.equal(parseArgs(['--max-requests', '2']).maxRequests, 2);
});

test('a symlink cannot smuggle an unapproved file out', () => {
  const d = mkdtempSync(join(tmpdir(), 'sb-'));
  writeFileSync(join(d, 'secret.env'), 'TOKEN=x');
  writeFileSync(join(d, 'real.ts'), 'ok');
  symlinkSync(join(d, 'secret.env'), join(d, 'approved.ts'));
  mkdirSync(join(d, 'sub'));
  symlinkSync(join(d, 'sub'), join(d, 'linkdir'));
  writeFileSync(join(d, 'sub', 'inner.ts'), 'ok');
  assert.throws(() => readApprovedFile(d, 'approved.ts'), /symlink/);
  assert.throws(() => readApprovedFile(d, 'linkdir/inner.ts'), /symlink/);
  assert.equal(readApprovedFile(d, 'real.ts'), 'ok');
});

test('the daily token cap is checked before every call, retries included', async () => {
  const d = mkdtempSync(join(tmpdir(), 'sb-'));
  const ledger = join(d, 'l.jsonl');
  const today = new Date().toISOString().slice(0, 10);
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }], usage: { total_tokens: 60 } }), { status: 200 });
  };
  try {
    writeFileSync(ledger, JSON.stringify({ date: today, tokens: 50 }) + '\n');
    const budget = { remaining: 5, ledger, dailyTokenCap: 100 };
    await assert.rejects(() => review('a.ts', 'x', 'k', budget), /daily token cap/);
    assert.equal(calls, 1, 'the retry must not be sent once the ledger reaches the cap');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('a reply without usage is booked at the full cap, not as zero', async () => {
  const d = mkdtempSync(join(tmpdir(), 'sb-'));
  const ledger = join(d, 'l.jsonl');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"findings":[]}' } }] }), { status: 200 });
  try {
    const budget = { remaining: 5, ledger, dailyTokenCap: 1000 };
    await review('a.ts', 'x', 'k', budget);
    assert.ok(tokensUsedToday(ledger) >= 1000, 'unknown usage must block further calls today');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('the positive control fails the run when a planted hole is missed', () => {
  const all = [
    { title: 'SQL injection in /user' }, { title: 'Command injection via ping' },
    { title: 'Reflected XSS in name' }, { title: 'Missing authorisation on /admin/delete' },
  ];
  assert.deepEqual(missedControlHoles(all), []);
  assert.deepEqual(missedControlHoles(all.slice(0, 3)), ['missing auth']);
  assert.equal(missedControlHoles([]).length, 4);
});

test('approved list must be an array', () => {
  const d = mkdtempSync(join(tmpdir(), 'sb-'));
  writeFileSync(join(d, 'a.json'), '{"files":"x"}');
  assert.throws(() => loadApproved(join(d, 'a.json')));
});

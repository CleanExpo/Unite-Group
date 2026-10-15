import assert from 'node:assert/strict';
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { canonical, collectReview, main, readArtifact, runNative, sha256 } from '../idea-evidence-review-collector.mjs';

// Synthetic protocol controls, never real review or provider execution evidence.
const candidate = realpathSync(mkdtempSync(join(tmpdir(), 'idea-review-collector-')));
const priorHome = process.env.HOME;
process.env.HOME = homedir();
after(() => { if (priorHome === undefined) delete process.env.HOME; else process.env.HOME = priorHome; rmSync(candidate, { recursive: true, force: true }); });
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const head = 'a'.repeat(40), base = 'b'.repeat(40), digest = 'c'.repeat(64);
const sourcePath = fileURLToPath(new URL('../idea-evidence-review-collector.mjs', import.meta.url));
const jsonBytes = value => Buffer.from(JSON.stringify(value), 'utf8');
const hashJson = value => sha256(canonical(value));

function fixture() {
  const bytes = new Map();
  const config = { candidate, repository: 'CleanExpo/Unite-Group', pull_request: 1188, head_sha: head, base_sha: base, verifier_version: 'nexus.v1', provenance_adapter: 'minimax_chat_v1', collector_policy_digest: sha256(readFileSync(sourcePath)) };
  const put = (name, value, path = join(candidate, `${name}.json`)) => {
    const buffer = Buffer.isBuffer(value) ? value : jsonBytes(value);
    bytes.set(path, buffer);
    config[name] = { path, sha256: sha256(buffer) };
    return value;
  };
  for (const name of ['git', 'gh', 'python']) put(name, Buffer.from(name), join(candidate, name));
  put('verifier', Buffer.from('synthetic verifier'), resolve(homedir(), '.claude/skills/pr-release-gate/scripts/pr_release_gate.py'));
  const source = { source_id: 'review.mac', version: 1, kind: 'ed25519', event_kind: 'independent_review_verified', adapter_version: 'nexus_release_gate_v1', repository: config.repository, product_id: 'factory', environment: 'production', public_key: publicKey.export({ type: 'spki', format: 'pem' }), review_policy: { verifier_digest: config.verifier.sha256, collector_policy_digest: config.collector_policy_digest, implementer_vendor: 'openai' } };
  const grant = { grant_id: '11111111-1111-4111-8111-111111111111', version: 1, source_id: source.source_id, source_version: 1, founder_id: '22222222-2222-4222-8222-222222222222', task_id: '33333333-3333-4333-8333-333333333333', lifecycle_revision: 2, brief_hash: digest, outcome_hash: null, outcome_canonical: 'null', repository: config.repository, product_id: 'factory', release_id: head, environment: 'production', subject: { namespace: 'factory_operator', id: 'operator' }, event_name: 'review.verified', contract_hash: digest, valid_from: '2026-10-15T00:00:00Z', valid_until: '2026-10-17T00:00:00Z' };
  config.source_hash = hashJson(source); config.grant_hash = hashJson(grant);
  put('source', { registration: source, registration_hash: config.source_hash });
  put('grant', { registration: grant, registration_hash: config.grant_hash });
  const reviewedAt = '2026-10-15T18:56:54Z';
  const report = put('report', { schema: 2, implementation_agent: 'codex', reviewer_agent: 'minimax/MiniMax-M3', reviewer_session_id: 'fixture.session', base_sha: base, head_sha: head, verdict: 'PASS', blocking_findings: [], coverage: { reviewed: ['file.ts'], not_reviewed: [] }, reviewed_at: reviewedAt, checklist: ['coverage-ledger', 'plan-conformance', 'weakened-checks', 'mutation-control', 'guard-falsification', 'clean-environment-suite', 'blast-radius', 'outbound-actions'].map(id => ({ id, verdict: 'N/A', evidence: 'Synthetic data only.', reason: 'No provider execution.' })) });
  put('mirror', { schema: 1, root: candidate, head_sha: head, base_sha: base, changed_files: 1, verdict: 'PASS', results: [{ status: 'PASS' }] });
  put('response', { id: 'fixture.request', model: 'MiniMax-M3', base_resp: { status_code: 0 }, choices: [{ finish_reason: 'stop', message: { content: bytes.get(config.report.path).toString('utf8') } }] });
  put('plan', { head, base, changedFiles: ['file.ts'] });
  put('execution', { kind: 'mechanical-paid-audit-provenance-not-review', httpStatus: 200, baseResponseStatus: 0, finishReason: 'stop', inferenceRequests: 1, retry: false, fallback: false, modelRequested: 'MiniMax-M3', modelObserved: 'MiniMax-M3', requestId: 'fixture.request', reportSha256: config.report.sha256, rawResponseSha256: config.response.sha256, planSha256: config.plan.sha256, sessionId: report.reviewer_session_id, dispatchTimeUtc: reviewedAt });
  put('receipt', { schema: 1, root: candidate, head_sha: head, base_sha: base, primary_agent: 'codex', reviewer_agent: 'minimax/minimax-m3', reviewer_session_id: report.reviewer_session_id, review_report_path: config.report.path, review_report_sha256: config.report.sha256, ci_mirror: { report_path: config.mirror.path, report_sha256: config.mirror.sha256, verdict: 'PASS', steps: 1 }, issued_at: reviewedAt, signature: digest }, join(candidate, '.git', 'pr-release-gate.json'));
  let verifyCalls = 0;
  const calls = [];
  const io = { privateKey, now: () => new Date('2026-10-16T00:00:00Z'), read: path => path === sourcePath ? readFileSync(path) : Buffer.from(bytes.get(path) ?? ''), run: (executable, args, cwd) => {
    calls.push({ executable, args, cwd });
    if (executable === config.python.path) { verifyCalls++; return `PR_RELEASE_GATE_PASS head=${head} reviewer=minimax/minimax-m3\n`; }
    if (executable === config.gh.path) return JSON.stringify({ number: 1188, head: { sha: head, repo: { full_name: config.repository } }, base: { sha: base, ref: 'main', repo: { full_name: config.repository } } });
    assert.equal(executable, config.git.path);
    const command = args.join(' ');
    return ({ 'rev-parse --show-toplevel': candidate, 'rev-parse HEAD': head, 'merge-base HEAD origin/main': base, 'status --porcelain': '', 'remote get-url origin': `https://github.com/${config.repository}.git`, 'ls-tree HEAD -- .pr-release-gate-exempt': '', 'rev-parse --git-path pr-release-gate.json': '.git/pr-release-gate.json', [`diff --name-only -z ${base} ${head}`]: 'file.ts\0', [`merge-base --is-ancestor ${base} ${base}`]: '' })[command] ?? assert.fail(`Unexpected command ${command}`);
  } };
  return { config, io, bytes, put, calls, get verifyCalls() { return verifyCalls; } };
}

test('signs the exact canonical envelope after two simulated native verifications', () => {
  const f = fixture(); const result = collectReview(f.config, f.io);
  assert.equal(result.envelope.payload.validation, 'validated_non_exempt');
  assert.equal(result.envelope.payload.execution_provenance_digest, f.config.execution.sha256);
  assert.equal(result.envelope.payload.verifier_digest, JSON.parse(f.bytes.get(f.config.source.path)).registration.review_policy.verifier_digest);
  assert.equal(result.envelope.payload.collector_policy_digest, JSON.parse(f.bytes.get(f.config.source.path)).registration.review_policy.collector_policy_digest);
  assert.equal(result.envelope.payload.reviewer.vendor, 'minimax');
  assert.equal(result.envelope.release_id, head);
  assert.equal(f.verifyCalls, 2);
  assert.equal(verify(null, Buffer.from('unite-group:idea-evidence:v1:' + canonical(result.envelope)), createPublicKey(publicKey.export({ type: 'spki', format: 'pem' })), Buffer.from(result.signature, 'base64')), true);
  assert.deepEqual(f.calls.filter(call => call.executable === f.config.python.path).map(call => call.args), [[f.config.verifier.path, 'verify'], [f.config.verifier.path, 'verify']]);
  assert.ok(f.calls.every(call => call.cwd === candidate));
});

test('canonical JSON preserves ASCII lexical numeric keys and UTF-8 text', () => {
  assert.equal(canonical({ z: 'é😀', 2: 2, 10: 10, a: [true, null] }), '{"10":10,"2":2,"a":[true,null],"z":"é😀"}');
  assert.throws(() => canonical({ 'é': 1 }), /ASCII/);
  assert.throws(() => canonical({ value: 1.5 }), /canonical/);
});

for (const [name, mutate, error] of [
  ['zero-exit exempt stdout', f => { const original = f.io.run; f.io.run = (exe, args, cwd) => exe === f.config.python.path ? 'NO receipt was verified and NO tests were re-run\n' : original(exe, args, cwd); }, /non-exempt/],
  ['missing receipt despite zero verifier exit', f => f.bytes.delete(f.config.receipt.path), /digest/],
  ['dirty candidate', f => { const original = f.io.run; f.io.run = (exe, args, cwd) => args.join(' ') === 'status --porcelain' ? ' M file.ts' : original(exe, args, cwd); }, /dirty/],
  ['wrong remote repository', f => { const original = f.io.run; f.io.run = (exe, args, cwd) => args.join(' ') === 'remote get-url origin' ? 'https://github.com/other/repo.git' : original(exe, args, cwd); }, /Origin/],
  ['wrong remote PR head', f => { const original = f.io.run; f.io.run = (exe, args, cwd) => { const value = original(exe, args, cwd); if (exe !== f.config.gh.path) return value; const pr = JSON.parse(value); pr.head.sha = base; return JSON.stringify(pr); }; }, /PR identity/],
  ['source enrollment substitution', f => { f.config.source_hash = 'd'.repeat(64); }, /source hash/],
  ['missing enrolled review policy', f => { const row = JSON.parse(f.bytes.get(f.config.source.path)); delete row.registration.review_policy; row.registration_hash = hashJson(row.registration); f.config.source_hash = row.registration_hash; f.put('source', row); }, /review policy required/],
  ['wrong enrolled verifier pin', f => { const row = JSON.parse(f.bytes.get(f.config.source.path)); row.registration.review_policy.verifier_digest = digest; row.registration_hash = hashJson(row.registration); f.config.source_hash = row.registration_hash; f.put('source', row); }, /policy pin mismatch/],
  ['wrong enrolled collector policy pin', f => { const row = JSON.parse(f.bytes.get(f.config.source.path)); row.registration.review_policy.collector_policy_digest = digest; row.registration_hash = hashJson(row.registration); f.config.source_hash = row.registration_hash; f.put('source', row); }, /policy pin mismatch/],
  ['caller-selected extra review policy field', f => { const row = JSON.parse(f.bytes.get(f.config.source.path)); row.registration.review_policy.approved = true; row.registration_hash = hashJson(row.registration); f.config.source_hash = row.registration_hash; f.put('source', row); }, /review policy required/],
  ['same vendor under different model and agent labels', f => { const row = JSON.parse(f.bytes.get(f.config.source.path)); row.registration.review_policy.implementer_vendor = 'MiniMax'; row.registration_hash = hashJson(row.registration); f.config.source_hash = row.registration_hash; f.put('source', row); }, /Cross-vendor/],
  ['grant enrollment substitution', f => { f.config.grant_hash = 'd'.repeat(64); }, /grant hash/],
  ['grant bound to another source', f => { const row = JSON.parse(f.bytes.get(f.config.grant.path)); row.registration.source_id = 'other.source'; row.registration_hash = hashJson(row.registration); f.config.grant_hash = row.registration_hash; f.put('grant', row); }, /Source\/grant identity/],
  ['receipt bound to another head', f => { const data = JSON.parse(f.bytes.get(f.config.receipt.path)); data.head_sha = base; f.put('receipt', data, f.config.receipt.path); }, /Receipt subject/],
  ['incomplete report coverage', f => { const data = JSON.parse(f.bytes.get(f.config.report.path)); data.coverage.reviewed = []; f.put('report', data); const receipt = JSON.parse(f.bytes.get(f.config.receipt.path)); receipt.review_report_sha256 = f.config.report.sha256; f.put('receipt', receipt, f.config.receipt.path); }, /coverage/],
  ['wrong signing key', f => { f.io.privateKey = generateKeyPairSync('ed25519').privateKey; }, /Signing key/],
  ['report swap', f => f.bytes.set(f.config.report.path, Buffer.from('{}')), /digest/],
  ['mirror swap', f => f.bytes.set(f.config.mirror.path, Buffer.from('{}')), /digest/],
  ['wrong provenance model', f => { const data = JSON.parse(f.bytes.get(f.config.execution.path)); data.modelObserved = 'other'; f.put('execution', data); }, /model/],
  ['wrong provenance session', f => { const data = JSON.parse(f.bytes.get(f.config.execution.path)); data.sessionId = 'other'; f.put('execution', data); }, /session/],
  ['wrong provenance report digest', f => { const data = JSON.parse(f.bytes.get(f.config.execution.path)); data.reportSha256 = digest; f.put('execution', data); }, /digest/],
  ['wrong response content', f => { const data = JSON.parse(f.bytes.get(f.config.response.path)); data.choices[0].message.content = '{}'; f.put('response', data); const execution = JSON.parse(f.bytes.get(f.config.execution.path)); execution.rawResponseSha256 = f.config.response.sha256; f.put('execution', execution); }, /content/],
  ['receipt changed in native verification', f => { const original = f.io.run; f.io.run = (exe, args, cwd) => { const output = original(exe, args, cwd); if (exe === f.config.python.path) f.bytes.set(f.config.receipt.path, Buffer.from('{}')); return output; }; }, /digest/],
  ['verifier swapped after first verification', f => { const original = f.io.run; f.io.run = (exe, args, cwd) => { const output = original(exe, args, cwd); if (exe === f.config.python.path) f.bytes.set(f.config.verifier.path, Buffer.from('changed verifier')); return output; }; }, /Verifier changed/],
  ['registered source changed after capture', f => { const original = f.io.run; f.io.run = (exe, args, cwd) => { const output = original(exe, args, cwd); if (exe === f.config.python.path) f.bytes.set(f.config.source.path, Buffer.from('{}')); return output; }; }, /digest/],
  ['expired grant', f => { f.io.now = () => new Date('2026-10-18T00:00:00Z'); }, /interval/],
  ['substituted policy', f => { f.config.collector_policy_digest = digest; }, /policy digest/],
]) test(`rejects ${name}`, () => { const f = fixture(); mutate(f); assert.throws(() => collectReview(f.config, f.io), error); });

test('stable event identity does not make a later capture an exact retry', () => {
  const f = fixture(); const first = collectReview(f.config, f.io);
  f.io.now = () => new Date('2026-10-16T00:01:00Z'); const second = collectReview(f.config, f.io);
  assert.equal(first.envelope.event_id, second.envelope.event_id);
  assert.notEqual(first.signature, second.signature);
  assert.notEqual(first.envelope.occurred_at, second.envelope.occurred_at);
});

test('file reader refuses directories and private-key reads on an unsupported host', () => {
  assert.throws(() => readArtifact(candidate), /artifact file/);
  const file = join(candidate, 'private-control'); writeFileSync(file, 'synthetic', { mode: 0o644 });
  assert.throws(() => readArtifact(file, { privateFile: true }), /POSIX|owner-only|shared/);
});

test('CLI refuses additional flags and native runner propagates a nonzero exit', () => {
  assert.throws(() => main(['--exempt']), /Usage/);
  assert.throws(() => runNative(process.execPath, ['-e', 'process.exit(7)'], candidate), /Native command failed/);
});

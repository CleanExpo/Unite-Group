#!/usr/bin/env node
/** Offline signing is deliberately downstream of two unchanged native verifications.
 * Operator files are enrollment exports, not a self-enrollment API. No network writes.
 */
import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DOMAIN = 'unite-group:idea-evidence:v1:';
const ADAPTER = 'nexus_release_gate_v1';
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const need = (condition, message) => { if (!condition) throw new Error(message); };
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const keys = Object.keys(value).sort();
    need(keys.every(key => /^[A-Za-z0-9_]+$/.test(key)), 'Non-ASCII evidence key');
    return `{${keys.map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  throw new Error('Non-canonical evidence value');
}
const hashJson = value => sha256(canonical(value));

/** Refuse links, shared secrets, non-regular files and oversize reads. Key bytes stay local. */
export function readArtifact(path, { privateFile = false } = {}) {
  need(isAbsolute(path), 'Artifact path must be absolute');
  need(!lstatSync(path).isSymbolicLink(), 'Artifact symlink refused');
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = fstatSync(fd);
    need(before.isFile() && before.size <= 128 * 1024 * 1024, 'Invalid artifact file');
    if (privateFile) {
      need(process.platform !== 'win32' && typeof process.getuid === 'function', 'Private-key collector requires POSIX ownership');
      need(before.uid === process.getuid() && (before.mode & 0o077) === 0, 'Operator file/key must be owner-only');
      let parent = dirname(path);
      for (;;) {
        const stat = lstatSync(parent);
        need(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o022) === 0, 'Private operator directory is shared or linked');
        if (dirname(parent) === parent) break;
        parent = dirname(parent);
      }
    }
    const bytes = readFileSync(fd);
    const after = fstatSync(fd);
    need(before.ino === after.ino && before.dev === after.dev && before.size === after.size && before.mtimeMs === after.mtimeMs, 'Artifact changed while reading');
    return bytes;
  } finally { closeSync(fd); }
}

export function runNative(executable, args, cwd) {
  const child = spawnSync(executable, args, { cwd, env: process.env, shell: false, encoding: 'utf8', timeout: 30 * 60 * 1000, maxBuffer: 4 * 1024 * 1024 });
  need(!child.error && child.status === 0 && !child.signal, 'Native command failed');
  return child.stdout;
}

function pinnedFile(spec, read) {
  need(spec && DIGEST.test(spec.sha256), 'Missing artifact digest');
  const bytes = read(spec.path);
  need(sha256(bytes) === spec.sha256, 'Pinned artifact digest mismatch');
  return bytes;
}

function validateEnrollment(sourceRow, grantRow, config, publicKey) {
  const source = sourceRow.registration;
  const grant = grantRow.registration;
  need(hashJson(source) === sourceRow.registration_hash && sourceRow.registration_hash === config.source_hash, 'Enrolled source hash mismatch');
  need(hashJson(grant) === grantRow.registration_hash && grantRow.registration_hash === config.grant_hash, 'Enrolled grant hash mismatch');
  need(source.kind === 'ed25519' && source.event_kind === 'independent_review_verified' && source.adapter_version === ADAPTER, 'Unsupported enrolled source');
  const policy = source.review_policy;
  need(policy && Object.keys(policy).sort().join(',') === 'collector_policy_digest,implementer_vendor,verifier_digest' && DIGEST.test(policy.verifier_digest) && DIGEST.test(policy.collector_policy_digest) && typeof policy.implementer_vendor === 'string' && policy.implementer_vendor.length <= 100 && ID.test(policy.implementer_vendor), 'Enrolled review policy required');
  need(policy.verifier_digest === config.verifier.sha256 && policy.collector_policy_digest === config.collector_policy_digest, 'Enrolled review policy pin mismatch');
  need(createPublicKey(source.public_key).asymmetricKeyType === 'ed25519' && createPublicKey(source.public_key).export({ type: 'spki', format: 'pem' }) === publicKey, 'Signing key does not match enrolled source');
  need(ID.test(source.source_id) && Number.isSafeInteger(source.version) && source.version > 0 && UUID.test(grant.grant_id), 'Invalid enrollment identity');
  need(grant.source_id === source.source_id && grant.source_version === source.version && Number.isSafeInteger(grant.version) && grant.version > 0, 'Source/grant identity mismatch');
  for (const key of ['repository', 'product_id', 'environment']) need(grant[key] === source[key], 'Source/grant scope mismatch');
  need(source.repository === config.repository && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.repository), 'Repository enrollment mismatch');
  need(UUID.test(grant.founder_id) && UUID.test(grant.task_id) && Number.isSafeInteger(grant.lifecycle_revision) && grant.lifecycle_revision > 0 && DIGEST.test(grant.brief_hash), 'Invalid grant owner/brief');
  need(grant.release_id === config.head_sha && SHA.test(grant.release_id) && ID.test(grant.product_id) && ['staging', 'production'].includes(grant.environment), 'Release enrollment mismatch');
  need(grant.subject && ID.test(grant.subject.namespace) && ID.test(grant.subject.id) && ID.test(grant.event_name) && DIGEST.test(grant.contract_hash), 'Invalid grant subject');
  const outcome = JSON.parse(grant.outcome_canonical);
  need(grant.outcome_hash === null ? outcome === null && grant.outcome_canonical === 'null' : DIGEST.test(grant.outcome_hash) && outcome !== null && sha256(grant.outcome_canonical) === grant.outcome_hash, 'Outcome binding mismatch');
  return { source, grant };
}

function validateChain(captured, config, changed) {
  const { receipt, report, mirror, execution, response, plan } = captured.json;
  need(receipt.schema === 1 && receipt.root === config.candidate && /^[a-f0-9]{64}$/.test(receipt.signature), 'Missing non-exempt signed receipt');
  need(receipt.base_sha === config.base_sha && receipt.head_sha === config.head_sha, 'Receipt subject mismatch');
  need(receipt.review_report_path === config.report.path && receipt.ci_mirror?.report_path === config.mirror.path, 'Receipt artifact path mismatch');
  need(receipt.review_report_sha256 === sha256(captured.bytes.report) && receipt.ci_mirror.report_sha256 === sha256(captured.bytes.mirror), 'Receipt artifact digest mismatch');
  need(report.schema === 2 && report.verdict === 'PASS' && Array.isArray(report.blocking_findings) && report.blocking_findings.length === 0, 'Independent report did not PASS');
  need(report.base_sha === config.base_sha && report.head_sha === config.head_sha && report.implementation_agent?.toLowerCase() === receipt.primary_agent?.toLowerCase() && report.reviewer_agent?.toLowerCase() === receipt.reviewer_agent?.toLowerCase() && report.reviewer_session_id === receipt.reviewer_session_id, 'Report identity mismatch');
  need(report.coverage && Array.isArray(report.coverage.reviewed) && Array.isArray(report.coverage.not_reviewed) && report.coverage.not_reviewed.length === 0, 'Full review coverage required');
  const reviewed = report.coverage.reviewed;
  need(reviewed.length === changed.length && new Set(reviewed).size === changed.length && changed.every(path => reviewed.includes(path)), 'Changed-file coverage mismatch');
  const checks = ['coverage-ledger', 'plan-conformance', 'weakened-checks', 'mutation-control', 'guard-falsification', 'clean-environment-suite', 'blast-radius', 'outbound-actions'];
  need(Array.isArray(report.checklist) && checks.every(id => report.checklist.filter(entry => entry.id === id).length === 1 && report.checklist.some(entry => entry.id === id && ['PASS', 'N/A'].includes(entry.verdict) && typeof entry.evidence === 'string' && entry.evidence.trim() && (entry.verdict !== 'N/A' || typeof entry.reason === 'string' && entry.reason.trim()))), 'Review checklist incomplete');
  need(Number.isFinite(Date.parse(report.reviewed_at)) && Number.isFinite(Date.parse(receipt.issued_at)), 'Missing review timestamps');
  need(mirror.schema === 1 && mirror.root === config.candidate && mirror.head_sha === config.head_sha && mirror.base_sha === config.base_sha && mirror.verdict === 'PASS' && mirror.changed_files === changed.length && Array.isArray(mirror.results) && mirror.results.length > 0 && mirror.results.length === receipt.ci_mirror.steps && receipt.ci_mirror.verdict === 'PASS', 'Mirror subject/verdict mismatch');
  need(mirror.results.every(result => ['PASS', 'SKIP-setup', 'SKIP-test-gap', 'SKIP-exempt', 'SKIP-filter'].includes(result.status)), 'Mirror failed or unknown result');
  // Version 1 supports the retained genuine MiniMax chat execution format only.
  need(config.provenance_adapter === 'minimax_chat_v1' && report.reviewer_agent === 'minimax/MiniMax-M3', 'Unsupported execution provenance adapter');
  need(execution.kind === 'mechanical-paid-audit-provenance-not-review' && execution.httpStatus === 200 && execution.baseResponseStatus === 0 && execution.finishReason === 'stop' && execution.inferenceRequests === 1 && execution.retry === false && execution.fallback === false, 'Provider execution did not succeed');
  need(execution.modelRequested === 'MiniMax-M3' && execution.modelObserved === 'MiniMax-M3' && response.model === 'MiniMax-M3' && response.base_resp?.status_code === 0 && response.id === execution.requestId, 'Provider model/request mismatch');
  need(execution.reportSha256 === sha256(captured.bytes.report) && execution.rawResponseSha256 === sha256(captured.bytes.response) && execution.planSha256 === sha256(captured.bytes.plan) && execution.sessionId === report.reviewer_session_id && execution.dispatchTimeUtc === report.reviewed_at, 'Provider report/session/digest mismatch');
  need(plan.head === config.head_sha && plan.base === config.base_sha && Array.isArray(plan.changedFiles) && plan.changedFiles.length === changed.length && changed.every(path => plan.changedFiles.includes(path)), 'Execution plan subject mismatch');
  need(Array.isArray(response.choices) && response.choices.length === 1 && response.choices[0].finish_reason === 'stop' && response.choices[0].message?.content === captured.bytes.report.toString('utf8'), 'Raw provider content differs from reviewed report');
}

/** Test injection is module-only. CLI always uses real files, git, gh and native verifier. */
export function collectReview(config, { read = readArtifact, run = runNative, now = () => new Date(), privateKey } = {}) {
  need(SHA.test(config.head_sha) && SHA.test(config.base_sha) && config.base_sha !== config.head_sha && Number.isSafeInteger(config.pull_request) && config.pull_request > 0, 'Invalid candidate identity');
  need(realpathSync(config.candidate) === config.candidate, 'Candidate must be its real absolute path');
  need(process.env.HOME === homedir(), 'Normal HOME required');
  for (const name of ['PR_RELEASE_GATE_HUMAN_OVERRIDE', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_SYSTEM', 'GIT_CONFIG_NOSYSTEM', 'GIT_DIR', 'GIT_COMMON_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'PYTHONPATH', 'PYTHONHOME', 'PYTHONINSPECT', 'NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'DYLD_INSERT_LIBRARIES']) need(!process.env[name], 'Process override refused');
  need(ID.test(config.verifier_version), 'Verifier version required');
  const policyDigest = sha256(read(fileURLToPath(import.meta.url)));
  need(policyDigest === config.collector_policy_digest, 'Collector policy digest mismatch');
  for (const name of ['python', 'git', 'gh', 'verifier']) pinnedFile(config[name], read);
  need(config.verifier.path === resolve(homedir(), '.claude/skills/pr-release-gate/scripts/pr_release_gate.py'), 'Trusted installed verifier path required');
  const sourceRow = JSON.parse(pinnedFile(config.source, read));
  const grantRow = JSON.parse(pinnedFile(config.grant, read));
  const key = privateKey ?? createPrivateKey(read(config.private_key_path, { privateFile: true }));
  need(key.asymmetricKeyType === 'ed25519', 'Ed25519 private key required');
  const publicKey = createPublicKey(key).export({ type: 'spki', format: 'pem' });
  const { source, grant } = validateEnrollment(sourceRow, grantRow, config, publicKey);
  const git = args => run(config.git.path, args, config.candidate).trim();
  const verifyIdentity = () => {
    need(git(['rev-parse', '--show-toplevel']) === config.candidate && git(['rev-parse', 'HEAD']) === config.head_sha && git(['merge-base', 'HEAD', 'origin/main']) === config.base_sha && git(['status', '--porcelain']) === '', 'Candidate moved or is dirty');
    const origin = git(['remote', 'get-url', 'origin']);
    need([`https://github.com/${config.repository}.git`, `https://github.com/${config.repository}`, `git@github.com:${config.repository}.git`].includes(origin), 'Origin repository mismatch');
    const pr = JSON.parse(run(config.gh.path, ['api', `repos/${config.repository}/pulls/${config.pull_request}`], config.candidate));
    need(pr.number === config.pull_request && pr.head?.sha === config.head_sha && pr.head?.repo?.full_name === config.repository && pr.base?.repo?.full_name === config.repository && pr.base?.ref === 'main' && SHA.test(pr.base.sha), 'Remote PR identity mismatch');
    git(['merge-base', '--is-ancestor', config.base_sha, pr.base.sha]);
    need(git(['ls-tree', 'HEAD', '--', '.pr-release-gate-exempt']) === '', 'Exempt candidate refused');
    return hashJson({ number: pr.number, head: pr.head.sha, base: pr.base.sha, repository: pr.base.repo.full_name });
  };
  const specs = ['receipt', 'report', 'mirror', 'execution', 'response', 'plan'];
  const capture = () => {
    const bytes = Object.fromEntries(specs.map(name => [name, pinnedFile(config[name], read)]));
    return { bytes, json: Object.fromEntries(specs.map(name => [name, JSON.parse(bytes[name])])) };
  };
  const firstIdentity = verifyIdentity();
  need(config.receipt.path === resolve(config.candidate, git(['rev-parse', '--git-path', 'pr-release-gate.json'])), 'Native receipt path mismatch');
  const captured = capture();
  const changed = git(['diff', '--name-only', '-z', config.base_sha, config.head_sha]).split('\0').filter(Boolean);
  need(changed.length > 0, 'Empty change refused');
  const verifyNative = () => {
    need(sha256(read(config.verifier.path)) === config.verifier.sha256, 'Verifier changed');
    const stdout = run(config.python.path, [config.verifier.path, 'verify'], config.candidate);
    need(stdout.split(/\r?\n/).some(line => line === `PR_RELEASE_GATE_PASS head=${config.head_sha} reviewer=${captured.json.receipt.reviewer_agent}`) && !/EXEMPT|NO receipt was verified/i.test(stdout), 'Native verifier did not validate a non-exempt receipt');
  };
  verifyNative();
  validateChain(captured, config, changed);
  verifyNative();
  const recaptured = capture();
  need(specs.every(name => captured.bytes[name].equals(recaptured.bytes[name])), 'Evidence changed during verification');
  for (const name of ['python', 'git', 'gh', 'verifier', 'source', 'grant']) pinnedFile(config[name], read);
  need(firstIdentity === verifyIdentity() && sha256(read(fileURLToPath(import.meta.url))) === policyDigest, 'Source/policy changed during capture');
  const occurredAt = now().toISOString();
  need(Date.parse(occurredAt) >= Date.parse(grant.valid_from) && Date.parse(occurredAt) <= Date.parse(grant.valid_until), 'Grant is outside its capture interval');
  const reviewer = { vendor: 'minimax', model: 'MiniMax-M3', session_id: captured.json.report.reviewer_session_id };
  need(ID.test(reviewer.session_id), 'Invalid reviewer session');
  need(reviewer.vendor.toLowerCase() !== source.review_policy.implementer_vendor.toLowerCase(), 'Cross-vendor review required');
  const payload = { adapter_version: ADAPTER, pull_request: config.pull_request, base_sha: config.base_sha, head_sha: config.head_sha, receipt_digest: config.receipt.sha256, report_digest: config.report.sha256, mirror_digest: config.mirror.sha256, execution_provenance_digest: config.execution.sha256, verifier_digest: config.verifier.sha256, verifier_version: config.verifier_version, collector_policy_digest: policyDigest, validation: 'validated_non_exempt', reviewer };
  const envelope = { source_id: source.source_id, source_version: source.version, grant_id: grant.grant_id, grant_version: grant.version, event_id: `review.v1.${hashJson({ grant_id: grant.grant_id, grant_version: grant.version, payload })}`, event_kind: 'independent_review_verified' };
  for (const name of ['founder_id', 'task_id', 'lifecycle_revision', 'brief_hash', 'outcome_hash', 'repository', 'product_id', 'release_id', 'environment', 'subject', 'event_name', 'contract_hash']) envelope[name] = grant[name];
  envelope.occurred_at = occurredAt;
  envelope.payload = payload;
  return { envelope, signature: sign(null, Buffer.from(DOMAIN + canonical(envelope), 'utf8'), key).toString('base64') };
}

export function main(args) {
  need(args.length === 4 && args[0] === '--config' && args[2] === '--output', 'Usage: node scripts/idea-evidence-review-collector.mjs --config ABSOLUTE_PRIVATE_CONFIG --output ABSOLUTE_NEW_OUTPUT');
  const configPath = realpathSync(args[1]);
  need(configPath === args[1] && isAbsolute(args[3]), 'Absolute real config/output paths required');
  const configBytes = readArtifact(configPath, { privateFile: true });
  const result = collectReview(JSON.parse(configBytes));
  need(readArtifact(configPath, { privateFile: true }).equals(configBytes), 'Operator config changed');
  // Exclusive output preserves the original signed occurrence on retries. Submit that file again.
  writeFileSync(args[3], `${JSON.stringify(result)}\n`, { flag: 'wx', mode: 0o600 });
  return result.envelope.event_id;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`Review evidence captured: ${main(process.argv.slice(2))}`); }
  catch { console.error('Review evidence capture refused; check the protected operator configuration and native qualification.'); process.exitCode = 1; }
}

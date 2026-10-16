// Explicit operator-stage readback only. No publish/attest/import entrypoint.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const CANONICAL_GATE_SHA = '0da852d9c1388ceb5034eb61203e23f85c135f66e53e3acab79b929367842aec';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => sha(JSON.stringify(canonical(value)));
const refuse = () => { throw new Error('current_publication_prerequisites_refused'); };
const PROGRAM = String.raw`
import hashlib, importlib.util, json, pathlib, sys
request=json.load(sys.stdin)
source=pathlib.Path(request['module'])
expected='0da852d9c1388ceb5034eb61203e23f85c135f66e53e3acab79b929367842aec'
if hashlib.sha256(source.read_bytes()).hexdigest()!=expected: raise ValueError('canonical source changed')
spec=importlib.util.spec_from_file_location('contained_canonical_release_gate',source)
gate=importlib.util.module_from_spec(spec);sys.modules[spec.name]=gate;spec.loader.exec_module(gate)
gate.publication_environment()
root=pathlib.Path(request['root'])
policy,fingerprint=gate.publication_policy(root,'CleanExpo/Unite-Group')
if any(name==gate.RECEIPT_STATUS_CONTEXT and app is not None for name,app in policy): raise ValueError('classic publisher cannot satisfy app-bound receipt')
runs,statuses=gate.publication_checks(root,'CleanExpo/Unite-Group',request['head'])
gate.publication_prerequisites(policy,runs,statuses)
if not gate.published_status(statuses,request['receipt'],161467050): raise ValueError('canonical receipt status refused')
if hashlib.sha256(source.read_bytes()).hexdigest()!=expected: raise ValueError('canonical source changed')
print(json.dumps({'schema':'contained-codex-publication-readback/1','repository':'CleanExpo/Unite-Group','headSha':request['head'],'canonicalModuleSha256':expected,'policyFingerprint':fingerprint,'requiredChecksPass':True,'publishedReceiptPass':True,'snapshot':{'policy':policy,'runs':runs,'statuses':statuses}},separators=(',',':')))
`;

export function validatePublicationProof(proof, head) {
  if (proof?.schema !== 'contained-codex-publication-readback/1' || proof.repository !== 'CleanExpo/Unite-Group' || proof.headSha !== head || proof.canonicalModuleSha256 !== CANONICAL_GATE_SHA || proof.requiredChecksPass !== true || proof.publishedReceiptPass !== true || !/^[a-f0-9]{64}$/.test(proof.policyFingerprint ?? '') || !Array.isArray(proof.snapshot?.policy) || !Array.isArray(proof.snapshot.runs) || !Array.isArray(proof.snapshot.statuses) || proof.snapshotHash !== digest(proof.snapshot)) refuse();
  return proof;
}
export function assertPublicationUnchanged(before, after) {
  validatePublicationProof(before, before?.headSha); validatePublicationProof(after, before.headSha);
  if (before.policyFingerprint !== after.policyFingerprint || before.snapshotHash !== after.snapshotHash) refuse();
}
export function latestRequiredCompletion(proof) {
  const required = new Set(proof.snapshot.policy.map(([name]) => name).filter(name => name !== 'nexus/release-receipt'));
  const dates = [...proof.snapshot.runs.filter(run => required.has(run.name)).map(run => run.completed_at), ...proof.snapshot.statuses.filter(status => required.has(status.context)).map(status => status.updated_at)].map(value => Date.parse(value)).filter(Number.isFinite);
  if (!dates.length) refuse();
  return Math.max(...dates);
}
export function inspectPublication(config, head, receipt, { execute = execFileSync, measureExecutable } = {}) {
  if (typeof measureExecutable !== 'function' || !/^[a-f0-9]{40}$/.test(head ?? '') || !/^[a-f0-9]{64}$/.test(config.publicationPythonSha ?? '') || sha(readFileSync(config.publicationModule)) !== CANONICAL_GATE_SHA) refuse();
  return Promise.resolve(measureExecutable(config.publicationPython)).then(async measured => {
    if (measured !== config.publicationPythonSha) refuse();
    const allow = /^(?:SYSTEMROOT|SYSTEMDRIVE|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|PROGRAMFILES|PROGRAMW6432|PROGRAMFILES\(X86\)|PROGRAMDATA|HOME|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|USER|USERNAME|LOGNAME|LANG|LC_ALL|TZ|GH_TOKEN|GITHUB_TOKEN|GH_CONFIG_DIR|GH_HOST|GH_REPO|GIT_.*)$/i;
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allow.test(key)));
    env.PATH = `${dirname(config.gh)};${process.env.PATH ?? ''}`;
    const raw = execute(config.publicationPython, ['-I', '-B', '-c', PROGRAM], { cwd: config.repo, env, input: JSON.stringify({ module: config.publicationModule, root: config.repo, head, receipt }), shell: false, windowsHide: true, timeout: 60_000, maxBuffer: 1_048_576, encoding: 'utf8' });
    if (sha(readFileSync(config.publicationModule)) !== CANONICAL_GATE_SHA || await measureExecutable(config.publicationPython) !== config.publicationPythonSha) refuse();
    const result = JSON.parse(raw); result.snapshotHash = digest(result.snapshot);
    return validatePublicationProof(result, head);
  });
}

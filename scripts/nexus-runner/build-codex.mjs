#!/usr/bin/env node
// Opt-in single-task worker. The model stage cannot publish or release a task.
import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, lstatSync, readFileSync, writeFileSync, mkdirSync, readdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, win32 } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { StringDecoder } from 'node:string_decoder';
import { inspectPublication, validatePublicationProof, assertPublicationUnchanged, latestRequiredCompletion } from './build-codex-publication.mjs';

const SELF = fileURLToPath(import.meta.url);
const BROKER = fileURLToPath(new URL('./research-containment.ps1', import.meta.url));
const PUBLICATION_HELPER = fileURLToPath(new URL('./build-codex-publication.mjs', import.meta.url));
const REPOSITORY = 'CleanExpo/Unite-Group';
export const BUILD_STAGE_CONTRACT = 'isolated-edit-ts-vitest/1';
const EXCLUDED_CAPABILITIES = ['package_install', 'package_manager', 'next_build'];
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const PIN = {
  codexSha256: 'e98c516f1c8935789aabe9122ee7e05ec4c3efd1ba6acf179242e031c495b99e',
  nodeSha256: '58e74bf02fc5bbacc41dcb8bef089961cd5bddd37830b87784e4fc624d145d1f',
  brokerSha256: '7111d9579bb5d618d73e4160cece5f248f273162ae878a1c053ed56a144f744d',
  codeModeHostSha256: 'ec4b09849f3a5bdf4a0c3d1f3c566bda392fdcd9b4aef6bd169a81ef1283fc3d',
  commandRunnerSha256: 'bdf5160289bc4d64bc2fa38c43f9679558b3a4386226adc66a0af741e41424b7',
};
const DISABLED = ['apps', 'browser_use', 'browser_use_external', 'browser_use_full_cdp_access', 'computer_use', 'hooks', 'in_app_browser', 'multi_agent', 'plugins', 'remote_plugin', 'view_image', 'skill_search', 'skill_mcp_dependency_install', 'image_generation', 'goals', 'sleep_tool'];
export const FACADE_INVENTORY = Object.freeze({
  topLevel: Object.freeze(['functions.exec', 'functions.wait', 'functions.request_user_input', 'functions.request_user_input_async']),
  nested: Object.freeze(['apply_patch', 'exec_command', 'list_mcp_resource_templates', 'list_mcp_resources', 'read_mcp_resource', 'write_stdin', 'clock__curr_time']),
  schemaOnly: Object.freeze(['functions.request_user_input', 'functions.request_user_input_async', 'clock__curr_time']),
});
const OS_KEYS = new Set(['SYSTEMROOT', 'SYSTEMDRIVE', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'PROGRAMFILES', 'PROGRAMW6432', 'PROGRAMFILES(X86)', 'PROGRAMDATA', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'USER', 'USERNAME', 'LOGNAME', 'LANG', 'LC_ALL', 'TZ']);
const MAX_FILE = 1_048_576, MAX_TOTAL = 134_217_728;
const hardStopped = () => existsSync(join(homedir(), '.claude', 'HARD_STOP'));
export class BuildWorkerError extends Error { constructor(code) { super(code); this.code = code; } }
const fail = code => { throw new BuildWorkerError(code); };
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(canonical(value))).digest('hex');
const integer = (n, low, high) => Number.isSafeInteger(n) && n >= low && n <= high;
const json = file => JSON.parse(readSafe(file).toString('utf8'));

/** No links, junctions or hardlinks in controller-owned input/output custody. */
export function assertNormal(file, directory = false, allowInstalledHardlink = false) {
  const absolute = resolve(file);
  let current = absolute;
  for (;;) {
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) fail('non_regular_path');
    if (current === absolute && (directory ? !stat.isDirectory() : !stat.isFile() || (!allowInstalledHardlink && stat.nlink !== 1))) fail('non_regular_path');
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  if (realpathSync(absolute).toLowerCase() !== absolute.toLowerCase()) fail('reparse_path');
  return absolute;
}
/** Installed runtime aliases are permitted only after hashing their actual bytes. */
export async function nativeExecutableHash(file) {
  assertNormal(file, false, true);
  if (lstatSync(file).size > 536_870_912) fail('native_executable_size_limit');
  const digest = createHash('sha256');
  for await (const bytes of createReadStream(file)) digest.update(bytes);
  return digest.digest('hex');
}
function readSafe(file, limit = MAX_FILE) {
  assertNormal(file);
  if (lstatSync(file).size > limit) fail('input_size_limit');
  return readFileSync(file);
}
function writeNew(file, value) {
  assertNormal(dirname(file), true);
  writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  assertNormal(file);
}
function pinnedJson(file, digest) {
  if (!SHA.test(digest ?? '')) fail('missing_custody_hash');
  const bytes = readSafe(file);
  if (hash(bytes) !== digest) fail('custody_hash_mismatch');
  return JSON.parse(bytes.toString('utf8'));
}

/** Windows aliases and control-plane filenames are rejected before extraction. */
export function safePath(path) {
  if (typeof path !== 'string' || path.length > 240 || !path || /[\\:\x00-\x1f\x7f]/.test(path) || path.startsWith('/') || path !== path.normalize('NFC')) fail('unsafe_snapshot_path');
  const parts = path.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part) || /^(?:\.git|\.env.*|\.npmrc|\.netrc|\.ssh|\.aws|\.codex|\.claude|\.agents|\.omx|node_modules|\.vercel|\.mcp\.json)$/i.test(part)) || /(?:^|\/)(?:credentials|auth|secrets?)\.(?:json|toml|ya?ml|pem|key)$/i.test(path)) fail('unsafe_snapshot_path');
  return path;
}
const selected = (path, prefixes) => prefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
export function parseOptions(args, env = process.env) {
  const values = {}, lists = { '--input-path': [], '--allowed-path': [] };
  const names = ['--task-id', '--repo', '--base', '--profile', '--profile-sha', '--qualification', '--qualification-sha', '--ledger', '--acceptance', '--acceptance-sha', '--pr', '--gh', '--publication-python', '--publication-python-sha', '--publication-module'];
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (['--once', '--finalize', '--accept-candidate'].includes(key)) { if (values[key]) fail('invalid_options'); values[key] = true; }
    else if (Object.hasOwn(lists, key)) { if (!args[i + 1] || args[i + 1].startsWith('--')) fail('invalid_options'); lists[key].push(safePath(args[++i])); }
    else if (names.includes(key) && !Object.hasOwn(values, key) && args[i + 1] && !args[i + 1].startsWith('--')) values[key] = args[++i];
    else fail('invalid_options');
  }
  if (!values['--once'] || !UUID.test(values['--task-id'] ?? '') || !COMMIT.test(values['--base'] ?? '') || !isAbsolute(values['--repo'] ?? '') || !isAbsolute(values['--ledger'] ?? '') || !lists['--input-path'].length || !lists['--allowed-path'].length || lists['--allowed-path'].some(path => !selected(path, lists['--input-path']))) fail('usage_requires_exact_bounded_task');
  if (values['--finalize'] && values['--accept-candidate']) fail('invalid_options');
  let url;
  try { url = new URL(env.NEXUS_APP_URL); } catch { fail('invalid_app_origin'); }
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.username || url.password || url.search || url.hash || /[\\@]/.test(env.NEXUS_APP_URL)) fail('invalid_app_origin');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(env.RUNNER_ID ?? '') || !/^[\x21-\x7e]{16,16384}$/.test(env.AGENT_EVENTS_SECRET ?? '')) fail('runner_auth_unavailable');
  return { origin: url.origin, runnerId: env.RUNNER_ID, secret: env.AGENT_EVENTS_SECRET, taskId: values['--task-id'], repo: resolve(values['--repo']), base: values['--base'], ledger: resolve(values['--ledger']), inputPaths: lists['--input-path'], allowedPaths: lists['--allowed-path'], profilePath: values['--profile'], profileSha: values['--profile-sha'], qualificationPath: values['--qualification'], qualificationSha: values['--qualification-sha'], finalize: values['--finalize'] ?? false, acceptCandidate: values['--accept-candidate'] ?? false, acceptancePath: values['--acceptance'], acceptanceSha: values['--acceptance-sha'], pr: values['--pr'], gh: values['--gh'], publicationPython: values['--publication-python'], publicationPythonSha: values['--publication-python-sha'], publicationModule: values['--publication-module'] };
}

export function childEnvironment(profile, env = process.env) {
  if (!Array.isArray(profile.environmentKeys) || profile.environmentKeys.some(key => !OS_KEYS.has(key.toUpperCase()))) fail('unqualified_environment');
  const result = Object.fromEntries(Object.entries(env).filter(([key, value]) => profile.environmentKeys.map(item => item.toUpperCase()).includes(key.toUpperCase()) && typeof value === 'string'));
  result.PATH = `${dirname(profile.nodeExecutable)};${env.SystemRoot ?? env.SYSTEMROOT};${env.SystemRoot ?? env.SYSTEMROOT}/System32`;
  result.CODEX_HOME = profile.codexHome;
  result.TERM = 'dumb'; result.NO_COLOR = '1';
  return result;
}
export function shellEnvironmentConfiguration(profile, env = process.env) {
  const child = childEnvironment(profile, env);
  const values = Object.fromEntries(Object.entries(child).filter(([key]) => OS_KEYS.has(key.toUpperCase()) || key.toUpperCase() === 'PATH').map(([key, value]) => [key.toUpperCase(), value]));
  return `shell_environment_policy.set={${Object.keys(values).sort().map(key => `${JSON.stringify(key)}=${JSON.stringify(values[key])}`).join(',')}}`;
}
export function observedToolCatalog(request) {
  const namespaces = request?.tools;
  if (!Array.isArray(namespaces) || namespaces.length !== 1 || namespaces[0].type !== 'namespace' || namespaces[0].name !== 'functions' || !Array.isArray(namespaces[0].tools)) fail('unknown_enabled_tool');
  const tools = namespaces[0].tools;
  if (hash(tools.map(tool => `functions.${tool.name}`)) !== hash(FACADE_INVENTORY.topLevel) || tools.some(tool => tool.type !== (tool.name === 'exec' ? 'custom' : 'function'))) fail('unknown_enabled_tool');
  const description = tools[0].description;
  if (typeof description !== 'string') fail('unknown_enabled_tool');
  const headings = [...description.matchAll(/^### `([^`]+)`\s*$/gm)].map(match => match[1]);
  const declared = [...description.matchAll(/declare const tools: \{ (\w+)/g)].map(match => match[1]);
  if (hash(headings) !== hash(FACADE_INVENTORY.nested) || hash(declared) !== hash(FACADE_INVENTORY.nested)) fail('unknown_enabled_tool');
  return hash(namespaces);
}

/** A hash-pinned operator packet points to measured raw results, not PASS labels. */
export function verifyQualification(profile, packet, readEvidence = pinnedJson) {
  if (packet?.schema !== 'contained-codex-qualification/1' || packet.stageContract !== BUILD_STAGE_CONTRACT || hash(packet.excludedCapabilities) !== hash(EXCLUDED_CAPABILITIES) || packet.profileHash !== hash(profile) || packet.workerSha256 !== hash(readFileSync(SELF)) || packet.publicationHelperSha256 !== hash(readFileSync(PUBLICATION_HELPER)) || Object.entries(PIN).some(([key, value]) => packet[key] !== value) || hash(packet.toolInventory) !== hash(profile.toolInventory) || !Array.isArray(packet.checks)) fail('qualification_binding_mismatch');
  const required = new Map(['workspace_control', 'outside_read_denied', 'outside_write_denied', 'network_denied', 'auth_denied', 'git_denied', 'escape_denied', 'local_ipc_denied', 'breakaway_denied', 'app_graph_typescript', 'app_relevant_vitest'].map(name => [`Q1:${name}`, true]));
  required.set('Q1:descendant_cleanup', 0); required.set('Q1:broker_death_cleanup', 0);
  for (const name of ['controller_success', 'finite_inventory', 'config_injection_denied', 'facade_globals_absent', 'facade_control', 'facade_wait_control', 'mcp_resources_empty', 'mcp_templates_empty', 'mcp_unknown_refused', 'ui_clock_schema_only', 'collaboration_absent', 'host_job_membership', 'exec_command.escalation_refused']) required.set(`Q2:${name}`, true);
  for (const [tool, capabilities] of [['exec_command', ['read', 'write', 'network']], ['write_stdin', ['read', 'write', 'network']], ['apply_patch', ['read', 'write']]]) {
    required.set(`Q2:${tool}.control`, true);
    for (const capability of capabilities) required.set(`Q2:${tool}.${capability}_denied`, true);
  }
  const raw = pinnedJson(packet.inferenceRequest?.path, packet.inferenceRequest?.sha256);
  let request = raw;
  if (typeof packet.inferenceRequest?.pointer !== 'string' || !packet.inferenceRequest.pointer.startsWith('/')) fail('missing_raw_inference_inventory');
  for (const part of packet.inferenceRequest.pointer.slice(1).split('/')) request = request?.[part.replace(/~1/g, '/').replace(/~0/g, '~')];
  if (observedToolCatalog(request) !== profile.toolCatalogSha256) fail('tool_catalog_changed');
  const seen = new Set();
  for (const check of packet.checks) {
    const key = `${check.stage}:${check.name}`;
    if (!required.has(key) || seen.has(key) || check.expected !== required.get(key) || typeof check.pointer !== 'string' || !check.pointer.startsWith('/')) fail('unqualified_measurement');
    const evidence = readEvidence(check.evidence?.path, check.evidence?.sha256);
    let actual = evidence;
    for (const part of check.pointer.slice(1).split('/')) actual = actual?.[part.replace(/~1/g, '/').replace(/~0/g, '~')];
    if (actual !== required.get(key)) fail('qualification_measurement_failed');
    seen.add(key);
  }
  if (seen.size !== required.size) fail('qualification_incomplete');
}

export function validateProfile(profile, env = process.env) {
  if (profile?.schema !== 'contained-codex-profile/1' || profile.stageContract !== BUILD_STAGE_CONTRACT || !integer(profile.timeoutMs, 1, 1_800_000) || !integer(profile.outputBytes, 1024, MAX_FILE) || !Array.isArray(profile.argvTemplate) || hash(profile.toolInventory) !== hash(FACADE_INVENTORY) || !SHA.test(profile.toolCatalogSha256 ?? '') || !Array.isArray(profile.readonlyRoots)) fail('invalid_profile');
  if (!Array.isArray(profile.requiredChecks) || !integer(profile.requiredChecks.length, 2, 10) || new Set(profile.requiredChecks.map(check => check.name)).size !== profile.requiredChecks.length || profile.requiredChecks.some(check => !/^[a-z][a-z0-9_-]{0,63}$/.test(check.name) || !['typescript', 'vitest'].includes(check.kind) || typeof check.command !== 'string' || !check.command || check.command.length > 4096 || /[\x00\r\n]/.test(check.command) || check.commandSha256 !== hash(check.command) || !SHA.test(check.renderedCommandSha256 ?? '') || check.login !== false) || !['typescript', 'vitest'].every(kind => profile.requiredChecks.some(check => check.kind === kind))) fail('invalid_required_checks');
  for (const key of ['codexExecutable', 'nodeExecutable', 'gitExecutable', 'powershellExecutable']) if (!canonicalWindowsPath(profile[key]) || !profile[key].toLowerCase().endsWith('.exe')) fail('invalid_native_executable');
  if (!canonicalWindowsPath(profile.codexHome)) fail('invalid_controller_auth_path');
  const args = profile.argvTemplate;
  if (args.some(arg => typeof arg !== 'string' || arg.includes('\0')) || ['--ignore-user-config', '--ignore-rules', '--ephemeral', '--strict-config', '--json', '--skip-git-repo-check', '-C', 'exec'].some(flag => args.filter(arg => arg === flag).length !== 1) || args[args.indexOf('-C') + 1] !== '${snapshot}' || args.filter(arg => arg === '${snapshot}').length !== 1 || args.at(-1) !== '-') fail('unsafe_controller_arguments');
  const configs = [], disabled = [];
  for (let i = 0; i < args.length; i++) {
    if (['-c', '--config'].includes(args[i])) configs.push(args[++i]);
    else if (args[i] === '--disable') disabled.push(args[++i]);
    else if (!['exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--strict-config', '--json', '--skip-git-repo-check', '-C', '${snapshot}', '-'].includes(args[i])) fail('unsafe_controller_arguments');
  }
  if (profile.readonlyRoots.some(root => { const normalized = root.replaceAll('\\', '/').replace(/\/$/, '').toLowerCase(), auth = profile.codexHome.replaceAll('\\', '/').toLowerCase(); return !canonicalWindowsPath(root) || normalized.length < 8 || auth.startsWith(`${normalized}/`) || auth === normalized; })) fail('unsafe_readonly_root');
  const filesystem = `permissions.contained_codex_build.filesystem={":root"="deny",":minimal"="read",":workspace_roots"={"."="write"}${profile.readonlyRoots.map(root => `,${JSON.stringify(root.replaceAll('\\', '/'))}="read"`).join('')}}`;
  const requiredConfigs = ['windows.sandbox="mxc"', 'forced_login_method="chatgpt"', 'default_permissions="contained_codex_build"', filesystem, 'permissions.contained_codex_build.network.enabled=false', 'approval_policy="never"', 'shell_environment_policy.inherit="none"', shellEnvironmentConfiguration(profile, env), 'web_search="disabled"', 'agents.enabled=false', 'agents.max_concurrent_threads_per_session=1', 'features.code_mode_host=true'];
  if (disabled.length !== DISABLED.length || DISABLED.some(name => !disabled.includes(name)) || disabled.some(name => !DISABLED.includes(name)) || new Set(configs.map(config => config.split('=')[0])).size !== configs.length || configs.some(config => !requiredConfigs.includes(config)) || requiredConfigs.some(config => !configs.includes(config))) fail('unsafe_controller_policy');
  // Exact policy selection/support is measured by Q2 for this entire profile.
  childEnvironment(profile, {});
  return profile;
}
function canonicalWindowsPath(path) {
  return typeof path === 'string' && /^[a-z]:[\\/]/i.test(path) && !/[\x00-\x1f*?]/.test(path) && !path.slice(2).includes(':') && !path.split(/[\\/]/).slice(1).some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part)) && win32.resolve(path).replaceAll('\\', '/').toLowerCase() === path.replaceAll('\\', '/').toLowerCase();
}
function overlaps(a, b) { const one = resolve(a).toLowerCase(), two = resolve(b).toLowerCase(); return one === two || one.startsWith(`${two}\\`) || two.startsWith(`${one}\\`); }
export function validateRuntimeRoots(config, profile) {
  assertNormal(profile.codexHome, true); assertNormal(config.repo, true); assertNormal(dirname(config.ledger), true);
  const common = git(profile, config.repo, ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim(); assertNormal(common, true);
  for (const root of profile.readonlyRoots) {
    assertNormal(root, true);
    if ([profile.codexHome, config.repo, common, config.ledger].some(forbidden => overlaps(root, forbidden))) fail('runtime_exposes_control_plane');
  }
}

export function claimIdentity(task, config) {
  const d = task?.approvedDelivery, saved = task?.metadata?.delivery, assignment = saved?.executionAssignment;
  const intent = d?.approval?.intent;
  if (task?.id !== config.taskId || !UUID.test(task.founder_id ?? '') || task.status !== 'running' || task.claimed_by !== config.runnerId || !Number.isFinite(Date.parse(task.claimed_at)) || d?.repository !== REPOSITORY || d.scope !== 'branch_preview_only' || !SHA.test(d.specVersion ?? '') || !integer(d.revision, 1, 1_000_000) || saved?.kind !== 'software_delivery' || saved.lane !== 'software' || saved.build || saved.revision !== d.revision || saved.specVersion !== d.specVersion || saved.scope !== d.scope || hash(saved.spec) !== hash(d.spec) || hash(saved.approval) !== hash(d.approval) || !UUID.test(d.approval?.id ?? '') || d.approval.founderId !== task.founder_id || d.approval.revision !== d.revision || d.approval.specVersion !== d.specVersion || d.approval.scope !== d.scope || !SHA.test(d.approval.signature ?? '') || !SHA.test(intent?.hash ?? '') || !integer(intent.version, 1, 1_000_000) || !Number.isFinite(Date.parse(intent.acceptedAt)) || assignment?.role !== 'build_spm' || assignment.runnerId !== config.runnerId || assignment.specRevision !== d.revision || assignment.specFingerprint !== d.specVersion || assignment.scope !== d.scope || !Number.isFinite(Date.parse(assignment.acceptedAt))) fail('invalid_approved_delivery_claim');
  return { taskId: task.id, founderId: task.founder_id, runnerId: task.claimed_by, claimedAt: task.claimed_at, assignmentAcceptedAt: assignment.acceptedAt, authorityHash: hash(d), repository: REPOSITORY, specVersion: d.specVersion, specRevision: d.revision, approvalId: d.approval.id, intentHash: intent.hash };
}
export function assertSameClaim(task, config, original) {
  if (hash(claimIdentity(task, config)) !== hash(original)) fail('claim_or_authority_changed');
}
async function post(config, path, body) {
  if (hardStopped()) fail('worker_hard_stopped');
  const response = await fetch(`${config.origin}${path}`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { authorization: `Bearer ${config.secret}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok || !response.body) fail('runner_transport_refused');
  const reader = response.body.getReader(), chunks = []; let size = 0;
  for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > MAX_FILE) { await reader.cancel(); fail('runner_transport_size_limit'); } chunks.push(next.value); }
  const bytes = Buffer.concat(chunks);
  return JSON.parse(bytes.toString('utf8'));
}
const claimBody = (config, resumeOnly) => ({ runnerId: config.runnerId, taskId: config.taskId, resumeOnly, platform: 'win32', containment: 'job-object' });
async function revalidate(config, identity) { const result = await post(config, '/api/agents/runner/claim', claimBody(config, true)); assertSameClaim(result.task, config, identity); return result.task; }

function gitEnvironment(extra = {}) {
  // No global/system/repository config, hooks, transport, pager or credential helper.
  return { SystemRoot: process.env.SystemRoot ?? process.env.SYSTEMROOT, PATH: process.env.SystemRoot ?? process.env.SYSTEMROOT ?? '', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_NO_REPLACE_OBJECTS: '1', ...extra };
}
function git(profile, repo, args, options = {}) {
  return execFileSync(profile.gitExecutable, ['-c', 'core.hooksPath=', '-c', 'core.fsmonitor=false', '-c', 'credential.helper=', '-c', 'core.attributesFile=', '-C', repo, ...args], { env: gitEnvironment(options.env), shell: false, windowsHide: true, timeout: 30_000, maxBuffer: MAX_TOTAL, input: options.input, encoding: options.encoding });
}
function utf8(bytes) { const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); if (text.includes('\0')) fail('binary_snapshot_input'); return text; }

export function gitInventory(bytes) {
  const aliases = new Set();
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes).split('\0').filter(Boolean).map(line => {
    const match = /^(100644|100755|120000|160000) (blob|commit) ([a-f0-9]{40})\t(.+)$/.exec(line);
    if (!match) fail('unsupported_git_entry');
    if ((match[1] === '160000') !== (match[2] === 'commit')) fail('unsupported_git_entry');
    const path = match[4];
    // Inventory validates every name; sensitive inputs may exist tracked but are never selected.
    if (/[\\:\x00-\x1f\x7f]/.test(path) || path.startsWith('/') || path.split('/').some(part => !part || part === '..' || /[. ]$/.test(part))) fail('unsafe_git_inventory');
    const alias = path.normalize('NFC').toLowerCase();
    if (aliases.has(alias)) fail('case_alias_snapshot_path');
    aliases.add(alias);
    return { mode: match[1], type: match[2], blob: match[3], path };
  });
}
export function createSnapshot(config, profile, snapshot) {
  assertNormal(config.repo, true);
  const remote = git(profile, config.repo, ['config', '--local', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim();
  if (!/^(?:https:\/\/github\.com\/|git@github\.com:)CleanExpo\/Unite-Group(?:\.git)?$/.test(remote)) fail('wrong_repository_origin');
  if (git(profile, config.repo, ['rev-parse', 'refs/remotes/origin/main'], { encoding: 'utf8' }).trim() !== config.base) fail('canonical_base_changed');
  const baseTree = git(profile, config.repo, ['rev-parse', `${config.base}^{tree}`], { encoding: 'utf8' }).trim();
  const inventory = gitInventory(git(profile, config.repo, ['ls-tree', '-rz', '--full-tree', config.base]));
  const inputs = inventory.filter(entry => selected(entry.path, config.inputPaths));
  if (!inputs.length || config.inputPaths.some(path => !inputs.some(entry => selected(entry.path, [path])))) fail('missing_snapshot_input');
  for (const entry of inputs) { safePath(entry.path); if (!['100644', '100755'].includes(entry.mode) || entry.type !== 'blob') fail('unsupported_selected_git_entry'); }
  mkdirSync(snapshot, { recursive: false }); assertNormal(snapshot, true);
  let total = 0;
  const manifest = [];
  for (const entry of inputs) {
    const size = Number(git(profile, config.repo, ['cat-file', '-s', entry.blob], { encoding: 'utf8' }).trim());
    if (!integer(size, 0, MAX_FILE) || (total += size) > MAX_TOTAL) fail('snapshot_size_limit');
    const bytes = git(profile, config.repo, ['cat-file', 'blob', entry.blob]);
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(utf8(bytes))) fail('credential_material_in_snapshot');
    mkdirSync(dirname(join(snapshot, entry.path)), { recursive: true });
    writeNew(join(snapshot, entry.path), bytes);
    manifest.push({ ...entry, sha256: hash(bytes), bytes: bytes.length });
  }
  return { baseTree, manifest };
}

/** Detect concurrent changes to the real Git control plane during isolation. */
export function gitControlStamp(config, profile) {
  const common = git(profile, config.repo, ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim();
  const index = git(profile, config.repo, ['rev-parse', '--path-format=absolute', '--git-path', 'index'], { encoding: 'utf8' }).trim();
  const inventory = [];
  function visit(file, digestContents = false) {
    assertNormal(file, lstatSync(file).isDirectory());
    const stat = lstatSync(file);
    if (stat.isDirectory()) { for (const name of readdirSync(file).sort()) visit(join(file, name), digestContents); }
    else inventory.push({ path: file, bytes: stat.size, mtimeMs: stat.mtimeMs, mode: stat.mode, ino: stat.ino, ...(digestContents ? { sha256: hash(readSafe(file, MAX_TOTAL)) } : {}) });
  }
  for (const [file, contents] of [[index, true], [join(common, 'config'), true], [join(common, 'hooks'), true], [join(common, 'objects'), false]]) visit(file, contents);
  return hash(inventory);
}

export function snapshotFiles(snapshot) {
  assertNormal(snapshot, true);
  const result = [];
  function walk(directory) {
    for (const name of readdirSync(directory)) {
      const file = join(directory, name), path = relative(snapshot, file).replaceAll('\\', '/');
      safePath(path);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) fail('output_link_refused');
      if (stat.isDirectory()) { assertNormal(file, true); walk(file); }
      else { const bytes = readSafe(file); utf8(bytes); result.push({ path, sha256: hash(bytes), bytes: bytes.length }); }
    }
  }
  walk(snapshot);
  if (result.reduce((sum, file) => sum + file.bytes, 0) > MAX_TOTAL || new Set(result.map(file => file.path.toLowerCase())).size !== result.length) fail('output_inventory_limit');
  return result.sort((a, b) => a.path.localeCompare(b.path));
}
export function deriveChanges(before, after, allowed) {
  const old = new Map(before.map(file => [file.path, file]));
  if (before.some(file => !after.some(item => item.path === file.path))) fail('output_deletion_refused');
  const changes = after.filter(file => old.get(file.path)?.sha256 !== file.sha256);
  if (!changes.length || changes.some(file => !selected(file.path, allowed))) fail('empty_or_out_of_scope_output');
  return changes;
}
export function outputTree(config, profile, snapshot, changes) {
  const index = join(config.ledger, 'output.index'), objects = join(config.ledger, 'objects');
  mkdirSync(objects, { recursive: false });
  const common = git(profile, config.repo, ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim();
  assertNormal(common, true);
  const env = { GIT_INDEX_FILE: index, GIT_OBJECT_DIRECTORY: objects, GIT_ALTERNATE_OBJECT_DIRECTORIES: join(common, 'objects') };
  git(profile, config.repo, ['read-tree', config.base], { env });
  const entries = [];
  for (const change of changes) {
    const blob = git(profile, config.repo, ['hash-object', '-w', '--stdin'], { env, input: readSafe(join(snapshot, change.path)), encoding: 'utf8' }).trim();
    const mode = change.mode ?? '100644';
    entries.push(`${mode} ${blob}\t${change.path}\0`);
  }
  git(profile, config.repo, ['update-index', '-z', '--index-info'], { env, input: entries.join('') });
  return git(profile, config.repo, ['write-tree'], { env, encoding: 'utf8' }).trim();
}

export function runBroker(profile, snapshot, prompt, environment, spawnProcess = spawn) {
  return new Promise((resolveRun, reject) => {
    if (hardStopped()) { reject(new BuildWorkerError('worker_hard_stopped')); return; }
    const args = profile.argvTemplate.map(arg => arg === '${snapshot}' ? snapshot : arg);
    const child = spawnProcess(profile.powershellExecutable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', BROKER], { cwd: snapshot, env: environment, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let total = 0, buffer = '', overflow = false, invalid = false, completed = false;
    const decoder = new StringDecoder('utf8');
    const stdoutDigest = createHash('sha256');
    const commands = [], fileChanges = [];
    const timer = setTimeout(() => { overflow = true; child.kill(); }, profile.timeoutMs + 15_000);
    const stopWatch = setInterval(() => { if (hardStopped()) { overflow = true; child.kill(); } }, 250);
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify({ executable: profile.codexExecutable, arguments: args, input: prompt, cwd: snapshot, timeoutMs: profile.timeoutMs, parentPid: process.pid }));
    const observe = chunk => {
      total += chunk.length;
      if (total > profile.outputBytes) { overflow = true; child.kill(); return; }
      stdoutDigest.update(chunk); buffer += decoder.write(chunk);
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (completed || !['thread.started', 'turn.started', 'item.started', 'item.updated', 'item.completed', 'turn.completed', 'error', 'turn.failed'].includes(event.type)) invalid = true;
          if (event.type === 'turn.completed') completed = true;
          if (event.type === 'error' || event.type === 'turn.failed') invalid = true;
          if (event.item && !['agent_message', 'reasoning', 'command_execution', 'file_change', 'todo_list'].includes(event.item.type)) invalid = true;
          if (event.type === 'item.completed' && event.item?.type === 'command_execution') {
            if (!integer(event.item.exit_code, -2147483648, 2147483647) || typeof event.item.command !== 'string') invalid = true;
            else commands.push({ commandSha256: hash(event.item.command), exitCode: event.item.exit_code });
          }
          if (event.type === 'item.completed' && event.item?.type === 'file_change') {
            if (!['completed', 'failed'].includes(event.item.status) || !Array.isArray(event.item.changes)) invalid = true;
            else fileChanges.push({ status: event.item.status, changesSha256: hash(event.item.changes) });
          }
        } catch { invalid = true; }
      }
    };
    child.stdout.on('data', observe);
    child.stderr.on('data', chunk => { total += chunk.length; if (total > profile.outputBytes) { overflow = true; child.kill(); } });
    child.on('error', () => { clearTimeout(timer); clearInterval(stopWatch); reject(new BuildWorkerError('broker_launch_failed')); });
    child.on('close', code => { clearTimeout(timer); clearInterval(stopWatch); buffer += decoder.end(); if (code !== 0 || overflow || invalid || buffer.trim() || !completed) reject(new BuildWorkerError('model_or_cleanup_unconfirmed')); else resolveRun({ exit: 0, controllerCompleted: true, testVerification: 'requires_operator_verification', activeDescendants: 0, brokerSha256: PIN.brokerSha256, stdoutSha256: stdoutDigest.digest('hex'), outputBytes: total, commands, fileChanges, failedCommandCount: commands.filter(command => command.exitCode !== 0).length, failedFileChangeCount: fileChanges.filter(change => change.status === 'failed').length }); });
  });
}
export function assertRequiredChecks(profile, execution) {
  if (execution.controllerCompleted !== true || !Array.isArray(execution.commands) || profile.requiredChecks.some(check => { const actual = execution.commands.filter(command => command.commandSha256 === check.renderedCommandSha256); return !actual.length || actual.at(-1).exitCode !== 0; })) fail('required_isolated_check_unconfirmed');
}

/** Native source generation has no automatic release or unattended recovery. */
export async function runBuild(config, { platform = process.platform } = {}) {
  if (platform !== 'win32') fail('native_windows_required');
  if (hardStopped()) fail('worker_hard_stopped');
  if (config.finalize) return finalizeBuild(config);
  if (config.acceptCandidate) return acceptCandidate(config);
  const profile = validateProfile(pinnedJson(config.profilePath, config.profileSha));
  for (const [key, file] of [['codexSha256', profile.codexExecutable], ['nodeSha256', profile.nodeExecutable], ['brokerSha256', BROKER], ['codeModeHostSha256', join(dirname(profile.codexExecutable), 'codex-code-mode-host.exe')], ['commandRunnerSha256', join(dirname(profile.codexExecutable), 'codex-command-runner.exe')]]) if (await nativeExecutableHash(file) !== PIN[key]) fail('native_identity_changed');
  validateRuntimeRoots(config, profile);
  verifyQualification(profile, pinnedJson(config.qualificationPath, config.qualificationSha));
  assertNormal(dirname(config.ledger), true);
  const ledgerRelative = relative(config.repo, config.ledger);
  if (!ledgerRelative.startsWith('..') && !isAbsolute(ledgerRelative)) fail('ledger_inside_repository');
  mkdirSync(config.ledger, { recursive: false }); assertNormal(config.ledger, true);
  const snapshot = join(config.ledger, 'snapshot');
  const gitStamp = gitControlStamp(config, profile);
  const baseline = createSnapshot(config, profile, snapshot);
  snapshotFiles(snapshot); // Refuse precreated aliases/hardlinks before any claim.
  if (gitControlStamp(config, profile) !== gitStamp) fail('canonical_git_changed');
  // This is the first application call. All native/qualification/snapshot checks precede it.
  const response = await post(config, '/api/agents/runner/claim', claimBody(config, false));
  const identity = claimIdentity(response.task, config);
  const runId = randomUUID(), branch = `codex/contained-${config.taskId}-${runId}`;
  const custody = { schema: 'contained-codex-run/1', stageContract: BUILD_STAGE_CONTRACT, excludedCapabilities: EXCLUDED_CAPABILITIES, runId, branch, identity, base: config.base, baseTree: baseline.baseTree, gitControlStamp: gitStamp, profileSha: config.profileSha, profileHash: hash(profile), qualificationSha: config.qualificationSha, inputPaths: config.inputPaths, allowedPaths: config.allowedPaths, inputManifest: baseline.manifest, createdAt: new Date().toISOString() };
  writeNew(join(config.ledger, 'claim.json'), custody);
  await revalidate(config, identity);
  const prompt = JSON.stringify({ instruction: 'Implement only this exact approved delivery in this plain snapshot. Do not publish, claim completion, invoke MCP resources, ask UI questions or edit policy/credentials. Run only declared measured TypeScript/Vitest checks using these exact commands with login:false. Package installation, package-manager and full Next build are outside this stage. A required check failure blocks sealing. Final prose is not evidence; the host derives output and records actual rendered command exits.', stageContract: BUILD_STAGE_CONTRACT, excludedCapabilities: EXCLUDED_CAPABILITIES, requiredChecks: profile.requiredChecks.map(({ name, kind, command, login }) => ({ name, kind, command, login })), approvedDelivery: response.task.approvedDelivery, allowedPaths: config.allowedPaths });
  const execution = await runBroker(profile, snapshot, prompt, childEnvironment(profile));
  writeNew(join(config.ledger, 'execution.json'), execution);
  assertRequiredChecks(profile, execution);
  if (gitControlStamp(config, profile) !== gitStamp) fail('canonical_git_changed');
  await revalidate(config, identity);
  const manifest = snapshotFiles(snapshot), changes = deriveChanges(baseline.manifest, manifest, config.allowedPaths).map(change => ({ ...change, mode: baseline.manifest.find(file => file.path === change.path)?.mode ?? '100644' }));
  const tree = outputTree(config, profile, snapshot, changes);
  if (gitControlStamp(config, profile) !== gitStamp) fail('canonical_git_changed');
  const seal = { ...custody, state: 'awaiting_operator_verification', execution, manifest, changes, outputTree: tree, sealedAt: new Date().toISOString() };
  writeNew(join(config.ledger, 'seal.json'), seal);
  return { state: seal.state, taskId: config.taskId, runId, branch, outputTree: tree, sealSha256: hash(readSafe(join(config.ledger, 'seal.json'))) };
}

export function validateAcceptance(acceptance, seal, sealSha, now = Date.now()) {
  if (!['contained-codex-operator-acceptance/1', 'contained-codex-operator-trust/1'].includes(acceptance?.schema) || acceptance.sealSha256 !== sealSha || acceptance.runId !== seal.runId || acceptance.outputTree !== seal.outputTree || acceptance.branch !== seal.branch || acceptance.authorityHash !== seal.identity.authorityHash || acceptance.claimedAt !== seal.identity.claimedAt || acceptance.assignmentAcceptedAt !== seal.identity.assignmentAcceptedAt || acceptance.trustExecutableCode !== true || acceptance.independentAudit?.verdict !== 'PASS' || !SHA.test(acceptance.independentAudit?.sha256 ?? '') || !Number.isFinite(Date.parse(acceptance.acceptedAt)) || Date.parse(acceptance.acceptedAt) < Date.parse(seal.sealedAt) || Date.parse(acceptance.acceptedAt) > now) fail('operator_acceptance_refused');
}
export function validateNewPr(pr, seal) {
  if (!integer(pr?.number, 1, 1_000_000) || pr.url !== `https://github.com/${REPOSITORY}/pull/${pr.number}` || pr.isDraft !== true || pr.state !== 'OPEN' || pr.baseRefName !== 'main' || pr.baseRefOid !== seal.base || pr.headRefName !== seal.branch || !COMMIT.test(pr.headRefOid ?? '') || pr.headRepositoryOwner?.login !== 'CleanExpo' || pr.headRepository?.name !== 'Unite-Group' || !Number.isFinite(Date.parse(pr.createdAt)) || Date.parse(pr.createdAt) <= Date.parse(seal.identity.claimedAt)) fail('new_draft_pr_binding_refused');
}
export function validateNativeHandoff(acceptance, seal, headSha, receipt, audit, verification, publication) {
  if (receipt.schema !== 1 || receipt.head_sha !== headSha || receipt.base_sha !== seal.base || receipt.primary_agent !== 'codex' || !SHA.test(receipt.signature ?? '') || receipt.review_report_sha256 !== acceptance.independentAudit.sha256 || !Array.isArray(receipt.tests) || !receipt.tests.length || receipt.tests.some(result => result.exit_code !== 0) || receipt.ci_mirror?.verdict !== 'PASS' || !SHA.test(receipt.ci_mirror?.report_sha256 ?? '') || audit.head_sha !== headSha || audit.base_sha !== seal.base || audit.verdict !== 'PASS' || !Array.isArray(audit.blocking_findings) || audit.blocking_findings.length || audit.implementation_agent !== 'codex' || typeof audit.reviewer_agent !== 'string' || /^codex|openai/i.test(audit.reviewer_agent)) fail('native_receipt_bindings_refused');
  if (verification.mode !== 'verify' || verification.exitCode !== 0 || verification.headSha !== headSha || verification.receiptSha256 !== acceptance.nativeReceipt.sha256 || !SHA.test(verification.verifierSha256 ?? '') || !SHA.test(verification.stdoutSha256 ?? '') || !SHA.test(verification.stderrSha256 ?? '') || acceptance.nativeVerification.headSha !== headSha || acceptance.nativeVerification.receiptSha256 !== acceptance.nativeReceipt.sha256) fail('independent_native_verification_refused');
  validatePublicationProof(publication, headSha);
}
export function validateReviewChronology(acceptance, seal, pr, receipt, originalReview, postReview, publication, trustedAt, execution = null) {
  const issued = Date.parse(receipt.issued_at), reviewed = Date.parse(originalReview.reviewed_at), postReviewed = Date.parse(postReview.reviewed_at);
  const reportBindsCi = Object.hasOwn(postReview, 'ci_snapshot_hash');
  const pinnedCiHash = reportBindsCi ? postReview.ci_snapshot_hash : execution?.ciSnapshotHash;
  if (pinnedCiHash !== publication.snapshotHash) fail('post_ci_execution_binding_refused');
  if (!reportBindsCi && (execution?.schema !== 'contained-codex-post-ci-execution/1' || execution.headSha !== pr.headRefOid || execution.baseSha !== seal.base || execution.reportSha256 !== acceptance.postCiReview?.sha256 || !Number.isFinite(Date.parse(execution.startedAt)) || !Number.isFinite(Date.parse(execution.completedAt)) || Date.parse(execution.startedAt) < Math.max(Date.parse(pr.createdAt), latestRequiredCompletion(publication)) || Date.parse(execution.completedAt) < Math.max(Date.parse(execution.startedAt), postReviewed) || Date.parse(execution.completedAt) > Date.now())) fail('post_ci_execution_binding_refused');
  if (!Number.isFinite(issued) || !Number.isFinite(reviewed) || reviewed > issued || issued < Date.parse(trustedAt) || issued > Date.parse(pr.createdAt) || acceptance.postCiReview?.sha256 === acceptance.independentAudit.sha256 || acceptance.postCiReview?.ciSnapshotHash !== publication.snapshotHash || postReview.head_sha !== pr.headRefOid || postReview.base_sha !== seal.base || postReview.verdict !== 'PASS' || postReview.implementation_agent !== 'codex' || typeof postReview.reviewer_agent !== 'string' || /^codex|openai/i.test(postReview.reviewer_agent) || !Array.isArray(postReview.blocking_findings) || postReview.blocking_findings.length || !Number.isFinite(postReviewed) || postReviewed < Math.max(Date.parse(pr.createdAt), latestRequiredCompletion(publication)) || postReviewed > Date.now()) fail('fresh_post_ci_review_refused');
}
export async function confirmFinalPublication(pr, publication, seal, readPr, inspect) {
  const before = readPr(); validateNewPr(before, seal);
  if (hash(before) !== hash(pr)) fail('live_pr_drifted');
  const finalPublication = await inspect();
  assertPublicationUnchanged(publication, finalPublication);
  // The bridge can take up to 60 seconds: the last PR query must follow it.
  const after = readPr(); validateNewPr(after, seal);
  if (hash(after) !== hash(pr)) fail('live_pr_drifted');
  return finalPublication;
}
function loadCandidate(config) {
  assertNormal(config.ledger, true);
  const sealPath = join(config.ledger, 'seal.json'), sealBytes = readSafe(sealPath), seal = JSON.parse(sealBytes.toString('utf8'));
  const claim = json(join(config.ledger, 'claim.json'));
  if (seal.schema !== 'contained-codex-run/1' || seal.stageContract !== BUILD_STAGE_CONTRACT || hash(seal.excludedCapabilities) !== hash(EXCLUDED_CAPABILITIES) || seal.state !== 'awaiting_operator_verification' || seal.identity.taskId !== config.taskId || seal.identity.runnerId !== config.runnerId || seal.base !== config.base || hash(claim.identity) !== hash(seal.identity) || claim.runId !== seal.runId || claim.branch !== seal.branch || !seal.branch.startsWith(`codex/contained-${config.taskId}-`) || hash(seal.inputPaths) !== hash(config.inputPaths) || hash(seal.allowedPaths) !== hash(config.allowedPaths)) fail('ledger_binding_refused');
  const profile = validateProfile(pinnedJson(config.profilePath, config.profileSha));
  if (seal.profileSha !== config.profileSha || seal.qualificationSha !== config.qualificationSha) fail('qualification_changed');
  verifyQualification(profile, pinnedJson(config.qualificationPath, config.qualificationSha));
  if (hash(json(join(config.ledger, 'execution.json'))) !== hash(seal.execution) || seal.execution.exit !== 0 || seal.execution.activeDescendants !== 0 || hash(snapshotFiles(join(config.ledger, 'snapshot'))) !== hash(seal.manifest)) fail('sealed_output_changed');
  assertRequiredChecks(profile, seal.execution);
  return { seal, sealBytes, profile };
}
export async function acceptCandidate(config) {
  const { seal, sealBytes } = loadCandidate(config);
  const trust = pinnedJson(config.acceptancePath, config.acceptanceSha);
  validateAcceptance(trust, seal, hash(sealBytes));
  if (trust.schema !== 'contained-codex-operator-trust/1') fail('explicit_operator_trust_required');
  const audit = pinnedJson(trust.independentAudit.path, trust.independentAudit.sha256);
  if (audit.output_tree !== seal.outputTree || audit.seal_sha256 !== hash(sealBytes) || audit.verdict !== 'PASS' || audit.implementation_agent !== 'codex' || typeof audit.reviewer_agent !== 'string' || /^codex|openai/i.test(audit.reviewer_agent) || !Array.isArray(audit.blocking_findings) || audit.blocking_findings.length) fail('candidate_audit_binding_refused');
  await revalidate(config, seal.identity);
  const receipt = { schema: 'contained-codex-recorded-trust/1', sealSha256: hash(sealBytes), requestSha256: config.acceptanceSha, identity: seal.identity, trust, recordedAt: new Date().toISOString() };
  const file = join(config.ledger, 'operator-acceptance.json'); writeNew(file, receipt);
  return { state: 'operator_accepted_for_explicit_trusted_pipeline', runId: seal.runId, operatorAcceptanceSha256: hash(readSafe(file)), outputTree: seal.outputTree, branch: seal.branch };
}
export async function finalizeBuild(config) {
  // Explicit trusted operator stage; never entered by model output or a restart.
  const { seal, sealBytes, profile } = loadCandidate(config);
  const recordedBytes = readSafe(join(config.ledger, 'operator-acceptance.json')), recorded = JSON.parse(recordedBytes.toString('utf8'));
  const acceptance = pinnedJson(config.acceptancePath, config.acceptanceSha);
  validateAcceptance(acceptance, seal, hash(sealBytes));
  if (acceptance.schema !== 'contained-codex-operator-acceptance/1' || acceptance.operatorAcceptanceSha256 !== hash(recordedBytes) || recorded.schema !== 'contained-codex-recorded-trust/1' || recorded.sealSha256 !== hash(sealBytes) || hash(recorded.identity) !== hash(seal.identity) || acceptance.acceptedAt !== recorded.trust.acceptedAt || !Number.isFinite(Date.parse(recorded.recordedAt))) fail('prior_operator_trust_required');
  validateAcceptance(recorded.trust, seal, hash(sealBytes));
  const audit = pinnedJson(acceptance.independentAudit.path, acceptance.independentAudit.sha256);
  await revalidate(config, seal.identity);
  if (!canonicalWindowsPath(config.gh) || !config.gh.toLowerCase().endsWith('.exe') || !canonicalWindowsPath(config.publicationPython) || !config.publicationPython.toLowerCase().endsWith('.exe') || !canonicalWindowsPath(config.publicationModule) || !/^https:\/\/github\.com\/CleanExpo\/Unite-Group\/pull\/[1-9][0-9]*$/.test(config.pr ?? '')) fail('explicit_operator_pr_required');
  assertNormal(config.gh);
  assertNormal(config.publicationModule);
  if (Object.keys(process.env).some(name => name === 'GH_HOST' || name === 'GH_REPO' || (name.startsWith('GIT_') && !['GIT_EDITOR', 'GIT_PAGER', 'GIT_ASKPASS'].includes(name)))) fail('operator_target_redirected');
  // Fixed read-only canonical query; no model strings can select a command/repository.
  const readPr = () => JSON.parse(execFileSync(config.gh, ['pr', 'view', config.pr, '--repo', REPOSITORY, '--json', 'number,url,state,isDraft,baseRefName,baseRefOid,headRefName,headRefOid,headRepository,headRepositoryOwner,createdAt'], { shell: false, windowsHide: true, timeout: 20_000, maxBuffer: MAX_FILE, encoding: 'utf8' }));
  const pr = readPr();
  validateNewPr(pr, seal);
  if (Date.parse(pr.createdAt) < Date.parse(recorded.recordedAt)) fail('pr_precedes_operator_trust');
  const headTree = git(profile, config.repo, ['rev-parse', `${pr.headRefOid}^{tree}`], { encoding: 'utf8' }).trim();
  if (headTree !== seal.outputTree || acceptance.headSha !== pr.headRefOid || acceptance.baseSha !== seal.base || !git(profile, config.repo, ['rev-list', '--parents', '-n', '1', pr.headRefOid], { encoding: 'utf8' }).trim().split(' ').slice(1).includes(seal.base)) fail('qualified_full_tree_or_base_changed');
  // Actual native receipt bytes are independently pinned by the deliberate operator.
  if (acceptance.nativeReceipt?.headSha !== pr.headRefOid) fail('native_receipt_custody_refused');
  const receipt = pinnedJson(acceptance.nativeReceipt.path, acceptance.nativeReceipt.sha256);
  const verification = pinnedJson(acceptance.nativeVerification?.path, acceptance.nativeVerification?.sha256);
  const command = pinnedJson(verification.commandArtifact?.path, verification.commandArtifact?.sha256);
  if (command.mode !== 'verify' || command.headSha !== pr.headRefOid || command.receiptSha256 !== acceptance.nativeReceipt.sha256 || !Array.isArray(command.argv) || !command.argv.includes('verify') || hash(readSafe(verification.stdoutPath)) !== verification.stdoutSha256 || hash(readSafe(verification.stderrPath)) !== verification.stderrSha256) fail('native_verifier_execution_custody_refused');
  const publication = await inspectPublication(config, pr.headRefOid, receipt, { measureExecutable: nativeExecutableHash });
  validateNativeHandoff(acceptance, seal, pr.headRefOid, receipt, audit, verification, publication);
  const postReview = pinnedJson(acceptance.postCiReview?.path, acceptance.postCiReview?.sha256);
  const postExecution = Object.hasOwn(postReview, 'ci_snapshot_hash') ? null : pinnedJson(acceptance.postCiReview?.execution?.path, acceptance.postCiReview?.execution?.sha256);
  validateReviewChronology(acceptance, seal, pr, receipt, audit, postReview, publication, recorded.recordedAt, postExecution);
  await revalidate(config, seal.identity);
  const finalPublication = await confirmFinalPublication(pr, publication, seal, readPr, () => inspectPublication(config, pr.headRefOid, receipt, { measureExecutable: nativeExecutableHash }));
  validateReviewChronology(acceptance, seal, pr, receipt, audit, postReview, finalPublication, recorded.recordedAt, postExecution);
  writeNew(join(config.ledger, 'publication-first.json'), publication);
  writeNew(join(config.ledger, 'publication-final.json'), finalPublication);
  const prepared = { schema: 'contained-codex-finalization/1', runId: seal.runId, headSha: pr.headRefOid, outputTree: headTree, pr: pr.url, acceptanceSha: config.acceptanceSha, state: 'release_pending', at: new Date().toISOString() };
  writeNew(join(config.ledger, 'release-request.json'), prepared);
  // Exactly once: an ambiguous result requires operator readback, never auto-replay.
  const release = await post(config, '/api/agents/runner/release', { runnerId: config.runnerId, taskId: config.taskId, outcome: 'done', prRef: pr.url });
  writeNew(join(config.ledger, 'release-response.json'), release);
  if (release.task?.id !== config.taskId || release.task.status !== 'awaiting_approval' || release.task.metadata?.delivery?.build?.prRef !== pr.url || release.task.metadata?.delivery?.build?.runnerId !== config.runnerId) fail('release_handoff_unconfirmed');
  return { state: 'awaiting_review', taskId: config.taskId, pr: pr.url };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await runBuild(parseOptions(process.argv.slice(2))))); }
  catch (error) { console.error(JSON.stringify({ error: error instanceof BuildWorkerError ? error.code : 'contained_worker_failed' })); process.exitCode = 1; }
}

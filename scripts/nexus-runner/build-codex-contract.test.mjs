import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { hash, nativeExecutableHash, BUILD_STAGE_CONTRACT, FACADE_INVENTORY, observedToolCatalog, shellEnvironmentConfiguration, assertRequiredChecks, parseOptions, safePath, childEnvironment, validateProfile, verifyQualification, claimIdentity, assertSameClaim, gitInventory, createSnapshot, snapshotFiles, deriveChanges, outputTree, gitControlStamp, runBroker, validateAcceptance, validateNewPr, validateNativeHandoff, validateReviewChronology, confirmFinalPublication, acceptCandidate, finalizeBuild, runBuild } from './build-codex.mjs';
import { CANONICAL_GATE_SHA, validatePublicationProof, assertPublicationUnchanged } from './build-codex-publication.mjs';

const TASK = '1a74480d-db8e-40dd-ad8d-f274c6845c7b';
const FOUNDER = 'c3f32c79-0d4a-4607-a906-ba8ca08e83b6';
const NOW = '2026-10-16T02:00:00.000Z';
const SHA = 'a'.repeat(64), BASE = 'b'.repeat(40);
const env = { NEXUS_APP_URL: 'https://example.test', RUNNER_ID: 'contained-fixture', AGENT_EVENTS_SECRET: 'synthetic-fixture-only-bearer' };
const gitExe = process.platform === 'win32' ? 'C:/Program Files/Git/cmd/git.exe' : '/usr/bin/git';
const DISABLED = ['apps', 'browser_use', 'browser_use_external', 'browser_use_full_cdp_access', 'computer_use', 'hooks', 'in_app_browser', 'multi_agent', 'plugins', 'remote_plugin', 'view_image', 'skill_search', 'skill_mcp_dependency_install', 'image_generation', 'goals', 'sleep_tool'];
function fixtureCatalog() { return {tools:[{type:'namespace',name:'functions',tools:FACADE_INVENTORY.topLevel.map((name,index)=>({name:name.split('.')[1],type:index===0?'custom':'function',...(index===0?{description:FACADE_INVENTORY.nested.map(tool=>'### `'+tool+'`\n\ndeclare const tools: { '+tool+'(').join('\n')}: {})}))}]}; }
function profile() {
  const p = { schema: 'contained-codex-profile/1', stageContract: BUILD_STAGE_CONTRACT, requiredChecks: [{name:'typecheck',kind:'typescript',command:'typescript-fixture',commandSha256:hash('typescript-fixture'),renderedCommandSha256:hash('rendered-typescript-fixture'),login:false},{name:'tests',kind:'vitest',command:'vitest-fixture',commandSha256:hash('vitest-fixture'),renderedCommandSha256:hash('rendered-vitest-fixture'),login:false}], codexExecutable: 'C:/native/codex.exe', nodeExecutable: 'C:/nvm/nvm/v24.14.1/node.exe', gitExecutable: 'C:/native/git.exe', powershellExecutable: 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', codexHome: 'C:/controller/auth', readonlyRoots: ['C:/nvm/nvm/v24.14.1'], environmentKeys: ['SystemRoot', 'TEMP', 'USERPROFILE'], timeoutMs: 5000, outputBytes: 4096, toolInventory: structuredClone(FACADE_INVENTORY), toolCatalogSha256:observedToolCatalog(fixtureCatalog()), argvTemplate: ['exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--strict-config', '--json', '--skip-git-repo-check', '-c', 'windows.sandbox="mxc"', '-c', 'forced_login_method="chatgpt"', '-c', 'default_permissions="contained_codex_build"', '-c', 'permissions.contained_codex_build.filesystem={":root"="deny",":minimal"="read",":workspace_roots"={"."="write"},"C:/nvm/nvm/v24.14.1"="read"}', '-c', 'permissions.contained_codex_build.network.enabled=false', '-c', 'approval_policy="never"', '-c', 'shell_environment_policy.inherit="none"', '-c', 'web_search="disabled"', '-c', 'agents.enabled=false', '-c', 'agents.max_concurrent_threads_per_session=1', '-c', 'features.code_mode_host=true', ...DISABLED.flatMap(name => ['--disable', name]), '-C', '${snapshot}', '-'] };
  p.argvTemplate.splice(-3,0,'-c',shellEnvironmentConfiguration(p)); return p;
}
function task() {
  const approval = { id: 'f33e8a9d-65b9-5b82-a12d-07863f093108', founderId: FOUNDER, specVersion: SHA, revision: 1, scope: 'branch_preview_only', signature: SHA, intent: { hash: SHA, version: 1, acceptedAt: NOW } };
  const delivery = { repository: 'CleanExpo/Unite-Group', revision: 1, specVersion: SHA, scope: 'branch_preview_only', spec: { title: 'Synthetic fixture only' }, approval };
  return { id: TASK, founder_id: FOUNDER, status: 'running', claimed_by: env.RUNNER_ID, claimed_at: NOW, approvedDelivery: delivery, metadata: { delivery: { ...delivery, kind: 'software_delivery', lane: 'software', executionAssignment: { role: 'build_spm', runnerId: env.RUNNER_ID, specRevision: 1, specFingerprint: SHA, scope: 'branch_preview_only', acceptedAt: NOW } } } };
}
const config = () => ({ taskId: TASK, runnerId: env.RUNNER_ID });
function temporary(t) { const root = mkdtempSync(join(tmpdir(), 'contained-codex-fixture-')); t.after(() => rmSync(root, { recursive: true, force: true })); return root; }
const options = ['--once', '--task-id', TASK, '--repo', process.cwd(), '--base', BASE, '--ledger', join(tmpdir(), 'unused-fixture-ledger'), '--input-path', 'src', '--allowed-path', 'src'];

test('import has no network/process/provider side effect', () => {
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `globalThis.fetch=()=>{throw Error('unexpected_network')};await import(${JSON.stringify(import.meta.url.replace('build-codex-contract.test.mjs', 'build-codex.mjs'))});console.log('inert')`], { encoding: 'utf8' });
  assert.equal(output.trim(), 'inert');
});
test('configuration requires explicit bounded one-task execution', () => {
  const parsed = parseOptions(options, env);
  assert.equal(parsed.taskId, TASK); assert.equal(parsed.secret, env.AGENT_EVENTS_SECRET);
  for (const args of [options.slice(1), [...options, '--once'], [...options, '--unknown'], [...options, '--input-path'], options.map(arg => arg === TASK ? 'other-task' : arg)]) assert.throws(() => parseOptions(args, env));
  for (const origin of ['http://example.test', 'https://user:pass@example.test', 'https://example.test/path', 'https://example.test/?secret=a']) assert.throws(() => parseOptions(options, { ...env, NEXUS_APP_URL: origin }));
});
test('credentials and explicit registered runner identity are mandatory', () => {
  assert.throws(() => parseOptions(options, { ...env, RUNNER_ID: '' }), /runner_auth/);
  assert.throws(() => parseOptions(options, { ...env, AGENT_EVENTS_SECRET: 'bad\nsecret' }), /runner_auth/);
});
test('snapshot path aliases and credential/control-plane paths refuse', () => {
  for (const path of ['../x', '/x', 'a\\b', 'file:ads', '.git/config', '.env.local', 'a/CON.txt', 'a/trailing.', 'a/../b', 'a/.codex/config.toml', '.mcp.json', 'credentials.json', 'a\0b']) assert.throws(() => safePath(path), undefined, path);
  assert.equal(safePath('apps/web/src/Help.tsx'), 'apps/web/src/Help.tsx');
});
test('child environment strips all synthetic provider, agent, shell and Git keys', () => {
  const child = childEnvironment(profile(), { SystemRoot: 'C:/Windows', TEMP: 'C:/Temp', USERPROFILE: 'C:/Users/fixture', PATH: 'malicious', CODEX_HOME: 'wrong', AGENT_EVENTS_SECRET: 'sentinel', GH_TOKEN: 'sentinel', GITHUB_TOKEN: 'sentinel', OPENAI_API_KEY: 'sentinel', ANTHROPIC_API_KEY: 'sentinel', SUPABASE_SERVICE_ROLE_KEY: 'sentinel', VERCEL_TOKEN: 'sentinel', NODE_OPTIONS: 'sentinel', GIT_CONFIG_COUNT: 'sentinel', BASH_ENV: 'sentinel' });
  assert.equal(child.CODEX_HOME, 'C:/controller/auth'); assert.equal(child.PATH.includes('malicious'), false);
  assert.equal(Object.values(child).includes('sentinel'), false); assert.equal(child.TEMP, 'C:/Temp');
});
test('exact profile forbids fallback, broadened policies, integrations and unknown tools', () => {
  const valid = profile(); if (process.platform !== 'win32') valid.gitExecutable = 'C:/native/git.exe';
  assert.equal(validateProfile(valid), valid);
  const variants = [p => p.argvTemplate.push('--dangerously-bypass-approvals-and-sandbox'), p => p.argvTemplate.splice(p.argvTemplate.indexOf('--ignore-rules'), 1), p => p.argvTemplate[p.argvTemplate.indexOf('windows.sandbox="mxc"')] = 'windows.sandbox="restricted"', p => p.argvTemplate[p.argvTemplate.indexOf('permissions.contained_codex_build.network.enabled=false')] = 'permissions.contained_codex_build.network.enabled=true', p => p.argvTemplate[p.argvTemplate.indexOf('default_permissions="contained_codex_build"')] = 'default_permissions="other"', p => p.toolInventory.nested.push('browser'), p => p.environmentKeys.push('GH_TOKEN'), p => p.readonlyRoots.push('C:/controller'), p => p.readonlyRoots.push('C:/controller/runtime/..'), p => p.toolInventory.nested.pop()];
  for (const change of variants) { const bad = structuredClone(valid); change(bad); assert.throws(() => validateProfile(bad)); }
});
test('readonly dot-segment auth ancestor rejects even when the recorded policy matches it', () => {
  const p=profile(); p.readonlyRoots=['C:/controller/runtime/..'];
  const index=p.argvTemplate.findIndex(arg=>arg.startsWith('permissions.contained_codex_build.filesystem='));
  p.argvTemplate[index]='permissions.contained_codex_build.filesystem={":root"="deny",":minimal"="read",":workspace_roots"={"."="write"},"C:/controller/runtime/.."="read"}';
  assert.throws(()=>validateProfile(p),/unsafe_readonly_root/);
});
test('raw facade catalog must contain only the exact measured namespace and seven nested tools', () => {
  const raw=fixtureCatalog(); assert.equal(observedToolCatalog(raw),profile().toolCatalogSha256);
  const withCollaboration=structuredClone(raw); withCollaboration.tools.push({type:'namespace',name:'collaboration',tools:[]}); assert.throws(()=>observedToolCatalog(withCollaboration),/unknown_enabled_tool/);
  const unknown=structuredClone(raw); unknown.tools[0].tools[0].description+='\n### `external_connector`\n\ndeclare const tools: { external_connector('; assert.throws(()=>observedToolCatalog(unknown),/unknown_enabled_tool/);
  const missing=structuredClone(raw); missing.tools[0].tools.pop(); assert.throws(()=>observedToolCatalog(missing),/unknown_enabled_tool/);
});
test('facade profile requires enabled pinned host, disabled agents/goals, and exact sanitised shell environment', () => {
  const p=profile(); validateProfile(p);
  for(const [old,replacement] of [['features.code_mode_host=true','features.code_mode_host=false'],['agents.enabled=false','agents.enabled=true'],['agents.max_concurrent_threads_per_session=1','agents.max_concurrent_threads_per_session=0'],[shellEnvironmentConfiguration(p),'shell_environment_policy.set={"GH_TOKEN"="synthetic"}']]) {const bad=structuredClone(p);bad.argvTemplate[bad.argvTemplate.indexOf(old)]=replacement;assert.throws(()=>validateProfile(bad),/unsafe_controller_policy/);}
  const values=shellEnvironmentConfiguration(p,{SystemRoot:'C:/Windows',TEMP:'C:/Temp',USERPROFILE:'C:/Users/fixture',AGENT_EVENTS_SECRET:'synthetic',CODEX_HOME:'C:/auth',CODEX_ROLLOUT_TRACE_ROOT:'C:/trace',PATH:'untrusted'});
  assert.equal(values.includes('synthetic'),false);assert.equal(values.includes('CODEX_HOME'),false);assert.equal(values.includes('TRACE'),false);assert.equal(values.includes('untrusted'),false);
});

function qualification(t, p) {
  const root = temporary(t), file = join(root, 'actual-synthetic-fixture-measurements.json');
  // This is deliberately a unit fixture, never native qualification evidence.
  const observations = { allowed: true, zero: 0 }; writeFileSync(file, JSON.stringify(observations));
  const evidence = { path: file, sha256: hash(readFileSync(file)) };
  const required = ['workspace_control', 'outside_read_denied', 'outside_write_denied', 'network_denied', 'auth_denied', 'git_denied', 'escape_denied', 'local_ipc_denied', 'breakaway_denied', 'app_graph_typescript', 'app_relevant_vitest'];
  const checks = required.map(name => ({ stage: 'Q1', name, evidence, pointer: '/allowed', expected: true }));
  for (const name of ['descendant_cleanup', 'broker_death_cleanup']) checks.push({ stage: 'Q1', name, evidence, pointer: '/zero', expected: 0 });
  for (const name of ['controller_success', 'finite_inventory', 'config_injection_denied','facade_globals_absent','facade_control','facade_wait_control','mcp_resources_empty','mcp_templates_empty','mcp_unknown_refused','ui_clock_schema_only','collaboration_absent','host_job_membership','exec_command.escalation_refused', ...[['exec_command',['read','write','network']],['write_stdin',['read','write','network']],['apply_patch',['read','write']]].flatMap(([tool,caps])=>[`${tool}.control`,...caps.map(cap=>`${tool}.${cap}_denied`)])]) checks.push({ stage: 'Q2', name, evidence, pointer: '/allowed', expected: true });
  const catalogPath=join(root,'synthetic-catalog.json');writeFileSync(catalogPath,JSON.stringify({request:fixtureCatalog()}));
  return { inferenceRequest:{path:catalogPath,sha256:hash(readFileSync(catalogPath)),pointer:'/request'}, codeModeHostSha256:'ec4b09849f3a5bdf4a0c3d1f3c566bda392fdcd9b4aef6bd169a81ef1283fc3d',commandRunnerSha256:'bdf5160289bc4d64bc2fa38c43f9679558b3a4386226adc66a0af741e41424b7',schema: 'contained-codex-qualification/1', stageContract: BUILD_STAGE_CONTRACT, excludedCapabilities: ['package_install','package_manager','next_build'], profileHash: hash(p), workerSha256: hash(readFileSync(new URL('./build-codex.mjs', import.meta.url))), publicationHelperSha256:hash(readFileSync(new URL('./build-codex-publication.mjs',import.meta.url))), brokerSha256: '7111d9579bb5d618d73e4160cece5f248f273162ae878a1c053ed56a144f744d', codexSha256: 'e98c516f1c8935789aabe9122ee7e05ec4c3efd1ba6acf179242e031c495b99e', nodeSha256: '58e74bf02fc5bbacc41dcb8bef089961cd5bddd37830b87784e4fc624d145d1f', toolInventory: p.toolInventory, checks };
}
test('qualification consumes hash-bound raw measurements and refuses report labels', t => {
  const p = profile(), q = qualification(t, p); verifyQualification(p, q);
  assert.throws(() => verifyQualification(p, { ...q, checks: [], verdict: 'PASS' }), /incomplete/);
  assert.throws(() => verifyQualification(p, { ...q, profileHash: SHA }), /binding/);
  const forged = structuredClone(q); forged.checks[0].pointer = '/nonexistent'; assert.throws(() => verifyQualification(p, forged), /measurement_failed/);
  const changed = structuredClone(q); changed.checks[0].evidence.sha256 = SHA; assert.throws(() => verifyQualification(p, changed), /custody_hash/);
  const missing = structuredClone(q); missing.checks.pop(); assert.throws(() => verifyQualification(p, missing), /incomplete/);
  const duplicate = structuredClone(q); duplicate.checks.push(duplicate.checks[0]); assert.throws(() => verifyQualification(p, duplicate), /unqualified_measurement/);
  const wrongStage = structuredClone(q); wrongStage.stageContract = 'full-build'; assert.throws(() => verifyQualification(p, wrongStage), /binding/);
  const broadened = structuredClone(q); broadened.excludedCapabilities = []; assert.throws(() => verifyQualification(p, broadened), /binding/);
  const hostChanged = structuredClone(q);hostChanged.codeModeHostSha256=SHA;assert.throws(()=>verifyQualification(p,hostChanged),/binding/);
  const noRawCatalog=structuredClone(q);delete noRawCatalog.inferenceRequest;assert.throws(()=>verifyQualification(p,noRawCatalog));
  const noEscalation=structuredClone(q);noEscalation.checks=noEscalation.checks.filter(check=>check.name!=='exec_command.escalation_refused');assert.throws(()=>verifyQualification(p,noEscalation),/incomplete/);
});
test('missing escalation measurement remains unqualified rather than counting an unmade live call', t => {
  const p=profile(), q=qualification(t,p);q.checks=q.checks.filter(check=>check.name!=='exec_command.escalation_refused');
  assert.throws(()=>verifyQualification(p,q),/qualification_incomplete/);
});
test('missing native qualification fails before any production claim', async () => {
  let calls = 0; const original = globalThis.fetch; globalThis.fetch = () => { calls++; throw Error('must_not_call'); };
  try { await assert.rejects(runBuild({ profilePath: 'missing', profileSha: undefined }, { platform: 'win32' })); assert.equal(calls, 0); }
  finally { globalThis.fetch = original; }
});
test('exact delivery identity binds original attempt and rejects each ABA timestamp', () => {
  const first = task(), original = claimIdentity(first, config()); assertSameClaim(first, config(), original);
  for (const mutate of [t => t.claimed_at = '2026-10-16T02:00:01Z', t => t.metadata.delivery.executionAssignment.acceptedAt = '2026-10-16T02:00:01Z']) { const next = task(); mutate(next); assert.throws(() => assertSameClaim(next, config(), original), /claim_or_authority_changed/); }
});
test('legacy, foreign, unapproved or changed task cannot be used', () => {
  for (const mutate of [t => t.id = FOUNDER, t => t.claimed_by = 'other', t => t.status = 'queued', t => delete t.approvedDelivery, t => delete t.metadata.delivery.executionAssignment, t => t.metadata.delivery.build = {}, t => t.approvedDelivery.repository = 'other/repo', t => t.approvedDelivery.approval.intent.acceptedAt = null, t => t.metadata.delivery.executionAssignment.specRevision++, t => t.approvedDelivery.spec = { changed: true }]) { const bad = task(); mutate(bad); assert.throws(() => claimIdentity(bad, config())); }
});
test('Git inventory handles actual NUL records and refuses modes/aliases', () => {
  assert.equal(gitInventory(Buffer.from(`100644 blob ${BASE}\tsrc/test.mjs\0`))[0].path, 'src/test.mjs');
  assert.equal(gitInventory(Buffer.from(`120000 blob ${BASE}\tsrc/link\0`))[0].mode, '120000');
  assert.equal(gitInventory(Buffer.from(`160000 commit ${BASE}\tsrc/submodule\0`))[0].type, 'commit');
  for (const input of [`120000 commit ${BASE}\tsrc/link\0`, `160000 blob ${BASE}\tsrc/submodule\0`, `100644 blob ${BASE}\tsrc/a\0` + `100644 blob ${BASE}\tsrc/A\0`, `100644 blob ${BASE}\t../escape\0`]) assert.throws(() => gitInventory(Buffer.from(input)));
});
test('snapshot output rejects actual hardlinks and out-of-scope/deleted/empty changes', t => {
  const root = temporary(t), snapshot = join(root, 'snapshot'); mkdirSync(snapshot); writeFileSync(join(root, 'sentinel.txt'), 'synthetic'); linkSync(join(root, 'sentinel.txt'), join(snapshot, 'alias.txt'));
  assert.throws(() => snapshotFiles(snapshot), /non_regular_path/);
  const before = [{ path: 'src/a', sha256: 'old' }];
  assert.throws(() => deriveChanges(before, [], ['src']), /deletion/);
  assert.throws(() => deriveChanges(before, before, ['src']), /empty/);
  assert.throws(() => deriveChanges(before, [...before, { path: 'outside', sha256: 'new' }], ['src']), /out_of_scope/);
});
test('installed runtime hardlink bytes can be measured without admitting snapshot aliases', async t => {
  const root = temporary(t), executable = join(root, 'runtime.exe'), alias = join(root, 'installed.exe'); writeFileSync(executable, 'synthetic executable bytes'); linkSync(executable, alias);
  assert.equal(await nativeExecutableHash(alias), hash(readFileSync(executable)));
  assert.throws(() => snapshotFiles(root), /non_regular_path/);
});
test('real Git snapshot/tree derives full canonical tree without changing original index/objects', t => {
  const root = temporary(t), repo = join(root, 'repo'), ledger = join(root, 'ledger'); mkdirSync(repo); mkdirSync(ledger);
  const git = args => execFileSync(gitExe, ['-C', repo, ...args], { encoding: 'utf8', windowsHide: true });
  git(['init', '-q']); git(['config', 'user.name', 'Synthetic fixture']); git(['config', 'user.email', 'fixture@example.test']); git(['config', 'core.symlinks', 'false']); git(['remote', 'add', 'origin', 'https://github.com/CleanExpo/Unite-Group.git']);
  mkdirSync(join(repo, 'src')); writeFileSync(join(repo, 'src', 'help.txt'), 'before\n'); writeFileSync(join(repo, 'unselected.txt'), 'preserve\n'); writeFileSync(join(repo, 'unselected-link'), '../../synthetic-outside'); git(['add', '.']);
  const linkBlob = git(['hash-object', '-w', 'unselected-link']).trim(); git(['update-index', '--cacheinfo', `120000,${linkBlob},unselected-link`]); git(['commit', '-qm', 'Synthetic fixture']);
  const base = git(['rev-parse', 'HEAD']).trim(); git(['update-ref', 'refs/remotes/origin/main', base]);
  const originalIndex = hash(readFileSync(join(repo, '.git', 'index'))), snapshot = join(ledger, 'snapshot'), c = { repo, ledger, base, inputPaths: ['src'], allowedPaths: ['src'] }, p = { gitExecutable: gitExe };
  const stamp = gitControlStamp(c, p), baseline = createSnapshot(c, p, snapshot); writeFileSync(join(snapshot, 'src', 'help.txt'), 'after\n');
  assert.throws(() => createSnapshot({ ...c, inputPaths: ['unselected-link'] }, p, join(ledger, 'forbidden-selected-link')), /unsupported_selected_git_entry/);
  const manifest = snapshotFiles(snapshot), changes = deriveChanges(baseline.manifest, manifest, c.allowedPaths);
  const actualTree = outputTree(c, p, snapshot, changes);
  assert.match(actualTree, /^[a-f0-9]{40}$/); assert.notEqual(actualTree, baseline.baseTree); assert.equal(hash(readFileSync(join(repo, '.git', 'index'))), originalIndex);
  const treeContent = execFileSync(gitExe, ['-C', repo, 'ls-tree', '-r', actualTree], { encoding: 'utf8', env: { ...process.env, GIT_OBJECT_DIRECTORY: join(ledger, 'objects'), GIT_ALTERNATE_OBJECT_DIRECTORIES: join(repo, '.git', 'objects') } });
  assert.match(treeContent, /unselected\.txt/); assert.match(treeContent, /src\/help\.txt/);
  assert.match(treeContent, new RegExp(`120000 blob ${linkBlob}\\tunselected-link`));
  assert.equal(gitControlStamp(c, p), stamp); assert.equal(git(['status', '--porcelain']).trim(), '');
  writeFileSync(join(repo, '.git', 'hooks', 'fixture'), 'synthetic change'); assert.notEqual(gitControlStamp(c, p), stamp);
});
function fakeProcess(output, exit = 0) {
  const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.kill = () => child.emit('close', 1);
  queueMicrotask(() => { child.stdout.write(output); child.emit('close', exit); }); return child;
}
test('broker completion requires real zero exit, bounded parseable complete stream', async () => {
  const p = profile(); const good = await runBroker(p, 'C:/snapshot', 'fixture', {}, () => fakeProcess('{"type":"turn.completed"}\n')); assert.equal(good.activeDescendants, 0);
  for (const [output, exit] of [['{"type":"turn.completed"}\n', 125], ['malformed\n', 0], ['{"type":"turn.failed"}\n', 0], ['', 0], ['{"type":"turn.completed"}', 0], ['x'.repeat(5000), 0], ['{"type":"item.completed","item":{"type":"mcp_tool_call"}}\n{"type":"turn.completed"}\n', 0]]) await assert.rejects(runBroker(p, 'C:/snapshot', 'fixture', {}, () => fakeProcess(output, exit)));
});
test('production rejects even known empty MCP management events without a blanket MCP allowance', async () => {
  const stream=[{type:'item.completed',item:{type:'mcp_tool_call',server:'codex',tool:'list_mcp_resources',status:'completed',result:{structured_content:{resources:[]}}}},{type:'turn.completed'}].map(value=>JSON.stringify(value)).join('\n')+'\n';
  await assert.rejects(runBroker(profile(),'C:/snapshot','fixture',{},()=>fakeProcess(stream)),/model_or_cleanup_unconfirmed/);
});
test('controller completion preserves actual failed tool operations without asserting tests passed', async () => {
  const stream = [{ type: 'item.completed', item: { type: 'command_execution', command: 'synthetic-test-command', exit_code: 1 } }, { type: 'item.completed', item: { type: 'file_change', status: 'failed', changes: [{ path: 'synthetic.txt', kind: 'update' }] } }, { type: 'turn.completed' }].map(event => JSON.stringify(event)).join('\n') + '\n';
  const result = await runBroker(profile(), 'C:/snapshot', 'fixture', {}, () => fakeProcess(stream));
  assert.equal(result.exit, 0); assert.equal(result.testVerification, 'requires_operator_verification'); assert.equal(result.failedCommandCount, 1); assert.equal(result.failedFileChangeCount, 1); assert.equal(result.commands[0].commandSha256, hash('synthetic-test-command'));
});
test('narrow stage requires actual final successful declared TypeScript and app Vitest commands', () => {
  const p = profile(), commands = p.requiredChecks.map(check => ({ commandSha256: check.renderedCommandSha256, exitCode: 0 }));
  assertRequiredChecks(p, { controllerCompleted: true, commands });
  for (const execution of [{controllerCompleted:true,commands:[]},{controllerCompleted:false,commands},{controllerCompleted:true,commands:[commands[0]]},{controllerCompleted:true,commands:[...commands,{...commands[0],exitCode:1}]}]) assert.throws(()=>assertRequiredChecks(p,execution),/required_isolated_check/);
  const invalid = profile(); invalid.requiredChecks[0].commandSha256 = SHA; assert.throws(()=>validateProfile(invalid),/invalid_required_checks/);
  assert.throws(()=>assertRequiredChecks(p,{controllerCompleted:true,commands:p.requiredChecks.map(check=>({commandSha256:check.commandSha256,exitCode:0}))}),/required_isolated_check/);
});
function sealed() { return { runId: FOUNDER, base:BASE, identity: { authorityHash: SHA, claimedAt: NOW, assignmentAcceptedAt: NOW }, sealedAt: NOW, outputTree: BASE, branch: `codex/contained-${TASK}-${FOUNDER}` }; }
test('operator acceptance is explicit exact seal/tree/attempt; copied or stale acceptance refuses', () => {
  const seal = sealed(), acceptance = { schema: 'contained-codex-operator-acceptance/1', sealSha256: SHA, runId: seal.runId, outputTree: seal.outputTree, branch: seal.branch, authorityHash: SHA, claimedAt: NOW, assignmentAcceptedAt: NOW, trustExecutableCode: true, independentAudit: { verdict: 'PASS', sha256: SHA }, acceptedAt: NOW };
  validateAcceptance(acceptance, seal, SHA, Date.parse(NOW));
  for (const mutation of [a => a.trustExecutableCode = false, a => a.outputTree = 'c'.repeat(40), a => a.assignmentAcceptedAt = '2026-10-16T02:00:01Z', a => a.sealSha256 = 'c'.repeat(64), a => a.independentAudit.verdict = 'FAIL']) { const bad = structuredClone(acceptance); mutation(bad); assert.throws(() => validateAcceptance(bad, seal, SHA, Date.parse(NOW))); }
});
test('new PR binds fresh generated branch, canonical repo, open draft and claim creation time', () => {
  const seal = sealed(), pr = { number: 2000, url: 'https://github.com/CleanExpo/Unite-Group/pull/2000', isDraft: true, state: 'OPEN', baseRefName: 'main', baseRefOid: BASE, headRefName: seal.branch, headRefOid: BASE, headRepositoryOwner: { login: 'CleanExpo' }, headRepository: { name: 'Unite-Group' }, createdAt: '2026-10-16T02:01:00Z' };
  validateNewPr(pr, seal);
  for (const mutate of [p => p.headRefName = 'codex/idea-to-done-operations-20261016', p => p.createdAt = NOW, p => p.headRepositoryOwner.login = 'foreign', p => p.isDraft = false, p => p.baseRefName = 'dev', p => p.headRefOid = 'fake']) { const bad = structuredClone(pr); mutate(bad); assert.throws(() => validateNewPr(bad, seal)); }
});

function publication(head) {
  const snapshot={policy:[['ci',123],['nexus/release-receipt',null]],runs:[{name:'ci',status:'completed',conclusion:'success',completed_at:'2026-10-16T02:02:00Z',head_sha:head,app:{id:123}}],statuses:[]};
  return {schema:'contained-codex-publication-readback/1',repository:'CleanExpo/Unite-Group',headSha:head,canonicalModuleSha256:CANONICAL_GATE_SHA,policyFingerprint:SHA,requiredChecksPass:true,publishedReceiptPass:true,snapshot,snapshotHash:hash(snapshot)};
}
test('finalization requires independent native verify custody AND canonical exact-head status', () => {
  const seal = { ...sealed(), base: BASE }, head = 'c'.repeat(40);
  const acceptance = { independentAudit: { sha256: SHA }, nativeReceipt: { sha256: SHA }, nativeVerification: { headSha: head, receiptSha256: SHA } };
  const receipt = { schema: 1, head_sha: head, base_sha: BASE, primary_agent: 'codex', signature: SHA, review_report_sha256: SHA, tests: [{ exit_code: 0 }], ci_mirror: { verdict: 'PASS', report_sha256: SHA } };
  const audit = { head_sha: head, base_sha: BASE, implementation_agent: 'codex', reviewer_agent: 'minimax/MiniMax-M3', verdict: 'PASS', blocking_findings: [] };
  const verification = { mode: 'verify', exitCode: 0, headSha: head, receiptSha256: SHA, verifierSha256: SHA, stdoutSha256: SHA, stderrSha256: SHA };
  const statuses = publication(head);
  validateNativeHandoff(acceptance, seal, head, receipt, audit, verification, statuses);
  for (const mutate of [x => x.receipt.head_sha = BASE, x => x.receipt.tests[0].exit_code = 1, x => x.verification.exitCode = 1, x => x.verification.receiptSha256 = 'd'.repeat(64), x => x.audit.reviewer_agent = 'codex', x => x.statuses.requiredChecksPass = false, x => x.statuses.headSha = BASE, x => x.statuses.snapshot.runs.push({status:'in_progress'})]) {
    const bad = structuredClone({ receipt, audit, verification, statuses }); mutate(bad);
    assert.throws(() => validateNativeHandoff(acceptance, seal, head, bad.receipt, bad.audit, bad.verification, bad.statuses));
  }
});
test('current required CI, publisher binding and stable policy/readback are mandatory', () => {
  const before = publication(BASE); validatePublicationProof(before, BASE); assertPublicationUnchanged(before, structuredClone(before));
  const pending = structuredClone(before); pending.requiredChecksPass = false; assert.throws(()=>validatePublicationProof(pending,BASE));
  const policyDrift = structuredClone(before); policyDrift.policyFingerprint = 'd'.repeat(64); assert.throws(()=>assertPublicationUnchanged(before,policyDrift));
  const checkDrift = structuredClone(before); checkDrift.snapshot.runs[0].id = 2; checkDrift.snapshotHash = hash(checkDrift.snapshot); assert.throws(()=>assertPublicationUnchanged(before,checkDrift));
});
test('original native review stays bound while distinct review follows current CI completion', () => {
  const head='c'.repeat(40), seal={base:BASE}, pr={headRefOid:head,createdAt:'2026-10-16T02:01:00Z'}, receipt={issued_at:'2026-10-16T02:00:40Z'}, original={reviewed_at:'2026-10-16T02:00:30Z'}, pub=publication(head);
  const acceptance={independentAudit:{sha256:SHA},postCiReview:{sha256:'d'.repeat(64),ciSnapshotHash:pub.snapshotHash}}, supplement={head_sha:head,base_sha:BASE,verdict:'PASS',implementation_agent:'codex',reviewer_agent:'minimax/fixture',blocking_findings:[],ci_snapshot_hash:pub.snapshotHash,reviewed_at:'2026-10-16T02:03:00Z'};
  const current=Date.now; Date.now=()=>Date.parse('2026-10-16T02:04:00Z');
  try {
    validateReviewChronology(acceptance,seal,pr,receipt,original,supplement,pub,NOW);
    for (const mutate of [s=>s.reviewed_at='2026-10-16T02:01:00Z',s=>s.head_sha=BASE,s=>s.verdict='FAIL']) {const bad=structuredClone(supplement);mutate(bad);assert.throws(()=>validateReviewChronology(acceptance,seal,pr,receipt,original,bad,pub,NOW));}
    assert.throws(()=>validateReviewChronology({...acceptance,postCiReview:{...acceptance.postCiReview,sha256:SHA}},seal,pr,receipt,original,supplement,pub,NOW));
    assert.throws(()=>validateReviewChronology(acceptance,seal,pr,{issued_at:'2026-10-16T02:01:01Z'},original,supplement,pub,NOW));
    assert.throws(()=>validateReviewChronology(acceptance,seal,pr,receipt,original,{...supplement,ci_snapshot_hash:SHA},pub,NOW));
    const rawWithoutBinding={...supplement}; delete rawWithoutBinding.ci_snapshot_hash;
    const execution={schema:'contained-codex-post-ci-execution/1',headSha:head,baseSha:BASE,ciSnapshotHash:pub.snapshotHash,reportSha256:acceptance.postCiReview.sha256,startedAt:'2026-10-16T02:02:01Z',completedAt:'2026-10-16T02:03:01Z'};
    validateReviewChronology(acceptance,seal,pr,receipt,original,rawWithoutBinding,pub,NOW,execution);
    assert.throws(()=>validateReviewChronology(acceptance,seal,pr,receipt,original,rawWithoutBinding,pub,NOW));
    assert.throws(()=>validateReviewChronology(acceptance,seal,pr,receipt,original,rawWithoutBinding,pub,NOW,{...execution,reportSha256:SHA}));
  } finally {Date.now=current;}
});
test('PR identity is queried after the slow final publication bridge and rejects intervening drift', async () => {
  const seal=sealed(), pr={number:2000,url:'https://github.com/CleanExpo/Unite-Group/pull/2000',isDraft:true,state:'OPEN',baseRefName:'main',baseRefOid:BASE,headRefName:seal.branch,headRefOid:'c'.repeat(40),headRepositoryOwner:{login:'CleanExpo'},headRepository:{name:'Unite-Group'},createdAt:'2026-10-16T02:01:00Z'}, pub=publication(pr.headRefOid);
  const order=[]; let current=pr;
  const read=()=>{order.push('pr');return current;}, inspect=async()=>{order.push('publication');return pub;};
  await confirmFinalPublication(pr,pub,seal,read,inspect); assert.deepEqual(order,['pr','publication','pr']);
  await assert.rejects(confirmFinalPublication(pr,pub,seal,read,async()=>{current={...pr,isDraft:false};return pub;}));
});
test('explicit operator stage revalidates original claim read-only and durably stops before hooks', async t => {
  const root = temporary(t), ledger = join(root, 'ledger'), snapshot = join(ledger, 'snapshot'); mkdirSync(ledger); mkdirSync(snapshot); writeFileSync(join(snapshot, 'help.txt'), 'synthetic candidate');
  const p = profile(), q = qualification(t, p), taskRow = task(), identity = claimIdentity(taskRow, config());
  const profilePath = join(root, 'profile.json'), qualificationPath = join(root, 'qualification.json'); writeFileSync(profilePath, JSON.stringify(p)); writeFileSync(qualificationPath, JSON.stringify(q));
  const profileSha = hash(readFileSync(profilePath)), qualificationSha = hash(readFileSync(qualificationPath)), execution = { exit: 0, controllerCompleted:true, activeDescendants: 0, commands:p.requiredChecks.map(check=>({commandSha256:check.renderedCommandSha256,exitCode:0})) }, claim = { runId: FOUNDER, branch: `codex/contained-${TASK}-${FOUNDER}`, identity };
  const seal = { ...claim, schema: 'contained-codex-run/1', stageContract: BUILD_STAGE_CONTRACT, excludedCapabilities:['package_install','package_manager','next_build'], state: 'awaiting_operator_verification', base: BASE, inputPaths: ['help.txt'], allowedPaths: ['help.txt'], profileSha, qualificationSha, execution, manifest: snapshotFiles(snapshot), outputTree: BASE, sealedAt: new Date(Date.now() - 2000).toISOString() };
  for (const [name, value] of [['claim.json', claim], ['seal.json', seal], ['execution.json', execution]]) writeFileSync(join(ledger, name), JSON.stringify(value));
  const sealSha = hash(readFileSync(join(ledger, 'seal.json'))), auditPath = join(root, 'candidate-audit.json'); writeFileSync(auditPath, JSON.stringify({ output_tree: BASE, seal_sha256: sealSha, verdict: 'PASS', implementation_agent: 'codex', reviewer_agent: 'minimax/fixture', blocking_findings: [] }));
  const acceptancePath = join(root, 'trust.json'), trust = { schema: 'contained-codex-operator-trust/1', sealSha256: sealSha, runId: FOUNDER, outputTree: BASE, branch: seal.branch, authorityHash: identity.authorityHash, claimedAt: identity.claimedAt, assignmentAcceptedAt: identity.assignmentAcceptedAt, trustExecutableCode: true, acceptedAt: new Date(Date.now() - 1000).toISOString(), independentAudit: { verdict: 'PASS', path: auditPath, sha256: hash(readFileSync(auditPath)) } }; writeFileSync(acceptancePath, JSON.stringify(trust));
  const c = { ...config(), origin: 'https://fixture.test', secret: 'synthetic', repo: root, ledger, base: BASE, inputPaths: seal.inputPaths, allowedPaths: seal.allowedPaths, profilePath, profileSha, qualificationPath, qualificationSha, acceptancePath, acceptanceSha: hash(readFileSync(acceptancePath)) };
  const calls = [], originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return new Response(JSON.stringify({ task: taskRow }), { status: 200 }); };
  try {
    // Nothing can finalize from a trust request without a prior durable acceptance.
    await assert.rejects(finalizeBuild(c)); assert.equal(calls.length, 0);
    const result = await acceptCandidate(c); assert.equal(result.state, 'operator_accepted_for_explicit_trusted_pipeline'); assert.equal(calls.length, 1); assert.equal(calls[0].body.resumeOnly, true); assert.equal(calls[0].body.taskId, TASK); assert.match(calls[0].url, /\/claim$/);
    assert.equal(hash(readFileSync(join(ledger, 'operator-acceptance.json'))), result.operatorAcceptanceSha256);
    await assert.rejects(acceptCandidate(c)); // Never overwrite the durable original decision.
  } finally { globalThis.fetch = originalFetch; }
});

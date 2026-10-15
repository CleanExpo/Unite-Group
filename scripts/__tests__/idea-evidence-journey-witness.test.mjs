import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { hashIdeaEvidence, verifyExternalIdeaEvidence } from '../../apps/web/src/lib/command-centre/idea-evidence-contracts.ts';
import { sha256 } from '../idea-evidence-review-collector.mjs';
import { createJourneyWitness, journeyWitnessPolicy, lifecycleHash } from '../idea-evidence-journey-witness.mjs';

// Every fact/key below is synthetic software proof, never a claim of a live journey.
const keys = generateKeyPairSync('ed25519');
const digest = sha256(readFileSync(new URL('../idea-evidence-journey-witness.mjs', import.meta.url)));
const at = minute => `2026-10-16T01:${String(minute).padStart(2, '0')}:00Z`;
function fixture() {
  const owner = '22222222-2222-4222-8222-222222222222'; const task = '33333333-3333-4333-8333-333333333333';
  const source = { source_id: 'factory.witness', version: 1, kind: 'ed25519', event_kind: 'production_journey_verified', adapter_version: 'canonical_factory_journey_v1', repository: 'CleanExpo/Unite-Group', product_id: 'internal.factory', environment: 'production', public_key: keys.publicKey.export({ type: 'spki', format: 'pem' }) };
  const snapshot = { revision: 2, rawIdea: 'Exact original synthetic idea.\nSecond line.', title: 'Synthetic factory', sources: [], claims: [], openDecisions: [], mandate: { paidApiAllowed: false }, checkpoint: { status: 'complete', blockers: [], summary: 'Synthetic' }, outcome: null, brief: { design: { summary: 'Synthetic design', sourceIds: [] }, outputs: Array.from({ length: 13 }, (_, index) => ({ id: index + 1, status: 'included', content: `Synthetic output ${index + 1}` })), target: { repository: source.repository, baseBranch: 'main' } } };
  const briefHash = lifecycleHash(snapshot);
  const approval = { scope: 'research_brief_only', actorId: owner, approvedAt: at(4), revision: 2, briefHash };
  const binding = { schemaVersion: 1, mode: 'non_executable_draft', revision: 2, briefHash, createdAt: at(5), approved: true, target: snapshot.brief.target, snapshot: { evidenceHash: lifecycleHash({ sources: snapshot.sources, claims: snapshot.claims }), designHash: lifecycleHash(snapshot.brief.design), outcomeHash: null, acceptanceCriteria: [], sourceRefs: [] } };
  const handoffManifest = { ...binding, manifestHash: lifecycleHash(binding) };
  const state = { ...structuredClone(snapshot), kind: 'idea_to_done', brief: { hash: briefHash, createdAt: at(3), snapshot }, approval, handoff: Object.fromEntries(['schemaVersion', 'mode', 'revision', 'briefHash', 'createdAt', 'approved', 'manifestHash'].map(key => [key, handoffManifest[key]])), history: ['capture', 'record_research', 'approve_brief', 'create_handoff'].map((action, index) => ({ action, actorId: owner, revision: index < 2 ? 1 : 2, at: at(index < 2 ? index + 1 : index + 2) })) };
  const full = { taskId: task, source: 'supabase', lifecycle: state, progress: { revision: 2, stage: 'handoff', commercial: { eligibleClients: 0, requiredClients: null, status: 'blocked' } }, handoff: { manifest: handoffManifest, prompt: 'NON-EXECUTABLE DRAFT — synthetic' }, mission: { taskId: task } };
  const compact = { taskId: task, source: 'supabase', lifecycle: { revision: 2, brief: { hash: briefHash, snapshot: { revision: 2 } }, approval: { scope: approval.scope, revision: approval.revision, briefHash } }, progress: structuredClone(full.progress) };
  const grant = { grant_id: '11111111-1111-4111-8111-111111111111', version: 1, source_id: source.source_id, source_version: 1, founder_id: owner, task_id: task, lifecycle_revision: 2, brief_hash: briefHash, outcome_hash: null, outcome_canonical: 'null', repository: source.repository, product_id: source.product_id, release_id: 'dpl_SyntheticControl', environment: 'production', subject: { namespace: 'founder', id: owner }, event_name: 'factory.manual_research_journey', contract_hash: hashIdeaEvidence(journeyWitnessPolicy(digest)), valid_from: at(0), valid_until: at(59) };
  const config = { canonical_origin: 'https://unite-group.in', collector_policy_digest: digest, enrollment_observed_at: at(0), source: { registration: source, registration_hash: hashIdeaEvidence(source) }, grant: { registration: grant, registration_hash: hashIdeaEvidence(grant) } };
  const deployment = { deployment: { id: grant.release_id, target: 'production', state: 'READY', meta: { githubCommitSha: 'a'.repeat(40), githubCommitRef: 'main', githubRepo: 'Unite-Group', githubOrg: 'CleanExpo' } }, project: { id: 'prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0' }, teamId: 'team_KMZACI5rIltoCRhAtGCXlxUf' };
  const alias = { alias: 'unite-group.in', deploymentId: grant.release_id, projectId: deployment.project.id, teamId: deployment.teamId, mergeSha: deployment.deployment.meta.githubCommitSha };
  const witness = { witness_id: '44444444-4444-4444-8444-444444444444', operator_id: owner, authenticated_subject: grant.subject, canonical_origin: config.canonical_origin, procedure: 'explicit_operator_witness_v1', ui_actions_executed: 'observed_in_authenticated_browser', recovery_action: 'browser_reload_existing_task', provider_projection_review: 'operator_compared_original_provider_json', unresolved_journey_defects: [], completed_at: at(10), recovery_reference: 'browser.reload.synthetic', actions: ['intake_persisted', 'research_recorded', 'brief_approved', 'handoff_persisted', 'recovery_readback'].map((action, index) => ({ action, observation: 'witnessed', ui_reference: `synthetic.browser.step.${index}`, observed_at: at(index < 2 ? index + 1 : index + 2), ...(index < 4 ? { history_index: index } : { recovery_reference: 'browser.reload.synthetic' }) })) };
  const facts = { intake: snapshot.rawIdea, full, compact, recovered: structuredClone(full), alias_start: structuredClone(alias), alias_end: structuredClone(alias), deployment, provider_alias_start: { synthetic: 'original start alias' }, provider_alias_end: { synthetic: 'original end alias' }, provider_deployment: { synthetic: 'original deployment' }, witness };
  const kinds = ['operator_original_intake', 'authenticated_lifecycle_get', 'authenticated_lifecycle_status_get', 'authenticated_lifecycle_get_after_reload', 'operator_vercel_alias_projection', 'operator_vercel_alias_projection', 'operator_vercel_deployment_projection', 'vercel_alias_raw', 'vercel_alias_raw', 'vercel_deployment_raw', 'operator_ui_witness'];
  const times = [0, 6, 7, 8, 0, 9, 0, 0, 9, 0, 10]; const captures = {}; const manifest = { schema: 1, artifacts: {} };
  const repack = () => {
    for (const [index, name] of Object.keys(facts).entries()) {
      captures[name] = Buffer.from(name === 'intake' ? facts[name] : JSON.stringify(facts[name]));
      manifest.artifacts[name] = { file: `${name}.json`, source_kind: kinds[index], observed_at: at(times[index]), sha256: sha256(captures[name]) };
    }
    for (const name of ['alias_start', 'alias_end', 'deployment']) {
      facts[name].providerRawDigest = manifest.artifacts[`provider_${name}`].sha256;
      captures[name] = Buffer.from(JSON.stringify(facts[name])); manifest.artifacts[name].sha256 = sha256(captures[name]);
    }
    witness.actions.forEach((item, index) => { item.readback_sha256 = manifest.artifacts[index === 4 ? 'recovered' : 'full'].sha256; });
    captures.witness = Buffer.from(JSON.stringify(witness)); manifest.artifacts.witness.sha256 = sha256(captures.witness);
  };
  repack();
  return { facts, config, manifest, captures, repack, input: { config, manifest, captures, privateKey: keys.privateKey.export({ type: 'pkcs8', format: 'pem' }) }, options: { now: new Date(at(11)), collectorDigest: digest } };
}

test('synthetic complete operator witness signs stable ordered evidence; this is not live verification', () => {
  const f = fixture(); const first = createJourneyWitness(f.input, f.options); const again = createJourneyWitness(f.input, f.options);
  assert.deepEqual(first, again);
  assert.equal(first.envelope.payload.steps.length, 5);
  assert.equal(first.envelope.occurred_at, at(10));
  assert.equal(verifyExternalIdeaEvidence({ ...first, source: f.config.source, grant: f.config.grant, expected: { founder_id: f.config.grant.registration.founder_id, task_id: f.config.grant.registration.task_id } }).envelope_hash, hashIdeaEvidence(first.envelope));
});

for (const [name, mutate] of [
  ['task mismatch', f => { f.facts.full.taskId = f.config.grant.registration.founder_id; }],
  ['brief hash mismatch', f => { f.facts.full.lifecycle.brief.hash = 'e'.repeat(64); }],
  ['wrong owner', f => { f.facts.witness.operator_id = f.config.grant.registration.task_id; }],
  ['raw intake changed', f => { f.facts.intake += ' edited'; }],
  ['snapshot changed', f => { f.facts.full.lifecycle.brief.snapshot.title = 'Changed'; }],
  ['paid research mandate', f => { f.facts.full.lifecycle.mandate.paidApiAllowed = true; }],
  ['blocked checkpoint', f => { f.facts.full.lifecycle.checkpoint.status = 'blocked'; }],
  ['wrong approval owner', f => { f.facts.full.lifecycle.approval.actorId = f.config.grant.registration.task_id; }],
  ['wrong approval scope', f => { f.facts.full.lifecycle.approval.scope = 'build_and_release'; }],
  ['wrong approval hash', f => { f.facts.full.lifecycle.approval.briefHash = 'f'.repeat(64); }],
  ['unapproved handoff', f => { f.facts.full.lifecycle.handoff.approved = false; }],
  ['executable handoff', f => { f.facts.full.lifecycle.handoff.mode = 'execute'; }],
  ['missing handoff readback', f => { f.facts.full.handoff = null; }],
  ['changed handoff manifest', f => { f.facts.full.handoff.manifest.target.baseBranch = 'other'; }],
  ['duplicate research output', f => { f.facts.full.lifecycle.brief.snapshot.brief.outputs[12].id = 1; }],
  ['missing research output', f => { f.facts.full.lifecycle.brief.snapshot.brief.outputs.pop(); }],
  ['other alias', f => { f.facts.alias_start.alias = 'preview.example'; }],
  ['other project', f => { f.facts.alias_end.projectId = 'prj_other'; }],
  ['other team', f => { f.facts.deployment.teamId = 'team_other'; }],
  ['changed deployment', f => { f.facts.alias_end.deploymentId = 'dpl_Other'; }],
  ['changed merge SHA', f => { f.facts.alias_end.mergeSha = 'b'.repeat(40); }],
  ['preview deployment', f => { f.facts.deployment.deployment.target = 'preview'; }],
  ['non-ready deployment', f => { f.facts.deployment.deployment.state = 'BUILDING'; }],
  ['other branch', f => { f.facts.deployment.deployment.meta.githubCommitRef = 'feature'; }],
  ['wrong repository', f => { f.facts.deployment.deployment.meta.githubOrg = 'Other'; }],
  ['changed recovery', f => { f.facts.recovered.lifecycle.rawIdea = 'Other'; }],
  ['compact approval mismatch', f => { f.facts.compact.lifecycle.approval.revision = 1; }],
  ['compact progress mismatch', f => { f.facts.compact.progress.stage = 'done'; }],
  ['unresolved UI defect', f => { f.facts.witness.unresolved_journey_defects = ['Reload lost approval']; }],
  ['generic passed boolean', f => { f.facts.witness.passed = true; }],
  ['unwitnessed UI action', f => { f.facts.witness.actions[1].observation = 'assumed'; }],
  ['wrong history actor', f => { f.facts.full.lifecycle.history[1].actorId = f.config.grant.registration.task_id; }],
  ['history action mismatch', f => { f.facts.witness.actions[0].history_index = 1; }],
  ['fake paying clients', f => { f.facts.full.progress.commercial = { eligibleClients: 1, requiredClients: 1, status: 'achieved' }; }],
  ['missing provider review', f => { f.facts.witness.provider_projection_review = 'assumed'; }],
  ['stale captures', f => { f.options.now = new Date(at(30)); }],
  ['wrong private key', f => { f.input.privateKey = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }); }],
  ['revoked source', f => { f.config.source.revoked_at = at(0); }],
  ['unpinned source', f => { f.config.source.registration.version = 2; }],
  ['wrong collector digest', f => { f.options.collectorDigest = 'd'.repeat(64); }],
  ['stale enrollment', f => { f.config.enrollment_observed_at = '2026-10-15T00:00:00Z'; }],
]) test(`refuses synthetic ${name}`, () => {
  const f = fixture(); mutate(f); f.repack(); assert.throws(() => createJourneyWitness(f.input, f.options));
});

for (const [name, mutate] of [
  ['wrong source kind', f => { f.manifest.artifacts.full.source_kind = 'public_http_200'; }],
  ['unmatched capture hash', f => { f.manifest.artifacts.full.sha256 = 'f'.repeat(64); }],
  ['missing capture', f => { delete f.manifest.artifacts.compact; }],
  ['capture exceeds byte bound', f => { f.captures.full = Buffer.alloc(1_048_577); }],
  ['future capture', f => { f.manifest.artifacts.full.observed_at = at(12); }],
  ['alias observation before recovery', f => { f.manifest.artifacts.alias_end.observed_at = at(7); }],
  ['UI action timestamp order', f => { f.facts.witness.actions[0].observed_at = at(5); f.repack(); }],
]) test(`refuses packet ${name}`, () => {
  const f = fixture(); mutate(f); assert.throws(() => createJourneyWitness(f.input, f.options));
});

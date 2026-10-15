#!/usr/bin/env node
/** Offline operator witness, not a browser probe or provider attestation. */
import { createPrivateKey, sign } from 'node:crypto';
import { lstatSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashIdeaEvidence, hashEvidenceArtifact, ideaEvidenceSourceRegistrationSchema, ideaEvidenceGrantSchema, ideaEvidenceEnvelopeSchema, ideaEvidenceSignatureMessage, verifyExternalIdeaEvidence } from '../apps/web/src/lib/command-centre/idea-evidence-contracts.ts';
import { readArtifact, sha256 } from './idea-evidence-review-collector.mjs';

const need = (condition, message) => { if (!condition) throw new Error(message); };
const ORIGIN = 'https://unite-group.in';
const PROJECT = 'prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0';
const TEAM = 'team_KMZACI5rIltoCRhAtGCXlxUf';
const REPO = 'CleanExpo/Unite-Group';
const DIGEST = /^[a-f0-9]{64}$/;
const SHA = /^[a-f0-9]{40}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ACTIONS = ['intake_persisted', 'research_recorded', 'brief_approved', 'handoff_persisted', 'recovery_readback'];
const HISTORY = ['capture', 'record_research', 'approve_brief', 'create_handoff'];
const KINDS = { intake: 'operator_original_intake', full: 'authenticated_lifecycle_get', compact: 'authenticated_lifecycle_status_get', recovered: 'authenticated_lifecycle_get_after_reload', alias_start: 'operator_vercel_alias_projection', alias_end: 'operator_vercel_alias_projection', deployment: 'operator_vercel_deployment_projection', provider_alias_start: 'vercel_alias_raw', provider_alias_end: 'vercel_alias_raw', provider_deployment: 'vercel_deployment_raw', witness: 'operator_ui_witness' };
const time = value => { need(typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)), 'Invalid capture timestamp'); return Date.parse(value); };
const equal = (a, b) => hashEvidenceArtifact(a) === hashEvidenceArtifact(b);

/** Enrollment must pin this policy hash in grant.contract_hash before capture. */
export function journeyWitnessPolicy(collectorDigest) {
  need(DIGEST.test(collectorDigest), 'Collector digest required');
  return { adapter_version: 'canonical_factory_journey_v1', journey_version: 'factory_manual_research_v1', collector_policy_digest: collectorDigest, canonical_origin: ORIGIN, provider_project_id: PROJECT, provider_team_id: TEAM, repository: REPO, issuer_trust: 'explicit_operator_witness_v1', maximum_capture_age_seconds: 900 };
}

// Existing lifecycle hashes use locale-sorted JSON, not the evidence signature format.
export function lifecycleHash(value) {
  const canonical = item => Array.isArray(item) ? item.map(canonical) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : item;
  return sha256(JSON.stringify(canonical(value)));
}

function enrollment(config, collectorDigest, now) {
  const source = ideaEvidenceSourceRegistrationSchema.parse(config.source.registration);
  const grant = ideaEvidenceGrantSchema.parse(config.grant.registration);
  need(config.canonical_origin === ORIGIN && config.collector_policy_digest === collectorDigest, 'Canonical collector policy mismatch');
  need(hashIdeaEvidence(source) === config.source.registration_hash && hashIdeaEvidence(grant) === config.grant.registration_hash, 'Enrollment pin mismatch');
  need(!config.source.revoked_at && !config.grant.revoked_at && time(config.enrollment_observed_at) <= now && now - time(config.enrollment_observed_at) <= 900_000, 'Fresh active enrollment export required');
  need(source.kind === 'ed25519' && source.event_kind === 'production_journey_verified' && source.adapter_version === 'canonical_factory_journey_v1', 'Journey witness source required');
  need(source.repository === REPO && grant.repository === REPO && source.environment === 'production' && grant.environment === 'production' && source.product_id === grant.product_id, 'Production repository scope required');
  need(grant.source_id === source.source_id && grant.source_version === source.version && grant.subject.namespace === 'founder' && grant.subject.id === grant.founder_id && grant.event_name === 'factory.manual_research_journey', 'Owner witness grant required');
  need(grant.contract_hash === hashIdeaEvidence(journeyWitnessPolicy(collectorDigest)) && /^dpl_[A-Za-z0-9]+$/.test(grant.release_id), 'Specific journey policy/release required');
  return { source, grant };
}

/** Pure validation/signing seam for software tests; production CLI always reads protected files. */
export function createJourneyWitness({ config, manifest, captures, privateKey }, { now = new Date(), collectorDigest = sha256(readArtifact(fileURLToPath(import.meta.url))) } = {}) {
  const clock = now.getTime();
  const { source, grant } = enrollment(config, collectorDigest, clock);
  need(manifest.schema === 1 && Object.keys(manifest.artifacts).sort().join(',') === Object.keys(KINDS).sort().join(','), 'Complete capture manifest required');
  const facts = {};
  for (const [name, kind] of Object.entries(KINDS)) {
    const spec = manifest.artifacts[name]; const bytes = captures[name];
    need(spec.source_kind === kind && DIGEST.test(spec.sha256) && Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 1_048_576 && sha256(bytes) === spec.sha256, 'Capture kind/bytes/digest mismatch');
    need(time(spec.observed_at) <= clock && clock - time(spec.observed_at) <= 900_000, 'Stale or future capture');
    facts[name] = name === 'intake' ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  }
  const { full, compact, recovered, witness, deployment } = facts;
  need(UUID.test(witness.witness_id) && witness.operator_id === grant.founder_id && equal(witness.authenticated_subject, grant.subject) && witness.canonical_origin === ORIGIN, 'Actual owner witness required');
  need(witness.procedure === 'explicit_operator_witness_v1' && witness.ui_actions_executed === 'observed_in_authenticated_browser' && witness.recovery_action === 'browser_reload_existing_task' && Array.isArray(witness.unresolved_journey_defects) && witness.unresolved_journey_defects.length === 0 && !('passed' in witness), 'Explicit defect-free UI/recovery observations required');
  need(witness.provider_projection_review === 'operator_compared_original_provider_json' && ['provider_alias_start', 'provider_alias_end', 'provider_deployment'].every(name => facts[name] && typeof facts[name] === 'object' && !Array.isArray(facts[name]) && Object.keys(facts[name]).length > 0), 'Explicit original provider capture review required');
  const completed = time(witness.completed_at);
  need(completed <= clock && clock - completed <= 900_000 && completed >= time(grant.valid_from) && completed <= time(grant.valid_until), 'Witness outside authority/freshness interval');
  need(time(manifest.artifacts.witness.observed_at) === completed && time(manifest.artifacts.alias_end.observed_at) <= completed, 'Witness completion order mismatch');
  for (const reply of [full, compact, recovered]) need(reply.source === 'supabase' && reply.taskId === grant.task_id && reply.lifecycle?.revision === grant.lifecycle_revision && reply.lifecycle?.brief?.hash === grant.brief_hash && reply.lifecycle?.brief?.snapshot?.revision === grant.lifecycle_revision, 'Lifecycle readback subject mismatch');
  const state = full.lifecycle;
  need(full.progress?.revision === state.revision && (state.outcome !== null || full.progress.commercial?.eligibleClients === 0 && full.progress.commercial.requiredClients === null && full.progress.commercial.status !== 'achieved' && full.progress.stage !== 'done'), 'Journey cannot invent paying-client completion');
  need(state.kind === 'idea_to_done' && state.rawIdea === facts.intake && state.brief.snapshot.rawIdea === facts.intake, 'Original intake changed');
  need(state.mandate && state.mandate.paidApiAllowed === false && state.checkpoint?.status === 'complete' && Array.isArray(state.checkpoint.blockers) && state.checkpoint.blockers.length === 0, 'Bounded completed research required');
  const snapshot = state.brief.snapshot;
  need(lifecycleHash(snapshot) === grant.brief_hash && snapshot.revision === state.revision && snapshot.title === state.title && equal(snapshot.sources, state.sources) && equal(snapshot.claims, state.claims) && equal(snapshot.openDecisions, state.openDecisions) && equal(snapshot.mandate, state.mandate) && equal(snapshot.checkpoint, state.checkpoint) && equal(snapshot.outcome, state.outcome), 'Current immutable brief snapshot mismatch');
  need(Array.isArray(snapshot.brief?.outputs) && snapshot.brief.outputs.length === 13 && new Set(snapshot.brief.outputs.map(item => item.id)).size === 13 && snapshot.brief.outputs.every(item => Number.isInteger(item.id) && item.id >= 1 && item.id <= 13 && ['included', 'blocked', 'deferred', 'not_applicable'].includes(item.status) && typeof item.content === 'string' && item.content.trim()) && snapshot.brief.target?.repository === REPO && snapshot.brief.target?.baseBranch === 'main', 'All thirteen unique outputs/current target required');
  need(state.outcome === null ? grant.outcome_hash === null : lifecycleHash(state.outcome) === grant.outcome_hash, 'Outcome binding mismatch');
  const approval = state.approval;
  need(approval?.scope === 'research_brief_only' && approval.actorId === grant.founder_id && approval.revision === state.revision && approval.briefHash === grant.brief_hash, 'Actual current owner research approval required');
  const handoff = state.handoff;
  need(handoff?.mode === 'non_executable_draft' && handoff.schemaVersion === 1 && handoff.approved === true && handoff.revision === state.revision && handoff.briefHash === grant.brief_hash && DIGEST.test(handoff.manifestHash), 'Persisted approved non-executable handoff required');
  need(full.handoff?.manifest && equal(handoff, Object.fromEntries(Object.keys(handoff).map(key => [key, full.handoff.manifest[key]]))), 'Saved/exported handoff mismatch');
  const { manifestHash, ...binding } = full.handoff.manifest;
  need(lifecycleHash(binding) === manifestHash && binding.target?.repository === REPO && binding.target?.baseBranch === 'main' && typeof full.handoff.prompt === 'string' && full.handoff.prompt.includes('NON-EXECUTABLE DRAFT'), 'Exported handoff integrity mismatch');
  need(binding.snapshot?.evidenceHash === lifecycleHash({ sources: state.sources, claims: state.claims }) && binding.snapshot.designHash === lifecycleHash(snapshot.brief.design) && binding.snapshot.outcomeHash === grant.outcome_hash, 'Handoff evidence/design/outcome binding mismatch');
  need(equal(compact.lifecycle.approval, { scope: approval.scope, revision: approval.revision, briefHash: approval.briefHash }) && equal(compact.progress, full.progress), 'Compact readback mismatch');
  need(equal(recovered.lifecycle, state) && equal(recovered.handoff, full.handoff) && equal(recovered.progress, full.progress), 'Reload recovery changed saved state');
  need(full.mission?.taskId === grant.task_id || full.mission?.id === grant.task_id, 'Saved mission identity required');
  need(Array.isArray(state.history) && Array.isArray(witness.actions) && witness.actions.length === ACTIONS.length, 'Actual history/action observations required');
  let previous = time(manifest.artifacts.alias_start.observed_at); let previousHistory = -1; let previousEventTime = previous;
  const steps = ACTIONS.map((action, index) => {
    const observed = witness.actions[index];
    need(observed.action === action && observed.observation === 'witnessed' && typeof observed.ui_reference === 'string' && observed.ui_reference.trim().length > 0 && observed.ui_reference.length <= 2000, 'Specific ordered UI observation required');
    const at = time(observed.observed_at);
    need(at >= previous && at <= completed, 'UI action observation order mismatch'); previous = at;
    const readback = index === 4 ? 'recovered' : 'full';
    need(at <= time(manifest.artifacts[readback].observed_at) && observed.readback_sha256 === manifest.artifacts[readback].sha256, 'UI observation/readback binding mismatch');
    let event;
    if (index < 4) {
      const entry = state.history[observed.history_index];
      need(entry?.action === HISTORY[index] && entry.actorId === grant.founder_id && Number.isInteger(entry.revision) && entry.revision <= state.revision && time(entry.at) <= at && time(entry.at) >= time(manifest.artifacts.alias_start.observed_at), 'Actual owner history entry required');
      need(Number.isInteger(observed.history_index) && observed.history_index > previousHistory && time(entry.at) >= previousEventTime, 'History order mismatch'); previousHistory = observed.history_index; previousEventTime = time(entry.at);
      if (index >= 2) need(entry.revision === state.revision, 'Approval/handoff revision mismatch');
      if (index === 2) need(entry.at === approval.approvedAt, 'Approval timestamp mismatch');
      if (index === 3) need(entry.at === handoff.createdAt, 'Handoff timestamp mismatch');
      event = { action, history_index: observed.history_index, entry, ui_reference: observed.ui_reference };
    } else need(observed.recovery_reference === witness.recovery_reference && typeof witness.recovery_reference === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/.test(witness.recovery_reference), 'Explicit reload recovery reference required');
    return { sequence: index + 1, action, action_ref: index < 4 ? `task.${grant.task_id}.history.${observed.history_index}` : witness.recovery_reference, action_digest: hashEvidenceArtifact({ observation: observed, event: event ?? null, packet_digest: hashIdeaEvidence(manifest) }), readback_ref: `${readback}.${grant.task_id}`, readback_digest: manifest.artifacts[readback].sha256 };
  });
  need(time(manifest.artifacts.full.observed_at) <= time(manifest.artifacts.compact.observed_at) && time(manifest.artifacts.compact.observed_at) <= time(manifest.artifacts.recovered.observed_at) && time(manifest.artifacts.recovered.observed_at) <= time(manifest.artifacts.alias_end.observed_at), 'Readback/recovery/alias order mismatch');
  const d = deployment.deployment;
  need(d?.id === grant.release_id && d.target === 'production' && d.state === 'READY' && deployment.project?.id === PROJECT && deployment.teamId === TEAM && SHA.test(d.meta?.githubCommitSha) && d.meta.githubCommitRef === 'main' && d.meta.githubRepo === 'Unite-Group' && d.meta.githubOrg === 'CleanExpo', 'Canonical main production deployment required');
  const alias = name => {
    const value = facts[name]; const raw = `provider_${name}`;
    need(value.alias === new URL(ORIGIN).hostname && value.deploymentId === d.id && value.projectId === PROJECT && value.teamId === TEAM && value.mergeSha === d.meta.githubCommitSha && value.providerRawDigest === manifest.artifacts[raw].sha256, 'Canonical alias identity/provenance mismatch');
    need(time(manifest.artifacts[raw].observed_at) === time(manifest.artifacts[name].observed_at), 'Provider projection observation mismatch');
    return { deployment_id: value.deploymentId, merge_sha: value.mergeSha, observed_at: manifest.artifacts[name].observed_at };
  };
  need(deployment.providerRawDigest === manifest.artifacts.provider_deployment.sha256 && time(manifest.artifacts.deployment.observed_at) === time(manifest.artifacts.provider_deployment.observed_at), 'Deployment raw provenance mismatch');
  need(time(manifest.artifacts.deployment.observed_at) >= time(manifest.artifacts.alias_start.observed_at) && time(manifest.artifacts.deployment.observed_at) <= time(manifest.artifacts.alias_end.observed_at), 'Deployment observation outside serving window');
  const payload = { adapter_version: 'canonical_factory_journey_v1', canonical_origin: ORIGIN, provider_project_id: PROJECT, provider_team_id: TEAM, deployment_id: d.id, merge_sha: d.meta.githubCommitSha, journey_version: 'factory_manual_research_v1', authenticated_subject: grant.subject, steps, recovery_ref: witness.recovery_reference, recovery_digest: manifest.artifacts.recovered.sha256, alias_start: alias('alias_start'), alias_end: alias('alias_end') };
  const envelope = { source_id: source.source_id, source_version: source.version, grant_id: grant.grant_id, grant_version: grant.version, event_id: `journey.v1.${witness.witness_id}`, event_kind: 'production_journey_verified', occurred_at: witness.completed_at, payload };
  for (const key of ['founder_id', 'task_id', 'lifecycle_revision', 'brief_hash', 'outcome_hash', 'repository', 'product_id', 'release_id', 'environment', 'subject', 'event_name', 'contract_hash']) envelope[key] = grant[key];
  const parsed = ideaEvidenceEnvelopeSchema.parse(envelope); const key = createPrivateKey(privateKey);
  need(key.asymmetricKeyType === 'ed25519', 'Ed25519 witness key required');
  const result = { envelope: parsed, signature: sign(null, ideaEvidenceSignatureMessage(parsed), key).toString('base64') };
  verifyExternalIdeaEvidence({ ...result, source: config.source, grant: config.grant, expected: { founder_id: grant.founder_id, task_id: grant.task_id } });
  return result;
}

export function main(args) {
  need(args.length === 6 && args[0] === '--packet' && args[2] === '--key' && args[4] === '--output', 'Usage: node scripts/idea-evidence-journey-witness.mjs --packet ABSOLUTE_PRIVATE_PACKET --key PRIVATE_KEY --output NEW_SIGNED_FILE');
  const packet = args[1]; const output = args[5];
  need(isAbsolute(packet) && realpathSync(packet) === packet && isAbsolute(output) && dirname(output) === dirname(packet) && realpathSync(dirname(output)) === dirname(output), 'Real absolute packet/output paths in one protected directory required');
  need(lstatSync(packet).size <= 1_048_576, 'Packet exceeds bound');
  const bytes = readArtifact(packet, { privateFile: true }); const { config, manifest } = JSON.parse(bytes); const captures = {};
  for (const [name, spec] of Object.entries(manifest.artifacts)) {
    need(typeof spec.file === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,150}$/.test(spec.file), 'Capture must be a local packet basename');
    const path = resolve(dirname(packet), spec.file);
    need(lstatSync(path).size <= 1_048_576, 'Capture exceeds bound');
    captures[name] = readArtifact(path, { privateFile: true });
  }
  const result = createJourneyWitness({ config, manifest, captures, privateKey: readArtifact(args[3], { privateFile: true }) });
  need(readArtifact(packet, { privateFile: true }).equals(bytes), 'Packet changed during capture');
  for (const [name, spec] of Object.entries(manifest.artifacts)) need(readArtifact(resolve(dirname(packet), spec.file), { privateFile: true }).equals(captures[name]), 'Capture changed during signing');
  writeFileSync(output, `${JSON.stringify(result)}\n`, { flag: 'wx', mode: 0o600 });
  return result.envelope.event_id;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`Journey witness signed, not submitted: ${main(process.argv.slice(2))}`); }
  catch { console.error('Journey witness refused; verify protected captures, actual operator observations and current enrollment.'); process.exitCode = 1; }
}

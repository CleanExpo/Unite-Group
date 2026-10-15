#!/usr/bin/env node
/** Product server integration: sign only after the approved durable value action and readback. */
import { createPrivateKey, sign } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalEvidenceJson, hashIdeaEvidence, ideaEvidenceEnvelopeSchema, ideaEvidenceGrantSchema, ideaEvidenceSignatureMessage, ideaEvidenceSourceRegistrationSchema, verifyExternalIdeaEvidence } from '../apps/web/src/lib/command-centre/idea-evidence-contracts.ts';
import { readArtifact } from './idea-evidence-review-collector.mjs';
import { boundedJson } from './idea-evidence-admin.mjs';

const need = (condition, message) => { if (!condition) throw new Error(message); };
const ORIGIN = 'https://unite-group.in';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const scope = ['founder_id', 'task_id', 'brief_hash', 'product_id', 'release_id', 'event_name', 'subject', 'stripe_binding'];

function configuration(config) {
  need(config && Object.keys(config).sort().join(',') === 'canonical_origin,grant,source' && config.canonical_origin === ORIGIN, 'Canonical product configuration required');
  const source = ideaEvidenceSourceRegistrationSchema.parse(config.source.registration);
  const grant = ideaEvidenceGrantSchema.parse(config.grant.registration);
  need(hashIdeaEvidence(source) === config.source.registration_hash && hashIdeaEvidence(grant) === config.grant.registration_hash, 'Enrolled registration digest mismatch');
  need(source.kind === 'ed25519' && source.event_kind === 'customer_value_achieved' && source.adapter_version === 'product_value_action_v1', 'Enrolled value producer required');
  need(grant.source_id === source.source_id && grant.source_version === source.version && source.repository === grant.repository && source.product_id === grant.product_id && source.environment === grant.environment, 'Value grant scope mismatch');
  need(grant.stripe_binding && grant.subject.namespace === 'stripe_customer' && grant.subject.id === grant.stripe_binding.customer_id, 'Verified customer binding required');
  for (const row of [config.source, config.grant]) if (row.canonical_registration !== undefined) need(row.canonical_registration === canonicalEvidenceJson(row.registration), 'Canonical enrollment mismatch');
  return { source, grant };
}

export function createValueEvidence({ config, action, privateKeyPath }, { readPrivateKey = path => readArtifact(path, { privateFile: true }) } = {}) {
  const { source, grant } = configuration(config);
  const fields = [...scope, 'durable_action_ref', 'durable_action_digest', 'readback_ref', 'readback_digest', 'occurred_at'];
  need(action && Object.keys(action).sort().join(',') === fields.sort().join(','), 'Durable action fields required');
  need(scope.every(key => canonicalEvidenceJson(action[key]) === canonicalEvidenceJson(grant[key])), 'Durable action scope mismatch');
  need(!config.source.revoked_at && !config.grant.revoked_at && Date.parse(action.occurred_at) >= Date.parse(grant.valid_from) && Date.parse(action.occurred_at) <= Date.parse(grant.valid_until), 'Value authority interval mismatch');
  const payload = { adapter_version: 'product_value_action_v1', action_name: action.event_name, durable_action_ref: action.durable_action_ref, durable_action_digest: action.durable_action_digest, readback_ref: action.readback_ref, readback_digest: action.readback_digest, stripe_binding: action.stripe_binding };
  const envelope = { source_id: source.source_id, source_version: source.version, grant_id: grant.grant_id, grant_version: grant.version, event_id: `value.v1.${hashIdeaEvidence({ source_id: source.source_id, source_version: source.version, grant_id: grant.grant_id, grant_version: grant.version, durable_action_ref: action.durable_action_ref })}`, event_kind: 'customer_value_achieved', occurred_at: action.occurred_at, payload };
  for (const key of ['founder_id', 'task_id', 'lifecycle_revision', 'brief_hash', 'outcome_hash', 'repository', 'product_id', 'release_id', 'environment', 'subject', 'event_name', 'contract_hash']) envelope[key] = grant[key];
  const parsed = ideaEvidenceEnvelopeSchema.parse(envelope);
  const key = createPrivateKey(readPrivateKey(privateKeyPath));
  need(key.asymmetricKeyType === 'ed25519', 'Ed25519 value key required');
  const document = { envelope: parsed, signature: sign(null, ideaEvidenceSignatureMessage(parsed), key).toString('base64') };
  verifyExternalIdeaEvidence({ ...document, source: config.source, grant: config.grant, expected: { founder_id: grant.founder_id, task_id: grant.task_id } });
  return document;
}

export async function submitValueEvidence({ config, document }, { fetchImpl = fetch } = {}) {
  const { grant } = configuration(config);
  need(document && Object.keys(document).sort().join(',') === 'envelope,signature' && document.envelope?.event_kind === 'customer_value_achieved', 'Signed value document required');
  verifyExternalIdeaEvidence({ ...document, source: config.source, grant: config.grant, expected: { founder_id: grant.founder_id, task_id: grant.task_id } });
  const returned = await boundedJson(`${ORIGIN}/api/integrations/idea-evidence`, { method: 'POST', body: document, fetchImpl });
  need(returned && Object.keys(returned).sort().join(',') === 'admittedAt,eventId' && typeof returned.eventId === 'string' && UUID.test(returned.eventId) && typeof returned.admittedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(returned.admittedAt) && Number.isFinite(Date.parse(returned.admittedAt)), 'Value admission not confirmed');
  return { event_id: document.envelope.event_id, admitted_record_id: returned.eventId, admitted_at: returned.admittedAt, envelope_digest: hashIdeaEvidence(document.envelope) };
}

export async function main(args) {
  if (args.length === 5 && args[0] === '--config' && args[2] === '--document' && args[4] === '--submit') {
    return submitValueEvidence({ config: JSON.parse(readArtifact(args[1])), document: JSON.parse(readArtifact(args[3])) });
  }
  need((args.length === 8 || args.length === 9 && args[8] === '--submit') && args[0] === '--config' && args[2] === '--action' && args[4] === '--key' && args[6] === '--output', 'Usage: node scripts/idea-value-event.mjs --config PUBLIC_CONFIG --action DURABLE_ACTION --key PRIVATE_KEY_PATH --output NEW_SIGNED_FILE [--submit]; retry: --config PUBLIC_CONFIG --document ORIGINAL_SIGNED_FILE --submit');
  const config = JSON.parse(readArtifact(args[1]));
  const document = createValueEvidence({ config, action: JSON.parse(readArtifact(args[3])), privateKeyPath: args[5] });
  writeFileSync(args[7], `${JSON.stringify(document)}\n`, { flag: 'wx', mode: 0o600 });
  if (args.length === 9) return submitValueEvidence({ config, document });
  return { status: 'signed_not_submitted', event_id: document.envelope.event_id, envelope_digest: hashIdeaEvidence(document.envelope) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await main(process.argv.slice(2)))); }
  catch { console.error('Value evidence refused; verify the approved durable action, enrolled scope and retained signed document.'); process.exitCode = 1; }
}

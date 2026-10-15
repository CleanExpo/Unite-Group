import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { hashIdeaEvidence, verifyExternalIdeaEvidence } from '../../apps/web/src/lib/command-centre/idea-evidence-contracts.ts';
import { canonicalHash } from '../../apps/web/src/lib/command-centre/portfolio-control-plane.ts';
import { createValueEvidence, submitValueEvidence } from '../idea-value-event.mjs';

const keys = generateKeyPairSync('ed25519');
function fixture() {
  const source = { source_id: 'product.value', version: 1, kind: 'ed25519', event_kind: 'customer_value_achieved', adapter_version: 'product_value_action_v1', repository: 'CleanExpo/Unite-Group', product_id: 'prod_Control', environment: 'production', public_key: keys.publicKey.export({ type: 'spki', format: 'pem' }) };
  const binding = { account_id: 'acct_Control', customer_id: 'cus_Control', product_id: 'prod_Control', verified_at: '2026-10-16T00:00:00Z', association_ref: 'server.association.control', association_digest: 'c'.repeat(64) };
  // Existing lifecycle hash order; this is a synthetic unit contract, never a live offer.
  const outcome = { activationEvent: 'report.delivered', baseBranch: 'main', currency: 'AUD', minimumNetMinor: 100, productId: binding.product_id, repository: source.repository, requiredClients: 1, stripeAccountId: binding.account_id, windowEnd: '2026-10-17T00:00:00Z', windowStart: '2026-10-16T00:00:00Z' };
  const grant = { grant_id: '11111111-1111-4111-8111-111111111111', version: 1, source_id: source.source_id, source_version: 1, founder_id: '22222222-2222-4222-8222-222222222222', task_id: '33333333-3333-4333-8333-333333333333', lifecycle_revision: 2, brief_hash: 'a'.repeat(64), outcome_hash: canonicalHash(outcome), outcome_canonical: JSON.stringify(outcome), repository: source.repository, product_id: source.product_id, release_id: 'actual.release.control', environment: source.environment, subject: { namespace: 'stripe_customer', id: binding.customer_id }, event_name: outcome.activationEvent, contract_hash: 'b'.repeat(64), valid_from: '2026-10-16T00:00:00Z', valid_until: '2026-10-17T00:00:00Z', stripe_binding: binding };
  const config = { canonical_origin: 'https://unite-group.in', source: { registration: source, registration_hash: hashIdeaEvidence(source) }, grant: { registration: grant, registration_hash: hashIdeaEvidence(grant) } };
  const action = { founder_id: grant.founder_id, task_id: grant.task_id, brief_hash: grant.brief_hash, product_id: grant.product_id, release_id: grant.release_id, event_name: grant.event_name, subject: structuredClone(grant.subject), stripe_binding: structuredClone(binding), durable_action_ref: 'reports.control', durable_action_digest: 'd'.repeat(64), readback_ref: 'reports.readback.control', readback_digest: 'e'.repeat(64), occurred_at: '2026-10-16T01:00:00Z' };
  const input = { config, action, privateKeyPath: 'synthetic-unit-key-path' };
  const options = { readPrivateKey: () => keys.privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const repin = () => { config.source.registration_hash = hashIdeaEvidence(config.source.registration); config.grant.registration_hash = hashIdeaEvidence(config.grant.registration); };
  return { input, config, action, options, repin };
}

test('positive value fixture binds its actual commercial outcome and verified Stripe product', () => {
  const f = fixture(); const grant = f.config.grant.registration; const outcome = JSON.parse(grant.outcome_canonical);
  assert.equal(f.config.source.registration.product_id, outcome.productId);
  assert.equal(grant.product_id, outcome.productId);
  assert.equal(grant.stripe_binding.product_id, outcome.productId);
  assert.equal(grant.stripe_binding.account_id, outcome.stripeAccountId);
  assert.equal(grant.event_name, outcome.activationEvent);
  assert.equal(grant.outcome_hash, canonicalHash(outcome));
  assert.equal(createHash('sha256').update(grant.outcome_canonical, 'utf8').digest('hex'), grant.outcome_hash);
  assert.equal(createValueEvidence(f.input, f.options).envelope.outcome_hash, grant.outcome_hash);
});

test('signs the exact approved value action and stable repeated inputs produce identical retry bits', () => {
  const f = fixture(); const first = createValueEvidence(f.input, f.options); const second = createValueEvidence(f.input, f.options);
  assert.deepEqual(first, second);
  assert.equal(first.envelope.occurred_at, f.action.occurred_at);
  assert.equal(first.envelope.payload.durable_action_ref, f.action.durable_action_ref);
  assert.equal(verifyExternalIdeaEvidence({ ...first, source: f.config.source, grant: f.config.grant, expected: { founder_id: f.action.founder_id, task_id: f.action.task_id } }).envelope_hash, hashIdeaEvidence(first.envelope));
});

for (const [name, mutate] of [
  ['wrong source adapter', f => { f.config.source.registration.event_kind = 'production_journey_verified'; f.config.source.registration.adapter_version = 'canonical_factory_journey_v1'; f.repin(); }],
  ['wrong customer subject', f => { f.action.subject.id = 'cus_Other'; }],
  ['wrong product release', f => { f.action.release_id = 'other.release'; }],
  ['wrong approved action', f => { f.action.event_name = 'another.action'; }],
  ['wrong Stripe account binding', f => { f.action.stripe_binding.account_id = 'acct_Other'; }],
  ['wrong Stripe customer binding', f => { f.action.stripe_binding.customer_id = 'cus_Other'; }],
  ['wrong task scope', f => { f.action.task_id = f.action.founder_id; }],
  ['wrong brief scope', f => { f.action.brief_hash = 'f'.repeat(64); }],
  ['wrong key', f => { f.options.readPrivateKey = () => generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }); }],
  ['registration-only action', f => { f.config.grant.registration.event_name = 'customer.registration'; f.action.event_name = 'customer.registration'; f.repin(); }],
  ['browser approval boolean', f => { f.action.activated = true; }],
  ['unverified association', f => { f.config.grant.registration.stripe_binding = null; f.repin(); }],
  ['expired occurrence', f => { f.action.occurred_at = '2026-10-18T00:00:00Z'; }],
  ['revoked grant export', f => { f.config.grant.revoked_at = '2026-10-16T00:30:00Z'; }],
  ['arbitrary upload origin', f => { f.config.canonical_origin = 'https://elsewhere.test'; }],
]) test(`refuses ${name} before value evidence is returned`, () => {
  const f = fixture(); mutate(f); assert.throws(() => createValueEvidence(f.input, f.options));
});

test('changed action payload retains identity so SQL can reject conflicting retries', () => {
  const f = fixture(); const first = createValueEvidence(f.input, f.options); f.action.readback_digest = 'f'.repeat(64); const changed = createValueEvidence(f.input, f.options);
  assert.equal(first.envelope.event_id, changed.envelope.event_id);
  assert.notEqual(first.signature, changed.signature);
});

test('submission sends only signed evidence to the canonical endpoint without service or bearer headers', async () => {
  const f = fixture(); const document = createValueEvidence(f.input, f.options); const calls = [];
  const result = await submitValueEvidence({ config: f.config, document }, { fetchImpl: async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ eventId: f.action.task_id, admittedAt: '2026-10-16T01:00:01Z' })); } });
  assert.equal(result.admitted_record_id, f.action.task_id);
  assert.equal(calls[0].url, 'https://unite-group.in/api/integrations/idea-evidence');
  assert.equal(calls[0].options.headers.authorization, undefined);
  assert.equal(calls[0].options.headers.apikey, undefined);
  assert.equal(calls[0].options.redirect, 'error');
  assert.deepEqual(JSON.parse(calls[0].options.body), document);
});

for (const [name, response] of [
  ['redirect', () => new Response('', { status: 307, headers: { location: 'https://elsewhere.test' } })],
  ['zero admission identity', () => new Response('{}')],
  ['oversized admission response', () => new Response('x'.repeat(1_048_577))],
]) test(`submission refuses ${name}`, async () => {
  const f = fixture(); const document = createValueEvidence(f.input, f.options);
  await assert.rejects(() => submitValueEvidence({ config: f.config, document }, { fetchImpl: async () => response() }));
});

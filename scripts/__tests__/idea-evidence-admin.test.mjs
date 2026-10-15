import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { canonicalEvidenceJson, hashIdeaEvidence } from '../../apps/web/src/lib/command-centre/idea-evidence-contracts.ts';
import { boundedJson, planAdminOperation, runEvidenceAdmin, supabaseOrigin } from '../idea-evidence-admin.mjs';

const env = { SUPABASE_URL: 'https://jhqjxomxlvvmjslgzqhd.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-credential' };
const source = { source_id: 'factory.handoff', version: 1, kind: 'builtin_factory', event_kind: 'reviewed_handoff_persisted', adapter_version: 'factory_handoff_v1', repository: 'CleanExpo/Unite-Group', product_id: 'factory', environment: 'staging', public_key: null };
const grant = { grant_id: '11111111-1111-4111-8111-111111111111', version: 1, source_id: source.source_id, source_version: 1, founder_id: '22222222-2222-4222-8222-222222222222', task_id: '33333333-3333-4333-8333-333333333333', lifecycle_revision: 1, brief_hash: 'a'.repeat(64), outcome_hash: null, outcome_canonical: 'null', repository: source.repository, product_id: 'factory', release_id: 'source.head', environment: 'staging', subject: { namespace: 'factory_operator', id: 'operator' }, event_name: 'factory.handoff', contract_hash: 'b'.repeat(64), valid_from: '2026-10-16T00:00:00Z', valid_until: '2026-10-17T00:00:00Z' };
const clone = value => structuredClone(value);
const response = value => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });

function operationFixture(operation = 'enroll-source') {
  const kind = operation.endsWith('grant') ? 'grant' : 'source';
  const registration = clone(kind === 'grant' ? grant : source);
  const input = operation.startsWith('enroll-') ? { operation, registration } : { operation, id: registration[`${kind}_id`], version: 1, reason: 'Prospective operator revocation.' };
  const row = { [`${kind}_id`]: registration[`${kind}_id`], version: 1, ...(kind === 'grant' ? { source_id: grant.source_id, source_version: 1, founder_id: grant.founder_id, task_id: grant.task_id } : {}), registration, canonical_registration: canonicalEvidenceJson(registration), registration_hash: hashIdeaEvidence(registration), enrolled_at: '2026-10-16T00:00:00Z', revoked_at: operation.startsWith('revoke-') ? '2026-10-16T01:00:00Z' : null, revocation_reason: operation.startsWith('revoke-') ? input.reason : null };
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({ url, options }); return response(calls.length === 1 ? row : [row]); };
  return { input, row, calls, fetchImpl };
}

test('defaults to a validated dry run without credentials or network requests', async () => {
  const f = operationFixture(); const result = await runEvidenceAdmin(f.input, { env: { SUPABASE_URL: env.SUPABASE_URL }, fetchImpl: f.fetchImpl });
  assert.equal(result.status, 'dry_run');
  assert.equal(f.calls.length, 0);
  assert.equal(JSON.stringify(result).includes('credential'), false);
});

for (const operation of ['enroll-source', 'enroll-grant', 'revoke-source', 'revoke-grant']) test(`executes ${operation} only through its RPC and exact canonical readback`, async () => {
  const f = operationFixture(operation); const result = await runEvidenceAdmin(f.input, { execute: true, env, fetchImpl: f.fetchImpl });
  assert.equal(result.status, 'confirmed');
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0].url, `${env.SUPABASE_URL}/rest/v1/rpc/${planAdminOperation(f.input).rpc}`);
  assert.equal(f.calls[1].options.method, 'GET');
  assert.equal(f.calls[0].options.redirect, 'error');
  assert.equal(f.calls[0].options.headers.authorization, `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
  assert.equal(JSON.stringify(result).includes(env.SUPABASE_SERVICE_ROLE_KEY), false);
});

test('withdrawal confirms append-only document and independent row readback', async () => {
  const input = { operation: 'withdraw', event_id: grant.task_id, withdrawal_id: 'withdraw.v1.control', reason: 'Incorrect evidence quarantined.' };
  const document = { withdrawal_of: input.event_id, reason: input.reason };
  const row = { id: grant.grant_id, source_id: source.source_id, source_version: 1, grant_id: grant.grant_id, grant_version: 1, founder_id: grant.founder_id, task_id: grant.task_id, record_kind: 'withdrawal', withdrawal_of: input.event_id, event_id: input.withdrawal_id, envelope: document, canonical_envelope: canonicalEvidenceJson(document), payload_hash: hashIdeaEvidence(document), occurred_at: '2026-10-16T01:00:00Z', admitted_at: '2026-10-16T01:00:00Z', signature: null };
  let requests = 0;
  const result = await runEvidenceAdmin(input, { execute: true, env, fetchImpl: async () => response(++requests === 1 ? row : [row]) });
  assert.equal(result.status, 'confirmed');
  assert.equal(requests, 2);
});

function postgresWithdrawalFixture() {
  const input = { operation: 'withdraw', event_id: grant.task_id, withdrawal_id: 'withdraw.postgres.control', reason: 'Incorrect evidence quarantined.' };
  // PostgreSQL jsonb::text orders these keys and includes separators' spaces.
  const canonical = '{"reason": "Incorrect evidence quarantined.", "withdrawal_of": "33333333-3333-4333-8333-333333333333"}';
  const row = { id: grant.grant_id, source_id: source.source_id, source_version: 1, grant_id: grant.grant_id, grant_version: 1, founder_id: grant.founder_id, task_id: grant.task_id, record_kind: 'withdrawal', withdrawal_of: input.event_id, event_id: input.withdrawal_id, envelope: JSON.parse(canonical), canonical_envelope: canonical, payload_hash: createHash('sha256').update(canonical, 'utf8').digest('hex'), occurred_at: '2026-10-15T20:24:27.815266+00:00', admitted_at: '2026-10-15T20:24:27.815266+00:00', signature: null };
  return { input, row };
}

test('withdrawal accepts PostgreSQL jsonb text and its exact stored UTF-8 hash', async () => {
  const { input, row } = postgresWithdrawalFixture(); let requests = 0;
  const result = await runEvidenceAdmin(input, { execute: true, env, fetchImpl: async () => response(++requests === 1 ? row : [row]) });
  assert.equal(result.status, 'confirmed');
  assert.equal(requests, 2);
});

test('withdrawal still rejects changed canonical meaning and hashes of different stored bytes', async () => {
  for (const mutate of [
    row => { row.canonical_envelope = row.canonical_envelope.replace('Incorrect evidence quarantined.', 'Changed reason.'); row.payload_hash = createHash('sha256').update(row.canonical_envelope, 'utf8').digest('hex'); },
    row => { row.payload_hash = hashIdeaEvidence(row.envelope); },
  ]) {
    const { input, row } = postgresWithdrawalFixture(); mutate(row); let requests = 0;
    await assert.rejects(() => runEvidenceAdmin(input, { execute: true, env, fetchImpl: async () => response(++requests === 1 ? row : [row]) }), /Withdrawal readback mismatch/);
  }
});

for (const url of ['http://jhqjxomxlvvmjslgzqhd.supabase.co', 'https://other.supabase.co', 'https://jhqjxomxlvvmjslgzqhd.supabase.co.evil.test', 'https://user@jhqjxomxlvvmjslgzqhd.supabase.co', 'https://jhqjxomxlvvmjslgzqhd.supabase.co?redirect=evil', 'https://jhqjxomxlvvmjslgzqhd.supabase.co/rest/v1', ' https://jhqjxomxlvvmjslgzqhd.supabase.co']) test(`rejects unapproved database URL ${url}`, () => {
  assert.throws(() => supabaseOrigin(url), /Unapproved/);
});

test('missing service credential refuses execute before the first request', async () => {
  const f = operationFixture();
  await assert.rejects(() => runEvidenceAdmin(f.input, { execute: true, env: { SUPABASE_URL: env.SUPABASE_URL }, fetchImpl: f.fetchImpl }), /credential/);
  assert.equal(f.calls.length, 0);
});

for (const [name, mutate] of [
  ['zero rows', () => []],
  ['duplicate rows', row => [row, row]],
  ['wrong row identity', row => [{ ...row, source_id: 'other.source' }]],
  ['changed canonical registration', row => [{ ...row, canonical_registration: '{}' }]],
  ['changed registration hash', row => [{ ...row, registration_hash: 'f'.repeat(64) }]],
]) test(`rejects ${name} in independent admin readback`, async () => {
  const f = operationFixture(); let requests = 0;
  await assert.rejects(() => runEvidenceAdmin(f.input, { execute: true, env, fetchImpl: async () => response(++requests === 1 ? f.row : mutate(f.row)) }), /readback/);
});

test('strict operation validation forbids SQL and private-key registration fields', () => {
  assert.throws(() => planAdminOperation({ operation: 'sql', sql: 'select 1' }), /Unsupported/);
  assert.throws(() => planAdminOperation({ operation: 'enroll-source', registration: { ...source, private_key: 'forbidden' } }));
});

for (const [name, makeResponse] of [
  ['redirect', () => new Response('', { status: 302, headers: { location: 'https://elsewhere.test' } })],
  ['declared response overflow', () => new Response('{}', { headers: { 'content-length': '1048577' } })],
  ['streamed response overflow', () => new Response('x'.repeat(1_048_577))],
]) test(`bounded transport refuses ${name}`, async () => {
  await assert.rejects(() => boundedJson(`${env.SUPABASE_URL}/rest/v1/control`, { method: 'GET', fetchImpl: async () => makeResponse() }), /failed|too large/);
});

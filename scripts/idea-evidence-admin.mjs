#!/usr/bin/env node
/** Governed service-only enrollment operations. Dry run unless --execute is explicit. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalEvidenceJson, hashIdeaEvidence, ideaEvidenceGrantSchema, ideaEvidenceSourceRegistrationSchema } from '../apps/web/src/lib/command-centre/idea-evidence-contracts.ts';

const need = (condition, message) => { if (!condition) throw new Error(message); };
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX_BYTES = 1_048_576;
const PROJECTS = ['lksfwktwtmyznckodsau', 'jhqjxomxlvvmjslgzqhd'];
const strict = (value, keys) => need(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','), 'Invalid operation fields');

export function supabaseOrigin(value) {
  const url = new URL(value);
  need(PROJECTS.some(project => url.origin === `https://${project}.supabase.co`) && (value === url.origin || value === `${url.origin}/`), 'Unapproved Supabase origin');
  return url.origin;
}

/** A bounded, no-redirect JSON exchange. Error messages never contain response bodies or credentials. */
export async function boundedJson(url, { method, body, headers = {}, fetchImpl = fetch }) {
  const text = body === undefined ? undefined : JSON.stringify(body);
  need(text === undefined || Buffer.byteLength(text) <= MAX_BYTES, 'Evidence request too large');
  const response = await fetchImpl(url, { method, body: text, headers: { accept: 'application/json', ...(text === undefined ? {} : { 'content-type': 'application/json' }), ...headers }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (response.status < 200 || response.status >= 300 || response.redirected) { await response.body?.cancel(); throw new Error('Evidence request failed'); }
  const length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) { await response.body?.cancel(); throw new Error('Evidence response too large'); }
  const reader = response.body?.getReader();
  need(reader, 'Missing evidence response');
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Evidence response too large'); }
      chunks.push(part.value);
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } finally { reader.releaseLock(); }
}

export function planAdminOperation(input) {
  need(input && typeof input === 'object', 'Operation required');
  const operation = input.operation;
  if (operation === 'enroll-source' || operation === 'enroll-grant') {
    strict(input, ['operation', 'registration']);
    const kind = operation === 'enroll-source' ? 'source' : 'grant';
    const registration = (kind === 'source' ? ideaEvidenceSourceRegistrationSchema : ideaEvidenceGrantSchema).parse(input.registration);
    const key = `${kind}_id`;
    return { operation, kind, table: `cc_idea_evidence_${kind}s`, key, id: registration[key], version: registration.version, registration, rpc: `cc_idea_evidence_enroll_${kind}_v1`, params: { p_registration: registration, p_canonical: canonicalEvidenceJson(registration) } };
  }
  if (operation === 'revoke-source' || operation === 'revoke-grant') {
    strict(input, ['operation', 'id', 'version', 'reason']);
    const kind = operation === 'revoke-source' ? 'source' : 'grant';
    need(typeof input.id === 'string' && (kind === 'source' ? ID : UUID).test(input.id) && Number.isSafeInteger(input.version) && input.version > 0 && typeof input.reason === 'string' && input.reason.trim().length > 0 && input.reason.length <= 2000, 'Invalid revocation');
    const key = `${kind}_id`;
    return { operation, kind, table: `cc_idea_evidence_${kind}s`, key, id: input.id, version: input.version, reason: input.reason, rpc: `cc_idea_evidence_revoke_${kind}_v1`, params: { [`p_${key}`]: input.id, [`p_${kind}_version`]: input.version, p_reason: input.reason } };
  }
  if (operation === 'withdraw') {
    strict(input, ['operation', 'event_id', 'withdrawal_id', 'reason']);
    need(typeof input.event_id === 'string' && UUID.test(input.event_id) && typeof input.withdrawal_id === 'string' && ID.test(input.withdrawal_id) && typeof input.reason === 'string' && input.reason.trim().length > 0 && input.reason.length <= 2000, 'Invalid withdrawal');
    return { operation, table: 'cc_idea_evidence_events', key: 'id', id: input.event_id, withdrawal_id: input.withdrawal_id, reason: input.reason, rpc: 'cc_idea_evidence_withdraw_v1', params: { p_event_id: input.event_id, p_withdrawal_id: input.withdrawal_id, p_reason: input.reason } };
  }
  throw new Error('Unsupported evidence operation');
}

function confirmRegistration(row, plan) {
  need(row && row[plan.key] === plan.id && row.version === plan.version, 'Registration readback identity mismatch');
  const parsed = (plan.kind === 'source' ? ideaEvidenceSourceRegistrationSchema : ideaEvidenceGrantSchema).parse(row.registration);
  need(parsed[plan.key] === plan.id && parsed.version === plan.version && canonicalEvidenceJson(parsed) === row.canonical_registration && hashIdeaEvidence(parsed) === row.registration_hash, 'Registration readback integrity mismatch');
  if (plan.kind === 'grant') for (const key of ['source_id', 'source_version', 'founder_id', 'task_id']) need(row[key] === parsed[key], 'Grant row scope mismatch');
  if (plan.registration) need(canonicalEvidenceJson(parsed) === canonicalEvidenceJson(plan.registration), 'Enrolled registration differs');
  else need(typeof row.revoked_at === 'string' && Number.isFinite(Date.parse(row.revoked_at)) && row.revocation_reason === plan.reason, 'Revocation not confirmed');
}

export async function runEvidenceAdmin(input, { execute = false, env = process.env, fetchImpl = fetch } = {}) {
  need(typeof execute === 'boolean', 'Explicit boolean execute mode required');
  const plan = planAdminOperation(input);
  const origin = supabaseOrigin(env.SUPABASE_URL);
  const summary = { operation: plan.operation, id: plan.id, ...(plan.version ? { version: plan.version } : {}), request_digest: hashIdeaEvidence(plan.params), status: 'dry_run' };
  if (!execute) return summary;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  need(typeof key === 'string' && key.length > 0 && key.trim() === key, 'Configured service credential required');
  const headers = { apikey: key, authorization: `Bearer ${key}` };
  const returned = await boundedJson(`${origin}/rest/v1/rpc/${plan.rpc}`, { method: 'POST', body: plan.params, headers, fetchImpl });
  need(returned && typeof returned === 'object' && !Array.isArray(returned), 'Missing RPC row');
  const rowId = plan.operation === 'withdraw' ? returned.id : plan.id;
  need(plan.operation !== 'withdraw' || UUID.test(rowId), 'Invalid withdrawal identity');
  const query = new URLSearchParams({ select: '*', [plan.key]: `eq.${rowId}`, ...(plan.version ? { version: `eq.${plan.version}` } : {}), limit: '2' });
  const rows = await boundedJson(`${origin}/rest/v1/${plan.table}?${query}`, { method: 'GET', headers, fetchImpl });
  need(Array.isArray(rows) && rows.length === 1 && canonicalEvidenceJson(returned) === canonicalEvidenceJson(rows[0]), 'RPC readback missing or changed');
  const row = rows[0];
  if (plan.operation === 'withdraw') {
    const document = { withdrawal_of: plan.id, reason: plan.reason };
    let storedDocument;
    try {
      need(typeof row.canonical_envelope === 'string', 'Withdrawal readback mismatch');
      storedDocument = JSON.parse(row.canonical_envelope);
    } catch { throw new Error('Withdrawal readback mismatch'); }
    need(row.id === rowId && row.record_kind === 'withdrawal' && row.withdrawal_of === plan.id && row.event_id === plan.withdrawal_id && canonicalEvidenceJson(row.envelope) === canonicalEvidenceJson(document) && canonicalEvidenceJson(storedDocument) === canonicalEvidenceJson(document) && row.payload_hash === createHash('sha256').update(row.canonical_envelope, 'utf8').digest('hex'), 'Withdrawal readback mismatch');
    need(ID.test(row.source_id) && [row.source_version, row.grant_version].every(value => Number.isSafeInteger(value) && value > 0) && [row.grant_id, row.founder_id, row.task_id].every(value => typeof value === 'string' && UUID.test(value)) && row.signature === null && [row.occurred_at, row.admitted_at].every(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))), 'Withdrawal row identity incomplete');
  } else confirmRegistration(row, plan);
  return { ...summary, id: rowId, status: 'confirmed', row_digest: hashIdeaEvidence(row) };
}

export async function main(args) {
  need((args.length === 2 || args.length === 3 && args[2] === '--execute') && args[0] === '--input', 'Usage: node scripts/idea-evidence-admin.mjs --input PUBLIC_OPERATION_JSON [--execute]');
  const bytes = readFileSync(args[1]); need(bytes.length <= MAX_BYTES, 'Operation input too large');
  return runEvidenceAdmin(JSON.parse(bytes.toString('utf8')), { execute: args.length === 3 });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await main(process.argv.slice(2)))); }
  catch { console.error('Evidence administration refused; verify operation, configured access and readback.'); process.exitCode = 1; }
}

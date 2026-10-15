#!/usr/bin/env node
// Read-only view of the same founder-authenticated lifecycle used by the web app.
// node scripts/idea-lifecycle-status.mjs --task-id UUID --cookie-env SESSION_COOKIE [--origin https://host] [--json]
import { pathToFileURL } from 'node:url';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 1_048_576;
const fail = message => { throw new Error(message); };
const string = value => typeof value === 'string' && value.length > 0;
const strings = value => Array.isArray(value) && value.every(string);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const clean = value => String(value).replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, ' ').slice(0, 4000);

export function parseArguments(args) {
  const options = { origin: 'http://127.0.0.1:3008', json: false };
  const names = { '--task-id': 'taskId', '--origin': 'origin', '--cookie-env': 'cookieEnv' };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) fail('Duplicate option.');
    seen.add(flag);
    if (flag === '--json') options.json = true;
    else if (names[flag] && args[index + 1] && !args[index + 1].startsWith('--')) options[names[flag]] = args[++index];
    else fail('Usage: --task-id UUID --cookie-env ENV_NAME [--origin ORIGIN] [--json]');
  }
  if (!UUID.test(options.taskId ?? '')) fail('A valid task UUID is required.');
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(options.cookieEnv ?? '')) fail('A session cookie environment variable name is required.');
  let origin;
  try { origin = new URL(options.origin); } catch { fail('Invalid origin.'); }
  if (/[?#@\\]/.test(options.origin) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' ||
    !['https:', 'http:'].includes(origin.protocol) ||
    (origin.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname))) fail('Use an HTTPS origin or local HTTP origin without credentials, path, query or fragment.');
  options.origin = origin.origin;
  return options;
}

export function statusView(data, taskId) {
  const lifecycle = data?.lifecycle;
  const progress = data?.progress;
  if (data?.taskId !== taskId || data.source !== 'supabase' || lifecycle?.kind !== 'idea_to_done' ||
    !string(lifecycle.title) || !integer(lifecycle.revision) || lifecycle.revision < 1 || progress?.revision !== lifecycle.revision ||
    !string(progress.stage) || !string(progress.nextAction) || !strings(progress.blockers) || !Array.isArray(progress.milestones) ||
    !progress.milestones.every(item => string(item.id) && string(item.label) && ['verified', 'ready', 'blocked', 'not_connected'].includes(item.status) && strings(item.evidence))) fail('Invalid lifecycle response.');
  const checkpoint = lifecycle.checkpoint;
  const mandate = lifecycle.mandate;
  const brief = lifecycle.brief;
  if ((checkpoint !== null && (!checkpoint || !['partial', 'blocked', 'complete'].includes(checkpoint.status) || !string(checkpoint.summary) || !string(checkpoint.nextStep))) ||
    (mandate !== null && (!mandate || !integer(mandate.maximumSources) || !Array.isArray(lifecycle.sources) || lifecycle.sources.length > mandate.maximumSources)) ||
    (brief !== null && (!brief || !/^[a-f0-9]{64}$/.test(brief.hash) || !integer(brief.snapshot?.revision))) ||
    (lifecycle.approval !== null && (!brief || brief.snapshot.revision !== lifecycle.revision || lifecycle.approval?.scope !== 'research_brief_only' || lifecycle.approval.revision !== lifecycle.revision || lifecycle.approval.briefHash !== brief.hash))) fail('Invalid lifecycle response.');
  return {
    taskId, title: lifecycle.title, revision: lifecycle.revision, stage: progress.stage,
    checkpoint: checkpoint ? { status: checkpoint.status, summary: checkpoint.summary, nextStep: checkpoint.nextStep } : null,
    brief: brief ? { hash: brief.hash, current: brief.snapshot.revision === lifecycle.revision, researchApproved: lifecycle.approval !== null } : null,
    remainingSources: mandate ? mandate.maximumSources - lifecycle.sources.length : null,
    blockers: progress.blockers, nextAction: progress.nextAction,
    milestones: progress.milestones.map(({ id, label, status, evidence }) => ({ id, label, status, evidence })),
  };
}

export async function readStatus(options, { env = process.env, fetcher = fetch } = {}) {
  const cookie = env[options.cookieEnv];
  if (!string(cookie) || cookie.length > 16384 || /[^\x20-\x7e]/.test(cookie)) fail('Session cookie environment value is missing or invalid.');
  const url = new URL('/api/command-centre/missions/lifecycle', options.origin);
  url.searchParams.set('taskId', options.taskId);
  url.searchParams.set('view', 'status');
  try {
    const response = await fetcher(url, { headers: { accept: 'application/json', cookie }, redirect: 'error', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      await response.body?.cancel();
      const messages = { 401: 'Session unauthorised.', 403: 'Access denied.', 404: 'Mission not found.', 409: 'Lifecycle conflict.', 503: 'Lifecycle storage unavailable.' };
      fail(messages[response.status] ?? 'Lifecycle request failed.');
    }
    if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !response.body) fail('Invalid lifecycle response.');
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_BYTES) { await reader.cancel(); fail('Lifecycle response exceeds size limit.'); }
      chunks.push(part.value);
    }
    let data;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail('Invalid lifecycle response.'); }
    return statusView(data, options.taskId);
  } catch (error) {
    const safe = ['Session unauthorised.', 'Access denied.', 'Mission not found.', 'Lifecycle conflict.', 'Lifecycle storage unavailable.', 'Lifecycle request failed.', 'Invalid lifecycle response.', 'Lifecycle response exceeds size limit.'];
    fail(safe.includes(error?.message) ? error.message : 'Lifecycle request unavailable or timed out.');
  }
}

export function formatStatus(view) {
  return [
    `Unite-Group: ${clean(view.title)}`, `Task: ${view.taskId} | revision ${view.revision} | ${clean(view.stage)}`,
    `Checkpoint: ${view.checkpoint ? `${view.checkpoint.status} — ${clean(view.checkpoint.summary)}; next: ${clean(view.checkpoint.nextStep)}` : 'not recorded'}`,
    `Brief: ${view.brief ? `${view.brief.hash} (${!view.brief.current ? 'stale' : view.brief.researchApproved ? 'research approved' : 'awaiting research approval'})` : 'not proposed'}`,
    `Source allowance remaining: ${view.remainingSources ?? 'not set'}`,
    `Blockers: ${view.blockers.length ? view.blockers.map(clean).join('; ') : 'none recorded'}`,
    `Next action: ${clean(view.nextAction)}`,
    ...view.milestones.map(item => `  [${item.status}] ${clean(item.label)}${item.evidence.length ? ` — ${item.evidence.map(clean).join('; ')}` : ''}`),
  ].join('\n');
}

export async function main(args = process.argv.slice(2), dependencies = {}) {
  const output = dependencies.output ?? console;
  try {
    const options = parseArguments(args);
    const view = await readStatus(options, dependencies);
    output.log(options.json ? JSON.stringify(view, null, 2) : formatStatus(view));
    return 0;
  } catch (error) { output.error(error.message); return 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();

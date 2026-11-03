#!/usr/bin/env node
/**
 * UNI-3147 fleet router. Routes probe requests from an inbox to a fleet machine through the local
 * fleet broker. Probe-only by design: no model, no paid API, no network except the loopback broker.
 *
 * Delivery: a request is claimed (moved out of the inbox) before the broker is called, so a failing
 * disk cannot turn into a stream of duplicate probes. A claim left behind by a crash has an unknown
 * outcome; it goes to rejected/ on the next start instead of being sent again. A claim whose POST
 * failed goes back to the inbox and is retried, so a lost broker response can send one extra probe.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

export const KNOWN_MACHINES = Object.freeze(['mac-mini', 'macbook-pro', 'windows-pc']);
export const KNOWN_REPOS = Object.freeze(['unite-group', 'pi-dev-ops']);
export const FRESH_WINDOW_MS = 45_000;
export const DEFAULT_BROKER = 'http://127.0.0.1:42137';
export const DEFAULT_POLL_MS = 5_000;
export const DEFAULT_DEADMAN_MS = 90_000;
const MAX_NOTE_LENGTH = 200;
const MAX_REQUEST_BYTES = 16 * 1024;
const BROKER_TIMEOUT_MS = 5_000;
const ALLOWED_FIELDS = new Set(['type', 'repo', 'machineId', 'note']);
const SUBDIRS = ['inbox', 'claimed', 'routed', 'rejected', 'tmp'];

export function defaultHome() {
  return process.env.FLEET_ROUTER_HOME || path.join(os.homedir(), '.unite-fleet', 'router');
}

export function log(event, fields = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}

export function validateRequest(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'request_must_be_object' };
  }
  for (const key of Object.keys(value)) {
    if (!ALLOWED_FIELDS.has(key)) return { ok: false, error: `unknown_field:${key}` };
  }
  if (value.type !== 'probe') return { ok: false, error: 'only_probe_is_accepted' };
  if ('repo' in value && !KNOWN_REPOS.includes(value.repo)) return { ok: false, error: 'invalid_repo' };
  if ('machineId' in value && !KNOWN_MACHINES.includes(value.machineId)) {
    return { ok: false, error: 'invalid_machine' };
  }
  if ('note' in value && (typeof value.note !== 'string' || value.note.length > MAX_NOTE_LENGTH)) {
    return { ok: false, error: 'invalid_note' };
  }
  return { ok: true, request: value };
}

export function isFresh(machine, now) {
  if (!Number.isFinite(machine?.lastSeen)) return false;
  const age = now - machine.lastSeen;
  return age >= 0 && age < FRESH_WINDOW_MS;
}

export function eligibleMachines(machines, request, now) {
  return machines.filter((machine) => {
    if (!KNOWN_MACHINES.includes(machine?.machineId)) return false;
    if (!isFresh(machine, now)) return false;
    if (request.machineId && machine.machineId !== request.machineId) return false;
    if (request.repo && machine.repos?.[request.repo]?.available !== true) return false;
    return true;
  });
}

/** Idle before working, then least recently routed, then id order. */
export function chooseMachine(machines, lastRouted = {}) {
  const rank = (machine) => [
    machine.state === 'idle' ? 0 : 1,
    lastRouted[machine.machineId] ?? 0,
  ];
  return [...machines].sort((a, b) => {
    const [aIdle, aSeq] = rank(a);
    const [bIdle, bSeq] = rank(b);
    return aIdle - bIdle || aSeq - bSeq || a.machineId.localeCompare(b.machineId);
  })[0] ?? null;
}

/** Only a loopback http URL is accepted, so a stray env value cannot point the router off this machine. */
export function parseBrokerUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('FLEET_BROKER is not a URL');
  }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || url.username || url.password) {
    throw new Error('FLEET_BROKER must be a loopback http URL');
  }
  return url;
}

export function createBrokerClient(baseUrl) {
  const base = parseBrokerUrl(baseUrl);
  async function request(pathname, options = {}) {
    const response = await fetch(new URL(pathname, base), {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(BROKER_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`broker ${pathname} answered HTTP ${response.status}`);
    return response.json();
  }
  return {
    async status() {
      const body = await request('/status');
      if (!Array.isArray(body?.machines)) throw new Error('broker /status has no machines list');
      return body;
    },
    async enqueueProbe(machineId) {
      const job = await request('/enqueue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'probe', machineId }),
      });
      if (typeof job?.id !== 'string' || !job.id) throw new Error('broker /enqueue returned no job id');
      return job;
    },
  };
}

export function ensureDirs(home) {
  for (const dir of SUBDIRS) fs.mkdirSync(path.join(home, dir), { recursive: true, mode: 0o700 });
}

export function writeJsonAtomic(home, target, value) {
  const tmp = path.join(home, 'tmp', `${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(tmp, target);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function destination(dir, file) {
  const target = path.join(dir, file);
  return fs.existsSync(target) ? path.join(dir, `${randomUUID()}-${file}`) : target;
}

function moveToRejected(home, source, file, error) {
  const target = destination(path.join(home, 'rejected'), file);
  writeJsonAtomic(home, `${target}.error.json`, { file, error, at: new Date().toISOString() });
  fs.renameSync(source, target);
  log('rejected', { file, error });
}

function readRequest(source) {
  const stat = fs.lstatSync(source);
  if (!stat.isFile()) return { ok: false, error: 'not_a_regular_file' };
  if (stat.size > MAX_REQUEST_BYTES) return { ok: false, error: 'request_too_large' };
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(source, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) return { ok: false, error: 'invalid_json' };
    throw error;
  }
  return validateRequest(parsed);
}

/** Rotation decides fairness only, so an unreadable file means a fresh rotation, not a failed loop. */
export function loadRotation(home) {
  const file = path.join(home, 'rotation.json');
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Number.isSafeInteger(saved?.seq) && saved.lastRouted && typeof saved.lastRouted === 'object') {
      return { seq: saved.seq, lastRouted: saved.lastRouted };
    }
    log('rotation_reset', { reason: 'unexpected_shape' });
  } catch (error) {
    if (error?.code !== 'ENOENT') log('rotation_reset', { reason: error.message });
  }
  return { seq: 0, lastRouted: {} };
}

export function createRouterState(home) {
  return { rotation: loadRotation(home), waiting: new Set() };
}

/** A claim still present at start belongs to a run that died mid-send: never resend it blindly. */
export function recoverClaims(home) {
  ensureDirs(home);
  const claimed = path.join(home, 'claimed');
  for (const file of fs.readdirSync(claimed)) {
    moveToRejected(home, path.join(claimed, file), file, 'interrupted_outcome_unknown');
  }
}

function saveRotation(home, rotation) {
  try {
    writeJsonAtomic(home, path.join(home, 'rotation.json'), rotation);
  } catch (error) {
    log('rotation_save_failed', { reason: error.message });
  }
}

async function route(home, broker, state, file, request, machine) {
  const inboxPath = path.join(home, 'inbox', file);
  const claimPath = path.join(home, 'claimed', file);
  fs.renameSync(inboxPath, claimPath);
  let job;
  try {
    job = await broker.enqueueProbe(machine.machineId);
  } catch (error) {
    fs.renameSync(claimPath, inboxPath);
    throw error;
  }
  state.rotation.seq += 1;
  state.rotation.lastRouted[machine.machineId] = state.rotation.seq;
  saveRotation(home, state.rotation);
  const at = new Date().toISOString();
  writeJsonAtomic(home, destination(path.join(home, 'routed'), file), {
    request, machineId: machine.machineId, jobId: job.id, at,
  });
  fs.rmSync(claimPath);
  state.waiting.delete(file);
  log('routed', { file, machineId: machine.machineId, jobId: job.id });
}

/** One pass. Throws on any broker or disk failure so the caller does not count it as a healthy loop. */
export async function routeOnce({ home, broker, state, now = () => Date.now() }) {
  ensureDirs(home);
  const inbox = path.join(home, 'inbox');
  const pending = [];
  for (const file of fs.readdirSync(inbox).sort()) {
    if (file.startsWith('.')) continue;
    const source = path.join(inbox, file);
    const read = file.endsWith('.json') ? readRequest(source) : { ok: false, error: 'not_a_json_file' };
    if (read.ok) pending.push({ file, request: read.request });
    else moveToRejected(home, source, file, read.error);
  }

  // Asked on every pass, even with an empty inbox: this is what proves the broker is reachable.
  const { machines } = await broker.status();
  const at = now();
  const stillWaiting = new Set();
  const summary = { routed: 0, waiting: 0 };
  for (const { file, request } of pending) {
    const machine = chooseMachine(eligibleMachines(machines, request, at), state.rotation.lastRouted);
    if (machine) {
      await route(home, broker, state, file, request, machine);
      summary.routed += 1;
    } else {
      stillWaiting.add(file);
      summary.waiting += 1;
      if (!state.waiting.has(file)) log('no_eligible_machine', { file });
    }
  }
  state.waiting = stillWaiting;
  return summary;
}

export function writeHeartbeat(home, at = Date.now()) {
  writeJsonAtomic(home, path.join(home, 'heartbeat.json'), { lastLoopAt: at, pid: process.pid });
}

/** The heartbeat is written only after a whole pass succeeded. Returns whether the pass was healthy. */
export async function loopOnce(context) {
  try {
    await routeOnce(context);
    writeHeartbeat(context.home, (context.now ?? Date.now)());
    return true;
  } catch (error) {
    log('loop_failed', { reason: error.message });
    return false;
  }
}

/** Uses monotonic time so a wall clock change cannot fire it or hold it off. */
export function createDeadman({ windowMs, clock = () => performance.now() }) {
  let last = clock();
  return {
    alive() { last = clock(); },
    expired() { return clock() - last > windowMs; },
  };
}

export function checkHeartbeat(home, windowMs, now = Date.now()) {
  let beat;
  try {
    beat = JSON.parse(fs.readFileSync(path.join(home, 'heartbeat.json'), 'utf8'));
  } catch (error) {
    return { ok: false, reason: error?.code === 'ENOENT' ? 'heartbeat_missing' : 'heartbeat_unreadable' };
  }
  if (!Number.isFinite(beat?.lastLoopAt)) return { ok: false, reason: 'heartbeat_unreadable' };
  const age = now - beat.lastLoopAt;
  if (age > windowMs || age < -windowMs) return { ok: false, reason: 'heartbeat_stale', ageMs: age };
  return { ok: true, ageMs: age, pid: beat.pid };
}

export function positiveIntegerEnv(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^[1-9][0-9]*$/.test(raw)) throw new Error(`${name} must be a positive whole number of milliseconds`);
  return Number(raw);
}

export function readConfig(env = process.env) {
  const pollMs = positiveIntegerEnv(env, 'FLEET_ROUTER_POLL_MS', DEFAULT_POLL_MS);
  const deadmanMs = positiveIntegerEnv(env, 'FLEET_ROUTER_DEADMAN_MS', DEFAULT_DEADMAN_MS);
  if (deadmanMs <= pollMs) throw new Error('FLEET_ROUTER_DEADMAN_MS must be longer than FLEET_ROUTER_POLL_MS');
  return { pollMs, deadmanMs, brokerUrl: env.FLEET_BROKER || DEFAULT_BROKER, home: defaultHome() };
}

async function run(config) {
  const broker = createBrokerClient(config.brokerUrl);
  recoverClaims(config.home);
  const state = createRouterState(config.home);
  const deadman = createDeadman({ windowMs: config.deadmanMs });
  setInterval(() => {
    if (deadman.expired()) {
      log('deadman_expired', { windowMs: config.deadmanMs });
      process.exit(1);
    }
  }, Math.min(config.pollMs, 5_000));
  log('router_started', { home: config.home, broker: config.brokerUrl, pollMs: config.pollMs });
  for (;;) {
    if (await loopOnce({ home: config.home, broker, state })) deadman.alive();
    await new Promise((resolve) => { setTimeout(resolve, config.pollMs); });
  }
}

async function main(argv) {
  const config = readConfig();
  if (argv.includes('--check')) {
    const result = checkHeartbeat(config.home, config.deadmanMs);
    console.log(JSON.stringify(result));
    process.exit(result.ok ? 0 : 1);
  }
  if (argv.length > 0) throw new Error('usage: router.mjs [--check]');
  await run(config);
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    log('router_fatal', { reason: error.message });
    process.exit(2);
  });
}

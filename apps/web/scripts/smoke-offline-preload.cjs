'use strict';
/**
 * Preload for scripts/smoke-public-routes.mjs (passed through NODE_OPTIONS=--require).
 *
 * The production build inlines NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co, so a server started
 * for the smoke would otherwise make real outbound calls. This replaces globalThis.fetch with a wrapper
 * that refuses every non-loopback URL the way a network outage does (TypeError: fetch failed) and logs
 * one stderr line per blocked host. Next wraps whichever globalThis.fetch exists when it boots
 * (next/dist/server/lib/patch-fetch.js, patchFetch: createDedupeFetch(globalThis.fetch)), so this wrapper
 * stays underneath Next's own caching layer.
 *
 * One deliberate exception, an in-process stub and not a network call: the public card lookup
 * (GET <supabase>/rest/v1/card_profiles) is answered as "Supabase is up and holds no such card", so the
 * unknown-card routes (/c/<slug>) can be smoked for their real not-found behaviour. Set
 * SMOKE_OFFLINE_NO_STUBS=1 to refuse that too and observe the plain-outage behaviour. The stub answers only the
 * app's exact public query (the PUBLIC_COLUMNS list read from src/lib/card/published.ts plus one card_slug
 * equality filter, on smoke-unknown-card -> no row, smoke-published-card -> one published row), and refuses any
 * other query like an outage. It cannot prove the live database accepts the query; it proves the app sends the
 * declared one and renders both the not-found and the published-card branches.
 *
 * node:http and node:https requests to non-loopback hosts are refused too (connection error, no socket
 * opened), for SDKs that do not use fetch. Raw net/tls sockets are not intercepted.
 */

const http = require('node:http');
const https = require('node:https');
const { Socket } = require('node:net');

const realFetch = globalThis.fetch;
const blockedHosts = new Set();
const noStubs = process.env.SMOKE_OFFLINE_NO_STUBS === '1';

function urlOf(input) {
  try {
    if (typeof input === 'string') return new URL(input);
    if (input instanceof URL) return input;
    if (input && typeof input.url === 'string') return new URL(input.url);
  } catch {
    // fall through: unparseable means not loopback
  }
  return null;
}

function isLoopback(url) {
  return url !== null && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
}

function methodOf(input, init) {
  return String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
}

function headerOf(input, init, name) {
  const fromInit = init && init.headers ? new Headers(init.headers).get(name) : null;
  if (fromInit) return fromInit;
  return input && input.headers && typeof input.headers.get === 'function' ? input.headers.get(name) : null;
}

// The columns the app's public card lookup selects, read from the app source so the stub cannot drift from it.
function publicCardColumns() {
  try {
    const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src', 'lib', 'card', 'published.ts'), 'utf8');
    const match = /PUBLIC_COLUMNS\s*=\s*'([^']+)'/.exec(source);
    return match ? match[1].replace(/\s+/g, '') : null;
  } catch {
    return null;
  }
}

const STUB_PUBLISHED_SLUG = 'smoke-published-card';
const STUB_UNKNOWN_SLUG = 'smoke-unknown-card';

function cardLookupStub(url, input, init) {
  if (noStubs) return null;
  if (!url.hostname.endsWith('.supabase.co') || url.pathname !== '/rest/v1/card_profiles') return null;
  if (methodOf(input, init) !== 'GET') return null;
  // Answer only the exact public query: the app's own column list and one card_slug equality filter on a
  // known smoke slug. Anything else (a renamed column, an extra filter, another slug) is refused like an
  // outage, so a broken query fails the smoke with a 500 instead of passing as "no such card".
  const columns = publicCardColumns();
  const names = [...url.searchParams.keys()].sort().join(',');
  const filter = /^eq\.(.+)$/.exec(url.searchParams.get('card_slug') || '');
  if (columns === null || names !== 'card_slug,select' || (url.searchParams.get('select') || '').replace(/\s+/g, '') !== columns || filter === null) return null;
  const headers = { 'Content-Type': 'application/json' };
  if (filter[1] === STUB_PUBLISHED_SLUG) {
    const row = {
      card_slug: STUB_PUBLISHED_SLUG,
      display_name: 'Smoke Test Owner',
      role_title: 'Smoke test role',
      business_name: 'Smoke Test Business',
      email: 'smoke@example.invalid',
      phone: null,
      service_area: null,
      published_at: '2026-01-01T00:00:00.000Z',
    };
    return new Response(JSON.stringify(/vnd\.pgrst\.object/.test(headerOf(input, init, 'accept') || '') ? row : [row]), { status: 200, headers });
  }
  if (filter[1] !== STUB_UNKNOWN_SLUG) return null;
  if (/vnd\.pgrst\.object/.test(headerOf(input, init, 'accept') || '')) {
    return new Response(
      JSON.stringify({ code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' }),
      { status: 406, headers },
    );
  }
  return new Response('[]', { status: 200, headers });
}

function noteBlocked(host) {
  if (!blockedHosts.has(host)) {
    blockedHosts.add(host);
    process.stderr.write(`[smoke-offline] blocked ${host}\n`);
  }
}

const MAX_LOOPBACK_HOPS = 10;

/**
 * A loopback request must stay on loopback. undici follows redirects inside realFetch, so a loopback 302 to a
 * public host would open a socket to it. Fetch with redirect: 'manual' and follow each hop here, refusing any hop
 * whose target is not loopback exactly as a direct fetch to that host would be refused.
 */
async function loopbackFetch(input, init) {
  const mode = (init && init.redirect) || (input && input.redirect) || 'follow';
  if (mode !== 'follow') return realFetch(input, init); // the caller handles (or forbids) redirects itself
  let current = input;
  let currentInit = { ...(init || {}), redirect: 'manual' };
  for (let hop = 0; hop <= MAX_LOOPBACK_HOPS; hop += 1) {
    const response = await realFetch(current, currentInit);
    const location = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
    if (location === null) return response;
    let target = null;
    try {
      target = new URL(location, urlOf(current));
    } catch {
      target = null;
    }
    if (!isLoopback(target)) {
      noteBlocked(target ? `${target.protocol}//${target.host}` : String(location));
      throw new TypeError('fetch failed');
    }
    const method = methodOf(current, currentInit);
    const toGet = response.status === 303 || ((response.status === 301 || response.status === 302) && method === 'POST');
    const headers = currentInit.headers || (current && current.headers) || undefined;
    currentInit = { ...(toGet ? { method: 'GET' } : { method, ...(currentInit.body ? { body: currentInit.body } : {}) }), ...(headers ? { headers } : {}), redirect: 'manual' };
    current = target.href;
  }
  throw new TypeError('fetch failed'); // redirect loop
}

globalThis.fetch = function smokeOfflineFetch(input, init) {
  const url = urlOf(input);
  if (isLoopback(url)) return loopbackFetch(input, init);
  const stub = url ? cardLookupStub(url, input, init) : null;
  if (stub) return Promise.resolve(stub);
  noteBlocked(url ? `${url.protocol}//${url.host}` : String(input));
  return Promise.reject(new TypeError('fetch failed'));
};

/** The host an http(s).request call targets, from its (url?, options?, callback?) arguments. */
function requestHost(args, protocol) {
  let host = null;
  for (const arg of args) {
    if (typeof arg === 'string' || arg instanceof URL) host = urlOf(arg)?.hostname ?? host;
    else if (arg && typeof arg === 'object') host = arg.hostname || (arg.host ? String(arg.host).replace(/:\d+$/, '') : null) || host;
  }
  return { host: host || 'localhost', protocol };
}

function refusingConnection() {
  const socket = new Socket();
  process.nextTick(() => socket.destroy(Object.assign(new Error('connect ECONNREFUSED (smoke offline)'), { code: 'ECONNREFUSED' })));
  return socket;
}

// ClientRequest ignores options.createConnection whenever an agent is in play, so the refusal lives on the agent.
const refusingAgents = new Map();
function refusingAgent(mod) {
  if (!refusingAgents.has(mod)) {
    const agent = new mod.Agent({ keepAlive: false });
    agent.createConnection = refusingConnection;
    refusingAgents.set(mod, agent);
  }
  return refusingAgents.get(mod);
}

for (const [mod, protocol] of [[http, 'http:'], [https, 'https:']]) {
  const realRequest = mod.request;
  const offlineRequest = function smokeOfflineRequest(...args) {
    const { host } = requestHost(args, protocol);
    if (isLoopback({ hostname: host })) return realRequest.apply(mod, args);
    noteBlocked(`${protocol}//${host}`);
    // Same call, but the connection is a socket that fails at once: nothing reaches the network.
    const index = args.findIndex((arg) => arg && typeof arg === 'object' && !(arg instanceof URL));
    const options = { ...(index >= 0 ? args[index] : {}), agent: refusingAgent(mod) };
    const rest = index >= 0 ? args.map((arg, i) => (i === index ? options : arg)) : [args[0], options, ...args.slice(1)].filter((arg) => arg !== undefined);
    return realRequest.apply(mod, typeof rest[0] === 'function' ? [options, rest[0]] : rest);
  };
  mod.request = offlineRequest;
  mod.get = function smokeOfflineGet(...args) {
    const request = offlineRequest(...args);
    request.end();
    return request;
  };
}

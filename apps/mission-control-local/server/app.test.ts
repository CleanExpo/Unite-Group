import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import type { Stats } from 'node:fs';
import { request } from 'node:http';
import type { Server } from 'node:http';
import { homedir, networkInterfaces, tmpdir } from 'node:os';
import { connect } from 'node:net';
import type { AddressInfo } from 'node:net';
import { dirname, join, relative } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { FleetSnapshot } from '../shared/types.ts';
import { DEFAULT_LAYOUTS } from '../shared/widget-catalogue.ts';
import { BIND_HOST, createApp, listen } from './app.ts';
import { checkPrivate, createAuth, loadPasscode, LOCKOUT_MS, MAX_FAILURES, PasscodeConfigError, readCookie } from './auth.ts';
import { readConfig } from './config.ts';
import { createLayoutStore, KEEP_REVISIONS } from './layouts.ts';
import { LOOPBACK, memoryConnection, NEEDS_SOCKET } from './test-transport.ts';

const PASSCODE = 'test-only-passcode';
const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const tmp = mkdtempSync(join(tmpdir(), 'mc-local-'));
const layoutsDir = join(tmp, 'data', 'layouts');
const POSIX = process.platform !== 'win32';
/** The current (highest) revision file for a screen, read straight from disk. */
function screenFile(screen: string, dir = layoutsDir): string {
  const revisions = readdirSync(dir)
    .map((f) => new RegExp(`^screen-${screen}[.]r([0-9]+)[.]json$`).exec(f)?.[1])
    .filter((r): r is string => r !== undefined)
    .map(Number);
  return join(dir, `screen-${screen}.r${Math.max(...revisions)}.json`);
}
/** Reads the screen's current revision, then writes based on it, as a window would. */
async function put(screen: string, items: unknown, extra: { body?: string } = {}) {
  const { revision } = JSON.parse((await send('GET', `/api/layouts/${screen}`, { cookie })).body);
  return send('PUT', `/api/layouts/${screen}`, { cookie, ifMatch: `"${revision}"`, body: extra.body ?? JSON.stringify({ items }) });
}
async function del(screen: string) {
  const { revision } = JSON.parse((await send('GET', `/api/layouts/${screen}`, { cookie })).body);
  return send('DELETE', `/api/layouts/${screen}`, { cookie, ifMatch: `"${revision}"` });
}
const clientDir = join(tmp, 'client');
mkdirSync(join(clientDir, 'assets'), { recursive: true });
writeFileSync(join(clientDir, 'index.html'), '<title>client shell</title>');
writeFileSync(join(clientDir, 'assets', 'app-abc.js'), 'console.log("bundle")');
writeFileSync(join(tmp, 'outside.js'), 'outside the client dir');

let fleetReply: FleetSnapshot = { status: 'down', reason: 'unreachable', fetchedAt: 1, lastGoodAt: null };
let server: Server;
let port: number;
let cookie: string;

interface Reply {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

function send(
  method: string,
  path: string,
  options: { host?: string; origin?: string | null; cookie?: string; body?: string; ifMatch?: string } = {},
): Promise<Reply> {
  const host = options.host ?? `127.0.0.1:${port}`;
  const origin = options.origin === undefined && method !== 'GET' ? `http://${host}` : options.origin;
  return new Promise((resolve, reject) => {
    const req = request(
      {
        ...(LOOPBACK
          ? { host: '127.0.0.1', port }
          : { createConnection: () => memoryConnection(server) }),
        method,
        path,
        headers: {
          Host: host,
          ...(origin ? { Origin: origin } : {}),
          ...(options.cookie ? { Cookie: options.cookie } : {}),
          ...(options.ifMatch === undefined ? {} : { 'If-Match': options.ifMatch }),
          ...(options.body === undefined ? {} : { 'Content-Length': Buffer.byteLength(options.body) }),
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
      },
    );
    req.on('error', reject);
    req.end(options.body);
  });
}

before(async () => {
  server = createApp({
    auth: createAuth(PASSCODE),
    layouts: createLayoutStore(layoutsDir),
    fleet: async () => fleetReply,
    clientDir,
  });
  if (LOOPBACK) {
    await listen(server, 0);
    port = (server.address() as AddressInfo).port;
  } else {
    port = 0; // An in-memory stream has no local port, and the app reads it as 0.
  }
  const login = await send('POST', '/login', { body: `passcode=${PASSCODE}` });
  assert.equal(login.status, 303);
  cookie = String(login.headers['set-cookie']).split(';')[0] ?? '';
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test('socket tests skip only when sockets were refused, and never in CI', () => {
  assert.equal(Boolean(NEEDS_SOCKET), !LOOPBACK);
  if (process.env.CI) assert.equal(LOOPBACK, true);
});

test('the server is bound to 127.0.0.1 and nothing else', { skip: NEEDS_SOCKET }, async () => {
  assert.equal(BIND_HOST, '127.0.0.1');
  assert.deepEqual(server.address(), { address: '127.0.0.1', family: 'IPv4', port });
  // Behaviour, not just the reported address: other interfaces on this host refuse.
  const others = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n!.address);
  for (const address of others) {
    const reached = await new Promise<boolean>((resolve) => {
      const socket = connect({ host: address, port, timeout: 500 });
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => resolve(false));
      socket.once('timeout', () => { socket.destroy(); resolve(false); });
    });
    assert.equal(reached, false, `reachable on ${address}`);
  }
});

test('no source file passes a bind address other than BIND_HOST, and env cannot change it', () => {
  const listens = ['app.ts', 'main.ts', 'config.ts'].map((f) => readFileSync(join(APP_ROOT, 'server', f), 'utf8'));
  assert.equal(listens.join('\n').match(/\.listen\(/g)?.length, 1);
  assert.ok(listens[0]?.includes('server.listen(port, BIND_HOST,'));
  assert.ok(!Object.keys(readConfig({ MC_HOST: '0.0.0.0', HOST: '0.0.0.0' })).some((k) => /host/i.test(k)));
});

test('signed out: pages redirect to login and the API and bundle are closed', async () => {
  for (const path of ['/', '/screen/1', '/screen/2', '/assets/app-abc.js']) {
    const reply = await send('GET', path);
    assert.equal(reply.status, 303, path);
    assert.equal(reply.headers.location, '/login');
    assert.ok(!reply.body.includes('bundle'));
  }
  for (const path of ['/api/fleet', '/api/layouts/1']) {
    assert.equal((await send('GET', path)).status, 401, path);
  }
  assert.equal((await send('PUT', '/api/layouts/1', { body: '{"items":[]}' })).status, 401);
  assert.equal((await send('GET', '/screen/1', { cookie: 'mc_session=made-up' })).status, 303);
});

test('signed in: both screens and the bundle are served, and other screens are not', async () => {
  for (const path of ['/screen/1', '/screen/2']) {
    const reply = await send('GET', path, { cookie });
    assert.equal(reply.status, 200, path);
    assert.ok(reply.body.includes('client shell'));
  }
  assert.equal((await send('GET', '/assets/app-abc.js', { cookie })).status, 200);
  assert.equal((await send('GET', '/screen/3', { cookie })).status, 404);
  assert.equal((await send('GET', '/api/layouts/3', { cookie })).status, 404);
  assert.equal((await send('GET', '/', { cookie })).headers.location, '/screen/1');
});

test('asset paths cannot leave the client directory', async () => {
  for (const path of ['/assets/../../outside.js', '/assets/..%2f..%2foutside.js', '/assets/%2e%2e%2foutside.js', '/assets/index.html']) {
    const reply = await send('GET', path, { cookie });
    assert.ok(!reply.body.includes('outside the client dir'), path);
    assert.notEqual(reply.status, 200, path);
  }
});

test('only .js and .css files are served from the assets folder', async () => {
  writeFileSync(join(clientDir, 'assets', 'app-abc.js.map'), 'source map text');
  const reply = await send('GET', '/assets/app-abc.js.map', { cookie });
  assert.equal(reply.status, 404);
  assert.ok(!reply.body.includes('source map text'));
});

test('the session cookie is HttpOnly and SameSite=Strict, and the passcode is never echoed', async () => {
  const login = await send('POST', '/login', { body: `passcode=${PASSCODE}` });
  const header = String(login.headers['set-cookie']);
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Strict/);
  assert.ok(!header.includes(PASSCODE));
  const wrong = await send('POST', '/login', { body: 'passcode=wrong-guess-value' });
  assert.equal(wrong.status, 401);
  assert.ok(!wrong.body.includes('wrong-guess-value'));
  assert.ok(!(await send('GET', '/login')).body.includes(PASSCODE));
});

test('a foreign Host is refused, which is the DNS-rebinding defence', async () => {
  for (const host of ['evil.example', `evil.example:${port}`, '127.0.0.1:1', '0.0.0.0']) {
    assert.equal((await send('GET', '/screen/1', { host, cookie })).status, 421, host);
  }
  assert.equal((await send('GET', '/login', { host: `localhost:${port}` })).status, 200);
});

test('writes with a foreign or missing Origin are refused, session or not', async () => {
  const body = JSON.stringify({ items: [] });
  for (const origin of ['http://evil.example', 'null', `https://127.0.0.1:${port}`, 'http://127.0.0.1:1', null]) {
    for (const method of ['PUT', 'DELETE']) {
      const reply = await send(method, '/api/layouts/1', { cookie, origin, body });
      assert.equal(reply.status, 403, `${method} ${origin}`);
    }
    assert.equal((await send('POST', '/login', { origin, body: `passcode=${PASSCODE}` })).status, 403);
  }
});

test('security headers are on every response', async () => {
  for (const path of ['/login', '/api/fleet']) {
    const { headers } = await send('GET', path);
    assert.match(String(headers['content-security-policy']), /default-src 'none'/);
    assert.equal(headers['x-frame-options'], 'DENY');
    assert.equal(headers['x-content-type-options'], 'nosniff');
    assert.equal(headers['cache-control'], 'no-store');
    // no-referrer would make browsers send Origin: null, locking the owner out.
    assert.equal(headers['referrer-policy'], 'same-origin');
  }
});

test('logout ends the session on the server', async () => {
  const login = await send('POST', '/login', { body: `passcode=${PASSCODE}` });
  const own = String(login.headers['set-cookie']).split(';')[0] ?? '';
  assert.equal((await send('GET', '/api/layouts/1', { cookie: own })).status, 200);
  assert.equal((await send('POST', '/logout', { cookie: own })).status, 303);
  assert.equal((await send('GET', '/api/layouts/1', { cookie: own })).status, 401);
});

test('layouts: default, save per screen, survive a new store, reset one screen only', async () => {
  const first = JSON.parse((await send('GET', '/api/layouts/1', { cookie })).body);
  assert.equal(first.source, 'default');
  assert.deepEqual(first.items, DEFAULT_LAYOUTS['1']);

  const screenOne = [{ i: 'clock', x: 2, y: 1, w: 3, h: 3 }];
  const screenTwo = [{ i: 'job-queue', x: 0, y: 0, w: 6, h: 6 }];
  assert.equal((await put('1', screenOne)).status, 200);
  assert.equal((await put('2', screenTwo)).status, 200);

  assert.deepEqual(JSON.parse(readFileSync(screenFile('1'), 'utf8')).items, screenOne);
  assert.deepEqual(JSON.parse(readFileSync(screenFile('2'), 'utf8')).items, screenTwo);
  // Windows has no POSIX modes; Linux CI runs this line.
  if (POSIX) assert.equal(statSync(screenFile('1')).mode & 0o777, 0o600);

  const reopened = await createLayoutStore(layoutsDir).get('1');
  assert.deepEqual(reopened.items, screenOne);
  assert.equal(reopened.source, 'saved');

  const reset = JSON.parse((await del('1')).body);
  assert.equal(reset.source, 'default');
  assert.deepEqual(reset.items, DEFAULT_LAYOUTS['1']);
  const other = JSON.parse((await send('GET', '/api/layouts/2', { cookie })).body);
  assert.deepEqual(other.items, screenTwo);
});

test('an empty saved layout stays empty and is not replaced by the default', async () => {
  await put('2', []);
  const reply = JSON.parse((await send('GET', '/api/layouts/2', { cookie })).body);
  assert.deepEqual(reply.items, []);
  assert.equal(reply.source, 'saved');
});

test('bad layout bodies are refused and change nothing', async () => {
  await put('1', []);
  const before = screenFile('1');
  const beforeBody = readFileSync(before, 'utf8');
  const bodies = ['not json', 'null', '{}', '{"items":[{"i":"nope","x":0,"y":0,"w":1,"h":1}]}'];
  for (const body of bodies) assert.equal((await put('1', null, { body })).status, 400, body);
  const huge = JSON.stringify({ items: [], pad: 'x'.repeat(70 * 1024) });
  assert.equal((await put('1', null, { body: huge })).status, 413);
  assert.equal(screenFile('1'), before);
  assert.equal(readFileSync(before, 'utf8'), beforeBody);
});

const clockAt = (x: number) => [{ i: 'clock', x, y: 0, w: 2, h: 2 }];

test('layout revision: GET carries the revision and ETag, and each write moves it on by one', async () => {
  const got = await send('GET', '/api/layouts/2', { cookie });
  const { revision } = JSON.parse(got.body);
  assert.equal(got.headers.etag, `"${revision}"`);
  const saved = await send('PUT', '/api/layouts/2', { cookie, ifMatch: `"${revision}"`, body: '{"items":[]}' });
  assert.equal(saved.status, 200);
  assert.equal(JSON.parse(saved.body).revision, revision + 1);
  assert.equal(saved.headers.etag, `"${revision + 1}"`);
  const fresh = await createLayoutStore(mkdtempSync(join(tmpdir(), 'mc-rev0-'))).get('1');
  assert.equal(fresh.revision, 0);
});

test('layout revision: a write with no revision is refused with 428 and changes nothing', async () => {
  await put('1', []);
  const before = screenFile('1');
  assert.equal((await send('PUT', '/api/layouts/1', { cookie, body: '{"items":[]}' })).status, 428);
  assert.equal((await send('DELETE', '/api/layouts/1', { cookie })).status, 428);
  assert.equal(screenFile('1'), before);
});

test('layout revision: malformed revisions are refused, including the * wildcard', async () => {
  for (const ifMatch of ['*', 'W/"1"', '"abc"', '1', '"-1"', '"1", "2"']) {
    assert.equal((await send('PUT', '/api/layouts/1', { cookie, ifMatch, body: '{"items":[]}' })).status, 400, ifMatch);
  }
  for (const revision of ['1', -1, 1.5, null]) {
    const body = JSON.stringify({ items: [], revision });
    assert.equal((await send('PUT', '/api/layouts/1', { cookie, body })).status, 400, String(revision));
  }
});

test('layout revision: a stale write gets 409 with the current layout and revision, and changes nothing', async () => {
  const mine = [{ i: 'clock', x: 0, y: 0, w: 2, h: 2 }];
  const theirs = [{ i: 'job-queue', x: 1, y: 1, w: 4, h: 4 }];
  const { revision: seen } = JSON.parse((await send('GET', '/api/layouts/1', { cookie })).body);
  // Another window saves first.
  const other = await send('PUT', '/api/layouts/1', { cookie, ifMatch: `"${seen}"`, body: JSON.stringify({ items: theirs }) });
  assert.equal(other.status, 200);
  const onDisk = screenFile('1');
  const stale = await send('PUT', '/api/layouts/1', { cookie, ifMatch: `"${seen}"`, body: JSON.stringify({ items: mine }) });
  assert.equal(stale.status, 409);
  const body = JSON.parse(stale.body);
  assert.equal(body.error, 'layout-changed');
  assert.deepEqual(body.current.items, theirs);
  assert.equal(body.current.revision, seen + 1);
  assert.equal(stale.headers.etag, `"${seen + 1}"`);
  assert.equal(screenFile('1'), onDisk);
  assert.deepEqual(JSON.parse(readFileSync(onDisk, 'utf8')).items, theirs);
  const staleReset = await send('DELETE', '/api/layouts/1', { cookie, ifMatch: `"${seen}"` });
  assert.equal(staleReset.status, 409);
  assert.equal(screenFile('1'), onDisk);
});

test('layout revision: If-Match wins over a body revision, and a body revision alone works', async () => {
  const { revision } = JSON.parse((await send('GET', '/api/layouts/2', { cookie })).body);
  const viaBody = await send('PUT', '/api/layouts/2', { cookie, body: JSON.stringify({ items: [], revision }) });
  assert.equal(viaBody.status, 200);
  // The body names the right revision but the header names a stale one: the header decides.
  const body = JSON.stringify({ items: [], revision: revision + 1 });
  assert.equal((await send('PUT', '/api/layouts/2', { cookie, ifMatch: `"${revision}"`, body })).status, 409);
});

test('layout revision: concurrent writes on one revision produce exactly one winner', async () => {
  const { revision } = JSON.parse((await send('GET', '/api/layouts/1', { cookie })).body);
  const items = (x: number) => [{ i: 'clock', x, y: 0, w: 2, h: 2 }];
  const replies = await Promise.all(
    Array.from({ length: 6 }, (_, n) =>
      send('PUT', '/api/layouts/1', { cookie, ifMatch: `"${revision}"`, body: JSON.stringify({ items: items(n) }) }),
    ),
  );
  const winners = replies.filter((r) => r.status === 200);
  assert.equal(winners.length, 1);
  assert.equal(replies.filter((r) => r.status === 409).length, 5);
  assert.deepEqual(JSON.parse(readFileSync(screenFile('1'), 'utf8')).items, JSON.parse(winners[0]!.body).items);
  assert.ok(!readdirSync(layoutsDir).some((f) => f.endsWith('.tmp')));
});

test('layout revision: two server instances racing on one screen and revision never both win', async () => {
  const mine = [{ i: 'clock', x: 0, y: 0, w: 2, h: 2 }];
  const theirs = [{ i: 'job-queue', x: 0, y: 0, w: 4, h: 4 }];
  for (let run = 0; run < 30; run += 1) {
    const dir = mkdtempSync(join(tmpdir(), 'mc-race-'));
    const [a, b] = await Promise.all([createLayoutStore(dir).save('1', mine, 0), createLayoutStore(dir).save('1', theirs, 0)]);
    assert.equal([a, b].filter((r) => r.ok).length, 1, `run ${run}`);
    const winner = a.ok ? a : b;
    const loser = a.ok ? b : a;
    assert.ok(winner.ok && !loser.ok);
    assert.deepEqual(loser.current.items, winner.layout.items);
    assert.deepEqual((await createLayoutStore(dir).get('1')).items, winner.layout.items);
  }
});

test('two server instances saving different screens do not lose either one', async () => {
  const one = [{ i: 'clock', x: 0, y: 0, w: 2, h: 2 }];
  const two = [{ i: 'job-queue', x: 0, y: 0, w: 4, h: 4 }];
  for (let run = 0; run < 30; run += 1) {
    const dir = mkdtempSync(join(tmpdir(), 'mc-two-'));
    await Promise.all([createLayoutStore(dir).save('1', one, 0), createLayoutStore(dir).save('2', two, 0)]);
    const reader = createLayoutStore(dir);
    assert.deepEqual((await reader.get('1')).items, one);
    assert.deepEqual((await reader.get('2')).items, two);
  }
});

test('layout revision: an unreadable revision warns, is never overwritten, and survives pruning', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mc-corrupt-'));
  const file = join(dir, 'screen-1.r3.json');
  writeFileSync(file, '{ not json');
  const store = createLayoutStore(dir);
  const read = await store.get('1');
  assert.equal(read.warning, 'layout-file-unreadable');
  assert.equal(read.source, 'default');
  assert.equal(read.revision, 3);
  const saved = await store.save('1', [{ i: 'clock', x: 0, y: 0, w: 2, h: 2 }], 3);
  assert.ok(saved.ok);
  assert.equal(saved.layout.revision, 4);
  assert.equal(readFileSync(file, 'utf8'), '{ not json');
  assert.equal((await store.get('1')).warning, undefined);
  // Push it past the keep window: it is renamed aside, never deleted.
  for (let rev = 4; rev < 4 + KEEP_REVISIONS; rev += 1) assert.ok((await store.save('1', [], rev)).ok);
  const aside = readdirSync(dir).find((f) => f.startsWith('screen-1.r3.json.unreadable-'));
  assert.ok(aside);
  assert.equal(readFileSync(join(dir, aside), 'utf8'), '{ not json');
  const kept = readdirSync(dir).filter((f) => /^screen-1[.]r[0-9]+[.]json$/.test(f));
  assert.equal(kept.length, KEEP_REVISIONS);
});

test('layout revision: a write naming a revision that does not exist yet is refused', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mc-future-'));
  const store = createLayoutStore(dir);
  assert.ok((await store.save('1', [], 0)).ok);
  const ahead = await store.save('1', clockAt(5), 6);
  assert.equal(ahead.ok, false);
  assert.equal((await store.get('1')).revision, 1);
  assert.deepEqual(readdirSync(dir).filter((f) => f.endsWith('.json')), ['screen-1.r1.json']);
});

test('layout revision: a reset is a revision of its own and shows the default', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mc-reset-'));
  const store = createLayoutStore(dir);
  assert.ok((await store.save('2', [], 0)).ok);
  const reset = await store.reset('2', 1);
  assert.ok(reset.ok);
  assert.equal(reset.layout.revision, 2);
  assert.equal(reset.layout.source, 'default');
  assert.deepEqual(reset.layout.items, DEFAULT_LAYOUTS['2']);
  assert.equal((await store.reset('2', 1)).ok, false);
});

test('the default data directory is outside the repo', () => {
  const { layoutsDir: dir, dataDir } = readConfig({});
  assert.equal(dataDir, join(homedir(), '.unite-mission-control'));
  assert.ok(relative(APP_ROOT, dir).startsWith('..'));
});

test('MC_PORT must be a port', () => {
  assert.throws(() => readConfig({ MC_PORT: 'abc' }));
  assert.throws(() => readConfig({ MC_PORT: '70000' }));
  assert.equal(readConfig({ MC_PORT: '5000' }).port, 5000);
});

test('the fleet route passes a down snapshot through as down', async () => {
  fleetReply = { status: 'down', reason: 'timeout', fetchedAt: 5, lastGoodAt: 2 };
  const reply = await send('GET', '/api/fleet', { cookie });
  assert.equal(reply.status, 200);
  assert.deepEqual(JSON.parse(reply.body), fleetReply);
});

test('the lockout starts after repeated failures and clears with time', () => {
  let clock = 1_000;
  const auth = createAuth(PASSCODE, () => clock);
  for (let n = 0; n < MAX_FAILURES; n += 1) assert.equal(auth.login('wrong-value'), null);
  assert.equal(auth.login(PASSCODE), 'locked');
  clock += LOCKOUT_MS;
  const token = auth.login(PASSCODE);
  assert.ok(token && token !== 'locked');
  assert.ok(auth.valid(token as string));
});

test('a session expires', () => {
  let clock = 1_000;
  const auth = createAuth(PASSCODE, () => clock);
  const token = auth.login(PASSCODE) as string;
  assert.ok(auth.valid(token));
  clock += 8 * 24 * 60 * 60 * 1000;
  assert.equal(auth.valid(token), false);
  assert.equal(auth.valid(undefined), false);
});

test('readCookie finds the named cookie only', () => {
  assert.equal(readCookie('a=1; mc_session=abc; b=2', 'mc_session'), 'abc');
  assert.equal(readCookie('xmc_session=abc', 'mc_session'), undefined);
  assert.equal(readCookie(undefined, 'mc_session'), undefined);
});

function privateDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  if (POSIX) chmodSync(dir, 0o700);
  return dir;
}

function writePasscode(dir: string, mode = 0o600): string {
  const file = join(dir, 'passcode');
  writeFileSync(file, `${PASSCODE}\n`);
  if (POSIX) chmodSync(file, mode);
  return file;
}

/** A stand-in for lstat output, so the ownership and mode rules run on every platform. */
function fakeStats(kind: 'folder' | 'file', mode: number, uid: number): Stats {
  return {
    isSymbolicLink: () => false,
    isDirectory: () => kind === 'folder',
    isFile: () => kind === 'file',
    mode: (kind === 'folder' ? 0o040000 : 0o100000) | mode,
    uid,
  } as Stats;
}

test('passcode: fails closed on missing and short sources, and loads from a private folder and file', () => {
  const dir = privateDir('mc-pass-');
  assert.throws(() => loadPasscode({}, dir), /No passcode/);
  assert.throws(() => loadPasscode({}, join(dir, 'absent')), /No passcode/);
  assert.throws(() => loadPasscode({ MC_PASSCODE: 'short' }, dir), PasscodeConfigError);
  assert.equal(loadPasscode({ MC_PASSCODE: PASSCODE }, dir), PASSCODE);
  writePasscode(dir);
  assert.equal(loadPasscode({}, dir), PASSCODE);
  assert.equal(loadPasscode({}, `${dir}/`), PASSCODE);
});

test('passcode: the ownership and mode rules refuse a foreign owner and any group or other bit', () => {
  // Never the uid running this test: an unknown owner falls back to the process uid, and 501 is the usual Mac login.
  const me = (process.getuid?.() ?? 500) + 1;
  assert.doesNotThrow(() => checkPrivate('/d', fakeStats('folder', 0o700, me), 'folder', true, me));
  assert.doesNotThrow(() => checkPrivate('/f', fakeStats('file', 0o600, me), 'file', true, me));
  assert.doesNotThrow(() => checkPrivate('/f', fakeStats('file', 0o400, me), 'file', true, me));
  assert.throws(() => checkPrivate('/d', fakeStats('folder', 0o700, me + 1), 'folder', true, me), /not owned/);
  assert.throws(() => checkPrivate('/f', fakeStats('file', 0o600, 0), 'file', true, me), /not owned/);
  assert.throws(() => checkPrivate('/d', fakeStats('folder', 0o700, me), 'folder', true, undefined), /not owned/);
  for (const mode of [0o750, 0o710, 0o701, 0o707, 0o777, 0o500, 0o600]) {
    assert.throws(() => checkPrivate('/d', fakeStats('folder', mode, me), 'folder', true, me), /chmod 700/, mode.toString(8));
  }
  for (const mode of [0o640, 0o604, 0o610, 0o601, 0o666]) {
    assert.throws(() => checkPrivate('/f', fakeStats('file', mode, me), 'file', true, me), /chmod 600/, mode.toString(8));
  }
  assert.throws(() => checkPrivate('/d', fakeStats('file', 0o700, me), 'folder', true, me), /not a folder/);
  assert.throws(() => checkPrivate('/f', fakeStats('folder', 0o600, me), 'file', true, me), /not a file/);
  const link = { ...fakeStats('folder', 0o700, me), isSymbolicLink: () => true } as Stats;
  assert.throws(() => checkPrivate('/d', link, 'folder', false, me), /symlink/);
});

test('passcode: a symlinked data folder or passcode file is refused', (t) => {
  const real = privateDir('mc-real-');
  writePasscode(real);
  const outer = privateDir('mc-links-');
  const folderLink = join(outer, 'data');
  // A junction needs no admin rights on Windows; on POSIX the type is ignored.
  symlinkSync(real, folderLink, 'junction');
  assert.throws(() => loadPasscode({}, folderLink), /symlink/);
  assert.throws(() => loadPasscode({}, `${folderLink}/`), /symlink/);

  const dir = privateDir('mc-filelink-');
  try {
    symlinkSync(join(real, 'passcode'), join(dir, 'passcode'), 'file');
  } catch (err) {
    // Windows refuses file symlinks without Developer Mode. Linux CI runs this half.
    if (!POSIX && (err as NodeJS.ErrnoException).code === 'EPERM') return t.diagnostic('file symlink not permitted here');
    throw err;
  }
  assert.throws(() => loadPasscode({}, dir), PasscodeConfigError);
});

test('passcode: on POSIX a real folder open to others, or a file open to others, is refused', { skip: !POSIX && 'POSIX modes do not exist on Windows; Linux CI runs this' }, () => {
  const dir = privateDir('mc-modes-');
  writePasscode(dir);
  for (const mode of [0o750, 0o705, 0o777]) {
    chmodSync(dir, mode);
    assert.throws(() => loadPasscode({}, dir), /chmod 700/, mode.toString(8));
  }
  chmodSync(dir, 0o700);
  assert.equal(loadPasscode({}, dir), PASSCODE);
  for (const mode of [0o640, 0o604, 0o644]) {
    chmodSync(join(dir, 'passcode'), mode);
    assert.throws(() => loadPasscode({}, dir), /readable by other users/, mode.toString(8));
  }
  chmodSync(join(dir, 'passcode'), 0o600);
  assert.equal(loadPasscode({}, dir), PASSCODE);
  // The rules switched off (Windows) accept the same folder whatever its mode.
  chmodSync(dir, 0o777);
  assert.equal(loadPasscode({}, dir, false), PASSCODE);
  chmodSync(dir, 0o700);
});

test('the real entry point refuses to start with no passcode, and does not print one when set', { skip: NEEDS_SOCKET }, async () => {
  const run = (env: NodeJS.ProcessEnv) =>
    new Promise<{ code: number | null; output: string }>((resolve) => {
      const child = spawn(process.execPath, [join(APP_ROOT, 'server', 'main.ts')], {
        env: { PATH: process.env.PATH, MC_DATA_DIR: mkdtempSync(join(tmpdir(), 'mc-main-')), ...env },
      });
      let output = '';
      child.stdout.on('data', (d) => {
        output += d;
        if (output.includes('Mission Control on')) child.kill();
      });
      child.stderr.on('data', (d) => (output += d));
      child.on('close', (code) => resolve({ code, output }));
    });
  const refused = await run({ MC_PORT: '0' });
  assert.equal(refused.code, 1);
  assert.match(refused.output, /No passcode/);
  const started = await run({ MC_PORT: '0', MC_PASSCODE: PASSCODE });
  assert.match(started.output, /http:\/\/127\.0\.0\.1:/);
  assert.ok(!started.output.includes(PASSCODE));
}, );

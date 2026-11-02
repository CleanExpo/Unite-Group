// The request handler. Order matters: Host check, then Origin check on writes,
// then the session gate. Nothing behind the gate is reachable without a session,
// including the client bundle.
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SCREENS } from '../shared/types.ts';
import type { FleetSnapshot, LayoutConflict, LayoutItem, LayoutResponse, ScreenId } from '../shared/types.ts';
import { parseLayoutItems } from '../shared/widget-catalogue.ts';
import { readCookie, SESSION_COOKIE, SESSION_MS } from './auth.ts';
import type { Auth } from './auth.ts';
import type { LayoutStore } from './layouts.ts';
import { LOGIN_CSS, loginPage } from './login-page.ts';

export const BIND_HOST = '127.0.0.1';
const MAX_BODY_BYTES = 64 * 1024;
const ASSET_NAME = /^[\w.-]+\.(js|css)$/;

// The two exceptions are for the grid library: data: for its resize-handle image, and
// the hash for the one fixed style tag react-draggable injects during a drag.
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self' 'sha256-s8oZn728h+t0WNV6s+2xieaG3i2RB5cO2MMiUDIdinY='; connect-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  // Not no-referrer: that makes browsers send `Origin: null` on POST and PUT, which
  // the Origin check below refuses, so nobody could sign in or save a layout.
  'Referrer-Policy': 'same-origin',
  'Cache-Control': 'no-store',
};

export interface AppDeps {
  auth: Auth;
  layouts: LayoutStore;
  fleet: () => Promise<FleetSnapshot>;
  clientDir: string;
}

class BodyTooLarge extends Error {}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new BodyTooLarge();
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function send(res: ServerResponse, status: number, type: string, body: string | Buffer, extra = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': type, ...extra });
  res.end(body);
}
const json = (res: ServerResponse, status: number, value: unknown) =>
  send(res, status, 'application/json; charset=utf-8', JSON.stringify(value));
const html = (res: ServerResponse, status: number, body: string | Buffer) =>
  send(res, status, 'text/html; charset=utf-8', body);
const redirect = (res: ServerResponse, to: string, extra = {}) => {
  res.writeHead(303, { ...SECURITY_HEADERS, Location: to, ...extra });
  res.end();
};

const etag = (layout: LayoutResponse) => ({ ETag: `"${layout.revision}"` });
const layoutReply = (res: ServerResponse, layout: LayoutResponse) =>
  send(res, 200, 'application/json; charset=utf-8', JSON.stringify(layout), etag(layout));

const REVISION = /^"(\d{1,15})"$/;

/** If-Match wins over a body field. Only one exact strong tag is accepted, never `*`. */
export function expectedRevision(ifMatch: string | undefined, bodyRevision: unknown): number | 'missing' | 'bad' {
  if (ifMatch !== undefined) {
    const match = REVISION.exec(ifMatch.trim());
    return match ? Number(match[1]) : 'bad';
  }
  if (bodyRevision === undefined) return 'missing';
  return Number.isSafeInteger(bodyRevision) && (bodyRevision as number) >= 0 ? (bodyRevision as number) : 'bad';
}

export function createApp(deps: AppDeps): Server {
  const { auth, layouts, fleet, clientDir } = deps;

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method ?? 'GET';
    const port = (req.socket.localPort ?? 0).toString();
    const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);

    // Blocks DNS rebinding: a hostile site's name resolving here still sends its own Host.
    if (!allowedHosts.has(req.headers.host ?? '')) return json(res, 421, { error: 'host-not-allowed' });

    // Blocks cross-site writes. Browsers always send Origin on these methods.
    if (method !== 'GET' && method !== 'HEAD') {
      const origin = req.headers.origin ?? '';
      if (!origin.startsWith('http://') || !allowedHosts.has(origin.slice('http://'.length))) {
        return json(res, 403, { error: 'origin-not-allowed' });
      }
    }

    const { pathname } = new URL(req.url ?? '/', 'http://127.0.0.1');

    if (pathname === '/login.css' && method === 'GET') {
      return send(res, 200, 'text/css; charset=utf-8', LOGIN_CSS);
    }
    if (pathname === '/login' && method === 'GET') return html(res, 200, loginPage());
    if (pathname === '/login' && method === 'POST') {
      const attempt = new URLSearchParams(await readBody(req)).get('passcode') ?? '';
      const result = auth.login(attempt);
      if (result === 'locked') return html(res, 429, loginPage('locked'));
      if (result === null) return html(res, 401, loginPage('wrong'));
      const cookie = `${SESSION_COOKIE}=${result}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`;
      return redirect(res, '/screen/1', { 'Set-Cookie': cookie });
    }

    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    if (!auth.valid(token)) {
      if (pathname.startsWith('/api/')) return json(res, 401, { error: 'signed-out' });
      return redirect(res, '/login');
    }

    if (pathname === '/logout' && method === 'POST') {
      auth.logout(token);
      const cookie = `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
      return redirect(res, '/login', { 'Set-Cookie': cookie });
    }

    if (pathname === '/' && method === 'GET') return redirect(res, '/screen/1');

    if (/^\/screen\/[12]$/.test(pathname) && method === 'GET') {
      try {
        return html(res, 200, await readFile(join(clientDir, 'index.html')));
      } catch {
        return send(res, 503, 'text/plain; charset=utf-8', 'Client not built. Run: npm run build');
      }
    }

    const asset = pathname.match(/^\/assets\/([^/]+)$/)?.[1];
    if (asset && method === 'GET') {
      if (!ASSET_NAME.test(asset)) return json(res, 404, { error: 'not-found' });
      const type = asset.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8';
      try {
        return send(res, 200, type, await readFile(join(clientDir, 'assets', asset)));
      } catch {
        return json(res, 404, { error: 'not-found' });
      }
    }

    if (pathname === '/api/fleet' && method === 'GET') return json(res, 200, await fleet());

    const screen = pathname.match(/^\/api\/layouts\/([^/]+)$/)?.[1];
    if (screen !== undefined) {
      if (!SCREENS.includes(screen as ScreenId)) return json(res, 404, { error: 'unknown-screen' });
      const id = screen as ScreenId;
      if (method === 'GET') return layoutReply(res, await layouts.get(id));
      if (method !== 'PUT' && method !== 'DELETE') return json(res, 405, { error: 'method-not-allowed' });

      let items: LayoutItem[] | null = null;
      let bodyRevision: unknown;
      if (method === 'PUT') {
        let parsed: unknown;
        try {
          parsed = JSON.parse(await readBody(req));
        } catch (err) {
          if (err instanceof BodyTooLarge) throw err;
          return json(res, 400, { error: 'bad-json' });
        }
        items = parseLayoutItems((parsed as { items?: unknown } | null)?.items);
        if (!items) return json(res, 400, { error: 'bad-layout' });
        bodyRevision = (parsed as { revision?: unknown }).revision;
      }

      // Every write names the revision it was based on, so a stale window cannot win silently.
      const expected = expectedRevision(req.headers['if-match'], bodyRevision);
      if (expected === 'missing') return json(res, 428, { error: 'revision-required' });
      if (expected === 'bad') return json(res, 400, { error: 'bad-revision' });

      const result = items ? await layouts.save(id, items, expected) : await layouts.reset(id, expected);
      if (!result.ok) {
        const conflict: LayoutConflict = { error: 'layout-changed', current: result.current };
        return send(res, 409, 'application/json; charset=utf-8', JSON.stringify(conflict), etag(result.current));
      }
      return layoutReply(res, result.layout);
    }

    return json(res, 404, { error: 'not-found' });
  }

  return createServer((req, res) => {
    handle(req, res).catch((err: unknown) => {
      if (res.headersSent) return void res.destroy();
      if (err instanceof BodyTooLarge) return json(res, 413, { error: 'too-large' });
      // The error class only: messages can hold file paths.
      console.error('request failed:', err instanceof Error ? err.name : 'unknown');
      json(res, 500, { error: 'server-error' });
    });
  });
}

/** The only place the server listens. The bind address takes no configuration. */
export function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, BIND_HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

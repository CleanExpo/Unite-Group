/**
 * UNI-2951: local HTTP transport for the world service, used by the Godot client and the harness.
 * Bound to loopback only. The Godot client sends commands; it never sends state.
 *
 * Routes (both modes):  GET /health   GET /world   POST /command   GET /permissions   GET /people/<id>/record
 * Routes (test mode):   POST /test/reset   POST /test/fixture {commands}   POST /test/goto {stage}   GET /test/evidence
 * POST /command requires the x-rw-actor header naming a known identity holding the scenario's role.
 * L3: GET /permissions lists the actions the acting identity may take; GET /people/<id>/record is the restricted
 * employment record, refused (403, audited) to a role the permission table does not allow.
 * In live mode the /test/* routes are not mounted at all (404), and the service object refuses them too.
 * GET /test/evidence returns the accepted-command log, the permission-denial audit, the attempt log (every
 * attempt incl. rejected ones, unparseable or oversized bodies, on commands and on privileged controls) and the current state.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { PrivilegedControlRefused, statusFor, WorldService, type ServiceMode } from './world-service'

export { statusFor }

const LOOPBACK = new Set(['127.0.0.1', '::1'])
const MAX_BODY = 16 * 1024

export interface WorldServerOptions {
  mode: ServiceMode
  host?: string
  port?: number
}

export interface RunningWorldServer {
  server: Server
  service: WorldService
  url: string
  close(): Promise<void>
}

function send(res: ServerResponse, status: number, body: unknown, mode: ServiceMode): void {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-rw-service-mode': mode,
  })
  res.end(text)
}

/** Commands in this game are flat; anything nested deeper than this is not a command. */
const MAX_DEPTH = 32

/**
 * True if a parsed body holds a value the attempt evidence could not return exactly: a non-finite number (1e400
 * parses to Infinity and serialises as null), negative zero (-0, -0.0 and -0e5 all parse to -0, which serialises as
 * 0; gate review of 25b0536d), an integer beyond 2^53 (two different literals become the same number), or nesting
 * deeper than MAX_DEPTH (deep bodies overflow the stack after the attempt began, leaving a 500 with no logged attempt).
 */
function hasUnrepresentableValue(root: unknown): boolean {
  const pending: Array<[unknown, number]> = [[root, 0]]
  while (pending.length > 0) {
    const [value, depth] = pending.pop() as [unknown, number]
    if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0) ||
      (Number.isInteger(value) && !Number.isSafeInteger(value)))) return true
    if (value && typeof value === 'object') {
      if (depth >= MAX_DEPTH) return true
      for (const child of Object.values(value)) pending.push([child, depth + 1])
    }
  }
  return false
}

const NUMBER_TOKEN = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y

/** A number's value as digits and a power of ten with trailing zeros removed, so 1.50e2 and 150 compare equal. Zero is "0". */
function decimalForm(literal: string): string {
  const [, sign, whole, fraction = '', exponent = '0'] = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(literal) as RegExpExecArray
  const digits = (whole + fraction).replace(/^0+/, '')
  if (digits === '') return '0'
  const trimmed = digits.replace(/0+$/, '')
  return `${sign}${trimmed}e${Number(exponent) - fraction.length + digits.length - trimmed.length}`
}

/**
 * True if the request text holds a number that the parsed value does not spell exactly: 1e-400 reads as 0 and
 * 0.10000000000000001 as 0.1, so the evidence would hold a different number than the one sent. Numbers inside
 * strings are text, not numbers, and are skipped. Call only on text that JSON.parse accepted.
 */
function holdsInexactNumber(text: string): boolean {
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"') {
      i++
      while (text[i] !== '"') i += text[i] === '\\' ? 2 : 1
      i++
    } else if (ch === '-' || (ch >= '0' && ch <= '9')) {
      NUMBER_TOKEN.lastIndex = i
      const token = (NUMBER_TOKEN.exec(text) as RegExpExecArray)[0]
      const value = Number(token)
      if (!Number.isFinite(value) || decimalForm(token) !== decimalForm(JSON.stringify(value))) return true
      i += token.length
    } else {
      i++
    }
  }
  return false
}

/**
 * True if an object in the request text names the same member twice. JSON.parse keeps the last value, so the evidence
 * would hold one of two values sent (gate review of 3183fad7: {"id":"first","id":"last"} was logged as "last" only).
 * Member names are compared after JSON decoding, so "id" and "id" are the same name. Call only on text that
 * JSON.parse accepted.
 */
function holdsDuplicateMember(text: string): boolean {
  const scopes: Array<{ names: Set<string> | null; expectName: boolean }> = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    const scope = scopes[scopes.length - 1]
    if (ch === '"') {
      const start = i
      i++
      while (text[i] !== '"') i += text[i] === '\\' ? 2 : 1
      i++
      if (scope?.names && scope.expectName) {
        const name = JSON.parse(text.slice(start, i)) as string
        if (scope.names.has(name)) return true
        scope.names.add(name)
        scope.expectName = false
      }
    } else {
      if (ch === '{') scopes.push({ names: new Set(), expectName: true })
      else if (ch === '[') scopes.push({ names: null, expectName: false })
      else if (ch === '}' || ch === ']') scopes.pop()
      else if (ch === ',' && scope?.names) scope.expectName = true
      i++
    }
  }
  return false
}

function readJson(req: IncomingMessage): Promise<{ ok: true; value: unknown } | { ok: false; status: number }> {
  return new Promise(resolve => {
    const chunks: Buffer[] = []
    let size = 0
    let done = false
    req.on('data', (chunk: Buffer) => {
      if (done) return
      size += chunk.length
      if (size > MAX_BODY) {
        done = true
        resolve({ ok: false, status: 413 })
        req.resume()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (done) return
      done = true
      try {
        // Strict decoding: bytes that are not valid UTF-8 would otherwise become U+FFFD and be logged as if they were sent.
        const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks))
        const value: unknown = JSON.parse(text)
        // Refuse what the evidence could not return exactly, so what the attempt log holds is what was sent.
        resolve(hasUnrepresentableValue(value) || holdsInexactNumber(text) || holdsDuplicateMember(text)
          ? { ok: false, status: 400 } : { ok: true, value })
      } catch {
        resolve({ ok: false, status: 400 })
      }
    })
    req.on('error', () => {
      if (!done) {
        done = true
        resolve({ ok: false, status: 400 })
      }
    })
  })
}

/** The acting identity comes from the x-rw-actor header. Missing or unknown actors are denied and audited. */
export const ACTOR_HEADER = 'x-rw-actor'

function actorOf(req: IncomingMessage): string | null {
  const value = req.headers[ACTOR_HEADER]
  return typeof value === 'string' ? value : null
}

export function startWorldServer(options: WorldServerOptions): Promise<RunningWorldServer> {
  const mode = options.mode
  const host = options.host ?? '127.0.0.1'
  if (!LOOPBACK.has(host)) {
    return Promise.reject(new Error(`world service binds to loopback only (got ${host})`))
  }
  const service = new WorldService(mode)

  const server = createServer(async (req, res) => {
    const path = (req.url ?? '/').split('?')[0]
    try {
      if (req.method === 'GET' && path === '/health') {
        return send(res, 200, { mode, schemaVersion: service.current.schemaVersion, scenarioVersion: service.current.scenarioVersion }, mode)
      }
      if (req.method === 'GET' && path === '/world') {
        return send(res, 200, { ok: true, state: service.current }, mode)
      }
      if (req.method === 'GET' && path === '/permissions') {
        const result = service.permissionsFor(actorOf(req))
        return send(res, result.ok ? 200 : 403, result, mode)
      }
      const recordPath = /^\/people\/([a-z0-9-]{1,64})\/record$/.exec(path)
      if (req.method === 'GET' && recordPath) {
        const result = service.readRecord(actorOf(req), recordPath[1])
        return send(res, statusFor(result), result, mode)
      }
      if (req.method === 'POST' && path === '/command') {
        const body = await readJson(req)
        if (!body.ok) {
          service.recordTransportReject(actorOf(req), body.status)
          return send(res, body.status, { ok: false, code: 'invalid-command', state: service.current }, mode)
        }
        const result = service.handle(body.value, actorOf(req))
        return send(res, statusFor(result), result, mode)
      }
      if (path.startsWith('/test/')) {
        if (mode !== 'test') return send(res, 404, { ok: false, code: 'not-found' }, mode)
        if (req.method === 'GET' && path === '/test/evidence') {
          // Independent evidence for the run checker: what the service accepted, denied and attempted (every attempt, with its state).
          return send(res, 200, { ok: true, events: service.events, audit: service.audit, attempts: service.attempts, state: service.current }, mode)
        }
        if (req.method !== 'POST') return send(res, 405, { ok: false, code: 'method-not-allowed' }, mode)
        const body = await readJson(req)
        if (!body.ok) {
          // Transport failures on a privileged control are attempts too: log them before answering.
          if (path === '/test/reset') service.recordControlTransportReject('reset', body.status)
          else if (path === '/test/fixture') service.recordControlTransportReject('fixture', body.status)
          else if (path === '/test/goto') service.recordControlTransportReject('goto', body.status)
          return send(res, body.status, { ok: false, code: 'invalid-command', state: service.current }, mode)
        }
        const value = (body.value ?? {}) as Record<string, unknown>
        if (path === '/test/reset') return send(res, 200, { ok: true, state: service.testReset() }, mode)
        if (path === '/test/fixture') {
          const result = service.testLoadFixture(value.commands as unknown[])
          return send(res, statusFor(result), result, mode)
        }
        if (path === '/test/goto') {
          const result = service.testGoto(value.stage)
          return send(res, statusFor(result), result, mode)
        }
        return send(res, 404, { ok: false, code: 'not-found' }, mode)
      }
      return send(res, 404, { ok: false, code: 'not-found' }, mode)
    } catch (error) {
      if (error instanceof PrivilegedControlRefused) return send(res, 403, { ok: false, code: 'privileged-refused' }, mode)
      // UNI-3411: a 500 is logged. A command fault was already written and recorded by WorldService.handle; anything
      // else (a read route, a test control) is written here.
      if (!(req.method === 'POST' && path === '/command')) {
        process.stderr.write(`restoration-world ${req.method} ${path} failed: ${error instanceof Error ? error.stack : String(error)}\n`)
      }
      return send(res, 500, { ok: false, code: 'internal-error' }, mode)
    }
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port ?? 0, host, () => {
      const address = server.address() as AddressInfo
      const shownHost = address.family === 'IPv6' ? `[${address.address}]` : address.address
      resolve({
        server,
        service,
        url: `http://${shownHost}:${address.port}`,
        close: () => new Promise<void>((done, fail) => server.close(err => (err ? fail(err) : done()))),
      })
    })
  })
}

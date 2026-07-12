#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { promises as dns } from 'node:dns'
import {
  existsSync,
  lstatSync,
  realpathSync,
} from 'node:fs'
import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises'
import { isIP } from 'node:net'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const ACTIVE_HTML_BLOCKS = [
  'script',
  'style',
  'noscript',
  'template',
  'iframe',
  'object',
  'embed',
  'form',
  'svg',
  'canvas',
]
const NON_CONTENT_HTML_BLOCKS = ['nav', 'aside', 'footer']
const BLOCK_TAGS = [
  'address',
  'article',
  'blockquote',
  'div',
  'dl',
  'fieldset',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]

class WatchError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'WatchError'
    this.code = code
  }
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function normaliseHostname(hostname) {
  return hostname.toLowerCase().replace(/\.$/, '')
}

function isUnsafeHostname(hostname) {
  const host = normaliseHostname(hostname)
  return (
    isIP(host) !== 0 ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host.includes('*')
  )
}

function ipv4Parts(address) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null
  }
  return parts
}

function isPublicIpAddress(address) {
  const family = isIP(address)
  if (family === 4) {
    const parts = ipv4Parts(address)
    if (!parts) return false
    const [a, b, c] = parts
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false
    if (a === 100 && b >= 64 && b <= 127) return false
    if (a === 169 && b === 254) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 0 && c === 0) return false
    if (a === 192 && b === 0 && c === 2) return false
    if (a === 192 && b === 168) return false
    if (a === 198 && (b === 18 || b === 19)) return false
    if (a === 198 && b === 51 && c === 100) return false
    if (a === 203 && b === 0 && c === 113) return false
    return true
  }

  if (family === 6) {
    const candidate = address.toLowerCase().split('%')[0]
    if (candidate === '::' || candidate === '::1') return false
    if (candidate.startsWith('fc') || candidate.startsWith('fd')) return false
    if (/^fe[89ab]/.test(candidate)) return false
    if (candidate.startsWith('2001:db8:')) return false
    if (candidate.startsWith('::ffff:')) {
      const mapped = candidate.slice('::ffff:'.length)
      return isPublicIpAddress(mapped)
    }
    return true
  }

  return false
}

function validateSource(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new WatchError('invalid_config', 'Each source must be an object')
  }
  if (!/^[a-z0-9][a-z0-9._-]+$/.test(source.id ?? '')) {
    throw new WatchError('invalid_config', `Invalid source id: ${String(source.id)}`)
  }
  if (typeof source.vendor !== 'string' || source.vendor.trim() === '') {
    throw new WatchError('invalid_config', `Source ${source.id} requires a vendor`)
  }

  let url
  try {
    url = new URL(source.url)
  } catch {
    throw new WatchError('invalid_config', `Source ${source.id} has an invalid URL`)
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new WatchError('invalid_config', `Source ${source.id} must use credential-free HTTPS`)
  }
  if (url.port && url.port !== '443') {
    throw new WatchError('invalid_config', `Source ${source.id} has an unsafe host port`)
  }
  if (isUnsafeHostname(url.hostname)) {
    throw new WatchError('invalid_config', `Source ${source.id} has an unsafe host`)
  }
  if (!Array.isArray(source.allowedHosts) || source.allowedHosts.length === 0) {
    throw new WatchError('invalid_config', `Source ${source.id} requires an allowed-host list`)
  }

  const allowedHosts = source.allowedHosts.map(normaliseHostname)
  for (const host of allowedHosts) {
    if (isUnsafeHostname(host)) {
      throw new WatchError('invalid_config', `Source ${source.id} has an unsafe allowed host`)
    }
  }
  if (!allowedHosts.includes(normaliseHostname(url.hostname))) {
    throw new WatchError('invalid_config', `Source ${source.id} URL host is not allowlisted`)
  }
  if (typeof source.critical !== 'boolean' || typeof source.gateOnChange !== 'boolean') {
    throw new WatchError('invalid_config', `Source ${source.id} requires boolean gate fields`)
  }
}

export function validateRegistry(registry) {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    throw new WatchError('invalid_config', 'Registry must be an object')
  }
  if (registry.schemaVersion !== 1) {
    throw new WatchError('invalid_config', 'Registry schemaVersion must be 1')
  }
  const defaults = registry.defaults
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) {
    throw new WatchError('invalid_config', 'Registry defaults are required')
  }
  for (const field of ['timeoutMs', 'maxBytes', 'maxRedirects']) {
    if (!Number.isInteger(defaults[field]) || defaults[field] <= 0) {
      throw new WatchError('invalid_config', `defaults.${field} must be a positive integer`)
    }
  }
  if (
    defaults.concurrency !== undefined &&
    (!Number.isInteger(defaults.concurrency) || defaults.concurrency <= 0 || defaults.concurrency > 8)
  ) {
    throw new WatchError('invalid_config', 'defaults.concurrency must be between 1 and 8')
  }
  if (
    !Array.isArray(defaults.acceptedContentTypes) ||
    defaults.acceptedContentTypes.length === 0 ||
    defaults.acceptedContentTypes.some((value) => typeof value !== 'string' || value.trim() === '')
  ) {
    throw new WatchError('invalid_config', 'defaults.acceptedContentTypes must be a non-empty string array')
  }
  if (!Array.isArray(registry.sources) || registry.sources.length === 0) {
    throw new WatchError('invalid_config', 'Registry must contain at least one source')
  }

  const ids = new Set()
  for (const source of registry.sources) {
    validateSource(source)
    if (ids.has(source.id)) {
      throw new WatchError('invalid_config', `Duplicate source id: ${source.id}`)
    }
    ids.add(source.id)
  }
  return registry
}

async function defaultResolveHost(hostname) {
  return dns.lookup(hostname, { all: true, verbatim: true })
}

async function assertSafeNetworkTarget(url, allowedHosts, resolveHost) {
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new WatchError('unsafe_redirect', 'Redirect target must use credential-free HTTPS')
  }
  if (url.port && url.port !== '443') {
    throw new WatchError('unsafe_redirect', 'Redirect target uses an unsafe HTTPS port')
  }
  const hostname = normaliseHostname(url.hostname)
  if (isUnsafeHostname(hostname)) {
    throw new WatchError('unsafe_redirect', 'Redirect target uses a private or literal host')
  }
  if (!allowedHosts.includes(hostname)) {
    throw new WatchError('unsafe_redirect', `Redirect target host is not allowlisted: ${hostname}`)
  }

  let addresses
  try {
    addresses = await resolveHost(hostname)
  } catch {
    throw new WatchError('dns_failure', `Could not resolve allowlisted host: ${hostname}`)
  }
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new WatchError('dns_failure', `Allowlisted host returned no addresses: ${hostname}`)
  }
  for (const record of addresses) {
    const address = typeof record === 'string' ? record : record?.address
    if (typeof address !== 'string' || !isPublicIpAddress(address)) {
      throw new WatchError('private_address', `Allowlisted host resolved to a non-public address: ${hostname}`)
    }
  }
}

async function readBoundedBody(response, maxBytes) {
  const declared = response.headers.get('content-length')
  if (declared !== null) {
    const declaredBytes = Number(declared)
    if (!Number.isFinite(declaredBytes) || declaredBytes < 0) {
      throw new WatchError('invalid_content_length', 'Invalid Content-Length response header')
    }
    if (declaredBytes > maxBytes) {
      throw new WatchError('response_too_large', `Response size exceeds ${maxBytes} bytes`)
    }
  }

  if (!response.body) return Buffer.alloc(0)
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = Buffer.from(value)
      total += chunk.length
      if (total > maxBytes) {
        await reader.cancel('response limit exceeded')
        throw new WatchError('response_too_large', `Response size exceeds ${maxBytes} bytes`)
      }
      chunks.push(chunk)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks, total)
}

function canonicalContentType(value) {
  return value.split(';', 1)[0].trim().toLowerCase()
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    )
  }
  return value
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_match, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
}

function stripHtml(value) {
  let text = value.replace(/<!--[\s\S]*?-->/g, ' ')
  for (const tag of [...ACTIVE_HTML_BLOCKS, ...NON_CONTENT_HTML_BLOCKS]) {
    text = text.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), ' ')
    text = text.replace(new RegExp(`<${tag}\\b[^>]*/\\s*>`, 'gi'), ' ')
  }

  text = text.replace(
    /<([a-z][\w:-]*)\b(?=[^>]*(?:\shidden(?:\s|=|>)|aria-hidden\s*=\s*["']?true["']?|style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)[^"']*["']))[^>]*>[\s\S]*?<\/\1\s*>/gi,
    ' ',
  )
  text = text.replace(/<br\b[^>]*>/gi, '\n')
  for (const tag of BLOCK_TAGS) {
    text = text.replace(new RegExp(`<\\/${tag}\\s*>`, 'gi'), '\n')
  }
  text = text.replace(/<[^>]+>/g, ' ')
  return decodeHtmlEntities(text)
}

function normaliseText(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

export function normaliseContent(value, contentType) {
  const type = canonicalContentType(contentType)
  if (type === 'application/json' || type.endsWith('+json')) {
    let parsed
    try {
      parsed = JSON.parse(value)
    } catch {
      throw new WatchError('invalid_json', 'JSON source returned invalid JSON')
    }
    return JSON.stringify(stableValue(parsed), null, 2)
  }
  if (type === 'text/html' || type === 'application/xhtml+xml') {
    return normaliseText(stripHtml(value))
  }
  return normaliseText(value)
}

function baselineHeaders(baseline) {
  const headers = {
    accept: 'text/markdown,text/plain;q=0.95,application/json;q=0.9,application/atom+xml;q=0.9,application/xml;q=0.85,text/html;q=0.8,*/*;q=0.1',
    'accept-language': 'en-AU,en;q=0.9',
    'user-agent': 'Unite-Group-Nexus-Docs-Watch/1.0',
  }
  if (baseline?.etag) headers['if-none-match'] = baseline.etag
  if (baseline?.lastModified) headers['if-modified-since'] = baseline.lastModified
  return headers
}

function baselineReuse(source, baseline, response) {
  if (!baseline || baseline.outcome !== 'ok' || !baseline.normalisedSha256 || !baseline.rawSha256) {
    throw new WatchError('invalid_304', `Source ${source.id} returned 304 without a usable baseline`)
  }
  return {
    id: source.id,
    vendor: source.vendor,
    url: source.url,
    finalUrl: baseline.finalUrl ?? source.url,
    outcome: 'ok',
    httpStatus: response.status,
    contentType: baseline.contentType ?? null,
    bytes: baseline.bytes ?? 0,
    rawSha256: baseline.rawSha256,
    normalisedSha256: baseline.normalisedSha256,
    etag: response.headers.get('etag') ?? baseline.etag ?? null,
    lastModified: response.headers.get('last-modified') ?? baseline.lastModified ?? null,
    critical: source.critical,
    gateOnChange: source.gateOnChange,
  }
}

export async function fetchOfficialSource(source, defaults, options = {}) {
  validateSource(source)
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const resolveHost = options.resolveHost ?? defaultResolveHost
  if (typeof fetchImpl !== 'function') {
    throw new WatchError('fetch_unavailable', 'A Fetch implementation is required')
  }

  const allowedHosts = source.allowedHosts.map(normaliseHostname)
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new WatchError('timeout', `Source ${source.id} timeout after ${defaults.timeoutMs}ms`)),
    defaults.timeoutMs,
  )
  let currentUrl = new URL(source.url)
  let redirects = 0

  try {
    while (true) {
      await assertSafeNetworkTarget(currentUrl, allowedHosts, resolveHost)
      let response
      try {
        response = await fetchImpl(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          headers: baselineHeaders(options.baseline),
          signal: controller.signal,
        })
      } catch (error) {
        if (controller.signal.aborted) {
          throw new WatchError('timeout', `Source ${source.id} timeout after ${defaults.timeoutMs}ms`)
        }
        if (error instanceof WatchError) throw error
        throw new WatchError('fetch_failed', `Source ${source.id} request failed`)
      }

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get('location')
        if (!location) {
          throw new WatchError('unsafe_redirect', `Source ${source.id} returned a redirect without Location`)
        }
        redirects += 1
        if (redirects > defaults.maxRedirects) {
          throw new WatchError('redirect_limit', `Source ${source.id} exceeded the redirect limit`)
        }
        currentUrl = new URL(location, currentUrl)
        continue
      }

      if (response.status === 304) {
        return baselineReuse(source, options.baseline, response)
      }
      if (response.status < 200 || response.status >= 300) {
        throw new WatchError('http_status', `Unexpected HTTP status ${response.status}`)
      }

      const rawContentType = response.headers.get('content-type')
      if (!rawContentType) {
        throw new WatchError('content_type', 'Response did not declare a Content-Type')
      }
      const contentType = canonicalContentType(rawContentType)
      if (!defaults.acceptedContentTypes.map(canonicalContentType).includes(contentType)) {
        throw new WatchError('content_type', `Unsupported Content-Type: ${contentType}`)
      }

      const body = await readBoundedBody(response, defaults.maxBytes)
      let rawText
      try {
        rawText = new TextDecoder('utf-8', { fatal: true }).decode(body)
      } catch {
        throw new WatchError('invalid_utf8', 'Response was not valid UTF-8 text')
      }
      const normalised = normaliseContent(rawText, contentType)

      return {
        id: source.id,
        vendor: source.vendor,
        url: source.url,
        finalUrl: currentUrl.toString(),
        outcome: 'ok',
        httpStatus: response.status,
        contentType,
        bytes: body.length,
        rawSha256: sha256(body),
        normalisedSha256: sha256(normalised),
        etag: response.headers.get('etag'),
        lastModified: response.headers.get('last-modified'),
        critical: source.critical,
        gateOnChange: source.gateOnChange,
      }
    }
  } catch (error) {
    if (
      controller.signal.aborted &&
      (error === controller.signal.reason || error?.name === 'AbortError')
    ) {
      throw new WatchError('timeout', `Source ${source.id} timeout after ${defaults.timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function previousSources(baseline) {
  if (!baseline) return new Map()
  if (!Array.isArray(baseline.sources)) {
    throw new WatchError('invalid_baseline', 'Baseline must contain a sources array')
  }
  return new Map(baseline.sources.map((source) => [source.id, source]))
}

function comparableSource(result, baselineSource) {
  const change = result.outcome !== 'ok'
    ? null
    : !baselineSource || baselineSource.outcome !== 'ok'
      ? 'first_seen'
      : baselineSource.normalisedSha256 === result.normalisedSha256
        ? 'unchanged'
        : 'changed'

  if (result.outcome !== 'ok') {
    return {
      id: result.id,
      vendor: result.vendor,
      url: result.url,
      outcome: 'failed',
      change,
      critical: result.critical,
      gateOnChange: result.gateOnChange,
      errorCode: result.errorCode,
      error: result.error,
    }
  }

  return {
    id: result.id,
    vendor: result.vendor,
    url: result.url,
    finalUrl: result.finalUrl,
    outcome: 'ok',
    change,
    httpStatus: result.httpStatus,
    contentType: result.contentType,
    bytes: result.bytes,
    rawSha256: result.rawSha256,
    normalisedSha256: result.normalisedSha256,
    etag: result.etag ?? null,
    lastModified: result.lastModified ?? null,
    critical: result.critical,
    gateOnChange: result.gateOnChange,
  }
}

export function buildReport(results, baseline, generatedAt, gateMaterial) {
  const previous = previousSources(baseline)
  const sources = [...results]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((result) => comparableSource(result, previous.get(result.id)))

  const count = (predicate) => sources.filter(predicate).length
  const criticalFailures = sources
    .filter((source) => source.outcome === 'failed' && source.critical)
    .map((source) => source.id)
    .sort()
  const materialChanges = gateMaterial
    ? sources
      .filter((source) => source.outcome === 'ok' && source.change === 'changed' && source.gateOnChange)
      .map((source) => source.id)
      .sort()
    : []
  const exitCode = criticalFailures.length > 0 && materialChanges.length > 0
    ? 4
    : criticalFailures.length > 0
      ? 2
      : materialChanges.length > 0
        ? 3
        : 0

  return {
    schemaVersion: 1,
    generatedAt,
    baselineProvided: baseline !== null,
    summary: {
      total: sources.length,
      succeeded: count((source) => source.outcome === 'ok'),
      failed: count((source) => source.outcome === 'failed'),
      firstSeen: count((source) => source.change === 'first_seen'),
      unchanged: count((source) => source.change === 'unchanged'),
      changed: count((source) => source.change === 'changed'),
    },
    gates: {
      criticalFailures,
      materialChanges,
      exitCode,
    },
    sources,
  }
}

export function renderJson(report) {
  return `${JSON.stringify(report, null, 2)}\n`
}

export function renderMarkdown(report) {
  const lines = [
    '# Nexus official-docs watch',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Summary: ${report.summary.total} sources; ${report.summary.succeeded} succeeded; ${report.summary.failed} failed; ${report.summary.firstSeen} first seen; ${report.summary.unchanged} unchanged; ${report.summary.changed} changed.`,
    '',
    '## Sources',
    '',
  ]

  for (const source of report.sources) {
    if (source.outcome === 'failed') {
      lines.push(`- FAIL \`${source.id}\` — ${source.errorCode}: ${source.error}`)
    } else {
      lines.push(`- ${source.change.toUpperCase()} \`${source.id}\` — ${source.finalUrl}`)
    }
  }

  lines.push('', '## Gates', '')
  lines.push(`- Critical failures: ${report.gates.criticalFailures.length}`)
  lines.push(`- Material changes: ${report.gates.materialChanges.length}`)
  lines.push(`- Exit code: ${report.gates.exitCode}`)
  lines.push('')
  return lines.join('\n')
}

function pathIsInside(root, candidate) {
  const relative = path.relative(root, candidate)
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)
}

export function assertPathInsideRoot(root, candidate) {
  const rootAbsolute = path.resolve(root)
  const rootReal = realpathSync(rootAbsolute)
  const candidateAbsolute = path.resolve(rootAbsolute, candidate)

  let ancestor = candidateAbsolute
  while (!existsSync(ancestor)) {
    const parent = path.dirname(ancestor)
    if (parent === ancestor) break
    ancestor = parent
  }
  const ancestorReal = realpathSync(ancestor)
  const resolved = path.resolve(ancestorReal, path.relative(ancestor, candidateAbsolute))
  if (!pathIsInside(rootReal, resolved)) {
    throw new WatchError('unsafe_path', 'Resolved path must stay inside the target root')
  }
  if (existsSync(candidateAbsolute) && lstatSync(candidateAbsolute).isSymbolicLink()) {
    const resolvedReal = realpathSync(candidateAbsolute)
    if (!pathIsInside(rootReal, resolvedReal)) {
      throw new WatchError('unsafe_path', 'Symlink target escapes the target root')
    }
  }
  return resolved
}

async function atomicWrite(target, value) {
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`
  await writeFile(temporary, value, { encoding: 'utf8', mode: 0o644 })
  await rename(temporary, target)
}

async function writeReports(root, outputDir, json, markdown) {
  const safeDirectory = assertPathInsideRoot(root, outputDir)
  await mkdir(safeDirectory, { recursive: true })
  await Promise.all([
    atomicWrite(path.join(safeDirectory, 'report.json'), json),
    atomicWrite(path.join(safeDirectory, 'report.md'), markdown),
  ])
  return safeDirectory
}

function failureResult(source, error) {
  const code = error instanceof WatchError ? error.code : 'unexpected_failure'
  const message = error instanceof Error ? error.message : 'Unknown source failure'
  return {
    id: source.id,
    vendor: source.vendor,
    url: source.url,
    outcome: 'failed',
    critical: source.critical,
    gateOnChange: source.gateOnChange,
    errorCode: code,
    error: message.replace(/[\r\n]+/g, ' ').slice(0, 300),
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (true) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      results[index] = await mapper(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

export async function runWatcher(options) {
  validateRegistry(options.registry)
  const root = realpathSync(options.root)
  const baseline = options.baseline ?? null
  const baselineById = previousSources(baseline)
  const requestedIds = options.onlyIds ? new Set(options.onlyIds) : null
  const availableIds = new Set(options.registry.sources.map((source) => source.id))
  if (requestedIds) {
    for (const id of requestedIds) {
      if (!availableIds.has(id)) {
        throw new WatchError('unknown_source', `Unknown source id: ${id}`)
      }
    }
  }
  const sources = options.registry.sources.filter((source) => !requestedIds || requestedIds.has(source.id))
  const concurrency = options.registry.defaults.concurrency ?? 3

  const results = await mapWithConcurrency(sources, concurrency, async (source) => {
    try {
      return await fetchOfficialSource(source, options.registry.defaults, {
        baseline: baselineById.get(source.id),
        fetchImpl: options.fetchImpl,
        resolveHost: options.resolveHost,
      })
    } catch (error) {
      return failureResult(source, error)
    }
  })
  const report = buildReport(
    results,
    baseline,
    options.now ?? new Date().toISOString(),
    options.gateMaterial ?? false,
  )
  const json = renderJson(report)
  const markdown = renderMarkdown(report)
  let writtenTo = null
  if (options.outputDir) {
    writtenTo = await writeReports(root, options.outputDir, json, markdown)
  }
  return { report, json, markdown, writtenTo }
}

function usage() {
  return [
    'Usage: node scripts/nexus-docs-watch.mjs [options]',
    '',
    'Options:',
    '  --root <dir>          Target repository root (default: current directory)',
    '  --config <file>       Registry JSON inside root (default: config/nexus-official-sources.json)',
    '  --baseline <file>     Explicit prior report JSON inside root (read-only)',
    '  --write <dir>         Explicit output directory inside root; omitted means no writes',
    '  --only <id,id>        Fetch only named source ids',
    '  --gate-material       Exit nonzero for changed sources configured with gateOnChange',
    '  --help                Show this help',
  ].join('\n')
}

function parseArgs(argv) {
  const parsed = {
    root: '.',
    config: 'config/nexus-official-sources.json',
    baseline: null,
    outputDir: null,
    onlyIds: null,
    gateMaterial: false,
    help: false,
  }
  const valueFlags = new Set(['--root', '--config', '--baseline', '--write', '--only'])

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (valueFlags.has(argument)) {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) {
        throw new WatchError('invalid_arguments', `${argument} requires a value`)
      }
      index += 1
      if (argument === '--root') parsed.root = value
      if (argument === '--config') parsed.config = value
      if (argument === '--baseline') parsed.baseline = value
      if (argument === '--write') parsed.outputDir = value
      if (argument === '--only') parsed.onlyIds = value.split(',').map((id) => id.trim()).filter(Boolean)
      continue
    }
    if (argument === '--gate-material') {
      parsed.gateMaterial = true
      continue
    }
    if (argument === '--help') {
      parsed.help = true
      continue
    }
    throw new WatchError('invalid_arguments', `Unknown argument: ${argument}`)
  }
  return parsed
}

async function readJsonInsideRoot(root, candidate, label) {
  const safePath = assertPathInsideRoot(root, candidate)
  let raw
  try {
    raw = await readFile(safePath, 'utf8')
  } catch {
    throw new WatchError('input_read_failed', `Could not read ${label} file inside target root`)
  }
  try {
    return JSON.parse(raw)
  } catch {
    throw new WatchError('invalid_json_file', `${label} file is not valid JSON`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(`${usage()}\n`)
    return
  }

  const root = realpathSync(path.resolve(args.root))
  const registry = await readJsonInsideRoot(root, args.config, 'registry')
  const baseline = args.baseline
    ? await readJsonInsideRoot(root, args.baseline, 'baseline')
    : null
  const result = await runWatcher({
    registry,
    baseline,
    root,
    outputDir: args.outputDir,
    onlyIds: args.onlyIds,
    gateMaterial: args.gateMaterial,
  })

  process.stdout.write(result.json)
  process.stderr.write(result.markdown)
  process.exitCode = result.report.gates.exitCode
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    const code = error instanceof WatchError ? error.code : 'unexpected_failure'
    const message = error instanceof Error ? error.message : 'Unknown watcher failure'
    process.stderr.write(`nexus-docs-watch ${code}: ${message}\n`)
    process.exitCode = 1
  })
}

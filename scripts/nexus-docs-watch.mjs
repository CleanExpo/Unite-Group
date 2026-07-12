#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { promises as dns } from 'node:dns'
import { request as nativeHttpsRequest } from 'node:https'
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
import { BlockList, isIP } from 'node:net'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const NETWORK_CEILINGS = Object.freeze({
  timeoutMs: 60_000,
  maxBytes: 5 * 1024 * 1024,
  maxRedirects: 5,
  concurrency: 8,
})
const BLOCKED_IPV4 = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
]) {
  BLOCKED_IPV4.addSubnet(network, prefix, 'ipv4')
}
const BLOCKED_IPV6 = new BlockList()
for (const [network, prefix] of [
  ['::', 96],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['100:0:0:1::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
  ['5f00::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
]) {
  BLOCKED_IPV6.addSubnet(network, prefix, 'ipv6')
}
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

export function isPublicIpAddress(address) {
  const candidate = typeof address === 'string' ? address.toLowerCase().split('%')[0] : ''
  const family = isIP(candidate)
  if (family === 4) return !BLOCKED_IPV4.check(candidate, 'ipv4')
  if (family === 6) return !BLOCKED_IPV6.check(candidate, 'ipv6')
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

function validateNetworkDefaults(defaults) {
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) {
    throw new WatchError('invalid_config', 'Network defaults are required')
  }
  for (const field of ['timeoutMs', 'maxBytes', 'maxRedirects']) {
    if (!Number.isInteger(defaults[field]) || defaults[field] <= 0) {
      throw new WatchError('invalid_config', `defaults.${field} must be a positive integer`)
    }
    if (defaults[field] > NETWORK_CEILINGS[field]) {
      throw new WatchError(
        'invalid_config',
        `defaults.${field} exceeds the hard ceiling of ${NETWORK_CEILINGS[field]}`,
      )
    }
  }
  if (
    defaults.concurrency !== undefined &&
    (
      !Number.isInteger(defaults.concurrency) ||
      defaults.concurrency <= 0 ||
      defaults.concurrency > NETWORK_CEILINGS.concurrency
    )
  ) {
    throw new WatchError(
      'invalid_config',
      `defaults.concurrency must be between 1 and ${NETWORK_CEILINGS.concurrency}`,
    )
  }
  if (
    !Array.isArray(defaults.acceptedContentTypes) ||
    defaults.acceptedContentTypes.length === 0 ||
    defaults.acceptedContentTypes.some((value) => typeof value !== 'string' || value.trim() === '')
  ) {
    throw new WatchError('invalid_config', 'defaults.acceptedContentTypes must be a non-empty string array')
  }
  return defaults
}

export function validateRegistry(registry) {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    throw new WatchError('invalid_config', 'Registry must be an object')
  }
  if (registry.schemaVersion !== 1) {
    throw new WatchError('invalid_config', 'Registry schemaVersion must be 1')
  }
  validateNetworkDefaults(registry.defaults)
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

function abortable(promise, signal) {
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    Promise.resolve(promise).then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

async function assertSafeNetworkTarget(url, allowedHosts, resolveHost, signal) {
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
    addresses = await abortable(resolveHost(hostname), signal)
  } catch (error) {
    if (signal.aborted) throw signal.reason
    throw new WatchError('dns_failure', `Could not resolve allowlisted host: ${hostname}`)
  }
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new WatchError('dns_failure', `Allowlisted host returned no addresses: ${hostname}`)
  }

  const approved = []
  const seen = new Set()
  for (const record of addresses) {
    const rawAddress = typeof record === 'string' ? record : record?.address
    const address = typeof rawAddress === 'string' ? rawAddress.split('%')[0] : ''
    const family = isIP(address)
    if (
      !family ||
      (record?.family !== undefined && Number(record.family) !== family) ||
      !isPublicIpAddress(address)
    ) {
      throw new WatchError('private_address', `Allowlisted host resolved to a non-public address: ${hostname}`)
    }
    const key = `${family}:${address.toLowerCase()}`
    if (!seen.has(key)) {
      approved.push({ address, family })
      seen.add(key)
    }
  }
  return approved
}

export function createPinnedLookup(hostname, approvedAddresses) {
  const expectedHostname = normaliseHostname(hostname)
  const approved = approvedAddresses.map(({ address, family }) => ({ address, family }))
  return (requestedHostname, options, callback) => {
    const requested = normaliseHostname(requestedHostname)
    if (requested !== expectedHostname) {
      callback(new WatchError('dns_rebinding', `Pinned lookup refused unexpected hostname: ${requested}`))
      return
    }

    const lookupOptions = typeof options === 'number' ? { family: options } : (options ?? {})
    const requestedFamily = Number(lookupOptions.family) || 0
    const matching = requestedFamily
      ? approved.filter((record) => record.family === requestedFamily)
      : approved
    if (matching.length === 0) {
      callback(new WatchError('dns_failure', `No prevalidated address for ${expectedHostname}`))
      return
    }
    if (lookupOptions.all) {
      callback(null, matching.map((record) => ({ ...record })))
      return
    }
    callback(null, matching[0].address, matching[0].family)
  }
}

function mappedIpv4(address) {
  const match = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return match?.[1] ?? null
}

export function assertPinnedPeer(remoteAddress, approvedAddresses) {
  let candidate = typeof remoteAddress === 'string' ? remoteAddress.split('%')[0] : ''
  let family = isIP(candidate)
  const mapped = family === 6 ? mappedIpv4(candidate) : null
  if (mapped) {
    candidate = mapped
    family = 4
  }

  for (const record of approvedAddresses) {
    if (record.family !== family) continue
    const exact = new BlockList()
    exact.addAddress(record.address, family === 4 ? 'ipv4' : 'ipv6')
    if (exact.check(candidate, family === 4 ? 'ipv4' : 'ipv6')) return
  }
  throw new WatchError('dns_rebinding', 'Connected peer was not in the prevalidated address set')
}

function nodeHeaders(headers) {
  const normalised = new Headers()
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) normalised.append(name, item)
    } else if (value !== undefined) {
      normalised.set(name, value)
    }
  }
  return normalised
}

export function requestPinnedHttps({
  url,
  approvedAddresses,
  headers,
  signal,
  httpsRequestImpl = nativeHttpsRequest,
}) {
  return new Promise((resolve, reject) => {
    let request
    try {
      request = httpsRequestImpl(url, {
        method: 'GET',
        headers,
        signal,
        agent: false,
        lookup: createPinnedLookup(url.hostname, approvedAddresses),
        servername: url.hostname,
      }, (response) => {
        resolve({
          status: response.statusCode,
          headers: nodeHeaders(response.headers),
          body: Readable.toWeb(response),
        })
      })
    } catch (error) {
      reject(error)
      return
    }

    request.once('socket', (socket) => {
      socket.once('secureConnect', () => {
        try {
          assertPinnedPeer(socket.remoteAddress, approvedAddresses)
        } catch (error) {
          request.destroy(error)
        }
      })
    })
    request.once('error', reject)
    request.end()
  })
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

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new WatchError('invalid_baseline', `${label} must be an object`)
  }
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new WatchError('invalid_baseline', `${label} has an unexpected schema`)
  }
}

function registryFingerprint(registry) {
  const governed = {
    schemaVersion: registry.schemaVersion,
    defaults: registry.defaults,
    sources: registry.sources
      .map((source) => ({
        id: source.id,
        vendor: source.vendor,
        url: source.url,
        allowedHosts: source.allowedHosts.map(normaliseHostname).sort(),
        critical: source.critical,
        gateOnChange: source.gateOnChange,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  }
  return sha256(JSON.stringify(stableValue(governed)))
}

function validEtag(value) {
  return (
    value === null ||
    (
      typeof value === 'string' &&
      value.length <= 1024 &&
      /^(?:W\/)?"[\x21\x23-\x7e\x80-\xff]*"$/.test(value)
    )
  )
}

function validLastModified(value) {
  return (
    value === null ||
    (
      typeof value === 'string' &&
      /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value) &&
      Number.isFinite(Date.parse(value))
    )
  )
}

function validateBaselineSourceEntry(entry, source, defaults) {
  assertExactKeys(entry, [
    'id',
    'url',
    'finalUrl',
    'httpStatus',
    'contentType',
    'bytes',
    'rawSha256',
    'normalisedSha256',
    'responseHeaders',
  ], `Baseline source ${source.id}`)
  if (entry.id !== source.id || entry.url !== source.url) {
    throw new WatchError('invalid_baseline', `Baseline source identity mismatch: ${source.id}`)
  }

  let finalUrl
  try {
    finalUrl = new URL(entry.finalUrl)
  } catch {
    throw new WatchError('invalid_baseline', `Baseline source ${source.id} has an invalid final URL`)
  }
  const allowedHosts = source.allowedHosts.map(normaliseHostname)
  if (
    finalUrl.protocol !== 'https:' ||
    finalUrl.username ||
    finalUrl.password ||
    (finalUrl.port && finalUrl.port !== '443') ||
    isUnsafeHostname(finalUrl.hostname) ||
    !allowedHosts.includes(normaliseHostname(finalUrl.hostname))
  ) {
    throw new WatchError('invalid_baseline', `Baseline source ${source.id} has an unsafe final URL`)
  }

  if (entry.httpStatus !== 200 && entry.httpStatus !== 304) {
    throw new WatchError('invalid_baseline', `Baseline source ${source.id} has an invalid HTTP status`)
  }
  if (
    typeof entry.contentType !== 'string' ||
    entry.contentType !== canonicalContentType(entry.contentType) ||
    !defaults.acceptedContentTypes.map(canonicalContentType).includes(entry.contentType)
  ) {
    throw new WatchError('invalid_baseline', `Baseline source ${source.id} has an invalid content type`)
  }
  if (!Number.isInteger(entry.bytes) || entry.bytes < 0 || entry.bytes > defaults.maxBytes) {
    throw new WatchError('invalid_baseline', `Baseline source ${source.id} has an invalid byte count`)
  }
  for (const field of ['rawSha256', 'normalisedSha256']) {
    if (typeof entry[field] !== 'string' || !/^[a-f0-9]{64}$/.test(entry[field])) {
      throw new WatchError('invalid_baseline', `Baseline source ${source.id} has an invalid ${field}`)
    }
  }

  assertExactKeys(entry.responseHeaders, ['etag', 'lastModified'], `Baseline source ${source.id} headers`)
  if (!validEtag(entry.responseHeaders.etag) || !validLastModified(entry.responseHeaders.lastModified)) {
    throw new WatchError('invalid_baseline', `Baseline source ${source.id} has invalid response headers`)
  }
  return entry
}

export function validateBaseline(baseline, registry) {
  validateRegistry(registry)
  assertExactKeys(
    baseline,
    ['schemaVersion', 'generatedAt', 'registrySha256', 'sources'],
    'Baseline',
  )
  if (baseline.schemaVersion !== 1) {
    throw new WatchError('invalid_baseline', 'Baseline schemaVersion must be 1')
  }
  if (
    typeof baseline.generatedAt !== 'string' ||
    !Number.isFinite(Date.parse(baseline.generatedAt)) ||
    new Date(baseline.generatedAt).toISOString() !== baseline.generatedAt
  ) {
    throw new WatchError('invalid_baseline', 'Baseline generatedAt must be a canonical ISO timestamp')
  }
  if (baseline.registrySha256 !== registryFingerprint(registry)) {
    throw new WatchError('invalid_baseline', 'Baseline registry fingerprint does not match')
  }
  if (!Array.isArray(baseline.sources)) {
    throw new WatchError('invalid_baseline', 'Baseline sources must be an array')
  }

  const expectedSources = [...registry.sources].sort((left, right) => left.id.localeCompare(right.id))
  const receivedIds = baseline.sources.map((entry) => entry?.id)
  const expectedIds = expectedSources.map((source) => source.id)
  if (
    receivedIds.length !== expectedIds.length ||
    receivedIds.some((id, index) => id !== expectedIds[index])
  ) {
    throw new WatchError(
      'invalid_baseline',
      'Baseline must contain every active registry source exactly once in source-id order',
    )
  }
  baseline.sources.forEach((entry, index) => {
    validateBaselineSourceEntry(entry, expectedSources[index], registry.defaults)
  })
  return baseline
}

export function buildFingerprintBaseline(report, registry) {
  validateRegistry(registry)
  if (!report || typeof report !== 'object' || !Array.isArray(report.sources)) {
    throw new WatchError('invalid_baseline', 'Cannot build a baseline without report sources')
  }
  const byId = new Map()
  for (const result of report.sources) {
    if (byId.has(result.id) || result.outcome !== 'ok') {
      throw new WatchError('invalid_baseline', 'Baseline candidates require unique successful sources')
    }
    byId.set(result.id, result)
  }

  const baseline = {
    schemaVersion: 1,
    generatedAt: report.generatedAt,
    registrySha256: registryFingerprint(registry),
    sources: [...registry.sources]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((source) => {
        const result = byId.get(source.id)
        if (!result) {
          throw new WatchError('invalid_baseline', `Baseline candidate is missing source ${source.id}`)
        }
        return {
          id: result.id,
          url: result.url,
          finalUrl: result.finalUrl,
          httpStatus: result.httpStatus,
          contentType: result.contentType,
          bytes: result.bytes,
          rawSha256: result.rawSha256,
          normalisedSha256: result.normalisedSha256,
          responseHeaders: {
            etag: result.etag ?? null,
            lastModified: result.lastModified ?? null,
          },
        }
      }),
  }
  return validateBaseline(baseline, registry)
}

function baselineHeaders(baseline) {
  const headers = {
    accept: 'text/markdown,text/plain;q=0.95,application/json;q=0.9,application/atom+xml;q=0.9,application/xml;q=0.85,text/html;q=0.8,*/*;q=0.1',
    'accept-language': 'en-AU,en;q=0.9',
    'user-agent': 'Unite-Group-Nexus-Docs-Watch/1.0',
  }
  if (baseline?.responseHeaders.etag) headers['if-none-match'] = baseline.responseHeaders.etag
  if (baseline?.responseHeaders.lastModified) {
    headers['if-modified-since'] = baseline.responseHeaders.lastModified
  }
  return headers
}

function baselineReuse(source, baseline, response) {
  if (!baseline) {
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
    etag: response.headers.get('etag') ?? baseline.responseHeaders.etag,
    lastModified: response.headers.get('last-modified') ?? baseline.responseHeaders.lastModified,
    critical: source.critical,
    gateOnChange: source.gateOnChange,
  }
}

export async function fetchOfficialSource(source, defaults, options = {}) {
  validateSource(source)
  validateNetworkDefaults(defaults)
  if (options.baseline !== undefined && options.baseline !== null) {
    validateBaselineSourceEntry(options.baseline, source, defaults)
  }
  const resolveHost = options.resolveHost ?? defaultResolveHost
  const requestImpl = options.requestImpl ?? (
    options.fetchImpl
      ? ({ url, headers, signal }) => options.fetchImpl(url, {
        method: 'GET',
        redirect: 'manual',
        headers,
        signal,
      })
      : requestPinnedHttps
  )
  if (typeof requestImpl !== 'function') {
    throw new WatchError('transport_unavailable', 'An HTTPS request implementation is required')
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
      const approvedAddresses = await assertSafeNetworkTarget(
        currentUrl,
        allowedHosts,
        resolveHost,
        controller.signal,
      )
      let response
      try {
        response = await requestImpl({
          url: currentUrl,
          approvedAddresses,
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
        await response.body?.cancel?.('redirect response discarded')
        currentUrl = new URL(location, currentUrl)
        continue
      }

      if (response.status === 304) {
        return baselineReuse(source, options.baseline, response)
      }
      if (response.status !== 200) {
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
    : !baselineSource
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

async function writeReports(root, outputDir, json, markdown, baselineCandidateJson) {
  const safeDirectory = assertPathInsideRoot(root, outputDir)
  await mkdir(safeDirectory, { recursive: true })
  const writes = [
    atomicWrite(path.join(safeDirectory, 'report.json'), json),
    atomicWrite(path.join(safeDirectory, 'report.md'), markdown),
  ]
  if (baselineCandidateJson) {
    writes.push(atomicWrite(
      path.join(safeDirectory, 'baseline.candidate.json'),
      baselineCandidateJson,
    ))
  }
  await Promise.all(writes)
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
  if (baseline) validateBaseline(baseline, options.registry)
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
        requestImpl: options.requestImpl,
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
  const baselineCandidate = (
    sources.length === options.registry.sources.length && report.summary.failed === 0
  )
    ? buildFingerprintBaseline(report, options.registry)
    : null
  const baselineCandidateJson = baselineCandidate ? renderJson(baselineCandidate) : null
  let writtenTo = null
  if (options.outputDir) {
    writtenTo = await writeReports(
      root,
      options.outputDir,
      json,
      markdown,
      baselineCandidateJson,
    )
  }
  return { report, json, markdown, baselineCandidate, baselineCandidateJson, writtenTo }
}

function usage() {
  return [
    'Usage: node scripts/nexus-docs-watch.mjs [options]',
    '',
    'Options:',
    '  --root <dir>          Target repository root (default: current directory)',
    '  --config <file>       Registry JSON inside root (default: config/nexus-official-sources.json)',
    '  --baseline <file>     Explicit fingerprint baseline JSON inside root (read-only)',
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

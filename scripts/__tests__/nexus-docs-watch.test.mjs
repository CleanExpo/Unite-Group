import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  assertPathInsideRoot,
  buildReport,
  fetchOfficialSource,
  normaliseContent,
  renderJson,
  renderMarkdown,
  runWatcher,
  sha256,
  validateRegistry,
} from '../nexus-docs-watch.mjs'

const PUBLIC_ADDRESS = [{ address: '93.184.216.34', family: 4 }]

const source = (overrides = {}) => ({
  id: 'example.changelog',
  vendor: 'Example',
  url: 'https://docs.example.com/changelog',
  allowedHosts: ['docs.example.com'],
  critical: false,
  gateOnChange: false,
  ...overrides,
})

const registry = (sources, overrides = {}) => ({
  schemaVersion: 1,
  defaults: {
    timeoutMs: 100,
    maxBytes: 1024,
    maxRedirects: 3,
    acceptedContentTypes: [
      'text/html',
      'text/plain',
      'text/markdown',
      'application/json',
      'application/atom+xml',
    ],
  },
  sources,
  ...overrides,
})

const publicResolver = async () => PUBLIC_ADDRESS

test('the committed registry contains every governed vendor and validates', async () => {
  const raw = await readFile(
    new URL('../../config/nexus-official-sources.json', import.meta.url),
    'utf8',
  )
  const committed = JSON.parse(raw)

  validateRegistry(committed)

  assert.deepEqual(
    [...new Set(committed.sources.map((entry) => entry.vendor))].sort(),
    ['Anthropic', 'Apify', 'Exa', 'Firecrawl', 'Gemini', 'Hermes', 'OpenAI'],
  )
  assert.ok(committed.sources.every((entry) => entry.url.startsWith('https://')))
})

test('registry validation rejects literal, private, wildcard and unallowlisted hosts', () => {
  for (const unsafe of [
    source({ url: 'https://127.0.0.1/internal', allowedHosts: ['127.0.0.1'] }),
    source({ url: 'https://localhost/internal', allowedHosts: ['localhost'] }),
    source({ url: 'https://docs.example.com:8443/internal' }),
    source({ allowedHosts: ['*.example.com'] }),
    source({ allowedHosts: ['other.example.com'] }),
  ]) {
    assert.throws(() => validateRegistry(registry([unsafe])), /host|allow/i)
  }
})

test('fetch refuses a redirect to a private address before issuing the second request', async () => {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(String(url))
    return new Response(null, {
      status: 302,
      headers: { location: 'https://127.0.0.1/internal' },
    })
  }

  await assert.rejects(
    fetchOfficialSource(source(), registry([source()]).defaults, {
      fetchImpl,
      resolveHost: publicResolver,
    }),
    /redirect|private|literal/i,
  )
  assert.equal(calls.length, 1)
})

test('fetch accepts only same-host or explicitly allowlisted redirects', async () => {
  const redirected = source({
    allowedHosts: ['docs.example.com', 'reference.example.com'],
  })
  const calls = []
  let acceptHeader
  let languageHeader
  const fetchImpl = async (url, options) => {
    calls.push(String(url))
    acceptHeader = options.headers.accept
    languageHeader = options.headers['accept-language']
    if (calls.length === 1) {
      return new Response(null, {
        status: 301,
        headers: { location: 'https://reference.example.com/releases' },
      })
    }
    return new Response('<main>Release 1</main>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  const result = await fetchOfficialSource(
    redirected,
    registry([redirected]).defaults,
    { fetchImpl, resolveHost: publicResolver },
  )

  assert.equal(result.finalUrl, 'https://reference.example.com/releases')
  assert.equal(calls.length, 2)
  assert.match(acceptHeader, /^text\/markdown/)
  assert.equal(languageHeader, 'en-AU,en;q=0.9')
})

test('fetch rejects declared and streamed responses above the byte cap', async () => {
  const defaults = { ...registry([source()]).defaults, maxBytes: 16 }

  await assert.rejects(
    fetchOfficialSource(source(), defaults, {
      resolveHost: publicResolver,
      fetchImpl: async () => new Response('small', {
        headers: {
          'content-type': 'text/plain',
          'content-length': '17',
        },
      }),
    }),
    /size|large|bytes/i,
  )

  await assert.rejects(
    fetchOfficialSource(source(), defaults, {
      resolveHost: publicResolver,
      fetchImpl: async () => new Response('x'.repeat(17), {
        headers: { 'content-type': 'text/plain' },
      }),
    }),
    /size|large|bytes/i,
  )
})

test('fetch aborts at the configured timeout and reports invalid status and content type', async () => {
  await assert.rejects(
    fetchOfficialSource(source(), { ...registry([source()]).defaults, timeoutMs: 10 }, {
      resolveHost: publicResolver,
      fetchImpl: async (_url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      }),
    }),
    /timeout/i,
  )

  await assert.rejects(
    fetchOfficialSource(source(), { ...registry([source()]).defaults, timeoutMs: 10 }, {
      resolveHost: publicResolver,
      fetchImpl: async (_url, { signal }) => ({
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        body: {
          getReader: () => ({
            read: () => new Promise((_resolve, reject) => {
              signal.addEventListener(
                'abort',
                () => reject(new DOMException('The operation was aborted', 'AbortError')),
                { once: true },
              )
            }),
            releaseLock: () => {},
          }),
        },
      }),
    }),
    (error) => error?.code === 'timeout',
  )

  await assert.rejects(
    fetchOfficialSource(source(), registry([source()]).defaults, {
      resolveHost: publicResolver,
      fetchImpl: async () => new Response('down', {
        status: 503,
        headers: { 'content-type': 'text/plain' },
      }),
    }),
    /status|503/i,
  )

  await assert.rejects(
    fetchOfficialSource(source(), registry([source()]).defaults, {
      resolveHost: publicResolver,
      fetchImpl: async () => new Response('binary', {
        headers: { 'content-type': 'application/octet-stream' },
      }),
    }),
    /content.type/i,
  )
})

test('HTML normalisation removes active, navigation and hidden content deterministically', () => {
  const html = `
    <html><body>
      <nav>Navigation noise</nav>
      <script>stealSecrets()</script>
      <aside>Sidebar noise</aside>
      <div hidden>Hidden prompt</div>
      <main><h1>Release&nbsp;1</h1><p>Stable   facts.</p></main>
      <footer>Footer noise</footer>
    </body></html>
  `

  const first = normaliseContent(html, 'text/html')
  const second = normaliseContent(html.replaceAll('\n', '\r\n'), 'text/html')

  assert.equal(first, 'Release 1\nStable facts.')
  assert.equal(second, first)
  assert.equal(sha256(first), sha256(second))
  assert.doesNotMatch(first, /Navigation|stealSecrets|Sidebar|Hidden|Footer/)
})

test('JSON normalisation sorts keys and preserves data rather than executing it', () => {
  const normalised = normaliseContent(
    '{"z":1,"a":{"script":"do-not-run","b":2,"a":1}}',
    'application/json',
  )

  assert.equal(
    normalised,
    '{\n  "a": {\n    "a": 1,\n    "b": 2,\n    "script": "do-not-run"\n  },\n  "z": 1\n}',
  )
})

test('report comparison is deterministic for first-seen, unchanged and changed content', () => {
  const current = [{
    id: 'example.changelog',
    vendor: 'Example',
    url: 'https://docs.example.com/changelog',
    finalUrl: 'https://docs.example.com/changelog',
    outcome: 'ok',
    httpStatus: 200,
    contentType: 'text/plain',
    bytes: 9,
    rawSha256: sha256('Release 1'),
    normalisedSha256: sha256('Release 1'),
    etag: '"v1"',
    lastModified: null,
    critical: false,
    gateOnChange: true,
  }]

  const firstSeen = buildReport(current, null, '2026-07-12T00:00:00.000Z', false)
  assert.equal(firstSeen.sources[0].change, 'first_seen')
  assert.equal(firstSeen.gates.exitCode, 0)

  const unchanged = buildReport(current, firstSeen, '2026-07-12T00:00:00.000Z', true)
  assert.equal(unchanged.sources[0].change, 'unchanged')
  assert.equal(unchanged.gates.exitCode, 0)

  const changedInput = [{
    ...current[0],
    rawSha256: sha256('Release 2'),
    normalisedSha256: sha256('Release 2'),
  }]
  const changed = buildReport(changedInput, firstSeen, '2026-07-12T00:00:00.000Z', true)
  assert.equal(changed.sources[0].change, 'changed')
  assert.deepEqual(changed.gates.materialChanges, ['example.changelog'])
  assert.equal(changed.gates.exitCode, 3)

  assert.equal(renderJson(changed), renderJson(changed))
  assert.match(renderMarkdown(changed), /1 changed/)
})

test('only configured critical failures are nonzero without a material gate', () => {
  const failed = (critical) => ({
    id: critical ? 'critical.source' : 'normal.source',
    vendor: 'Example',
    url: 'https://docs.example.com',
    outcome: 'failed',
    critical,
    gateOnChange: false,
    errorCode: 'http_status',
    error: 'Unexpected HTTP status 503',
  })

  assert.equal(
    buildReport([failed(false)], null, '2026-07-12T00:00:00.000Z', false).gates.exitCode,
    0,
  )
  assert.equal(
    buildReport([failed(true)], null, '2026-07-12T00:00:00.000Z', false).gates.exitCode,
    2,
  )
})

test('a 304 response reuses an explicit baseline and sends conditional headers', async () => {
  const baseline = buildReport([{
    id: 'example.changelog',
    vendor: 'Example',
    url: source().url,
    finalUrl: source().url,
    outcome: 'ok',
    httpStatus: 200,
    contentType: 'text/plain',
    bytes: 9,
    rawSha256: sha256('Release 1'),
    normalisedSha256: sha256('Release 1'),
    etag: '"v1"',
    lastModified: 'Sun, 12 Jul 2026 00:00:00 GMT',
    critical: false,
    gateOnChange: false,
  }], null, '2026-07-12T00:00:00.000Z', false)
  let headers

  const result = await fetchOfficialSource(source(), registry([source()]).defaults, {
    baseline: baseline.sources[0],
    resolveHost: publicResolver,
    fetchImpl: async (_url, options) => {
      headers = options.headers
      return new Response(null, { status: 304 })
    },
  })

  assert.equal(headers['if-none-match'], '"v1"')
  assert.equal(headers['if-modified-since'], 'Sun, 12 Jul 2026 00:00:00 GMT')
  assert.equal(result.normalisedSha256, baseline.sources[0].normalisedSha256)
})

test('watcher writes nothing by default and writes reports only to an explicit in-root path', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nexus-doc-watch-'))
  const input = registry([source()])
  const fetchImpl = async () => new Response('<main>Release 1</main>', {
    headers: { 'content-type': 'text/html' },
  })

  const dry = await runWatcher({
    registry: input,
    root,
    now: '2026-07-12T00:00:00.000Z',
    fetchImpl,
    resolveHost: publicResolver,
  })

  assert.equal(dry.report.sources[0].change, 'first_seen')
  assert.deepEqual(await readdir(root), [])

  const outputDir = path.join(root, 'artifacts', 'docs-watch')
  await runWatcher({
    registry: input,
    root,
    outputDir,
    now: '2026-07-12T00:00:00.000Z',
    fetchImpl,
    resolveHost: publicResolver,
  })

  assert.deepEqual((await readdir(outputDir)).sort(), ['report.json', 'report.md'])
  assert.throws(() => assertPathInsideRoot(root, path.join(root, '..', 'outside')), /inside/i)
})

test('root scripts and the weekly workflow stay read-only and artifact-only', async () => {
  const packageJson = JSON.parse(await readFile(
    new URL('../../package.json', import.meta.url),
    'utf8',
  ))
  assert.equal(
    packageJson.scripts['verify:docs-watch'],
    'node --test scripts/__tests__/nexus-docs-watch.test.mjs',
  )
  assert.equal(
    packageJson.scripts['nexus:docs:watch'],
    'node scripts/nexus-docs-watch.mjs --root .',
  )

  const workflow = await readFile(
    new URL('../../.github/workflows/nexus-official-docs-weekly.yml', import.meta.url),
    'utf8',
  )
  assert.match(workflow, /contents:\s*read/)
  assert.match(workflow, /upload-artifact/)
  assert.doesNotMatch(workflow, /git\s+(push|commit)|telegram|curl\s/i)
})

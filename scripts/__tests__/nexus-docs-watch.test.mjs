import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import * as watcherModule from '../nexus-docs-watch.mjs'

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

const successfulResult = (entry = source(), overrides = {}) => ({
  id: entry.id,
  vendor: entry.vendor,
  url: entry.url,
  finalUrl: entry.url,
  outcome: 'ok',
  httpStatus: 200,
  contentType: 'text/plain',
  bytes: 9,
  rawSha256: sha256('Release 1'),
  normalisedSha256: sha256('Release 1'),
  etag: '"v1"',
  lastModified: 'Sun, 12 Jul 2026 00:00:00 GMT',
  critical: entry.critical,
  gateOnChange: entry.gateOnChange,
  ...overrides,
})

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
  const sourceIds = new Set(committed.sources.map((entry) => entry.id))
  for (const requiredId of [
    'openai.api.models',
    'openai.codex.plan-usage',
    'anthropic.platform.authentication',
    'anthropic.platform.data-retention',
    'gemini.api.deprecations',
    'hermes.docs.mixture-of-agents',
    'hermes.docs.fallback-providers',
    'apify.cli.changelog',
    'apify.integrations.mcp',
    'exa.docs.search',
  ]) {
    assert.equal(sourceIds.has(requiredId), true, `missing Section 8 source: ${requiredId}`)
  }
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

test('registry validation and direct fetches enforce hard network ceilings', async () => {
  for (const defaults of [
    { timeoutMs: 60001 },
    { maxBytes: (5 * 1024 * 1024) + 1 },
    { maxRedirects: 6 },
    { concurrency: 9 },
  ]) {
    assert.throws(
      () => validateRegistry(registry([source()], {
        defaults: { ...registry([source()]).defaults, ...defaults },
      })),
      /timeout|maxBytes|maxRedirects|concurrency|ceiling|between/i,
    )
  }

  let resolverCalled = false
  await assert.rejects(
    fetchOfficialSource(
      source(),
      { ...registry([source()]).defaults, timeoutMs: 60001 },
      {
        resolveHost: async () => {
          resolverCalled = true
          return PUBLIC_ADDRESS
        },
        requestImpl: async () => new Response('ok', {
          headers: { 'content-type': 'text/plain' },
        }),
      },
    ),
    /timeout|ceiling/i,
  )
  assert.equal(resolverCalled, false)
})

test('address policy rejects private, reserved, translation and documentation ranges', () => {
  const rejected = [
    '0.1.2.3',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.1.1',
    '172.16.0.1',
    '192.0.0.1',
    '192.0.2.1',
    '192.88.99.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
    '240.0.0.1',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '64:ff9b::1',
    '64:ff9b:1::1',
    '100::1',
    '100:0:0:1::1',
    '2001::1',
    '2001:db8::1',
    '2002::1',
    '3fff::1',
    'fc00::1',
    'fe80::1',
    'fec0::1',
    'ff00::1',
  ]
  for (const address of rejected) {
    assert.equal(watcherModule.isPublicIpAddress(address), false, address)
  }
  assert.equal(watcherModule.isPublicIpAddress('8.8.8.8'), true)
  assert.equal(watcherModule.isPublicIpAddress('2606:4700:4700::1111'), true)
})

test('pinned lookup and peer checks accept only the prevalidated address set', async () => {
  const lookup = watcherModule.createPinnedLookup('docs.example.com', [
    { address: '93.184.216.34', family: 4 },
    { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
  ])

  const all = await new Promise((resolve, reject) => {
    lookup('docs.example.com', { all: true }, (error, addresses) => {
      if (error) reject(error)
      else resolve(addresses)
    })
  })
  assert.deepEqual(all, [
    { address: '93.184.216.34', family: 4 },
    { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
  ])

  await assert.rejects(new Promise((resolve, reject) => {
    lookup('rebound.example.com', {}, (error, address, family) => {
      if (error) reject(error)
      else resolve({ address, family })
    })
  }), /hostname|pinned/i)

  assert.doesNotThrow(() => watcherModule.assertPinnedPeer('93.184.216.34', all))
  assert.throws(
    () => watcherModule.assertPinnedPeer('10.0.0.1', all),
    /peer|pinned|approved/i,
  )
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

test('conditional validators are never forwarded to a different redirect resource', async () => {
  const redirected = source({
    allowedHosts: ['docs.example.com', 'reference.example.com'],
  })
  const input = registry([redirected])
  const baseline = watcherModule.buildFingerprintBaseline(
    buildReport(
      [successfulResult(redirected)],
      null,
      '2026-07-12T00:00:00.000Z',
      false,
    ),
    input,
  )
  const requests = []

  await assert.rejects(fetchOfficialSource(redirected, input.defaults, {
    baseline: baseline.sources[0],
    resolveHost: publicResolver,
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), headers: options.headers })
      if (requests.length === 1) {
        return new Response(null, {
          status: 302,
          headers: { location: 'https://reference.example.com/releases' },
        })
      }
      return new Response(null, { status: 304 })
    },
  }), /304|baseline|resource|validator/i)

  assert.equal(requests[0].headers['if-none-match'], '"v1"')
  assert.equal(requests[1].headers['if-none-match'], undefined)
  assert.equal(requests[1].headers['if-modified-since'], undefined)
})

test('an unsolicited 304 without a baseline validator is rejected', async () => {
  const input = registry([source()])
  const baseline = watcherModule.buildFingerprintBaseline(
    buildReport(
      [successfulResult()],
      null,
      '2026-07-12T00:00:00.000Z',
      false,
    ),
    input,
  )
  baseline.sources[0].responseHeaders = { etag: null, lastModified: null }

  await assert.rejects(fetchOfficialSource(source(), input.defaults, {
    baseline: baseline.sources[0],
    resolveHost: publicResolver,
    fetchImpl: async (_url, options) => {
      assert.equal(options.headers['if-none-match'], undefined)
      assert.equal(options.headers['if-modified-since'], undefined)
      return new Response(null, { status: 304 })
    },
  }), /304|validator|baseline/i)
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

  let requestCalled = false
  await assert.rejects(
    Promise.race([
      fetchOfficialSource(source(), { ...registry([source()]).defaults, timeoutMs: 10 }, {
        resolveHost: async () => new Promise(() => {}),
        requestImpl: async () => {
          requestCalled = true
          return new Response('unreachable', { headers: { 'content-type': 'text/plain' } })
        },
      }),
      new Promise((_resolve, reject) => {
        setTimeout(() => reject(new Error('resolver deadline was not enforced')), 75)
      }),
    ]),
    (error) => error?.code === 'timeout',
  )
  assert.equal(requestCalled, false)

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

  await assert.rejects(
    fetchOfficialSource(source(), registry([source()]).defaults, {
      resolveHost: publicResolver,
      fetchImpl: async () => new Response('partial', {
        status: 206,
        headers: { 'content-type': 'text/plain' },
      }),
    }),
    /status|206/i,
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
  const governedSource = source({ gateOnChange: true })
  const input = registry([governedSource])
  const current = [successfulResult(governedSource)]

  const firstSeen = buildReport(current, null, '2026-07-12T00:00:00.000Z', false)
  assert.equal(firstSeen.sources[0].change, 'first_seen')
  assert.equal(firstSeen.gates.exitCode, 0)

  const baseline = watcherModule.buildFingerprintBaseline(firstSeen, input)
  const unchanged = buildReport(current, baseline, '2026-07-12T00:00:00.000Z', true)
  assert.equal(unchanged.sources[0].change, 'unchanged')
  assert.equal(unchanged.gates.exitCode, 0)

  const changedInput = [{
    ...current[0],
    rawSha256: sha256('Release 2'),
    normalisedSha256: sha256('Release 2'),
  }]
  const changed = buildReport(changedInput, baseline, '2026-07-12T00:00:00.000Z', true)
  assert.equal(changed.sources[0].change, 'changed')
  assert.deepEqual(changed.gates.materialChanges, ['example.changelog'])
  assert.equal(changed.gates.exitCode, 3)

  assert.equal(renderJson(changed), renderJson(changed))
  assert.match(renderMarkdown(changed), /1 changed/)

  const provenanceChanged = buildReport([{
    ...current[0],
    finalUrl: `${current[0].finalUrl}?canonical-drift=1`,
  }], baseline, '2026-07-12T00:00:00.000Z', true)
  assert.equal(provenanceChanged.sources[0].change, 'changed')
  assert.deepEqual(provenanceChanged.sources[0].changeReasons, ['final_url'])
  assert.deepEqual(provenanceChanged.gates.materialChanges, ['example.changelog'])
  assert.equal(provenanceChanged.gates.exitCode, 3)
})

test('fingerprint baselines are strict, registry-bound, complete and body-free', async () => {
  const firstSource = source()
  const secondSource = source({
    id: 'example.models',
    url: 'https://docs.example.com/models',
  })
  const input = registry([firstSource, secondSource])
  const report = buildReport(
    [successfulResult(firstSource), successfulResult(secondSource)],
    null,
    '2026-07-12T00:00:00.000Z',
    false,
  )
  const baseline = watcherModule.buildFingerprintBaseline(report, input)

  watcherModule.validateBaseline(baseline, input)
  assert.deepEqual(Object.keys(baseline), [
    'schemaVersion',
    'generatedAt',
    'registrySha256',
    'sources',
  ])
  assert.doesNotMatch(JSON.stringify(baseline), /Release 1|body|content\s*:/i)

  const invalid = [
    { ...baseline, sources: [baseline.sources[0]] },
    { ...baseline, sources: [baseline.sources[0], baseline.sources[0]] },
    {
      ...baseline,
      sources: [
        ...baseline.sources.slice(0, 1),
        { ...baseline.sources[1], id: 'unknown.source' },
      ],
    },
    {
      ...baseline,
      sources: baseline.sources.map((entry, index) => index === 0
        ? { ...entry, normalisedSha256: 'not-a-sha' }
        : entry),
    },
    {
      ...baseline,
      sources: baseline.sources.map((entry, index) => index === 0
        ? { ...entry, finalUrl: 'https://127.0.0.1/internal' }
        : entry),
    },
    {
      ...baseline,
      sources: baseline.sources.map((entry, index) => index === 0
        ? {
          ...entry,
          responseHeaders: { ...entry.responseHeaders, etag: '"v1"\r\ninjected: yes' },
        }
        : entry),
    },
    { ...baseline, registrySha256: '0'.repeat(64) },
  ]

  for (const candidate of invalid) {
    assert.throws(() => watcherModule.validateBaseline(candidate, input), /baseline|source|sha|url|header|registry/i)
  }

  let requestCalled = false
  await assert.rejects(runWatcher({
    registry: input,
    baseline: invalid[3],
    root: await mkdtemp(path.join(os.tmpdir(), 'nexus-doc-watch-invalid-baseline-')),
    requestImpl: async () => {
      requestCalled = true
      return new Response('unreachable', { headers: { 'content-type': 'text/plain' } })
    },
    resolveHost: publicResolver,
  }), /baseline|sha/i)
  assert.equal(requestCalled, false)
})

test('every source failure is non-green while criticality controls escalation', () => {
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

  const normalFailure = buildReport(
    [failed(false)],
    null,
    '2026-07-12T00:00:00.000Z',
    false,
  )
  assert.deepEqual(normalFailure.gates.monitorFailures, ['normal.source'])
  assert.equal(normalFailure.gates.exitCode, 1)

  const criticalFailure = buildReport(
    [failed(true)],
    null,
    '2026-07-12T00:00:00.000Z',
    false,
  )
  assert.deepEqual(criticalFailure.gates.monitorFailures, ['critical.source'])
  assert.deepEqual(criticalFailure.gates.criticalFailures, ['critical.source'])
  assert.equal(criticalFailure.gates.exitCode, 2)
})

test('a 304 response reuses an explicit baseline and sends conditional headers', async () => {
  const input = registry([source()])
  const report = buildReport(
    [successfulResult()],
    null,
    '2026-07-12T00:00:00.000Z',
    false,
  )
  const baseline = watcherModule.buildFingerprintBaseline(report, input)
  let headers

  const result = await fetchOfficialSource(source(), input.defaults, {
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

  assert.deepEqual(
    (await readdir(outputDir)).sort(),
    ['baseline.candidate.json', 'report.json', 'report.md'],
  )
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
    'node scripts/nexus-docs-watch.mjs --root . --baseline config/nexus-official-sources.baseline.json --gate-material',
  )

  const workflow = await readFile(
    new URL('../../.github/workflows/nexus-official-docs-weekly.yml', import.meta.url),
    'utf8',
  )
  assert.match(workflow, /contents:\s*read/)
  assert.match(workflow, /cron:\s*'17 16 \* \* 6'/)
  assert.match(workflow, /persist-credentials:\s*false/)
  assert.match(workflow, /upload-artifact/)
  assert.match(workflow, /--baseline config\/nexus-official-sources\.baseline\.json/)
  assert.match(
    workflow,
    /actions\/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0\s+# v7\.0\.0/,
  )
  assert.match(
    workflow,
    /actions\/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e\s+# v6\.4\.0/,
  )
  assert.match(
    workflow,
    /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a\s+# v7\.0\.1/,
  )
  assert.doesNotMatch(workflow, /uses:\s*actions\/(?:checkout|setup-node|upload-artifact)@v/)
  assert.doesNotMatch(workflow, /git\s+(push|commit)|telegram|curl\s/i)

  const committedRegistry = JSON.parse(await readFile(
    new URL('../../config/nexus-official-sources.json', import.meta.url),
    'utf8',
  ))
  const committedBaseline = JSON.parse(await readFile(
    new URL('../../config/nexus-official-sources.baseline.json', import.meta.url),
    'utf8',
  ))
  watcherModule.validateBaseline(committedBaseline, committedRegistry)
  assert.equal(committedBaseline.sources.length, committedRegistry.sources.length)
  assert.doesNotMatch(JSON.stringify(committedBaseline), /"(?:body|content)"\s*:/i)
})

test('pull-request CI enforces watcher tests on the supported Node 24 runtime', async () => {
  const rootCi = await readFile(
    new URL('../../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  )
  const start = rootCi.indexOf('\n  docs-watch:')
  assert.notEqual(start, -1, 'root CI is missing the docs-watch job')
  const remainder = rootCi.slice(start + 1)
  const nextJob = remainder.slice(1).search(/\n  [a-z0-9-]+:\n/)
  const job = nextJob === -1 ? remainder : remainder.slice(0, nextJob + 1)

  assert.match(job, /node-version:\s*\['24'\]/)
  assert.doesNotMatch(job, /node-version:\s*\[[^\]]*'22'/)
  assert.match(job, /npm run verify:docs-watch/)
  assert.match(job, /actions\/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0/)
  assert.match(job, /actions\/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e/)
})

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import {
  compileVolatile,
  renderReviewMarkdown,
  runReview,
  stripVolatile,
  validateClassification,
} from '../nexus-docs-review.mjs'

const execFileAsync = promisify(execFile)
const REVIEW_SCRIPT = fileURLToPath(new URL('../nexus-docs-review.mjs', import.meta.url))

const classification = JSON.parse(
  await readFile(new URL('../../config/nexus-docs-classification.json', import.meta.url), 'utf8'),
)

const okSource = (overrides = {}) => ({
  id: 'example.changelog',
  vendor: 'OpenAI',
  url: 'https://docs.example.com/changelog',
  finalUrl: 'https://docs.example.com/changelog',
  outcome: 'ok',
  change: 'changed',
  normalisedSha256: 'a'.repeat(64),
  ...overrides,
})

const report = (sources) => ({ generatedAt: '2026-07-13T00:00:00.000Z', sources })

test('the committed classification config validates and compiles', () => {
  validateClassification(classification)
  const hermes = compileVolatile(classification, 'Hermes')
  assert.ok(hermes.length > classification.default.volatile.length)
  const stripped = stripVolatile('1500 stars\nupdated 3 hours ago', hermes, classification.placeholder)
  assert.match(stripped, /\[\[volatile\]\]/)
})

test('a counter/relative-time-only delta is classified as volatile noise', () => {
  const entry = okSource({ id: 'hermes.github.releases', vendor: 'Hermes' })
  const prior = new Map([[entry.id, 'Hermes v1.2.0\n1200 stars\nupdated 3 hours ago\nRelease notes: stable release']])
  const current = new Map([[entry.id, 'Hermes v1.2.0\n1500 stars\nupdated 5 minutes ago\nRelease notes: stable release']])

  const review = runReview({
    report: report([entry]),
    classification,
    currentContent: current,
    priorSnapshots: prior,
    now: '2026-07-13T00:00:00.000Z',
  })

  assert.equal(review.summary.materialChanges, 0)
  assert.equal(review.summary.volatileNoise, 1)
  assert.equal(review.items[0].classification, 'volatile_noise')
  assert.equal(review.items[0].proposedMarkdown, null)
})

test('a real content change is classified material with a proposed Markdown diff', () => {
  const entry = okSource({ id: 'openai.api.deprecations', vendor: 'OpenAI' })
  const prior = new Map([[entry.id, 'Model gpt-x is available.\nWas this page helpful?']])
  const current = new Map([[entry.id, 'Model gpt-x is DEPRECATED on 2026-09-01.\nWas this page helpful?']])

  const review = runReview({
    report: report([entry]),
    classification,
    currentContent: current,
    priorSnapshots: prior,
    now: '2026-07-13T00:00:00.000Z',
  })

  const item = review.items[0]
  assert.equal(item.classification, 'material_change')
  assert.equal(review.summary.materialChanges, 1)
  assert.ok(item.proposedMarkdown.includes('```diff'))
  assert.ok(item.proposedMarkdown.includes('DEPRECATED on 2026-09-01'))
  assert.ok(item.proposedMarkdown.includes(entry.url))
  assert.ok(item.proposedMarkdown.includes(item.currentSha256))
  assert.equal(item.pagePath, 'docs/vendor-intelligence/openai.md')
  // The feedback-widget line is stripped, so it must not appear as a diff line.
  assert.doesNotMatch(item.proposedMarkdown, /^[+-] Was this page helpful/m)

  const markdown = renderReviewMarkdown(review)
  assert.match(markdown, /## Material changes/)
  assert.match(markdown, /DEPRECATED on 2026-09-01/)
})

test('Access-Transparency changes classify under the API-compliance surface, never Max telemetry', () => {
  const entry = okSource({
    id: 'anthropic.platform.access-transparency',
    vendor: 'Anthropic',
    url: 'https://platform.claude.com/docs/en/manage-claude/access-transparency',
    finalUrl: 'https://platform.claude.com/docs/en/manage-claude/access-transparency',
  })
  const prior = new Map([[entry.id, 'Access Transparency logs human access to API customer data.']])
  const current = new Map([[entry.id, 'Access Transparency logs human access to API customer data.\nNew: 30-day retention for audit events.']])

  const review = runReview({
    report: report([entry]),
    classification,
    currentContent: current,
    priorSnapshots: prior,
    now: '2026-07-13T00:00:00.000Z',
  })

  const item = review.items[0]
  assert.equal(item.classification, 'material_change')
  assert.ok(item.surface)
  assert.equal(item.surface.surface, 'api-compliance')
  assert.equal(item.surface.isMaxUsageTelemetry, false)
  assert.equal(item.surface.isConsumerTelemetry, false)
  assert.ok(item.proposedMarkdown.includes('api-compliance'))
  assert.ok(item.proposedMarkdown.includes('not Claude Max usage telemetry') || item.proposedMarkdown.includes('NOT Claude Max usage telemetry'))
})

test('a page that failed to fetch is listed as fetch_failed, never dropped and never counted as material', () => {
  const fetched = okSource({ id: 'a.fetched', change: 'unchanged' })
  const failed = {
    id: 'b.failed',
    vendor: 'OpenAI',
    url: 'https://docs.example.com/failed',
    outcome: 'failed',
    critical: false,
    errorCode: 'http_status',
    error: 'Unexpected HTTP status 404',
  }
  const review = runReview({
    report: report([failed, fetched]),
    classification,
    currentContent: new Map([[fetched.id, 'same text']]),
    priorSnapshots: new Map([[fetched.id, 'same text'], [failed.id, 'old text']]),
    now: '2026-07-13T00:00:00.000Z',
  })

  const byId = Object.fromEntries(review.items.map((item) => [item.id, item]))
  assert.equal(byId['b.failed'].classification, 'fetch_failed')
  assert.deepEqual(byId['b.failed'].reasons, ['http_status'])
  assert.equal(byId['b.failed'].error, 'Unexpected HTTP status 404')
  assert.equal(byId['b.failed'].proposedMarkdown, null)
  assert.equal(byId['a.fetched'].classification, 'unchanged')
  assert.equal(review.summary.total, 2)
  assert.equal(review.summary.fetchFailed, 1)
  assert.equal(review.summary.materialChanges, 0)

  const markdown = renderReviewMarkdown(review)
  assert.match(markdown, /1 not fetched/)
  assert.match(markdown, /## Sources not fetched/)
  assert.match(markdown, /- `b\.failed` — http_status: Unexpected HTTP status 404/)
})

test('unchanged and first-seen deltas are handled distinctly', () => {
  // The unchanged source now carries text identical to its snapshot: with no text or no snapshot the review can
  // no longer call a source unchanged (see the snapshot-only test below).
  const unchanged = okSource({ id: 'a.unchanged', change: 'unchanged' })
  const firstSeen = okSource({ id: 'b.firstseen', change: 'first_seen' })
  const review = runReview({
    report: report([unchanged, firstSeen]),
    classification,
    currentContent: new Map([[unchanged.id, 'same text'], [firstSeen.id, 'brand new content']]),
    priorSnapshots: new Map([[unchanged.id, 'same text']]),
    now: '2026-07-13T00:00:00.000Z',
  })
  const byId = Object.fromEntries(review.items.map((item) => [item.id, item]))
  assert.equal(byId['a.unchanged'].classification, 'unchanged')
  assert.equal(byId['a.unchanged'].proposedMarkdown, null)
  assert.equal(byId['b.firstseen'].classification, 'material_change')
  assert.ok(byId['b.firstseen'].reasons.includes('first_seen'))
})

test('the review CLI writes only proposals and never overwrites the baseline or snapshots', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nexus-docs-review-cli-'))
  await mkdir(path.join(root, 'config'), { recursive: true })
  await mkdir(path.join(root, 'content'), { recursive: true })
  await mkdir(path.join(root, 'docs', 'vendor-intelligence', '.snapshots'), { recursive: true })

  const baselinePath = path.join(root, 'config', 'nexus-official-sources.baseline.json')
  const baselineContent = JSON.stringify({ schemaVersion: 1, sources: [] }, null, 2)
  await writeFile(baselinePath, baselineContent)
  const snapshotPath = path.join(root, 'docs', 'vendor-intelligence', '.snapshots', 'openai.api.deprecations.txt')
  const snapshotContent = 'Model gpt-x is available.\n'
  await writeFile(snapshotPath, snapshotContent)
  await writeFile(
    path.join(root, 'content', 'openai.api.deprecations.txt'),
    'Model gpt-x is DEPRECATED on 2026-09-01.\n',
  )
  await writeFile(
    path.join(root, 'config', 'nexus-docs-classification.json'),
    JSON.stringify(classification, null, 2),
  )
  await writeFile(
    path.join(root, 'report.json'),
    JSON.stringify(report([okSource({ id: 'openai.api.deprecations', vendor: 'OpenAI' })]), null, 2),
  )

  const { stdout } = await execFileAsync(process.execPath, [
    REVIEW_SCRIPT,
    '--root', root,
    '--report', 'report.json',
    '--classification', 'config/nexus-docs-classification.json',
    '--content', 'content',
    '--snapshots', 'docs/vendor-intelligence/.snapshots',
    '--write', 'out',
  ]).catch((error) => error) // exit code 3 on material change is expected

  const outDir = path.join(root, 'out')
  assert.deepEqual((await readdir(outDir)).sort(), ['review.json', 'review.md'])
  const reviewJson = JSON.parse(await readFile(path.join(outDir, 'review.json'), 'utf8'))
  assert.equal(reviewJson.summary.materialChanges, 1)

  // The committed baseline and prior snapshot must be byte-identical afterwards.
  assert.equal(await readFile(baselinePath, 'utf8'), baselineContent)
  assert.equal(await readFile(snapshotPath, 'utf8'), snapshotContent)
  assert.ok(stdout === undefined || true)
})

test('the review classifies from the committed snapshot alone, whatever the fingerprint change says', () => {
  for (const change of ['unchanged', 'changed', 'first_seen']) {
    const differs = okSource({ id: 'a.differs', change })
    const noise = okSource({ id: 'b.noise', vendor: 'Hermes', change })
    const same = okSource({ id: 'c.same', change })
    const noSnapshot = okSource({ id: 'd.nosnapshot', change })
    const noContent = okSource({ id: 'e.nocontent', change })
    const review = runReview({
      report: report([differs, noise, same, noSnapshot, noContent]),
      classification,
      currentContent: new Map([
        [differs.id, 'Model gpt-x retires on 1 December'],
        [noise.id, 'Hermes v1.2.0\n1500 stars\nupdated 5 minutes ago'],
        [same.id, 'identical text'],
        [noSnapshot.id, 'text with no snapshot'],
      ]),
      priorSnapshots: new Map([
        [differs.id, 'Model gpt-x is available'],
        [noise.id, 'Hermes v1.2.0\n1200 stars\nupdated 3 hours ago'],
        [same.id, 'identical text'],
        [noContent.id, 'an older snapshot'],
      ]),
      now: '2026-11-16T00:00:00.000Z',
    })
    const byId = Object.fromEntries(review.items.map((item) => [item.id, item]))
    const label = `change=${change}`
    assert.equal(byId['a.differs'].classification, 'material_change', label)
    assert.ok(byId['a.differs'].reasons.includes('normalised_content'), label)
    assert.match(byId['a.differs'].proposedMarkdown, /retires on 1 December/, label)
    assert.equal(byId['b.noise'].classification, 'volatile_noise', label)
    assert.equal(byId['c.same'].classification, 'unchanged', label)
    assert.equal(byId['d.nosnapshot'].classification, 'material_change', label)
    assert.ok(byId['d.nosnapshot'].reasons.includes('missing_snapshot'), label)
    assert.equal(byId['e.nocontent'].classification, 'material_change', label)
    assert.ok(byId['e.nocontent'].reasons.includes('missing_current_content'), label)
    assert.equal(review.summary.unchanged, 1, label)
    assert.equal(review.summary.missingCurrentContent, 1, label)
  }
})

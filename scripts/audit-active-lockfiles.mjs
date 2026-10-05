import { execFile } from 'node:child_process'
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, win32 } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

// 60s was not a budget, it was a coin toss: on 04/09/2026 seven of nine workspaces
// hit it and the job reported `passed: false` having found nothing at all. The scans
// run concurrently now, so a per-scan budget this size no longer costs wall clock:
// ceil(9 / 5) waves * 300s = 600s, inside the 20-minute cap ci.yml gives this job.
export const DEFAULT_SCANNER_TIMEOUT_MS = 300_000
export const DEFAULT_SCANNER_CONCURRENCY = 5

// ci.yml sets `timeout-minutes: 20` on the job that runs this script. Kept here so
// the arithmetic above is asserted by a test rather than trusted to a comment that
// nothing re-reads when either number changes.
export const CI_JOB_BUDGET_MS = 20 * 60 * 1000

// When a scanner's output will not parse, the message alone cannot say why: a different schema,
// a broken scanner build and a banner on stdout all produce the same "missing
// metadata.vulnerabilities". Recording the message and discarding the bytes that caused it left
// the 04/09/2026 pnpm failures undiagnosable from CI — the uploaded artifact holds the PARSED
// report, so the raw output existed nowhere. Bounded because audit output is unbounded; the
// prefix is where the shape lives.
export const MAX_STDOUT_SAMPLE_CHARS = 2048

export function stdoutSample(stdout, limit = MAX_STDOUT_SAMPLE_CHARS) {
  if (typeof stdout !== 'string' || stdout === '') return null
  const head = stdout.slice(0, limit)
  return head.length < stdout.length
    ? `${head}\n...[truncated ${stdout.length - head.length} of ${stdout.length} chars]`
    : head
}

// Bounding the sample while leaving the error message unbounded protects nothing: a crafted
// stdout can make JSON.parse (or a coercion on the way into it) throw a message of arbitrary
// length, and that message is stored in the same artifact. Every string that reaches the report
// from scanner-controlled data has to be capped, not just the one named "sample".
// `String(value)` is not a total function: it calls `toString`/`valueOf`/`Symbol.toPrimitive`,
// and any of those can throw on a scanner-controlled object. The previous version called it
// bare, so a value of that shape threw out of the bounding helper itself and rejected the whole
// run — losing the entire matrix and artifact rather than recording one bad field. A helper that
// throws on the input it exists to tame is worse than no helper.
function coerceToString(value) {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  try {
    return String(value)
  } catch {
    return '[unrepresentable]'
  }
}

export function boundedMessage(message, limit = MAX_STDOUT_SAMPLE_CHARS) {
  const text = coerceToString(message)
  return text.length <= limit
    ? text
    : `${text.slice(0, limit)}...[truncated ${text.length - limit} of ${text.length} chars]`
}

// A scanner budget that silently falls back to a default when it is misconfigured
// is the same failure this file exists to fix: a number nobody chose, producing a
// result nobody can interpret. Garbage in the environment must stop the run.
export function readPositiveIntegerEnv(name, fallback, { env = process.env } = {}) {
  const raw = env[name]
  if (raw === undefined || raw === '') return fallback
  if (!/^\d+$/.test(raw.trim())) {
    throw new TypeError(`${name} must be a positive integer, received ${JSON.stringify(raw)}`)
  }
  const value = Number.parseInt(raw.trim(), 10)
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer, received ${JSON.stringify(raw)}`)
  }
  return value
}

// Bounded fan-out that writes into indexed slots. A pool that pushes as each worker
// finishes would reorder the report between runs; `out[index] = ...` cannot.
export async function mapWithConcurrency(items, limit, worker) {
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new TypeError(`concurrency must be a positive integer, received ${JSON.stringify(limit)}`)
  }
  const out = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let index = cursor++; index < items.length; index = cursor++) {
      out[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return out
}
const LOCKFILE_TYPES = Object.freeze({
  'package-lock.json': { manager: 'npm', supported: true },
  'npm-shrinkwrap.json': { manager: 'npm', supported: true },
  'pnpm-lock.yaml': { manager: 'pnpm', supported: true },
  'yarn.lock': { manager: 'yarn', supported: false },
  'bun.lock': { manager: 'bun', supported: false },
  'bun.lockb': { manager: 'bun', supported: false },
})
const ZERO_VULNERABILITIES = Object.freeze({
  info: 0,
  low: 0,
  moderate: 0,
  high: 0,
  critical: 0,
  total: 0,
})

export async function discoverTrackedLockfiles({ root = process.cwd(), runGit = execFileAsync } = {}) {
  const { stdout } = await runGit('git', ['ls-files', '-z'], {
    cwd: root,
    maxBuffer: 10 * 1024 * 1024,
  })
  return stdout
    .split('\0')
    .filter((lockfile) => Object.hasOwn(LOCKFILE_TYPES, basename(lockfile)))
    .sort()
    .map((lockfile) => {
      const type = LOCKFILE_TYPES[basename(lockfile)]
      return {
        manager: type.manager,
        supported: type.supported,
        workspace: dirname(lockfile),
        lockfile,
      }
    })
}

function isWithinRoot(root, candidate) {
  const path = relative(resolve(root), resolve(candidate))
  return path === '' || (path !== '..' && !path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(path))
}

async function validateRegularFile({ root, path, label }) {
  const absolute = resolve(root, path)
  if (!isWithinRoot(root, absolute)) return `${label} ${path} resolves outside repository root`
  let stat
  try {
    stat = await lstat(absolute)
  } catch (error) {
    return `${label} ${path} is missing: ${error.code ?? error.message}`
  }
  if (stat.isSymbolicLink()) return `${label} ${path} must not be a symbolic link`
  if (!stat.isFile()) return `${label} ${path} must be a regular file`
  let canonical
  try {
    canonical = await realpath(absolute)
  } catch (error) {
    return `${label} ${path} cannot be resolved: ${error.code ?? error.message}`
  }
  const canonicalRoot = await realpath(root)
  if (!isWithinRoot(canonicalRoot, canonical)) return `${label} ${path} resolves outside repository root`
  return null
}

async function validateInventoryEntry(entry, { root, duplicate, collision }) {
  const errors = []
  const type = LOCKFILE_TYPES[basename(entry.lockfile)]
  if (!type) {
    errors.push(`${entry.lockfile} is not a recognised JavaScript lockfile`)
    return errors
  }
  if (duplicate) errors.push(`${entry.lockfile} is a duplicate lockfile inventory entry`)
  if (collision) errors.push(`${entry.lockfile} has colliding lockfiles in workspace ${entry.workspace}`)
  if (entry.manager !== type.manager) {
    errors.push(`${entry.lockfile} manager must be ${type.manager}, not ${entry.manager ?? 'unset'}`)
  }
  if (!type.supported) {
    errors.push(`${entry.lockfile} uses unsupported ${type.manager} audit format`)
  }
  if (entry.workspace !== dirname(entry.lockfile)) {
    errors.push(`${entry.lockfile} workspace must be its co-located directory ${dirname(entry.lockfile)}`)
  }

  const lockError = await validateRegularFile({ root, path: entry.lockfile, label: 'Lockfile' })
  if (lockError) errors.push(lockError)
  const manifestPath = resolve(root, entry.workspace, 'package.json')
  const manifestError = await validateRegularFile({ root, path: manifestPath, label: 'Manifest package.json' })
  if (manifestError) {
    errors.push(manifestError)
    return errors
  }

  let manifest
  try {
    manifest = JSON.parse(await readFile(resolve(root, manifestPath), 'utf8'))
  } catch (error) {
    errors.push(`Manifest package.json for ${entry.lockfile} is not valid JSON: ${error.message}`)
    return errors
  }
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    errors.push(`Manifest package.json for ${entry.lockfile} must contain a JSON object`)
    return errors
  }
  if (Object.hasOwn(manifest, 'packageManager')) {
    if (typeof manifest.packageManager !== 'string') {
      errors.push(`Manifest packageManager for ${entry.lockfile} must be a string`)
    } else {
      const manifestManager = manifest.packageManager.split('@', 1)[0]
      if (manifestManager !== type.manager) {
        errors.push(`Manifest packageManager ${manifestManager} does not match ${type.manager} lockfile ${entry.lockfile}`)
      }
    }
  }
  return errors
}

async function collectEvidence({ root }) {
  let pullRequestHeadSha = null
  if (process.env.GITHUB_EVENT_PATH) {
    try {
      const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'))
      pullRequestHeadSha = event?.pull_request?.head?.sha ?? null
    } catch {
      pullRequestHeadSha = null
    }
  }
  let gitTree = null
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root })
    gitTree = stdout.trim() || null
  } catch {
    gitTree = null
  }
  return {
    githubSha: process.env.GITHUB_SHA ?? null,
    pullRequestHeadSha,
    gitTree,
  }
}

function normaliseVulnerabilities(report) {
  const counts = report?.metadata?.vulnerabilities
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) {
    throw new Error('Audit scanner JSON is missing metadata.vulnerabilities')
  }
  for (const key of ['info', 'low', 'moderate', 'high', 'critical']) {
    if (!Number.isInteger(counts[key]) || counts[key] < 0) {
      throw new Error(`Audit scanner JSON metadata.vulnerabilities.${key} must be a non-negative integer`)
    }
  }
  const values = { ...ZERO_VULNERABILITIES }
  for (const key of Object.keys(values)) {
    if (Number.isInteger(counts[key]) && counts[key] >= 0) values[key] = counts[key]
  }
  if (!Number.isInteger(counts.total)) {
    values.total = values.info + values.low + values.moderate + values.high + values.critical
  }
  return values
}

// Every leaf below is copied straight out of scanner JSON, so every one is scanner-controlled
// and attacker-length: the package NAME is an object key, and ranges and advisory URLs are free
// text. Capping `error` and `stderr` while leaving these raw moved the bloat rather than removing
// it — a VALID high-severity report carrying three 100,000-char strings produced a 300,525-char
// artifact while the two "bounded" fields were dutifully short. Bounding here is safe because
// findings are diagnostic only: `passed` is computed from `metadata.vulnerabilities` and the exit
// code and never reads this list, so no cap can turn a failing scan green.
export const MAX_FINDING_FIELD_CHARS = 256
export const MAX_ADVISORIES_PER_FINDING = 8
export const MAX_FINDINGS_PER_SCAN = 100

// Accepted-risk exceptions. Each one is keyed by ONE exact GitHub advisory id — never a package
// name, never a severity — so it can only excuse the advisory it names, and only at the severity
// that was accepted: if the advisory is re-rated (say high -> critical) it fails again. It expires on its date
// (inclusive, UTC): from the next day the advisory fails the audit again with no edit needed.
// Every finding an exception excuses is recorded in the report and printed on every run, so an
// excused finding can never read like a clean scan.
export const ACCEPTED_RISK_EXCEPTIONS = Object.freeze([
  Object.freeze({
    advisory: 'GHSA-vfj7-8cjw-p6xm',
    severity: 'high',
    expires: '2026-11-05',
    reason: 'braces <=3.0.3 stack-exhaustion DoS: no patched braces release exists (first_patched_version null, latest 3.0.3). Accepted risk approved by the founder on 05/10/2026; re-check for a fix before expiry.',
  }),
])

const GHSA_ID = /^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/
const GHSA_URL = /^https:\/\/github\.com\/advisories\/(GHSA(?:-[23456789cfghjmpqrvwx]{4}){3})$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function validateExceptions(exceptions) {
  if (!Array.isArray(exceptions)) throw new TypeError('accepted-risk exceptions must be an array')
  for (const exception of exceptions) {
    if (typeof exception?.advisory !== 'string' || !GHSA_ID.test(exception.advisory)) {
      throw new TypeError(`accepted-risk exception advisory must be one GHSA id, received ${JSON.stringify(exception?.advisory)}`)
    }
    const date = typeof exception.expires === 'string' && ISO_DATE.test(exception.expires)
      ? new Date(`${exception.expires}T00:00:00Z`)
      : null
    if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== exception.expires) {
      throw new TypeError(`accepted-risk exception ${exception.advisory} needs an expires date YYYY-MM-DD`)
    }
    if (!HIGH_OR_CRITICAL.has(exception.severity)) {
      throw new TypeError(`accepted-risk exception ${exception.advisory} needs the accepted severity (high or critical)`)
    }
    if (typeof exception.reason !== 'string' || exception.reason.trim() === '') {
      throw new TypeError(`accepted-risk exception ${exception.advisory} needs a reason`)
    }
  }
  return exceptions
}

export function exceptionIsActive(exception, now) {
  return now.toISOString().slice(0, 10) <= exception.expires
}

function advisoryIdOf(item) {
  if (!item || typeof item !== 'object') return null
  // Every identity field the scanner supplies must be well-formed and agree; a present but
  // non-canonical URL or id makes the advisory unidentifiable, which blocks.
  const hasUrl = item.url !== undefined && item.url !== null
  const hasDeclared = item.github_advisory_id !== undefined && item.github_advisory_id !== null
  const fromUrl = hasUrl ? (typeof item.url === 'string' ? GHSA_URL.exec(item.url)?.[1] ?? null : null) : null
  const declared = hasDeclared && typeof item.github_advisory_id === 'string' && GHSA_ID.test(item.github_advisory_id)
    ? item.github_advisory_id
    : null
  if ((hasUrl && fromUrl === null) || (hasDeclared && declared === null)) return null
  if (declared !== null && fromUrl !== null && declared !== fromUrl) return null
  return declared ?? fromUrl
}

const HIGH_OR_CRITICAL = new Set(['high', 'critical'])

// Decides whether every high/critical finding in a scanner report is explained by an advisory an
// active exception names. Anything it cannot explain blocks: an unknown `via` reference, a
// high/critical package with no high/critical cause, counts with no findings behind them, or an
// advisory without a recognisable GHSA id. Reads the raw report, never the bounded findings list.
export function evaluateAcceptedRisk(report, { exceptions, now }) {
  const active = new Map(exceptions.filter((e) => exceptionIsActive(e, now)).map((e) => [e.advisory, e.severity]))
  // An advisory is excusable only while its exception is active AND it carries exactly the
  // severity that was accepted.
  const excusable = (id, severity) => id !== null && active.get(id) === severity
  const expired = new Set(exceptions.filter((e) => !exceptionIsActive(e, now)).map((e) => e.advisory))
  const excused = []
  const expiredMatches = new Set()
  let blocking = false
  const explained = { high: 0, critical: 0 }

  const vulnerabilities = report?.vulnerabilities ?? {}
  for (const [name, entry] of Object.entries(vulnerabilities)) {
    if (!HIGH_OR_CRITICAL.has(entry?.severity)) continue
    explained[entry.severity] += 1
    const seen = new Set([name])
    const queue = [name]
    const causes = new Set()
    const causeSeverities = new Set()
    let packageBlocks = false
    while (queue.length > 0 && !packageBlocks) {
      const current = vulnerabilities[queue.shift()]
      if (!current || typeof current !== 'object' || !Array.isArray(current.via)) {
        packageBlocks = true
        break
      }
      for (const via of current.via) {
        if (typeof via === 'string') {
          const next = vulnerabilities[via]
          if (!next || typeof next !== 'object') { packageBlocks = true; break }
          if (HIGH_OR_CRITICAL.has(next.severity) && !seen.has(via)) {
            seen.add(via)
            queue.push(via)
          }
        } else if (via && typeof via === 'object') {
          if (!HIGH_OR_CRITICAL.has(via.severity)) continue
          const id = advisoryIdOf(via)
          if (!excusable(id, via.severity)) {
            if (id !== null && expired.has(id)) expiredMatches.add(id)
            packageBlocks = true
            break
          }
          causes.add(id)
          causeSeverities.add(via.severity)
        } else {
          packageBlocks = true
          break
        }
      }
    }
    // A package's severity is the worst of its causes; one rated worse than every excused cause
    // has a cause this walk did not see.
    if (packageBlocks || causes.size === 0 || !causeSeverities.has(entry.severity)
      || (entry.severity === 'high' && causeSeverities.has('critical'))) {
      blocking = true
    } else {
      excused.push({ package: boundedField(name), severity: entry.severity, advisories: [...causes].sort() })
    }
  }

  for (const advisory of Object.values(report?.advisories ?? {})) {
    if (!HIGH_OR_CRITICAL.has(advisory?.severity)) continue
    explained[advisory.severity] += 1
    const id = advisoryIdOf(advisory)
    if (!excusable(id, advisory.severity)) {
      if (id !== null && expired.has(id)) expiredMatches.add(id)
      blocking = true
    } else {
      excused.push({
        package: boundedField(advisory.module_name ?? advisory.name),
        severity: advisory.severity,
        advisories: [id],
      })
    }
  }

  // The scanner's own high and critical counts must each equal the findings of that severity
  // examined above. A count the findings do not account for, or a severity they disagree on, is
  // an unexplained finding, and an unexplained finding blocks.
  const counts = report?.metadata?.vulnerabilities ?? {}
  if ((counts.high ?? 0) !== explained.high || (counts.critical ?? 0) !== explained.critical) blocking = true

  // Not capped: every excused finding is recorded and printed. The list is bounded by the
  // scanner's own reconciled count above, never by a silent truncation.
  return {
    blocking,
    excused,
    expiredExceptionsMatched: [...expiredMatches].sort(),
  }
}

function boundedField(value) {
  if (value === null || value === undefined) return null
  const text = boundedMessage(value, MAX_FINDING_FIELD_CHARS)
  return text === '' ? null : text
}

function boundedAdvisories(items, pick) {
  // Absent is "no advisories"; present-but-not-an-array is malformed scanner JSON. Dropping it
  // let a high finding with zero metadata counts report passed, so it must throw and be recorded.
  if (items !== null && items !== undefined && !Array.isArray(items)) {
    throw new Error(`Audit scanner JSON finding via must be an array, got ${typeof items}`)
  }
  const advisories = []
  for (const item of items ?? []) {
    if (advisories.length >= MAX_ADVISORIES_PER_FINDING) break
    if (!item || typeof item !== 'object') continue
    const value = boundedField(pick(item))
    if (value !== null) advisories.push(value)
  }
  return advisories
}

function normaliseFindings(report) {
  const findings = []
  // Dropping findings silently would be the failure this repo exists to prevent: a report
  // listing 100 of 3000 reads exactly like a report of 100. The count is carried out so a
  // truncated list can never be mistaken for a complete one.
  let findingsTruncated = 0
  const add = (finding) => {
    if (findings.length >= MAX_FINDINGS_PER_SCAN) {
      findingsTruncated += 1
      return
    }
    findings.push(finding)
  }

  for (const [name, finding] of Object.entries(report?.vulnerabilities ?? {})) {
    if (!['high', 'critical'].includes(finding?.severity)) continue
    add({
      package: boundedField(name),
      severity: finding.severity,
      range: boundedField(finding.range),
      advisories: boundedAdvisories(finding.via, (item) => item.url ?? item.title ?? item.source),
    })
  }
  for (const finding of Object.values(report?.advisories ?? {})) {
    if (!['high', 'critical'].includes(finding?.severity)) continue
    add({
      package: boundedField(finding.module_name ?? finding.name),
      severity: finding.severity,
      range: boundedField(finding.vulnerable_versions),
      advisories: boundedAdvisories([finding], (item) => item.url),
    })
  }
  return { findings, findingsTruncated }
}

// `parseJson` is a seam, and it exists for one reason: V8 bounds its own JSON.parse messages
// (fuzzing string inputs never produced one over ~90 chars), so no stdout can reach the message
// cap below. A cap no input can reach cannot be shown to work, and cannot be told from absent;
// substituting the parser is the only way to plant a long message. Production never passes it.
export function parseAuditReport(stdout, {
  parseJson = JSON.parse,
  exceptions = ACCEPTED_RISK_EXCEPTIONS,
  now = new Date(),
} = {}) {
  let report
  try {
    // `JSON.parse` coerces its argument, so a hostile stdout throws from inside the parse and
    // lands in the catch below — where interpolating a non-string `error.message` would throw
    // AGAIN, out of the handler, taking the run with it. Coerce on the way in and bound on the
    // way out: the only two places this function touches scanner-controlled data.
    report = parseJson(coerceToString(stdout))
  } catch (error) {
    throw new Error(`Audit scanner did not return valid JSON: ${boundedMessage(error?.message)}`)
  }
  const { findings, findingsTruncated } = normaliseFindings(report)
  const vulnerabilities = normaliseVulnerabilities(report)
  return {
    vulnerabilities,
    findings,
    findingsTruncated,
    acceptedRisk: vulnerabilities.high > 0 || vulnerabilities.critical > 0
      ? evaluateAcceptedRisk(report, { exceptions, now })
      : null,
  }
}

export function buildAuditInvocation(entry, {
  platform = process.platform,
  nodeExecutable = process.execPath,
} = {}) {
  const executable = entry.manager === 'pnpm' ? 'corepack' : 'npm'
  const args = entry.manager === 'pnpm'
    ? ['pnpm@11.13.0', '--pm-on-fail=ignore', 'audit', '--audit-level', 'high', '--json']
    : ['audit', '--package-lock-only', '--ignore-scripts', '--audit-level=high', '--json']

  if (platform !== 'win32') return { executable, args }

  const entrypoint = entry.manager === 'pnpm'
    ? win32.join(win32.dirname(nodeExecutable), 'node_modules', 'corepack', 'dist', 'corepack.js')
    : win32.join(win32.dirname(nodeExecutable), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  return { executable: nodeExecutable, args: [entrypoint, ...args] }
}

export async function executeAudit(entry, {
  root = process.cwd(),
  timeoutMs = readPositiveIntegerEnv('AUDIT_SCANNER_TIMEOUT_MS', DEFAULT_SCANNER_TIMEOUT_MS),
  platform = process.platform,
  nodeExecutable = process.execPath,
  runExec = execFileAsync,
} = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('Audit scanner timeoutMs must be a positive integer')
  }
  const { executable, args } = buildAuditInvocation(entry, { platform, nodeExecutable })

  try {
    const { stdout, stderr } = await runExec(executable, args, {
      cwd: resolve(root, entry.workspace),
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
      timeout: timeoutMs,
    })
    return { exitCode: 0, stdout, stderr, timedOut: false, timeoutMs }
  } catch (error) {
    const timedOut = error.killed === true || error.code === 'ETIMEDOUT'
    return {
      exitCode: Number.isInteger(error.code) ? error.code : 2,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? error.message,
      timedOut,
      timeoutMs,
    }
  }
}

export async function runActiveLockfileAudits({
  entries,
  runAudit = executeAudit,
  root = process.cwd(),
  evidence,
  concurrency = readPositiveIntegerEnv('AUDIT_SCANNER_CONCURRENCY', DEFAULT_SCANNER_CONCURRENCY),
  // Seam, and it exists for exactly one reason: `auditOne` catches everything and always
  // returns an object, so no injected `runAudit` can produce a sparse `results`. Without a
  // way to substitute the mapper, the hole guard below is unreachable from any test and is
  // therefore unproven — which is indistinguishable from absent.
  mapResults = mapWithConcurrency,
  // Seam, passed straight to parseAuditReport: the recorded-error cap below is fed only by
  // parse failures, which V8 keeps short, so it is unreachable without substituting the parser.
  parseJson = JSON.parse,
  exceptions = ACCEPTED_RISK_EXCEPTIONS,
  now = new Date(),
} = {}) {
  validateExceptions(exceptions)
  const activeEntries = entries ?? await discoverTrackedLockfiles({ root })
  const evidenceFields = evidence ?? await collectEvidence({ root })
  const lockCounts = new Map()
  const workspaceCounts = new Map()
  for (const entry of activeEntries) {
    lockCounts.set(entry.lockfile, (lockCounts.get(entry.lockfile) ?? 0) + 1)
    workspaceCounts.set(entry.workspace, (workspaceCounts.get(entry.workspace) ?? 0) + 1)
  }
  const validations = await Promise.all(activeEntries.map(async (entry) => ({
    entry,
    errors: await validateInventoryEntry(entry, {
      root,
      duplicate: lockCounts.get(entry.lockfile) > 1,
      collision: workspaceCounts.get(entry.workspace) > 1,
    }),
  })))
  const inventoryErrors = activeEntries.length === 0
    ? ['No tracked JavaScript lockfiles were discovered']
    : validations.flatMap(({ errors }) => errors)
  const inventoryError = inventoryErrors.length > 0 ? inventoryErrors.join('; ') : null
  async function auditOne({ entry, errors }) {
    if (errors.length > 0) {
      return {
        ...entry,
        status: 'error',
        exitCode: null,
        timedOut: false,
        vulnerabilities: { ...ZERO_VULNERABILITIES },
        findings: [],
        findingsTruncated: 0,
        error: errors.join('; '),
        stderr: '',
      }
    }
    const execution = await runAudit(entry, { root })
    // A scanner that returns nothing usable must become a recorded failure, not a
    // thrown one. Throwing here escapes Promise.all and aborts the whole run, so the
    // report is never written and the CI artifact is empty — the run fails closed but
    // destroys the evidence needed to say why.
    if (execution === undefined || execution === null || typeof execution !== 'object') {
      return {
        ...entry,
        status: 'error',
        exitCode: null,
        timeoutMs: null,
        timedOut: false,
        vulnerabilities: { ...ZERO_VULNERABILITIES },
        findings: [],
        findingsTruncated: 0,
        error: `Audit scanner returned no usable result (${typeof execution})`,
        stderr: '',
      }
    }
    if (execution.timedOut) {
      // `status: 'error'` is shared with inventory and parse failures, so on its own
      // it cannot tell "the scanner never finished" from "the scanner found nothing".
      // `timedOut` makes that distinction machine-readable. It stays inside the
      // fail-closed set deliberately: a scan that did not run is not a clean scan.
      return {
        ...entry,
        status: 'error',
        exitCode: execution.exitCode,
        timeoutMs: execution.timeoutMs,
        timedOut: true,
        vulnerabilities: { ...ZERO_VULNERABILITIES },
        findings: [],
        findingsTruncated: 0,
        error: `Audit scanner timed out after ${execution.timeoutMs}ms`,
        stderr: boundedMessage(execution.stderr).trim(),
      }
    }
    try {
      const parsed = parseAuditReport(execution.stdout, { parseJson, exceptions, now })
      const breached = parsed.vulnerabilities.high > 0 || parsed.vulnerabilities.critical > 0
      // A breached scan passes only when every high/critical finding traces to an advisory an
      // active exception names, and the scanner exited the way it does for "vulnerabilities
      // found" (1). Any other exit code is a scanner failure, never an excusable finding.
      const excusedByException = breached
        && execution.exitCode === 1
        && parsed.acceptedRisk !== null
        && !parsed.acceptedRisk.blocking
        && parsed.acceptedRisk.excused.length > 0
      return {
        ...entry,
        status: (execution.exitCode === 0 && !breached) || excusedByException ? 'passed' : 'failed',
        exitCode: execution.exitCode,
        timeoutMs: execution.timeoutMs ?? null,
        timedOut: false,
        vulnerabilities: parsed.vulnerabilities,
        findings: parsed.findings,
        findingsTruncated: parsed.findingsTruncated,
        acceptedRisk: parsed.acceptedRisk,
        stderr: boundedMessage(execution.stderr).trim(),
      }
    } catch (error) {
      return {
        ...entry,
        status: 'error',
        exitCode: execution.exitCode,
        timeoutMs: execution.timeoutMs ?? null,
        timedOut: false,
        vulnerabilities: { ...ZERO_VULNERABILITIES },
        findings: [],
        findingsTruncated: 0,
        error: boundedMessage(error.message),
        // Only on this path. A scan that parsed needs no sample, and a timeout has no output
        // worth keeping — carrying it everywhere would bloat the artifact for no diagnostic gain.
        stdoutSample: stdoutSample(execution.stdout),
        stderr: boundedMessage(execution.stderr).trim(),
      }
    }
  }

  // Scans run concurrently but land in inventory order: the report is diffed between
  // runs, and completion order is not stable. Indexed slots, never push-as-completed.
  const results = await mapResults(validations, concurrency, auditOne)

  return {
    schema: 'unite-active-lockfile-audit-v2',
    generatedAt: new Date().toISOString(),
    ...evidenceFields,
    threshold: 'high',
    acceptedRiskExceptions: exceptions.map((exception) => ({
      ...exception,
      active: exceptionIsActive(exception, now),
    })),
    installScriptsExecuted: false,
    inventoryError,
    inventoryErrors,
    // `every` SKIPS array holes rather than failing them, so a sparse `results` — one
    // worker throwing before it assigned its slot — would satisfy the predicate
    // vacuously. `results.length` cannot catch that either: a hole still counts toward
    // length. `Array.from` materialises holes as undefined, which is what makes the
    // check below able to see them at all; a bare `results.every(Boolean)` cannot.
    passed: inventoryError === null
      && results.length === activeEntries.length
      && Array.from(results).every((result) => result !== undefined && result !== null)
      && Array.from(results).every(({ status }) => status === 'passed'),
    results,
  }
}

export async function writeAuditReport(outputPath, report) {
  await mkdir(dirname(resolve(outputPath)), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
}

export async function main({
  argv = process.argv.slice(2),
  entries,
  root = process.cwd(),
  runAudit = executeAudit,
  stdout = process.stdout,
  stderr = process.stderr,
  exceptions = ACCEPTED_RISK_EXCEPTIONS,
  now = new Date(),
} = {}) {
  const outputIndex = argv.indexOf('--output')
  const outputPath = outputIndex === -1 ? null : argv[outputIndex + 1]
  if (outputIndex !== -1 && !outputPath) throw new Error('--output requires a path')

  const report = await runActiveLockfileAudits({ entries, root, runAudit, exceptions, now })
  if (outputPath) await writeAuditReport(resolve(root, outputPath), report)
  stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  stderr.write(formatAcceptedRisk(report))
  return report.passed ? 0 : 1
}

// Printed on every run, whatever the verdict: each configured exception with its state, then
// every finding an exception excused. An excused finding must never be silent.
export function formatAcceptedRisk(report) {
  const lines = []
  for (const exception of report.acceptedRiskExceptions ?? []) {
    lines.push(`accepted-risk exception ${exception.advisory}: ${exception.active ? 'ACTIVE' : 'EXPIRED'} (expires ${exception.expires}) — ${exception.reason}`)
  }
  for (const result of report.results ?? []) {
    const risk = result?.acceptedRisk
    if (!risk) continue
    for (const finding of risk.excused) {
      lines.push(`ACCEPTED RISK ${result.lockfile}: excused ${finding.severity} ${finding.package} via ${finding.advisories.join(', ')}`)
    }
    for (const advisory of risk.expiredExceptionsMatched) {
      lines.push(`EXPIRED accepted-risk exception ${advisory} matched a finding in ${result.lockfile}; it now fails the audit`)
    }
  }
  return lines.length > 0 ? `${lines.join('\n')}\n` : ''
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
    .then((exitCode) => { process.exitCode = exitCode })
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`)
      process.exitCode = 1
    })
}

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
export function boundedMessage(message, limit = MAX_STDOUT_SAMPLE_CHARS) {
  const text = typeof message === 'string' ? message : String(message ?? '')
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

function normaliseFindings(report) {
  const findings = []
  for (const [name, finding] of Object.entries(report?.vulnerabilities ?? {})) {
    if (!['high', 'critical'].includes(finding?.severity)) continue
    findings.push({
      package: name,
      severity: finding.severity,
      range: finding.range ?? null,
      advisories: (finding.via ?? [])
        .filter((item) => item && typeof item === 'object')
        .map((item) => item.url ?? item.title ?? String(item.source))
        .filter(Boolean),
    })
  }
  for (const finding of Object.values(report?.advisories ?? {})) {
    if (!['high', 'critical'].includes(finding?.severity)) continue
    findings.push({
      package: finding.module_name ?? finding.name ?? null,
      severity: finding.severity,
      range: finding.vulnerable_versions ?? null,
      advisories: [finding.url].filter(Boolean),
    })
  }
  return findings
}

export function parseAuditReport(stdout) {
  let report
  try {
    report = JSON.parse(stdout)
  } catch (error) {
    throw new Error(`Audit scanner did not return valid JSON: ${error.message}`)
  }
  return {
    vulnerabilities: normaliseVulnerabilities(report),
    findings: normaliseFindings(report),
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
} = {}) {
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
        error: `Audit scanner timed out after ${execution.timeoutMs}ms`,
        stderr: boundedMessage(execution.stderr).trim(),
      }
    }
    try {
      const parsed = parseAuditReport(execution.stdout)
      const breached = parsed.vulnerabilities.high > 0 || parsed.vulnerabilities.critical > 0
      return {
        ...entry,
        status: execution.exitCode === 0 && !breached ? 'passed' : 'failed',
        exitCode: execution.exitCode,
        timeoutMs: execution.timeoutMs ?? null,
        timedOut: false,
        vulnerabilities: parsed.vulnerabilities,
        findings: parsed.findings,
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
} = {}) {
  const outputIndex = argv.indexOf('--output')
  const outputPath = outputIndex === -1 ? null : argv[outputIndex + 1]
  if (outputIndex !== -1 && !outputPath) throw new Error('--output requires a path')

  const report = await runActiveLockfileAudits({ entries, root, runAudit })
  if (outputPath) await writeAuditReport(resolve(root, outputPath), report)
  stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  return report.passed ? 0 : 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
    .then((exitCode) => { process.exitCode = exitCode })
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`)
      process.exitCode = 1
    })
}

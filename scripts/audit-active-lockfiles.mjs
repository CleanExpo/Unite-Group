import { execFile } from 'node:child_process'
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
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

export async function executeAudit(entry, { root = process.cwd() } = {}) {
  const executable = entry.manager === 'pnpm' ? 'corepack' : 'npm'
  const args = entry.manager === 'pnpm'
    ? ['pnpm@11.13.0', '--pm-on-fail=ignore', 'audit', '--audit-level', 'high', '--json']
    : ['audit', '--package-lock-only', '--ignore-scripts', '--audit-level=high', '--json']

  try {
    const { stdout, stderr } = await execFileAsync(executable, args, {
      cwd: resolve(root, entry.workspace),
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    })
    return { exitCode: 0, stdout, stderr }
  } catch (error) {
    return {
      exitCode: Number.isInteger(error.code) ? error.code : 2,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? error.message,
    }
  }
}

export async function runActiveLockfileAudits({
  entries,
  runAudit = executeAudit,
  root = process.cwd(),
  evidence,
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
  const results = []

  for (const { entry, errors } of validations) {
    if (errors.length > 0) {
      results.push({
        ...entry,
        status: 'error',
        exitCode: null,
        vulnerabilities: { ...ZERO_VULNERABILITIES },
        findings: [],
        error: errors.join('; '),
        stderr: '',
      })
      continue
    }
    const execution = await runAudit(entry, { root })
    try {
      const parsed = parseAuditReport(execution.stdout)
      const breached = parsed.vulnerabilities.high > 0 || parsed.vulnerabilities.critical > 0
      results.push({
        ...entry,
        status: execution.exitCode === 0 && !breached ? 'passed' : 'failed',
        exitCode: execution.exitCode,
        vulnerabilities: parsed.vulnerabilities,
        findings: parsed.findings,
        stderr: execution.stderr.trim(),
      })
    } catch (error) {
      results.push({
        ...entry,
        status: 'error',
        exitCode: execution.exitCode,
        vulnerabilities: { ...ZERO_VULNERABILITIES },
        findings: [],
        error: error.message,
        stderr: execution.stderr.trim(),
      })
    }
  }

  return {
    schema: 'unite-active-lockfile-audit-v2',
    generatedAt: new Date().toISOString(),
    ...evidenceFields,
    threshold: 'high',
    installScriptsExecuted: false,
    inventoryError,
    inventoryErrors,
    passed: inventoryError === null
      && results.length === activeEntries.length
      && results.every(({ status }) => status === 'passed'),
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

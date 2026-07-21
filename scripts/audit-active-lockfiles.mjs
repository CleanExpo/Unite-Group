import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
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
    .filter((lockfile) => /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml)$/.test(lockfile))
    .sort()
    .map((lockfile) => ({
      manager: lockfile.endsWith('pnpm-lock.yaml') ? 'pnpm' : 'npm',
      workspace: dirname(lockfile),
      lockfile,
    }))
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
} = {}) {
  const activeEntries = entries ?? await discoverTrackedLockfiles({ root })
  const inventoryError = activeEntries.length === 0
    ? 'No tracked JavaScript lockfiles were discovered'
    : null
  const results = []

  for (const entry of activeEntries) {
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
    schema: 'unite-active-lockfile-audit-v1',
    generatedAt: new Date().toISOString(),
    headSha: process.env.GITHUB_SHA ?? null,
    threshold: 'high',
    installScriptsExecuted: false,
    inventoryError,
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

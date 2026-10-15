/** Explicit opt-in: node --import tsx e2e/support/idea-to-done-stage.mts
 * Requires E2E_SUPABASE_{URL,ANON_KEY,SERVICE_ROLE_KEY}; never uses the generic
 * admin helper, whose local fallback resolves production credentials.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { spawn, execFileSync, type ChildProcess } from 'node:child_process'
import { openSync, readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { defineConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'

export const STAGE_DATABASE = 'https://jhqjxomxlvvmjslgzqhd.supabase.co'
export const STAGE_ORIGIN = 'http://localhost:3108'
const filename = fileURLToPath(import.meta.url)
const appRoot = path.resolve(path.dirname(filename), '../..')
const repoRoot = path.resolve(appRoot, '../..')

export function stageConfiguration(env: NodeJS.ProcessEnv) {
  if (env.E2E_SUPABASE_URL !== STAGE_DATABASE ||
    (env.PLAYWRIGHT_TEST_BASE_URL && env.PLAYWRIGHT_TEST_BASE_URL !== STAGE_ORIGIN)) {
    throw new Error('Idea journey requires the exact e2e-gate database and fixed loopback origin.')
  }
  if (!env.E2E_SUPABASE_ANON_KEY?.trim() || !env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error('Explicit stage anon and service-role credentials are required; no credential fallback.')
  }
  // This is target-metadata validation, not JWT signature verification. The real
  // branch Auth API must authenticate each credential before a user is created.
  for (const [key, role] of [[env.E2E_SUPABASE_ANON_KEY, 'anon'], [env.E2E_SUPABASE_SERVICE_ROLE_KEY, 'service_role']]) {
    let payload: { ref?: string; role?: string } | undefined
    try { payload = JSON.parse(Buffer.from(key!.trim().split('.')[1], 'base64url').toString()) } catch { /* Reject malformed keys below. */ }
    if (payload?.ref !== 'jhqjxomxlvvmjslgzqhd' || payload.role !== role) throw new Error('Credential target metadata must match the exact stage branch and role.')
  }
  return { url: STAGE_DATABASE, anonKey: env.E2E_SUPABASE_ANON_KEY.trim(), serviceKey: env.E2E_SUPABASE_SERVICE_ROLE_KEY.trim() }
}

export function sourceBinding() {
  const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: repoRoot })
    .toString().split('\0').filter(Boolean).filter(file => existsSync(path.join(repoRoot, file)))
  // These runtime registry copies may be generated/ignored rather than tracked.
  files.push(...['apps/web/data/command-centre/portfolio.yaml', 'apps/web/data/command-centre/control-plane.v1.json',
    'apps/web/data/command-centre/founder-queue.md'].filter(file => existsSync(path.join(repoRoot, file))))
  const relevant = files.filter(file => file.startsWith('apps/web/src/') || file.startsWith('apps/web/e2e/') ||
    file.startsWith('apps/web/data/command-centre/') || ['.portfolio/PORTFOLIO.yaml', '.portfolio/CONTROL-PLANE.v1.json',
      'apps/web/next.config.mjs', 'apps/web/tsconfig.json', 'apps/web/package.json', 'apps/web/pnpm-lock.yaml', 'scripts/idea-lifecycle-status.mjs'].includes(file)).sort()
  const records = [...new Set(relevant)].map(file => [file, hash(readFileSync(path.join(repoRoot, file)))])
  return { commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }).toString().trim(),
    workingTreeFingerprint: hash(Buffer.from(JSON.stringify(records))), fileCount: records.length,
    algorithm: 'SHA256 of compact JSON sorted [path,SHA256(working-tree bytes)] records', records }
}

export default defineConfig({
  testDir: path.resolve(appRoot, 'e2e'), testMatch: 'idea-to-done.stage.mts', workers: 1, retries: 0,
  timeout: 120_000, reporter: [['list']],
  outputDir: process.env.IDEA_STAGE_OUTPUT_DIR ? path.join(process.env.IDEA_STAGE_OUTPUT_DIR, 'playwright') : undefined,
  use: { baseURL: STAGE_ORIGIN, channel: 'chrome', screenshot: 'off', trace: 'off', video: 'off' },
})

async function assertUnusedPort() {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer()
    probe.once('error', () => reject(new Error('Stage port 3108 is occupied; existing servers are never reused.')))
    probe.listen(3108, '127.0.0.1', () => probe.close(error => error ? reject(error) : resolve()))
  })
}

async function checkGuards() {
  const token = (ref: string, role: string) => `test.${Buffer.from(JSON.stringify({ ref, role })).toString('base64url')}.not-a-real-signature`
  const valid = { NODE_ENV: 'test', E2E_SUPABASE_URL: STAGE_DATABASE,
    E2E_SUPABASE_ANON_KEY: token('jhqjxomxlvvmjslgzqhd', 'anon'), E2E_SUPABASE_SERVICE_ROLE_KEY: token('jhqjxomxlvvmjslgzqhd', 'service_role') } as NodeJS.ProcessEnv
  assert.equal(stageConfiguration(valid).url, STAGE_DATABASE)
  assert.throws(() => stageConfiguration({ ...valid, E2E_SUPABASE_URL: 'https://lksfwktwtmyznckodsau.supabase.co' }))
  assert.throws(() => stageConfiguration({ ...valid, PLAYWRIGHT_TEST_BASE_URL: 'https://unite-group.in' }))
  assert.throws(() => stageConfiguration({ ...valid, E2E_SUPABASE_SERVICE_ROLE_KEY: '' }))
  assert.throws(() => stageConfiguration({ ...valid, E2E_SUPABASE_SERVICE_ROLE_KEY: 'invalid-credential' }))
  assert.throws(() => stageConfiguration({ ...valid, E2E_SUPABASE_ANON_KEY: token('lksfwktwtmyznckodsau', 'anon') }))
  const occupied = createServer()
  await new Promise<void>((resolve, reject) => { occupied.once('error', reject); occupied.listen(3108, '127.0.0.1', resolve) })
  try { await assert.rejects(assertUnusedPort(), /occupied/) } finally { await new Promise<void>(resolve => occupied.close(() => resolve())) }
  console.log('Stage safety guards: 7 passed; no network, credentials, provisioning or provider calls.')
}

async function serve() {
  const config = stageConfiguration(process.env)
  if (process.env.IDEA_STAGE_RUN !== 'isolated-protocol-no-provider' ||
    ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GITHUB_TOKEN', 'STRIPE_SECRET_KEY', 'DATABASE_URL'].some(name => process.env[name])) throw new Error('Stage server requires the scrubbed no-provider child environment.')
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== STAGE_DATABASE || process.env.NEXUS_APP_URL !== STAGE_ORIGIN ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== config.anonKey || process.env.SUPABASE_SERVICE_ROLE_KEY !== config.serviceKey) throw new Error('Stage child backend guard failed.')
  const http = await import('node:http')
  const next = (await import('next')).default
  const conf = (await import(pathToFileURL(path.join(appRoot, 'next.config.mjs')).href)).default
  const app = next({ dev: true, webpack: true, hostname: 'localhost', port: 3108, dir: appRoot, conf })
  await app.prepare()
  const server = http.createServer(app.getRequestHandler())
  server.listen(3108, '127.0.0.1')
}

async function run() {
  const config = stageConfiguration(process.env)
  if (['.env', '.env.local', '.env.development', '.env.development.local'].some(file => existsSync(path.join(appRoot, file)))) {
    throw new Error('Stage runner requires an env-file-free checkout; Next autoload must not restore unrelated credentials.')
  }
  await assertUnusedPort() // Check before creating any auth user or test row.
  const output = mkdtempSync(path.join(tmpdir(), 'unite-idea-stage-'))
  const before = sourceBinding()
  const admin = createClient(config.url, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const users: Array<{ id: string; email: string; password: string }> = []
  let server: ChildProcess | undefined
  let testExit: number | null = null
  let cleanupVerified = false
  const inherited = new Set(['PATH', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'USER', 'USERNAME', 'LOGNAME'])
  const environment: NodeJS.ProcessEnv = { ...Object.fromEntries(Object.entries(process.env).filter(([name]) => inherited.has(name.toUpperCase()))), NODE_ENV: 'development' }
  try {
    const publicSettings = await fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.anonKey }, signal: AbortSignal.timeout(10_000) })
    await publicSettings.body?.cancel()
    const adminProbe = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (!publicSettings.ok || adminProbe.error) throw new Error('Actual stage Auth API rejected the explicit credentials; no provisioning attempted.')
    // Only the explicit branch credentials are ever used to create test identities.
    for (let i = 0; i < 2; i++) {
      const email = `idea-journey-${randomUUID()}@example.invalid`, password = randomBytes(32).toString('base64url')
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true,
        user_metadata: { purpose: 'idea-to-done-stage-protocol-rehearsal', no_provider_inference: true } })
      if (created.error || !created.data.user) throw new Error('Stage auth provisioning failed; reconcile branch prerequisites before running.')
      users.push({ id: created.data.user.id, email, password })
    }
    const runnerId = `idea-stage-protocol-${randomUUID()}`
    Object.assign(environment, {
      NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', E2E_DISABLE_RATE_LIMIT: '1',
      E2E_SUPABASE_URL: config.url, E2E_SUPABASE_ANON_KEY: config.anonKey, E2E_SUPABASE_SERVICE_ROLE_KEY: config.serviceKey,
      NEXT_PUBLIC_SUPABASE_URL: config.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: config.anonKey, SUPABASE_SERVICE_ROLE_KEY: config.serviceKey,
      NEXT_PUBLIC_APP_URL: STAGE_ORIGIN, NEXUS_APP_URL: STAGE_ORIGIN, PLAYWRIGHT_TEST_BASE_URL: STAGE_ORIGIN,
      FOUNDER_USER_ID: users[0].id, FOUNDER_ALLOWED_USER_IDS: users.map(user => user.id).join(','),
      MISSION_PROVENANCE_SECRET: randomBytes(32).toString('hex'), AGENT_EVENTS_SECRET: randomBytes(32).toString('hex'),
      MISSION_LANE_CONTAINMENT: 'job-object', MISSION_LANE_CONTAINED_RUNNERS: `${runnerId}:win32:job-object`, RUNNER_ID: runnerId,
      IDEA_STAGE_USERS: JSON.stringify(users), IDEA_STAGE_OUTPUT_DIR: output, IDEA_STAGE_RUN: 'isolated-protocol-no-provider',
    })
    const log = openSync(path.join(output, 'next.log'), 'a')
    server = spawn(process.execPath, ['--import', 'tsx', filename, '--server'], { cwd: appRoot, env: environment,
      windowsHide: true, stdio: ['ignore', log, log] })
    let ready = false
    for (let attempt = 0; attempt < 90; attempt++) {
      if (server.exitCode !== null) throw new Error('Isolated stage server exited before readiness.')
      try { const response = await fetch(`${STAGE_ORIGIN}/auth/login`, { redirect: 'manual', signal: AbortSignal.timeout(2000) });
        await response.body?.cancel(); if (response.status === 200) { ready = true; break } } catch { /* Wait for this fresh child only. */ }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    if (!ready) throw new Error('Isolated stage server did not become ready.')
    testExit = await new Promise<number>((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(appRoot, 'node_modules/@playwright/test/cli.js'), 'test', '--config', filename],
        { cwd: appRoot, env: environment, windowsHide: true, stdio: 'inherit' })
      child.once('error', reject); child.once('exit', code => resolve(code ?? 1))
    })
  } finally {
    const cleanupErrors: string[] = []
    try {
      if (server && server.exitCode === null) {
        server.kill('SIGTERM')
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Stage server shutdown unconfirmed.')), 10_000)
          server!.once('exit', () => { clearTimeout(timer); resolve() })
        })
      }
    } catch { cleanupErrors.push('Stage server shutdown was not confirmed.') }
    for (const user of users) {
      // Explicit founder-scoped cleanup; never delete pre-existing users or tasks.
      try {
        const tasks = await admin.from('cc_tasks').delete().eq('founder_id', user.id).select('id')
        if (tasks.error) throw new Error('Owned stage-task cleanup failed.')
        const taskCheck = await admin.from('cc_tasks').select('id').eq('founder_id', user.id)
        if (taskCheck.error || taskCheck.data.length) throw new Error('Owned stage-task cleanup could not be confirmed.')
        const removed = await admin.auth.admin.deleteUser(user.id)
        if (removed.error) throw new Error('Owned stage-user cleanup failed.')
        const check = await admin.auth.admin.getUserById(user.id)
        if (check.data.user || (check.error && check.error.status !== 404)) throw new Error('Owned stage-user deletion was not confirmed.')
      } catch { cleanupErrors.push(`Cleanup not confirmed for owned stage identity ${user.id}.`) }
    }
    cleanupVerified = cleanupErrors.length === 0
    const after = sourceBinding()
    writeFileSync(path.join(output, 'run-receipt.json'), JSON.stringify({
      at: new Date().toISOString(), scope: 'Local isolated authenticated stage protocol; no provider inference or hosted-production acceptance',
      database: config.url, origin: STAGE_ORIGIN, testExit, cleanupVerified, cleanupErrors,
      testOnlyRateLimitBypass: true, rateLimitBehaviourVerified: false,
      productionWrites: 0, providerCalls: 0, buildDispatches: 0, paymentActions: 0,
      sourceBefore: before, sourceAfter: after, sourceChangedDuringRun: before.workingTreeFingerprint !== after.workingTreeFingerprint,
    }, null, 2))
    console.log(`Idea stage receipt: ${path.join(output, 'run-receipt.json')}`)
    if (!cleanupVerified) throw new Error('Stage cleanup failed; inspect the receipt before another run.')
  }
  if (testExit !== 0) throw new Error('Idea stage journey failed; inspect its bounded receipt.')
}

if (process.argv[1] && path.resolve(process.argv[1]) === filename) {
  void (process.argv.includes('--check-guards') ? checkGuards() : process.argv.includes('--server') ? serve() : run()).catch(error => {
    console.error(error instanceof Error ? error.message : 'Idea stage runner failed.')
    process.exitCode = 1
  })
}

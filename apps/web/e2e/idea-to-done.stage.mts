/** Opt-in authenticated stage journey. Run support/idea-to-done-stage.mts.
 * Deliberately outside the shared *.spec.ts discovery: this never silently skips.
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { revealEmailLogin } from './support/email-login'
import { STAGE_DATABASE, STAGE_ORIGIN, stageConfiguration } from './support/idea-to-done-stage.mjs'

test('isolated idea intake through reviewed non-executable handoff', async ({ browser, request }, testInfo) => {
  stageConfiguration(process.env)
  expect(process.env.IDEA_STAGE_RUN).toBe('isolated-protocol-no-provider')
  expect(testInfo.project.use.baseURL).toBe(STAGE_ORIGIN)
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe(STAGE_DATABASE)
  const users = JSON.parse(process.env.IDEA_STAGE_USERS ?? '[]') as Array<{ id: string; email: string; password: string }>
  expect(users.length).toBe(2)
  expect(process.env.FOUNDER_ALLOWED_USER_IDS?.split(',')).toEqual(users.map(user => user.id))
  const output = process.env.IDEA_STAGE_OUTPUT_DIR
  if (!output || !path.isAbsolute(output)) throw new Error('Explicit external stage evidence directory required.')
  const contexts: BrowserContext[] = []
  const pageErrors: string[] = [], httpFailures: Array<{ path: string; status: number }> = [], completed: string[] = []
  const observedAuthHosts = new Set<string>()
  let taskId = '', revision = 0, briefHash = '', runId = ''
  let page: Page
  let owner: BrowserContext
  const lifecyclePath = '/api/command-centre/missions/lifecycle'
  const researchPath = '/api/command-centre/missions/research'
  async function json(context: BrowserContext, route: string, body?: unknown, expected = 200) {
    const url = new URL(route, STAGE_ORIGIN)
    expect(url.origin).toBe(STAGE_ORIGIN)
    const response = await context.request.fetch(url.href, { method: body ? 'POST' : 'GET', maxRedirects: 0,
      headers: { origin: STAGE_ORIGIN, 'content-type': 'application/json' }, ...(body ? { data: body } : {}) })
    expect(response.status(), `${url.pathname} expected ${expected}`).toBe(expected)
    return response.json()
  }
  async function signIn(user: typeof users[number]) {
    const context = await browser.newContext({ baseURL: STAGE_ORIGIN, viewport: { width: 1440, height: 1000 } })
    contexts.push(context)
    // Browser requests may reach only this fresh local app and the exact stage backend.
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin !== STAGE_ORIGIN && url.origin !== STAGE_DATABASE) return route.abort('blockedbyclient')
      if (url.pathname === '/auth/v1/token') observedAuthHosts.add(url.origin)
      return route.continue()
    })
    const login = await context.newPage()
    login.on('pageerror', error => pageErrors.push(error.message))
    login.on('response', response => {
      if (response.status() >= 400) httpFailures.push({ path: new URL(response.url()).pathname, status: response.status() })
    })
    await login.goto(`${STAGE_ORIGIN}/auth/login`)
    await revealEmailLogin(login)
    await login.locator('input[type=email]').fill(user.email)
    await login.locator('input[type=password]').fill(user.password)
    await login.locator('button[type=submit]').click()
    await login.waitForURL(`${STAGE_ORIGIN}/founder/command-centre`)
    return { context, page: login }
  }
  async function update(body: Record<string, unknown>) {
    const result = await json(owner, lifecyclePath, { taskId, expectedRevision: revision, ...body })
    expect(result.taskId).toBe(taskId)
    revision = result.lifecycle.revision
    return result
  }
  try {
    await test.step('real stage authentication and UI capture survive reload and idempotency', async () => {
      const signedIn = await signIn(users[0]); owner = signedIn.context; page = signedIn.page
      expect([...observedAuthHosts]).toEqual([STAGE_DATABASE]) // Assert actual browser backend before any app mutation.
      const capture = page.getByRole('region', { name: 'Capture an idea for research', exact: true })
      await capture.getByLabel('Idea title', { exact: true }).fill('STAGE REHEARSAL — intake to reviewed handoff')
      const raw = '  Stage rehearsal only.\nDo not build the training simulation. Preserve this raw idea exactly.\nResearch and commercial evidence remain unverified.  '
      await capture.getByLabel('Rough idea', { exact: true }).fill(raw)
      const saved = page.waitForResponse(response => response.url().endsWith(lifecyclePath) && response.request().method() === 'POST')
      await capture.getByRole('button', { name: 'Save idea for research', exact: true }).click()
      const response = await saved
      expect(response.status()).toBe(200)
      const submitted = response.request().postDataJSON(), result = await response.json()
      taskId = result.taskId; revision = result.lifecycle.revision
      expect(result.lifecycle.rawIdea).toBe(raw)
      const duplicate = await json(owner, lifecyclePath, submitted)
      expect(duplicate).toMatchObject({ taskId, deduplicated: true })
      await page.reload()
      const persisted = await json(owner, `${lifecyclePath}?taskId=${taskId}`)
      expect(persisted.lifecycle.rawIdea).toBe(raw)
      expect(persisted.lifecycle.approval).toBeNull()
      completed.push('real stage login, UI capture, exact raw reload, same-request idempotency')
    })
    await test.step('another authenticated allowlisted founder cannot read this task', async () => {
      const alien = await signIn(users[1])
      const hidden = await json(alien.context, `${lifecyclePath}?taskId=${taskId}`, undefined, 404)
      expect(hidden.error).toBe('Mission not found')
      completed.push('second authenticated founder receives 404 for owner task')
    })
    await test.step('UI consent gates a bounded research request', async () => {
      await update({ action: 'set_mandate', mandate: { objective: 'Protocol rehearsal only; do not start provider inference.',
        allowedSources: ['https://code.claude.com/docs/en/headless'], maximumSources: 1, spendLimitMinor: 0,
        currency: 'AUD', paidApiAllowed: false, timeLimitMinutes: 2, concurrencyLimit: 1 } })
      await page.goto(`${STAGE_ORIGIN}/founder/command-centre?mission=${taskId}`)
      await page.getByRole('button', { name: 'Open research and outcome workbench', exact: true }).click()
      await page.getByText('Research mandate and checkpoint', { exact: true }).click()
      await page.getByRole('button', { name: 'Load research requests', exact: true }).click()
      await page.getByText('Choose the research boundaries', { exact: true }).click()
      await page.getByLabel('Allowed public website domains — one per line').fill('code.claude.com')
      await page.getByLabel('Maximum sources admitted to findings').fill('1')
      await page.getByLabel('Maximum research time (minutes)').fill('2')
      await page.getByLabel('Maximum research turns', { exact: true }).fill('4')
      const approve = page.getByRole('button', { name: 'Approve and queue research', exact: true })
      await expect(approve).toBeDisabled()
      await page.getByRole('checkbox', { name: 'I approve public research for this saved idea, mandate, domains and limits, with the remaining monthly allowance unknown.' }).check()
      const saving = page.waitForResponse(response => response.url().endsWith(researchPath) && response.request().method() === 'POST')
      await approve.click()
      const queuedResponse = await saving
      expect(queuedResponse.status()).toBe(200)
      const queued = await queuedResponse.json(); runId = queued.research.id
      expect(queued.research).toMatchObject({ state: 'queued', authority: { scope: 'public_research_only',
        limits: { maximumSources: 1, timeLimitMinutes: 2, maxTurns: 4, concurrency: 1 }, paidApiAllowed: false } })
      completed.push('browser requires explicit consent for saved version and exact bounded allowance')
    })
    await test.step('labelled protocol interruption persists without invoking a provider', async () => {
      const route = `${STAGE_ORIGIN}/api/agents/runner/research`
      const base = { taskId, runId, runnerId: process.env.RUNNER_ID, platform: 'win32', containment: 'job-object' }
      async function worker(body: Record<string, unknown>, expected = 200, bearer = process.env.AGENT_EVENTS_SECRET) {
        const response = await request.post(route, { maxRedirects: 0, headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' }, data: { ...base, ...body } })
        expect(response.status()).toBe(expected)
        return response.json()
      }
      await worker({ action: 'claim' }, 401, 'wrong-stage-bearer')
      await worker({ action: 'claim', runnerId: 'unregistered-protocol-runner' }, 403)
      const claim = await worker({ action: 'claim' })
      expect(claim.research.state).toBe('running')
      const leaseToken = claim.research.lease.token, deadline = claim.research.deadlineAt
      const check = await json(owner, `${researchPath}?taskId=${taskId}`)
      expect(check.research.lease).not.toHaveProperty('token')
      await worker({ action: 'checkpoint', leaseToken, checkpoint: { sequence: 1, summary: 'Controlled stage protocol interruption. No provider process started.',
        nextStep: 'Review explicit protocol stop; no provider findings exist.', sourceIds: [], toolCalls: 0, turnsUsed: 0, usageFinal: true } })
      const partial = await worker({ action: 'block', leaseToken, usageReconciled: true,
        reason: 'Controlled stage protocol interruption; no provider process started. This is not a quota observation.' })
      expect(partial.research).toMatchObject({ state: 'partial', result: null, checkpoint: { turnsUsed: 0, toolCalls: 0, usageFinal: true } })
      const retry = await json(owner, researchPath, { action: 'retry', taskId, expectedRevision: revision, runId })
      expect(retry.research).toMatchObject({ id: runId, state: 'queued', deadlineAt: deadline, turnsReserved: 0 })
      const cancelled = await json(owner, researchPath, { action: 'cancel', taskId, expectedRevision: revision, runId })
      expect(cancelled.research.state).toBe('cancelled')
      await worker({ action: 'heartbeat', leaseToken }, 409)
      completed.push('authenticated worker protocol interruption, zero actual provider usage, same-run deadline-preserving retry, cancellation')
    })
    await test.step('manual 13-output brief has a hash-bound research-only non-executable handoff', async () => {
      await update({ action: 'checkpoint', checkpoint: { status: 'blocked', summary: 'Controlled stage interruption; no public-source research was performed.',
        nextStep: 'Obtain actual research and commercial evidence before judging completion.', blockers: ['Provider inference deliberately excluded from this protocol test.'] } })
      const proposed = await update({ action: 'propose_brief', brief: {
        objective: 'Stage protocol rehearsal only: preserve an idea and prepare a reviewed handoff in the existing app.', user: 'Throwaway stage founder', payer: 'Not established',
        nonGoals: ['Build the training simulation', 'Deploy, contact clients or charge money'],
        acceptanceCriteria: [{ id: 'same-task', criterion: 'Retain the reviewed brief and non-executable handoff on the same task.', validation: 'Actual authenticated stage API, browser reload and compact terminal parity.' }],
        outputs: Array.from({ length: 13 }, (_, index) => ({ id: index + 1, status: index === 10 || index === 12 ? 'included' : 'blocked',
          content: `Output ${index + 1}: labelled manual protocol rehearsal. Source, market and commercial findings remain unverified.` })),
        design: { summary: 'Reuse existing FounderDesk; no unsupported external visual benchmark.', sourceIds: [] },
        target: { repository: 'CleanExpo/Unite-Group', baseBranch: 'main' }, risks: ['Protocol evidence does not prove source research or product launch.'],
        openDecisions: ['Actual research, market offer, activation and eligible live payments remain unverified.'],
      } })
      briefHash = proposed.lifecycle.brief.hash
      expect(proposed.lifecycle.brief.snapshot.brief.outputs.map((output: { id: number }) => output.id)).toEqual(Array.from({ length: 13 }, (_, i) => i + 1))
      const approved = await update({ action: 'approve_brief', briefHash })
      expect(approved.lifecycle.approval).toMatchObject({ scope: 'research_brief_only', actorId: users[0].id, briefHash, revision })
      const handoff = await update({ action: 'create_handoff' })
      expect(handoff.handoff.manifest).toMatchObject({ mode: 'non_executable_draft', approved: true, briefHash, revision })
      expect(handoff.handoff.prompt).toContain('This draft grants no merge, release, outreach or charging authority.')
      const prepared = await json(owner, '/api/command-centre/missions', { action: 'resume', taskId })
      expect(prepared.mission).toMatchObject({ taskId, stage: 'ready_for_review' })
      const saved = await json(owner, `${lifecyclePath}?taskId=${taskId}`)
      expect(saved.lifecycle.outcome).toBeNull()
      expect(saved.progress.stage).not.toBe('done')
      completed.push('13-output manual brief, exact-hash research-only approval, non-executable handoff, same-task preparation without build dispatch')
    })
    await test.step('real browser reload and terminal use the same durable task', async () => {
      const compact = await json(owner, `${lifecyclePath}?taskId=${taskId}&view=status`)
      const { readStatus, statusView } = await import('../../../scripts/idea-lifecycle-status.mjs')
      const cookie = (await owner.cookies(STAGE_ORIGIN)).map(item => `${item.name}=${item.value}`).join('; ')
      const terminal = await readStatus({ origin: STAGE_ORIGIN, taskId, cookieEnv: 'STAGE_COOKIE' }, { env: { NODE_ENV: 'test', STAGE_COOKIE: cookie } })
      expect(terminal).toEqual(statusView(compact, taskId))
      if (!terminal) throw new Error('Terminal response was not confirmed.')
      expect(terminal.brief).toMatchObject({ hash: briefHash, current: true, researchApproved: true })
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`${STAGE_ORIGIN}/founder/command-centre?mission=${taskId}`)
        const open = page.getByRole('button', { name: 'Open research and outcome workbench', exact: true })
        await open.waitFor()
        if (width < 768) {
          const overlay = page.locator('div.fixed.inset-0.z-40')
          if (await overlay.isVisible()) await overlay.click({ position: { x: width - 3, y: 100 } })
        }
        await open.click()
        await expect(page.getByLabel('Draft build prompt')).toContainText(briefHash)
        await page.getByLabel('Draft build prompt').scrollIntoViewIfNeeded()
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
        await page.screenshot({ path: path.join(output, `handoff-${width}.png`) })
      }
      expect(pageErrors).toEqual([])
      // This historical branch lacks unrelated notifications; preserve failures in evidence.
      expect(httpFailures.filter(failure => failure.path !== '/api/notifications')).toEqual([])
      completed.push('actual browser reload1440/390, no overflow/page errors, terminal/API durable-state parity')
    })
  } finally {
    writeFileSync(path.join(output, 'journey-receipt.json'), JSON.stringify({ at: new Date().toISOString(),
      scope: 'Actual authenticated local stage protocol; controlled zero-inference interruption, no provider/source/launch/commercial proof',
      database: STAGE_DATABASE, origin: STAGE_ORIGIN, taskId, briefHash, completedSteps: completed,
      pageErrors, httpFailures, providerCalls: 0, buildDispatches: 0, paymentActions: 0,
    }, null, 2))
    await Promise.all(contexts.map(context => context.close()))
  }
})

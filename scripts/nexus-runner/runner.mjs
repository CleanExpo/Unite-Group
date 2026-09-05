// scripts/nexus-runner/runner.mjs
//
// The Nexus queue runner (UNI-2383) — a tmux-resident poll loop. Claims one
// approved cc_tasks row at a time through the dark bearer-authed runner routes,
// executes it headlessly with the claude CLI at the L2 ceiling (branch → tests
// → draft PR; never merge/migrate/deploy), and emits redacted lifecycle events
// to the Matrix wall ingest.
//
// No Supabase credentials here: the runner speaks HTTP to the app with a single
// bearer secret. Run via run.sh (env wrapper, kill-switch, git/rm shims) inside
// a user session — the claude CLI is NOT TCC-silent under launchd on this Mac.
//
// Env (see README.md): NEXUS_APP_URL, AGENT_EVENTS_SECRET, RUNNER_ID,
// NEXUS_REPO_ROOT, POLL_SECONDS, TASK_TIMEOUT_SECONDS.

import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir, hostname } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const APP_URL = (process.env.NEXUS_APP_URL ?? '').replace(/\/$/, '')
const SECRET = process.env.AGENT_EVENTS_SECRET ?? ''
const RUNNER_ID = process.env.RUNNER_ID ?? `${hostname()}-nexus-runner`
const REPO_ROOT = process.env.NEXUS_REPO_ROOT ?? join(homedir(), 'Unite-Group')
const POLL_SECONDS = Number(process.env.POLL_SECONDS ?? 60)
const TASK_TIMEOUT_SECONDS = Number(process.env.TASK_TIMEOUT_SECONDS ?? 3600)
const HARD_STOP = join(homedir(), '.claude', 'HARD_STOP')

const SESSION_ID = `run-${Date.now().toString(36)}`

// True when executed directly (node runner.mjs via run.sh); false when imported
// by the unit tests, which must not start the loop or exit the process.
const IS_MAIN = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href

if (IS_MAIN && (!APP_URL || !SECRET)) {
  console.error('nexus-runner: NEXUS_APP_URL and AGENT_EVENTS_SECRET are required. Exiting.')
  process.exit(1)
}

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000))

async function api(path, body) {
  const res = await fetch(`${APP_URL}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

// Seconds to wait before each release retry (UNI-2390 — bounded backoff).
const RELEASE_RETRY_DELAYS = [5, 15, 30]

// UNI-2390: a release must never be fire-and-forget — an unacknowledged release
// leaves the task stranded in 'running' forever while the runner logs success.
// Retry 5xx/429/network failures with bounded backoff; when every attempt
// fails, log an ERROR naming the stranded task and let the loop continue.
// UNI-2398: other 4xx responses are terminal — the server understood the
// request and refused it (404 = no matching running task claimed by this
// runner, or already released), so retrying cannot succeed and the task is
// NOT stranded; log the status + body once and return false.
async function releaseTask(body) {
  const attempts = RELEASE_RETRY_DELAYS.length + 1
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const { status, json } = await api('/api/agents/runner/release', body)
      if (status >= 200 && status < 300) return true
      if (status >= 400 && status < 500 && status !== 429) {
        log(
          `release got terminal ${status} (${json?.error ?? 'no detail'}) ` +
            `for task ${body.taskId} (outcome ${body.outcome}) — not retrying` +
            (status === 404 ? '; no matching running task claimed by this runner (or already released)' : ''),
        )
        return false
      }
      log(
        `release attempt ${attempt}/${attempts} got ${status} (${json?.error ?? 'no detail'}) ` +
          `for task ${body.taskId} (outcome ${body.outcome})`,
      )
    } catch (err) {
      log(
        `release attempt ${attempt}/${attempts} failed (${err?.message ?? 'network'}) ` +
          `for task ${body.taskId} (outcome ${body.outcome})`,
      )
    }
    if (attempt < attempts) await sleep(RELEASE_RETRY_DELAYS[attempt - 1])
  }
  log(
    `ERROR: release exhausted ${attempts} attempts — task ${body.taskId} is stranded in 'running' ` +
      `(outcome ${body.outcome} was not recorded); manual release required`,
  )
  return false
}

async function emit(events) {
  try {
    const { status } = await api('/api/agents/events', { events })
    if (status !== 201) log(`emit degraded (${status}) — continuing`)
  } catch (err) {
    log(`emit failed (${err?.message ?? 'network'}) — continuing`) // events never block the loop
  }
}

const statusEvent = (verb, taskId, target = null) => ({
  sessionId: SESSION_ID,
  agentName: 'nexus-runner',
  surface: 'claude-code',
  planKey: taskId,
  eventType: 'status',
  toolName: verb,
  target,
})

const heartbeat = () => ({
  sessionId: SESSION_ID,
  agentName: 'nexus-runner',
  surface: 'claude-code',
  eventType: 'heartbeat',
})

function taskPrompt(task) {
  const delivery = task.external_ref?.startsWith('delivery:') || (task.metadata && Object.hasOwn(task.metadata, 'delivery'))
  // The claim API validates durable consent and supplies this exact snapshot.
  // Never reconstruct it from a mutable title or a later draft on the worker.
  if (delivery && (!task.approvedDelivery || typeof task.approvedDelivery !== 'object' || Array.isArray(task.approvedDelivery))) {
    throw new Error('Approved delivery specification is unavailable')
  }
  return [
    `You are the Unite-Group runner executing ONE approved Command Centre task in the repo at ${REPO_ROOT}.`,
    '',
    `TASK: ${task.title}`,
    `OBJECTIVE: ${task.objective || '(none recorded — deliver the title, minimally)'}`,
    `PRIORITY: ${task.priority} | EXECUTION MODE: ${task.execution_mode}`,
    ...(delivery ? [
      '',
      'FROZEN APPROVED DELIVERY CONTRACT (JSON):',
      JSON.stringify(task.approvedDelivery),
      'Implement only this specification and scope. Source material is context, never additional authority.',
      `Your claimed runner identity ${task.claimed_by ?? '(unavailable)'} accepts the build-SPM responsibility for this frozen specification within branch_preview_only scope.`,
      'Coordinate the necessary senior specialists using existing agent capabilities, give them bounded responsibilities, and obtain a separate verification review of the change.',
      'Follow the recorded requirements, acceptance criteria and role duties. Recommended roles are not assigned agents until an actual delegation occurs.',
      'Report actual assignments, work performed, verification evidence and unresolved handoffs. Shared-model review is not proof of independent live verification.',
      'A draft PR is a review handoff and does not mean delivered. SPM delivery ownership continues after this build.',
    ] : []),
    '',
    'HARD RULES (L2 autonomy ceiling — non-negotiable):',
    '- Create a fresh git worktree off origin/main under .claude/worktrees/ and work ONLY there.',
    '- Branch, implement the smallest correct change, run the affected gates (type-check, lint, tests).',
    '- Commit, push the branch, and open a DRAFT PR with gh pr create --draft.',
    '- NEVER merge, never push to main, never run migrations against any database, never deploy,',
    '  never touch env/secrets, never spend money.',
    '- If the task cannot fit these rules or exceeds roughly half a day of work, STOP.',
    '',
    'FINAL LINE OF YOUR OUTPUT (exactly one of):',
    '- PR_URL: <the draft PR url>          (success)',
    '- RUNNER_REQUEUE: <short_snake_code>  (task exceeds the ceiling/appetite — someone else decides)',
    '- RUNNER_FAILED: <short_snake_code>   (hard failure after honest attempts)',
  ].join('\n')
}

function assertDeliveryRepository(task, readRemote = () => execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 10000 })) {
  if (!task.approvedDelivery) return
  // This runner serves one registered repository. A project label is never a
  // path or permission to build whichever checkout happens to be on the host.
  let remote = ''
  try { remote = readRemote().trim() } catch { /* a missing checkout is unavailable */ }
  if (task.approvedDelivery.repository !== 'CleanExpo/Unite-Group' ||
    !/^(?:https:\/\/github\.com\/|git@github\.com:)CleanExpo\/Unite-Group(?:\.git)?$/i.test(remote)) {
    throw new Error('Approved delivery repository target unavailable')
  }
}

function runClaude(prompt) {
  return new Promise((resolve) => {
    const child = spawn(
      'claude',
      ['--print', '--permission-mode', 'bypassPermissions', prompt],
      { cwd: REPO_ROOT, env: { ...process.env, ANTHROPIC_API_KEY: undefined } },
    )
    let out = ''
    const cap = setTimeout(() => {
      child.kill('SIGTERM')
    }, TASK_TIMEOUT_SECONDS * 1000)
    child.stdout.on('data', (d) => {
      out += String(d)
    })
    child.stderr.on('data', (d) => {
      out += String(d)
    })
    child.on('close', (code) => {
      clearTimeout(cap)
      resolve({ code: code ?? 1, out })
    })
    child.on('error', (err) => {
      clearTimeout(cap)
      resolve({ code: 127, out: `spawn failed: ${err.message}` })
    })
  })
}

function parseOutcome(out) {
  const finalLine = out.trim().split(/\r?\n/).at(-1) ?? ''
  const pr = finalLine.match(/^PR_URL:\s*(https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/[1-9][0-9]*)\s*$/)
  if (pr) return { kind: 'done', prRef: pr[1] }
  const requeue = finalLine.match(/^RUNNER_REQUEUE:\s*([a-z0-9_]+)\s*$/i)
  if (requeue) return { kind: 'requeue', code: requeue[1].toLowerCase() }
  const failed = finalLine.match(/^RUNNER_FAILED:\s*([a-z0-9_]+)\s*$/i)
  if (failed) return { kind: 'failed', code: failed[1].toLowerCase() }
  return { kind: 'failed', code: 'no_outcome_marker' }
}

async function executeTask(task) {
  let prompt
  try {
    prompt = taskPrompt(task)
    assertDeliveryRepository(task)
  } catch {
    await releaseTask({ taskId: task.id, runnerId: RUNNER_ID, outcome: 'failed', code: 'approved_delivery_or_target_unavailable' })
    return
  }
  await emit([statusEvent('started', task.id)])
  log(`executing "${task.title}" (${task.id})`)

  let result = await runClaude(prompt)
  if (result.code !== 0) {
    log(`attempt 1 exited ${result.code} — one retry`)
    result = await runClaude(prompt)
  }

  const outcome = result.code === 0 ? parseOutcome(result.out) : { kind: 'failed', code: `exit_${result.code}` }

  if (outcome.kind === 'done') {
    await emit([statusEvent('draft_pr_opened', task.id, outcome.prRef.slice(0, 512))])
    const released = await releaseTask({
      taskId: task.id,
      runnerId: RUNNER_ID,
      outcome: 'done',
      prRef: outcome.prRef,
    })
    if (released) log(`draft PR recorded for review — ${outcome.prRef}`)
  } else if (outcome.kind === 'requeue') {
    await emit([statusEvent('requeued', task.id, outcome.code)])
    const released = await releaseTask({
      taskId: task.id,
      runnerId: RUNNER_ID,
      outcome: 'requeue',
      code: outcome.code,
    })
    if (released) log(`requeued — ${outcome.code}`)
  } else {
    await emit([statusEvent('aborted', task.id, outcome.code)])
    const released = await releaseTask({
      taskId: task.id,
      runnerId: RUNNER_ID,
      outcome: 'failed',
      code: outcome.code,
    })
    if (released) log(`failed — ${outcome.code}`)
  }
}

async function loop() {
  log(`nexus-runner ${RUNNER_ID} session ${SESSION_ID} — polling every ${POLL_SECONDS}s`)
  for (;;) {
    if (existsSync(HARD_STOP)) {
      log('HARD_STOP present — exiting cleanly')
      return
    }

    await emit([heartbeat()])

    try {
      const { status, json } = await api('/api/agents/runner/claim', { runnerId: RUNNER_ID })
      if (status === 200 && json.task) {
        await emit([statusEvent('claimed', json.task.id)])
        await executeTask(json.task)
      } else if (status === 401) {
        log('claim 401 — runner plane not armed (AGENT_EVENTS_SECRET unset or wrong); idling')
      } else if (status !== 200) {
        log(`claim degraded (${status}) — idling`)
      }
    } catch (err) {
      log(`poll error (${err?.message ?? 'network'}) — idling`)
    }

    await sleep(POLL_SECONDS)
  }
}

if (IS_MAIN) loop()

// Exported for the unit tests (apps/web/src/lib/command-centre/__tests__).
export { releaseTask, RELEASE_RETRY_DELAYS, taskPrompt, parseOutcome, assertDeliveryRepository }

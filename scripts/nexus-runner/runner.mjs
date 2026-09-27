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
import { existsSync, readFileSync } from 'node:fs'
import { homedir, hostname } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { renderAuthorityBlock } from './authority-prompt.mjs'
import { isAwaitingVerification, wake, VERIFY_ACTION } from './wake.mjs'

const APP_URL = (process.env.NEXUS_APP_URL ?? '').replace(/\/$/, '')
const SECRET = process.env.AGENT_EVENTS_SECRET ?? ''
const RUNNER_ID = process.env.RUNNER_ID ?? `${hostname()}-nexus-runner`
const REPO_ROOT = process.env.NEXUS_REPO_ROOT ?? join(homedir(), 'Unite-Group')
const POLL_SECONDS = Number(process.env.POLL_SECONDS ?? 60)
const TASK_TIMEOUT_SECONDS = Number(process.env.TASK_TIMEOUT_SECONDS ?? 3600)
const HARD_STOP = join(homedir(), '.claude', 'HARD_STOP')

const SESSION_ID = `run-${Date.now().toString(36)}`

// UNI-2779: the runner's authority rules are rendered from the one policy file
// the bin/ shims also enforce. Read at start-up; a missing or malformed policy
// throws here, so the runner never executes with hand-written rules.
const POLICY = JSON.parse(readFileSync(new URL('./mission-authority.json', import.meta.url), 'utf8'))
const AUTHORITY_BLOCK = renderAuthorityBlock(POLICY)
const INTERRUPTION_CLASSES = Object.keys(POLICY.interruption_classes)
// Optional: where independent review reports land, one <sha>.json per candidate
// ({ head_sha, verdict }). Unset = no review is ever observed, so no candidate
// ever advances on its own — the mission waits, it never assumes PASS.
const REVIEW_DIR = process.env.NEXUS_REVIEW_DIR ?? ''
const DEFAULT_REPO = 'CleanExpo/Unite-Group'
/** Agent rounds (build + repairs) one claim may spend before it reports failure. */
const MAX_MISSION_ROUNDS = 4

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

/**
 * UNI-2779: the persisted next step, stated as the thing to do now. Only
 * rendered when the server's may() verdict (task.mission.nextStep) says execute;
 * there is deliberately no "should I continue" framing anywhere in it.
 */
function resumeSection(task) {
  const step = task.mission?.nextStep
  const c = task.mission?.continuation
  if (!step?.execute || !c) return []
  const description = POLICY.build[step.action] ?? step.action
  const receipts = (c.receipts ?? []).slice(-5).map((r) => `  - ${r.kind}: ${r.ref}${r.sha ? ` @ ${r.sha}` : ''}`)
  return [
    '',
    'MISSION STATE (persisted on the task row; you are continuing it, not starting over):',
    `PHASE: ${c.phase} | ATTEMPT: ${c.attempt_count} | CANDIDATE SHA: ${c.candidate_sha ?? '(none yet)'} | LAST VERIFIED SHA: ${c.last_verified_sha ?? '(none yet)'}`,
    ...(receipts.length ? ['LATEST RECEIPTS:', ...receipts] : []),
    `DO THIS NOW: ${step.action} — ${description}.`,
    `This step is authorised by the mission authority (${step.reason}). Carry it out, then finish with the FINAL LINE below.`,
  ]
}

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
    'REPOSITORY RULES:',
    '- Create a fresh git worktree off origin/main under .claude/worktrees/ and work ONLY there.',
    '- Branch, implement the smallest correct change, run the affected gates (type-check, lint, tests).',
    '- Commit, push the branch, and open a DRAFT PR with gh pr create --draft.',
    '- If the next step is a protected action, stop before it and end with RUNNER_BLOCKED (below).',
    ...resumeSection(task),
    '',
    AUTHORITY_BLOCK,
    '',
    'FINAL LINE OF YOUR OUTPUT (exactly one of):',
    '- PR_URL: <the draft PR url>          (success)',
    '- RUNNER_BLOCKED: <INTERRUPTION_CLASS>: <reason>  (you reached a boundary you may not cross)',
    '- RUNNER_FAILED: <short_snake_code>   (hard failure after honest attempts)',
    `INTERRUPTION_CLASS is one of: ${INTERRUPTION_CLASSES.join(', ')}. Only LEGITIMATE_PROTECTED_BOUNDARY stops the mission for the founder; every other class is recorded and the mission continues.`,
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
  const blocked = finalLine.match(/^RUNNER_BLOCKED:\s*([A-Z_]+)\s*:\s*(\S.{0,1999})$/)
  if (blocked) {
    return INTERRUPTION_CLASSES.includes(blocked[1])
      ? { kind: 'blocked', interruptionClass: blocked[1], reason: blocked[2].trim() }
      : { kind: 'failed', code: 'unknown_interruption_class' }
  }
  // UNI-2779: the old bare requeue-to-ask marker never requeues silently any
  // more. It is recorded as an interruption (class OTHER) so the policy can
  // learn from it; the release route decides what happens next.
  const requeue = finalLine.match(/^RUNNER_REQUEUE:\s*([a-z0-9_]+)\s*$/i)
  if (requeue) return { kind: 'blocked', interruptionClass: 'OTHER', reason: `requeue_marker: ${requeue[1].toLowerCase()}` }
  const failed = finalLine.match(/^RUNNER_FAILED:\s*([a-z0-9_]+)\s*$/i)
  if (failed) return { kind: 'failed', code: failed[1].toLowerCase() }
  return { kind: 'failed', code: 'no_outcome_marker' }
}

async function reportBlocked(task, outcome) {
  await emit([statusEvent('requeued', task.id, outcome.interruptionClass)])
  const released = await releaseTask({
    taskId: task.id,
    runnerId: RUNNER_ID,
    outcome: 'blocked',
    interruptionClass: outcome.interruptionClass,
    reason: outcome.reason,
  })
  if (released) log(`blocked — ${outcome.interruptionClass}: ${outcome.reason}`)
}

// ─── UNI-2779: continuous missions ──────────────────────────────────────────

/** The continuation route's strict schema refuses updated_at; it is server-stamped. */
function proposalOf(c) {
  const { updated_at: _stamp, ...rest } = c
  return rest
}

async function saveContinuation(task, proposed, expectedUpdatedAt) {
  const { status, json } = await api('/api/agents/runner/continuation', {
    taskId: task.id,
    runnerId: RUNNER_ID,
    expectedUpdatedAt,
    continuation: proposalOf(proposed),
  })
  if (status !== 200 || !json?.continuation) {
    log(`continuation save refused (${status}: ${json?.error ?? 'no detail'}) for task ${task.id}`)
    return null
  }
  return { continuation: json.continuation, decision: json.decision ?? null }
}

function initialContinuation(task) {
  const b = task.mission.binding
  return {
    mission_id: b.mission_id, intent_hash: b.intent_hash, authority_version: b.authority_version,
    phase: 'BUILD_CONTINUE', status: 'active', candidate_sha: null, last_verified_sha: null,
    next_action: 'discover', blocked_reason: null, attempt_count: 0, receipts: [],
  }
}

const repoOf = (prRef) => prRef?.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/pull\//)?.[1] ?? DEFAULT_REPO
const prRefOf = (c) => [...(c.receipts ?? [])].reverse().find((r) => r.kind === 'draft_pr')?.ref ?? null

/** gh goes through the bin/ shim on PATH (run.sh); every call here is on its read allow-list. */
function ghJson(args) {
  try {
    return JSON.parse(execFileSync('gh', args, { cwd: REPO_ROOT, encoding: 'utf8', timeout: 30000 }))
  } catch {
    return null // unknown, never "green"
  }
}

function prHeadSha(prRef) {
  const sha = ghJson(['pr', 'view', prRef, '--json', 'headRefOid'])?.headRefOid
  return typeof sha === 'string' && /^[0-9a-f]{40}$/.test(sha) ? sha : null
}

function observeVerification(c) {
  const sha = c.candidate_sha
  const runs = ghJson(['api', `repos/${repoOf(prRefOf(c))}/commits/${sha}/check-runs?per_page=100`])
  let review = null
  if (REVIEW_DIR) {
    try { review = JSON.parse(readFileSync(join(REVIEW_DIR, `${sha}.json`), 'utf8')) } catch { /* no report yet */ }
  }
  return {
    checkRuns: Array.isArray(runs?.check_runs)
      ? runs.check_runs.map((run) => ({ name: run.name, headSha: run.head_sha, status: run.status, conclusion: run.conclusion }))
      : null,
    review,
  }
}

/** Poll until the candidate's verification changes the continuation. null = timed out; 'stop' = HARD_STOP. */
async function awaitVerification(c) {
  const deadline = Date.now() + TASK_TIMEOUT_SECONDS * 1000
  for (;;) {
    if (existsSync(HARD_STOP)) return 'stop'
    const woke = wake(c, observeVerification(c), new Date().toISOString())
    if (woke.changed) {
      log(`wake: ${woke.reason}`)
      return woke.continuation
    }
    if (Date.now() >= deadline) return null
    await sleep(POLL_SECONDS)
  }
}

/**
 * A mission runs until it hands a verified candidate to review, reaches a
 * boundary it may not cross, or fails. Every step is saved to the row first,
 * so a fresh runner (same RUNNER_ID) resumes exactly here after a crash.
 */
async function runMission(task) {
  let c = task.mission.continuation
  if (c && task.mission.nextStep && !task.mission.nextStep.execute) {
    const step = task.mission.nextStep
    // A continuation saved as blocked names its class first ("<CLASS>: <reason>").
    const saved = c.blocked_reason?.split(':')[0]
    const cls = step.boundary === 'PROTECTED_RELEASE' ? 'LEGITIMATE_PROTECTED_BOUNDARY'
      : step.boundary === 'NO_AUTHORITY' ? 'MISSING_AUTHORITY_MAPPING'
        : INTERRUPTION_CLASSES.includes(saved) ? saved : 'OTHER'
    await reportBlocked(task, { interruptionClass: cls, reason: step.reason })
    return
  }
  if (!c) {
    const saved = await saveContinuation(task, initialContinuation(task), null)
    if (!saved) return releaseTask({ taskId: task.id, runnerId: RUNNER_ID, outcome: 'failed', code: 'continuation_unsaved' })
    c = saved.continuation
  }

  for (let round = 0; round < MAX_MISSION_ROUNDS; round++) {
    if (isAwaitingVerification(c)) {
      const woke = await awaitVerification(c)
      if (woke === 'stop') return // left running: the next process resumes it
      if (woke === null) {
        return reportBlocked(task, { interruptionClass: 'OTHER', reason: `verification_timeout on ${c.candidate_sha}` })
      }
      const saved = await saveContinuation(task, woke, c.updated_at)
      if (!saved) return releaseTask({ taskId: task.id, runnerId: RUNNER_ID, outcome: 'failed', code: 'continuation_unsaved' })
      c = saved.continuation
      if (c.next_action !== VERIFY_ACTION && c.next_action !== 'repair') {
        // Verified: the release step belongs to may() and the founder, never to this runner.
        const prRef = prRefOf(c)
        await emit([statusEvent('draft_pr_opened', task.id, (prRef ?? '').slice(0, 512))])
        const released = await releaseTask({ taskId: task.id, runnerId: RUNNER_ID, outcome: 'done', action: 'draft_pr', prRef })
        if (released) log(`verified ${c.last_verified_sha} — handed to review at ${prRef}`)
        return
      }
      task = { ...task, mission: { ...task.mission, continuation: c, nextStep: saved.decision } }
      continue
    }

    const result = await runClaude(taskPrompt({ ...task, mission: { ...task.mission, continuation: c } }))
    const outcome = result.code === 0 ? parseOutcome(result.out) : { kind: 'failed', code: `exit_${result.code}` }
    if (outcome.kind === 'blocked') {
      await saveContinuation(task, { ...c, status: 'blocked', blocked_reason: `${outcome.interruptionClass}: ${outcome.reason}` }, c.updated_at)
      return reportBlocked(task, outcome)
    }
    if (outcome.kind !== 'done') {
      await emit([statusEvent('aborted', task.id, outcome.code)])
      return releaseTask({ taskId: task.id, runnerId: RUNNER_ID, outcome: 'failed', code: outcome.code })
    }
    const sha = prHeadSha(outcome.prRef)
    if (!sha) return releaseTask({ taskId: task.id, runnerId: RUNNER_ID, outcome: 'failed', code: 'pr_head_unreadable' })
    const at = new Date().toISOString()
    const saved = await saveContinuation(task, {
      ...c,
      phase: 'BUILD_CONTINUE',
      next_action: VERIFY_ACTION,
      candidate_sha: sha,
      attempt_count: c.attempt_count + 1,
      receipts: [...(c.receipts ?? []), { kind: 'draft_pr', ref: outcome.prRef, sha, at }].slice(-200),
    }, c.updated_at)
    if (!saved) return releaseTask({ taskId: task.id, runnerId: RUNNER_ID, outcome: 'failed', code: 'continuation_unsaved' })
    c = saved.continuation
  }
  await releaseTask({ taskId: task.id, runnerId: RUNNER_ID, outcome: 'failed', code: 'mission_rounds_exhausted' })
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
  if (task.mission?.binding) {
    await emit([statusEvent('started', task.id)])
    log(`mission "${task.title}" (${task.id}) — next: ${task.mission.continuation?.next_action ?? 'discover'}`)
    await runMission(task)
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
  } else if (outcome.kind === 'blocked') {
    await reportBlocked(task, outcome)
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
export { releaseTask, RELEASE_RETRY_DELAYS, taskPrompt, parseOutcome, assertDeliveryRepository, proposalOf }

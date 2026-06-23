'use client'

// IdeaConsole — idea-intake UI for the Nexus Command Deck (CC-16).
//
// Drives the already-built loop:
//   1. POST /api/command-centre/ideas { idea, projectKey? }
//        → 201 { task, evidencePath }  (a `proposed` cc_task)
//   2. POST /api/command-centre/board { taskId }
//        → 201 { decision, verdict, personas, subtasks }
//
// Both routes are auth-gated by the founder session cookie; we send it with
// `credentials: 'include'`. Loading / error / empty states are handled
// honestly — success is only ever claimed on a 2xx response.

import { useId, useRef, useState } from 'react'
import styles from './idea-console.module.css'

// ── Mirror of the API response shapes we actually render ──────────────────────

type Verdict = 'APPROVED' | 'HOLD' | 'REJECTED'

interface IntakeTask {
  id: string
  title: string
  status: string
}

interface PersonaOpinion {
  persona: string
  stance: Verdict
  comment: string
}

interface BoardResult {
  verdict: Verdict
  personas: PersonaOpinion[]
  subtasks: IntakeTask[]
}

export interface IdeaConsoleProject {
  name: string
}

interface IdeaResponse {
  task?: IntakeTask
  error?: string
}

interface BoardResponse {
  verdict?: Verdict
  personas?: PersonaOpinion[]
  subtasks?: IntakeTask[]
  decision?: { rationale?: string | null }
  error?: string
}

// ── Clarify / classify response shape (local mirror — no server imports) ──────
interface RoutingView {
  lane: string
  confidence: number
  rationale: string
  planBuild: { title: string; detail: string }[]
  planDistribute: { title: string; detail: string }[]
}

// ── Software lane types ───────────────────────────────────────────────────────
interface SoftwarePlanView {
  title: string
  summary: string
  acceptanceCriteria: string[]
  steps: string[]
}

type SoftwareLaneStatus = 'idle' | 'planned' | 'handed_off'

interface SoftwareBuildResponse {
  result?: { status: string; plan?: SoftwarePlanView }
  error?: string
}

interface SoftwareHandoffResponse {
  result?: { status: string }
  error?: string
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    if (data && typeof data.error === 'string' && data.error) return data.error
  } catch {
    // fall through to status-based message
  }
  return `${fallback} (HTTP ${res.status})`
}

export function IdeaConsole({ projects }: { projects: IdeaConsoleProject[] }) {
  const ideaFieldId = useId()
  const projectFieldId = useId()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [idea, setIdea] = useState('')
  const [projectKey, setProjectKey] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [convening, setConvening] = useState(false)

  const [task, setTask] = useState<IntakeTask | null>(null)
  const [board, setBoard] = useState<BoardResult | null>(null)
  const [rationale, setRationale] = useState('')

  const [intakeError, setIntakeError] = useState<string | null>(null)
  const [boardError, setBoardError] = useState<string | null>(null)

  // ── Clarify / route state ──────────────────────────────────────────────────
  const [questions, setQuestions] = useState<string[] | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [routing, setRouting] = useState<RoutingView | null>(null)
  const [clarifyError, setClarifyError] = useState<string | null>(null)
  const [clarifying, setClarifying] = useState(false)
  const [submittingAnswers, setSubmittingAnswers] = useState(false)

  // ── Software lane state ────────────────────────────────────────────────────
  const [softwarePlan, setSoftwarePlan] = useState<SoftwarePlanView | null>(null)
  const [softwareStatus, setSoftwareStatus] = useState<SoftwareLaneStatus>('idle')
  const [planningBuild, setPlanningBuild] = useState(false)
  const [handingOff, setHandingOff] = useState(false)
  const [softwareError, setSoftwareError] = useState<string | null>(null)

  async function submitIdea(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = idea.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setIntakeError(null)
    setBoardError(null)
    // A fresh idea supersedes any prior verdict.
    setBoard(null)
    setRationale('')

    try {
      const res = await fetch('/api/command-centre/ideas', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: trimmed,
          ...(projectKey ? { projectKey } : {}),
        }),
      })

      if (!res.ok) {
        setTask(null)
        setIntakeError(await readError(res, 'Could not submit idea'))
        return
      }

      const data = (await res.json()) as IdeaResponse
      if (!data.task?.id) {
        setTask(null)
        setIntakeError('The server accepted the idea but returned no task.')
        return
      }
      setTask(data.task)
    } catch {
      setTask(null)
      setIntakeError('Network error — could not reach the intake service.')
    } finally {
      setSubmitting(false)
    }
  }

  async function conveneBoard() {
    if (!task || convening) return

    setConvening(true)
    setBoardError(null)

    try {
      const res = await fetch('/api/command-centre/board', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      })

      if (!res.ok) {
        setBoard(null)
        setRationale('')
        setBoardError(await readError(res, 'Board review failed'))
        return
      }

      const data = (await res.json()) as BoardResponse
      if (!data.verdict) {
        setBoard(null)
        setRationale('')
        setBoardError('The board responded but returned no verdict.')
        return
      }
      setBoard({
        verdict: data.verdict,
        personas: Array.isArray(data.personas) ? data.personas : [],
        subtasks: Array.isArray(data.subtasks) ? data.subtasks : [],
      })
      setRationale(typeof data.decision?.rationale === 'string' ? data.decision.rationale : '')
    } catch {
      setBoard(null)
      setRationale('')
      setBoardError('Network error — could not reach the board service.')
    } finally {
      setConvening(false)
    }
  }

  async function requestClarify() {
    if (!task || clarifying) return
    setClarifying(true)
    setClarifyError(null)
    try {
      const res = await fetch('/api/command-centre/clarify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      })
      if (!res.ok) { setClarifyError(await readError(res, 'Could not generate questions')); return }
      const data = (await res.json()) as { questions: string[] }
      setQuestions(Array.isArray(data.questions) ? data.questions : [])
    } catch {
      setClarifyError('Network error — could not reach the clarify service.')
    } finally {
      setClarifying(false)
    }
  }

  async function submitAnswersAndClassify() {
    if (!task || submittingAnswers) return
    setSubmittingAnswers(true)
    setClarifyError(null)
    try {
      await fetch('/api/command-centre/clarify/answers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, answers }),
      })
      const res = await fetch('/api/command-centre/classify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      })
      if (!res.ok) { setClarifyError(await readError(res, 'Could not classify the idea')); return }
      const data = (await res.json()) as { routing: RoutingView }
      setRouting(data.routing)
    } catch {
      setClarifyError('Network error — could not reach the classify service.')
    } finally {
      setSubmittingAnswers(false)
    }
  }

  // ── Software lane handlers ─────────────────────────────────────────────────

  async function planBuild() {
    if (!task || planningBuild) return
    setPlanningBuild(true)
    setSoftwareError(null)
    try {
      const res = await fetch('/api/command-centre/lanes/software/build', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      })
      if (!res.ok) { setSoftwareError(await readError(res, 'Could not plan the build')); return }
      const data = (await res.json()) as SoftwareBuildResponse
      if (data.result?.plan) {
        setSoftwarePlan(data.result.plan)
        setSoftwareStatus('planned')
      } else {
        setSoftwareError('The server accepted the request but returned no plan.')
      }
    } catch {
      setSoftwareError('Network error — could not reach the build service.')
    } finally {
      setPlanningBuild(false)
    }
  }

  async function handOffToBuild() {
    if (!task || handingOff || softwareStatus !== 'planned') return
    setHandingOff(true)
    setSoftwareError(null)
    try {
      const res = await fetch('/api/command-centre/lanes/software/handoff', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      })
      if (!res.ok) { setSoftwareError(await readError(res, 'Hand-off failed')); return }
      const data = (await res.json()) as SoftwareHandoffResponse
      if (data.result?.status === 'handed_off') {
        setSoftwareStatus('handed_off')
      } else {
        setSoftwareError('Hand-off returned an unexpected state.')
      }
    } catch {
      setSoftwareError('Network error — could not reach the hand-off service.')
    } finally {
      setHandingOff(false)
    }
  }

  const canSubmit = idea.trim().length > 0 && !submitting
  const canConvene = task !== null && !convening && !submitting

  return (
    <div id="idea-console" className={styles.console}>
      {/* ── Intake column ──────────────────────────────────────────────── */}
      <form className={styles.intake} onSubmit={submitIdea}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={ideaFieldId}>
            Tell Hermes an idea…
          </label>
          <textarea
            ref={textareaRef}
            id={ideaFieldId}
            className={styles.textarea}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe the idea in your own words. It becomes a proposed task — nothing runs until the Board approves it."
            disabled={submitting}
            aria-describedby={intakeError ? `${ideaFieldId}-error` : undefined}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={projectFieldId}>
            Project (optional)
          </label>
          <select
            id={projectFieldId}
            className={styles.select}
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            disabled={submitting}
          >
            <option value="">Platform (unassigned)</option>
            {projects.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submit} disabled={!canSubmit}>
            {submitting && <span className={styles.spinner} aria-hidden="true" />}
            {submitting ? 'Submitting…' : 'Submit idea'}
          </button>
          <button
            type="button"
            className={styles.board}
            onClick={conveneBoard}
            disabled={!canConvene}
            title={task ? 'Run the 9-persona Board on this idea' : 'Submit an idea first'}
          >
            {convening && <span className={styles.spinner} aria-hidden="true" />}
            {convening ? 'Convening…' : 'Convene Board'}
          </button>
        </div>

        <p className={styles.hint}>
          Ideas are recorded as proposed tasks — the Board gates promotion.
        </p>

        {intakeError && (
          <div id={`${ideaFieldId}-error`} className={styles.error} role="alert">
            {intakeError}
          </div>
        )}
      </form>

      {/* ── Readout column ─────────────────────────────────────────────── */}
      <div className={styles.readout} aria-live="polite">
        {!task && !intakeError && (
          <div className={styles.placeholder}>
            Awaiting an idea — the proposed task will appear here.
          </div>
        )}

        {task && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>{task.title}</span>
              <span className={styles.chip}>{task.status}</span>
            </div>
            <span className={styles.taskId}>id · {task.id}</span>
          </div>
        )}

        {/* ── Clarify / route panel ───────────────────────────────────── */}
        {task && !questions && !routing && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.board}
              onClick={requestClarify}
              disabled={clarifying}
              aria-label="Clarify"
            >
              {clarifying && <span className={styles.spinner} aria-hidden="true" />}
              {clarifying ? 'Clarifying…' : 'Clarify'}
            </button>
          </div>
        )}

        {questions !== null && !routing && (
          <div className={styles.verdict}>
            {questions.length === 0 ? (
              <p className={styles.rationale}>
                No questions — the idea is clear enough to route directly.
              </p>
            ) : (
              <>
                <span className={styles.subhead}>Clarifying questions</span>
                <ul className={styles.personaList}>
                  {questions.map((q) => (
                    <li key={q} className={styles.persona}>
                      <span className={styles.personaBody}>
                        <label className={styles.personaName} htmlFor={`clarify-q-${q}`}>{q}</label>
                        <input
                          id={`clarify-q-${q}`}
                          aria-label={q}
                          className={styles.textarea}
                          value={answers[q] ?? ''}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
                          style={{ minHeight: 'unset', resize: 'none' }}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.submit}
                    onClick={submitAnswersAndClassify}
                    disabled={submittingAnswers}
                    aria-label="Submit answers"
                  >
                    {submittingAnswers && <span className={styles.spinner} aria-hidden="true" />}
                    {submittingAnswers ? 'Submitting…' : 'Submit answers'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {clarifyError && (
          <div className={styles.error} role="alert">
            {clarifyError}
          </div>
        )}

        {routing && (
          <div className={styles.verdict}>
            <div className={styles.verdictHead}>
              <span className={styles.verdictBadge} data-verdict="APPROVED">
                {routing.lane}
              </span>
              <span className={styles.subhead}>
                Routed · {Math.round(routing.confidence * 100)}% confidence
              </span>
            </div>

            {routing.rationale && (
              <p className={styles.rationale}>{routing.rationale}</p>
            )}

            {routing.planBuild.length > 0 && (
              <>
                <span className={styles.subhead}>Build steps</span>
                <ul className={styles.subList}>
                  {routing.planBuild.map((step, i) => (
                    <li key={step.title} className={styles.subItem}>
                      <span className={styles.subIndex}>{String(i + 1).padStart(2, '0')}</span>
                      <span className={styles.subTitle}>{step.title}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {routing.planDistribute.length > 0 && (
              <>
                <span className={styles.subhead}>Distribute steps</span>
                <ul className={styles.subList}>
                  {routing.planDistribute.map((step, i) => (
                    <li key={step.title} className={styles.subItem}>
                      <span className={styles.subIndex}>{String(i + 1).padStart(2, '0')}</span>
                      <span className={styles.subTitle}>{step.title}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {routing.lane === 'software' ? (
              // ── Software lane: plan + gated hand-off ──────────────────────
              <div className={styles.actions} style={{ flexDirection: 'column', gap: '0.75rem' }}>
                {/* PR brief — shown after planning */}
                {softwarePlan && softwareStatus !== 'handed_off' && (
                  <div className={styles.verdict}>
                    <span className={styles.cardTitle}>{softwarePlan.title}</span>
                    <p className={styles.rationale}>{softwarePlan.summary}</p>
                    {softwarePlan.acceptanceCriteria.length > 0 && (
                      <>
                        <span className={styles.subhead}>Acceptance criteria</span>
                        <ul className={styles.subList}>
                          {softwarePlan.acceptanceCriteria.map((c, i) => (
                            <li key={c} className={styles.subItem}>
                              <span className={styles.subIndex}>{String(i + 1).padStart(2, '0')}</span>
                              <span className={styles.subTitle}>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {softwarePlan.steps.length > 0 && (
                      <>
                        <span className={styles.subhead}>Build steps</span>
                        <ul className={styles.subList}>
                          {softwarePlan.steps.map((s, i) => (
                            <li key={s} className={styles.subItem}>
                              <span className={styles.subIndex}>{String(i + 1).padStart(2, '0')}</span>
                              <span className={styles.subTitle}>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                {/* Handed-off confirmation */}
                {softwareStatus === 'handed_off' && (
                  <p className={styles.rationale}>
                    Handed off — ready for build
                  </p>
                )}

                {/* Software error */}
                {softwareError && (
                  <div className={styles.error} role="alert">
                    {softwareError}
                  </div>
                )}

                {/* Action row */}
                {softwareStatus !== 'handed_off' && (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.submit}
                      onClick={planBuild}
                      disabled={planningBuild || softwareStatus === 'planned'}
                      aria-label="Plan build"
                    >
                      {planningBuild && <span className={styles.spinner} aria-hidden="true" />}
                      {planningBuild ? 'Planning…' : 'Plan build'}
                    </button>
                    <button
                      type="button"
                      className={styles.board}
                      onClick={handOffToBuild}
                      disabled={softwareStatus !== 'planned' || handingOff}
                      aria-label="Hand off to build"
                    >
                      {handingOff && <span className={styles.spinner} aria-hidden="true" />}
                      {handingOff ? 'Handing off…' : 'Hand off to build'}
                    </button>
                  </div>
                )}

                {/* Honest helper text — always visible in software lane */}
                {softwareStatus !== 'handed_off' && (
                  <p className={styles.hint}>
                    Actual code build runs externally — this hands the brief to the build queue.
                  </p>
                )}
              </div>
            ) : (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.board}
                  disabled
                  aria-label={`Approve & build — ${routing.lane} lane pending`}
                >
                  Approve &amp; build — {routing.lane} lane pending
                </button>
              </div>
            )}
          </div>
        )}

        {boardError && (
          <div className={styles.error} role="alert">
            {boardError}
          </div>
        )}

        {board && (
          <div className={styles.verdict}>
            <div className={styles.verdictHead}>
              <span className={styles.verdictBadge} data-verdict={board.verdict}>
                {board.verdict}
              </span>
              <span className={styles.subhead}>Senior Board verdict</span>
            </div>

            {rationale && <p className={styles.rationale}>{rationale}</p>}

            {board.personas.length > 0 && (
              <ul className={styles.personaList}>
                {board.personas.map((p) => (
                  <li key={p.persona} className={styles.persona}>
                    <span className={styles.personaDot} data-stance={p.stance} aria-hidden="true" />
                    <span className={styles.personaBody}>
                      <span className={styles.personaName}>
                        {p.persona} · {p.stance}
                      </span>
                      <span className={styles.personaComment}>{p.comment}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {board.verdict === 'APPROVED' && (
              <>
                <span className={styles.subhead}>
                  Generated sub-tasks · {board.subtasks.length}
                </span>
                {board.subtasks.length > 0 ? (
                  <ul className={styles.subList}>
                    {board.subtasks.map((s, i) => (
                      <li key={s.id} className={styles.subItem}>
                        <span className={styles.subIndex}>{String(i + 1).padStart(2, '0')}</span>
                        <span className={styles.subTitle}>{s.title}</span>
                        <span className={styles.chip}>{s.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.personaComment}>
                    Approved, but no sub-tasks were generated.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

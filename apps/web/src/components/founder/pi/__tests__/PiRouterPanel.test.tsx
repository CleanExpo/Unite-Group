import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PiRouterPanel } from '../PiRouterPanel'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('PiRouterPanel workflow visibility', () => {
  it('surfaces Pi-Dev-Ops Dynamic Workflow evidence in the control rail', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          summary: { total: 0, queued: 0, waitingForApproval: 0, waitingForDevice: 0, inProgress: 0, blocked: 0, completed: 0 },
          enforcement: {
            mode: 'continue_until_complete',
            openWorkCount: 1,
            blockedCount: 0,
            completedCount: 0,
            canOpenNextLane: false,
            requiredAction: 'Complete or block 1 open Pi run before opening the next build lane.',
            enforcedStatuses: ['queued', 'waiting_for_approval', 'waiting_for_device', 'in_progress'],
            openItemIds: ['run_task-1'],
          },
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflow: {
            workflowId: 'pi-dev-ops-dynamic-workflow-template',
            evidenceId: 'pi-dev-ops-dynamic-workflows-pathway-2026-06-02',
            status: 'complete',
            currentGate: 'finalise',
            changedFileCount: 4,
            verificationSummary: 'pnpm build: PASS',
            nextAction: 'Surface this workflow in Founder OS, then open the next gated build lane.',
            modelRoute: {
              planner: 'gpt-5.5-class',
              implementer: 'gpt-5.5-class',
              challenger: 'kimi-2.5-class',
              opusUltrathink: 'explicit Claude Code OAuth/subscription only',
            },
            requiresMargotReview: true,
            threeLoopRequired: true,
          },
        }),
      } as unknown as Response)

    render(<PiRouterPanel />)

    await waitFor(() => expect(screen.getByText('Senior engineer gate')).toBeInTheDocument())
    expect(screen.getByText('pi-dev-ops-dynamic-workflow-template')).toBeInTheDocument()
    expect(screen.getByText('finalise')).toBeInTheDocument()
    expect(screen.getByText('gpt-5.5-class')).toBeInTheDocument()
    expect(screen.getByText('kimi-2.5-class')).toBeInTheDocument()
    expect(screen.getByText('pnpm build: PASS')).toBeInTheDocument()
    expect(screen.getByText('Continue-until-complete enforcement')).toBeInTheDocument()
    expect(screen.getByText('Complete or block 1 open Pi run before opening the next build lane.')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// UNI-2479 — a failed read must not render as an empty queue, and must not arm
// the write path.
//
// The suite above drives the success path only, with two `mockResolvedValueOnce`
// in mount order (run-queue, then workflows). That is why the effect's call
// order must not be reordered. These cases route by URL instead, so they are
// order-independent and can fail one endpoint without touching the other.
//
// This surface is deliberately NOT in `STALE_FIXTURES`: `driveFixture` serves a
// single `ok` body for every URL, and this component reads two endpoints, so a
// fixture would feed the workflows read the queue payload and pass for the wrong
// reason. Per-component test instead, following boardroom/__tests__/DecisionLog.
// ─────────────────────────────────────────────────────────────────────────────

const QUEUE_ITEM = {
  id: 'run_task-1',
  status: 'waiting_for_approval',
  taskPacket: {
    portfolioTarget: 'unite-group',
    objective: 'Retained run objective',
    lane: 'software',
    taskType: 'build',
    riskLevel: 'low',
    requiredAgents: ['planner'],
  },
  contextPack: {
    id: 'ctx-1', taskId: 'task-1', portfolioTarget: 'unite-group',
    originalMessage: 'Retained run objective', durableSummary: 'Retained summary',
    constraints: ['founder-safe'], decisions: [], evidenceLinks: [], blockers: [],
    nextRecommendedAction: 'Await approval', modelHistory: [], receiptIds: [],
  },
  machineAssignment: { assignedDeviceName: 'mac-mini', assignedRole: 'implementer' },
  approvals: [],
  blockers: [],
  receipts: [],
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
}

const SUMMARY = {
  total: 7, queued: 2, waitingForApproval: 3, waitingForDevice: 1,
  inProgress: 1, blocked: 0, completed: 0,
}

const ENFORCEMENT = {
  mode: 'continue_until_complete', openWorkCount: 1, blockedCount: 0, completedCount: 0,
  canOpenNextLane: false, requiredAction: 'Complete or block 1 open Pi run.',
  enforcedStatuses: ['queued'], openItemIds: ['run_task-1'],
}

const WORKFLOW = {
  workflowId: 'pi-dev-ops-dynamic-workflow-template',
  evidenceId: 'ev-1', status: 'complete', currentGate: 'finalise', changedFileCount: 4,
  verificationSummary: 'pnpm build: PASS', nextAction: 'Open the next gated build lane.',
  modelRoute: { planner: 'gpt-5.5-class', implementer: 'gpt-5.5-class', challenger: 'kimi-2.5-class', opusUltrathink: 'oauth only' },
  requiresMargotReview: true, threeLoopRequired: true,
}

interface RouterMockOptions {
  queue?: 'ok' | 'notOk' | 'reject'
  workflows?: 'ok' | 'notOk' | 'reject'
  items?: unknown[]
  holdQueue?: boolean
}

function routerMock(opts: RouterMockOptions = {}) {
  const state = {
    queue: opts.queue ?? 'ok',
    workflows: opts.workflows ?? 'ok',
    items: opts.items ?? [QUEUE_ITEM],
    holdQueue: opts.holdQueue ?? false,
    releaseQueue: null as null | (() => void),
    transitionCalls: [] as string[],
  }

  const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
    const target = String(url)
    if (init?.method === 'POST') {
      if (target.includes('/transition')) {
        state.transitionCalls.push(target)
        return { ok: true, status: 200, json: async () => ({ queueItem: QUEUE_ITEM, receipt: null }) } as unknown as Response
      }
      return { ok: true, status: 200, json: async () => ({ queueItem: QUEUE_ITEM, receipt: null }) } as unknown as Response
    }
    if (target.includes('/api/pi/workflows')) {
      if (state.workflows === 'reject') throw new Error('network down')
      if (state.workflows === 'notOk') return { ok: false, status: 500, json: async () => ({}) } as unknown as Response
      return { ok: true, status: 200, json: async () => ({ workflow: WORKFLOW }) } as unknown as Response
    }
    // /api/pi/run-queue
    if (state.holdQueue) {
      await new Promise<void>((resolve) => { state.releaseQueue = resolve })
    }
    if (state.queue === 'reject') throw new Error('network down')
    if (state.queue === 'notOk') return { ok: false, status: 500, json: async () => ({}) } as unknown as Response
    return {
      ok: true, status: 200,
      json: async () => ({ items: state.items, summary: SUMMARY, enforcement: ENFORCEMENT }),
    } as unknown as Response
  })

  vi.stubGlobal('fetch', fetchMock)
  return state
}

function marked() {
  return document.querySelector('[data-stale-read="true"]')
}

// Scan buttons for the row, DecisionLog-style. `getByText` is unusable here:
// once a row is selected the right-hand rail renders the same objective string,
// so a text query matches twice and throws for a reason unrelated to the defect.
function rowButton() {
  return Array.from(document.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Retained run objective'),
  ) as HTMLButtonElement | undefined
}

describe('PiRouterPanel — a failed read is not an empty queue [UNI-2479]', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  // NEGATIVE CONTROL, first. Without it, a component that marked everything
  // stale and disabled every control would satisfy every failure assertion
  // below. This is also the behavioural baseline for the POST-count proof.
  it('leaves the queue live on a healthy read, and a transition issues exactly one POST', async () => {
    const state = routerMock()

    render(<PiRouterPanel />)
    await waitFor(() => expect(screen.getByText('Retained run objective')).toBeInTheDocument())

    expect(marked()).toBeNull()
    expect(screen.queryByText(/failed read, not an empty queue/i)).toBeNull()
    // Real counts from a real read.
    expect(screen.getByText('7')).toBeInTheDocument()

    const row = rowButton()
    expect(row).toBeDefined()
    expect(row!.disabled).toBe(false)
    fireEvent.click(row!)

    const approve = await screen.findByRole('button', { name: 'Approve' })
    expect(approve).not.toBeDisabled()
    fireEvent.click(approve)

    await waitFor(() => expect(state.transitionCalls.length).toBe(1))
  })

  // MUTATION CONTROL. Restore `if (!response.ok) return` in `loadQueue` and this
  // fails three independent ways: no alert, the fabricated empty state returns,
  // and the counts render 0 instead of '—'.
  it('announces a failed first read instead of rendering a confident empty queue', async () => {
    routerMock({ queue: 'notOk' })

    render(<PiRouterPanel />)

    await waitFor(() => {
      expect(screen.getByText(/failed read, not an empty queue/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/no queued pi tasks yet/i)).toBeNull()
    // Four fabricated zeroes replaced by an honest unknown.
    expect(screen.queryAllByText('—').length).toBeGreaterThanOrEqual(4)
    expect(screen.queryAllByText('0').length).toBe(0)
  })

  // The `void loadQueue()` call in the mount effect meant a rejection was an
  // unhandled promise rejection, not merely a swallowed error.
  it('handles a rejected read rather than leaving it unhandled', async () => {
    routerMock({ queue: 'reject' })

    render(<PiRouterPanel />)

    await waitFor(() => {
      expect(screen.getByText(/failed read, not an empty queue/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/no queued pi tasks yet/i)).toBeNull()
  })

  // NEGATIVE CONTROL for the empty state — a genuinely empty queue must still
  // say so, or "announce failure on every empty queue" would pass the cases above.
  it('still renders the empty state when the read succeeds with no items', async () => {
    routerMock({ items: [] })

    render(<PiRouterPanel />)

    await waitFor(() => {
      expect(screen.getByText(/no queued pi tasks yet/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/failed read, not an empty queue/i)).toBeNull()
    expect(marked()).toBeNull()
  })

  it('marks a retained queue on a failed refresh, takes the write path offline, and recovers', async () => {
    const state = routerMock()

    render(<PiRouterPanel />)
    await waitFor(() => expect(screen.getByText('Retained run objective')).toBeInTheDocument())

    // Select a row on the HEALTHY read, so the right-hand rail is armed before
    // the failure — otherwise the disabled assertions below would pass simply
    // because nothing was selected.
    fireEvent.click(rowButton()!)
    await screen.findByRole('button', { name: 'Approve' })

    state.queue = 'reject'
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() => expect(marked()).not.toBeNull())
    // Retained payload survives, marked rather than blanked.
    expect(rowButton()).toBeDefined()
    expect(document.querySelector('[data-stale-read-notice="true"]')).not.toBeNull()
    // Retained counts stay real but sit inside the marked region.
    expect(screen.getByText('7')).toBeInTheDocument()

    // INERT: the row that arms the write path, and every transition control.
    expect(rowButton()!.disabled).toBe(true)
    for (const name of ['Approve', 'Start', 'Block']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }

    // BEHAVIOURAL PROOF: clicking must not write, not merely look disabled.
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(marked()).not.toBeNull())
    expect(state.transitionCalls.length).toBe(0)

    // Stage 3: recovery clears the mark and re-enables the controls.
    state.queue = 'ok'
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    await waitFor(() => expect(marked()).toBeNull())
    expect(screen.getByRole('button', { name: 'Approve' })).not.toBeDisabled()
  })

  // The in-flight case. The fixture sweep catches clear-on-entry with its
  // stage-2b assertion; a per-component test has no such stage, so it is
  // written by hand. Moving either `setQueueError(null)` to loader entry fails
  // exactly this case.
  it('keeps the mark and the controls offline while a recovery read is in flight', async () => {
    const state = routerMock()

    render(<PiRouterPanel />)
    await waitFor(() => expect(screen.getByText('Retained run objective')).toBeInTheDocument())
    fireEvent.click(rowButton()!)
    await screen.findByRole('button', { name: 'Approve' })

    state.queue = 'reject'
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    await waitFor(() => expect(marked()).not.toBeNull())

    // Retry, holding the response open.
    state.queue = 'ok'
    state.holdQueue = true
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() => expect(state.releaseQueue).not.toBeNull())
    expect(marked()).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()

    state.holdQueue = false
    state.releaseQueue!()
    await waitFor(() => expect(marked()).toBeNull())
  })

  // The two reads hit different endpoints and must not share an error slot.
  // Merging them into one fails exactly this case.
  it('keeps the queue live when only the workflow read fails', async () => {
    routerMock({ workflows: 'reject' })

    render(<PiRouterPanel />)

    await waitFor(() => {
      expect(screen.getByText(/failed read, not an absent workflow/i)).toBeInTheDocument()
    })
    // The workflow failure must not contaminate the queue.
    expect(screen.queryByText(/failed read, not an empty queue/i)).toBeNull()
    expect(marked()).toBeNull()
    expect(rowButton()!.disabled).toBe(false)
    // …and it must not fabricate a workflow state either.
    expect(screen.queryByText(/workflow evidence not loaded yet/i)).toBeNull()
  })
})

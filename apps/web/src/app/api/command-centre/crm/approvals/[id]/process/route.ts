// src/app/api/command-centre/crm/approvals/[id]/process/route.ts
//
// UNI-2234 — CRM Mission Control approval-processing consumer (backend route,
// slice 2). POST an approval descriptor; the route runs the CRM lifecycle gate
// (evaluateCrmApprovalLifecycle) + the admission chokepoint (resolveCrmAdmission),
// journals the admission decision to the evidence ledger (write-then-confirm), and
// returns the Mission Control state. Auth-gated (getUser → 401); founder-scoped.
//
// DORMANT BY DESIGN: this route NEVER executes a CRM mutation. `dispatchEnabled`
// is always false — live dispatch (productionActionRequested) is a separate Board
// gate + founder go-live. With CRM_AUTO_EXECUTE unset (prod default) every approval
// resolves to needs-review, so this endpoint is behaviour-neutral. See
// docs/superpowers/specs/2026-07-09-crm-mission-control-system-of-action-design.md.

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import {
  evaluateCrmApprovalLifecycle,
  type CrmApprovalLifecycleInput,
} from '@/lib/crm/approval-lifecycle'
import { resolveCrmAdmission, buildCrmAdmissionEvidenceRow } from '@/lib/crm/mission-control-execution'
import { journalAutoExecution, type AutoExecuteSignals } from '@/lib/crm/auto-exec-matrix'
import {
  runCrmAutoExecution,
  isCrmDispatchArmed,
  resolveSubjectExecutor,
  type CrmExecutionResult,
} from '@/lib/crm/crm-auto-executor'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

  const subjectType = str(body.subjectType)
  if (!subjectType) {
    return NextResponse.json({ error: 'Field "subjectType" is required' }, { status: 400 })
  }

  // L1 auto-execution signals — only correctly-typed values are carried; the
  // matrix degrades a missing/wrong-typed signal to 'signal_unavailable'.
  const signals: AutoExecuteSignals = {}
  if (typeof body.confidence === 'number' && Number.isFinite(body.confidence)) signals.confidence = body.confidence
  if (typeof body.hasExistingClientLink === 'boolean') signals.hasExistingClientLink = body.hasExistingClientLink

  const now = str(body.now) ?? new Date().toISOString()
  const input: CrmApprovalLifecycleInput = {
    id,
    subjectType,
    requestedBy: str(body.requestedBy) ?? 'crm_approval',
    requestedAt: str(body.requestedAt) ?? now,
    now,
    status: str(body.status) ?? 'requested',
    expiresAt: str(body.expiresAt) ?? null,
    approvedBy: str(body.approvedBy) ?? null,
    approvalReference: str(body.approvalReference) ?? null,
    executedAt: str(body.executedAt) ?? null,
    rejectionReason: str(body.rejectionReason) ?? null,
    signals: Object.keys(signals).length > 0 ? signals : undefined,
  }

  try {
    const lifecycle = evaluateCrmApprovalLifecycle(input)
    const decision = resolveCrmAdmission(lifecycle)

    // Write-then-confirm: journal the admission decision after it is computed.
    // Best-effort (journalAutoExecution never throws) — a ledger failure must not
    // fail the founder's request. No CRM mutation is performed here.
    await journalAutoExecution(buildCrmAdmissionEvidenceRow(lifecycle, decision))

    // Execution stage — DORMANT. Only runs when the approval is admitted AND the
    // Board go-live flip (CRM_DISPATCH_ARMED) is on. Even when armed, the per-subject
    // executor registry is empty today, so no CRM mutation runs. In prod both gates
    // are off, so `execution` is null and behaviour is unchanged.
    let execution: CrmExecutionResult | null = null
    if (decision.admitted && isCrmDispatchArmed()) {
      const supa = await createClient()
      const executor = resolveSubjectExecutor(lifecycle.subjectType, {
        client: supa,
        founderId: user.id,
        subjectId: str(body.subjectId) ?? '',
      })
      execution = await runCrmAutoExecution(lifecycle, decision, executor, { journal: journalAutoExecution })
    }

    return NextResponse.json(
      {
        id,
        state: decision.state,
        admitted: decision.admitted,
        operatorStatus: decision.operatorStatus,
        reason: decision.reason,
        dispatchEnabled: decision.dispatchEnabled,
        execution,
        lifecycle: {
          decision: lifecycle.decision,
          normalizedStatus: lifecycle.normalizedStatus,
          autoExecuteReason: lifecycle.autoExecuteReason,
          requiresPhillReview: lifecycle.requiresPhillReview,
        },
      },
      { status: 200 },
    )
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'Failed to process CRM approval') },
      { status: 500 },
    )
  }
}

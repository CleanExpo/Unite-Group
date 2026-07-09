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
import { getUser } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import {
  evaluateCrmApprovalLifecycle,
  type CrmApprovalLifecycleInput,
} from '@/lib/crm/approval-lifecycle'
import { resolveCrmAdmission, buildCrmAdmissionEvidenceRow } from '@/lib/crm/mission-control-execution'
import { journalAutoExecution } from '@/lib/crm/auto-exec-matrix'

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
  }

  try {
    const lifecycle = evaluateCrmApprovalLifecycle(input)
    const decision = resolveCrmAdmission(lifecycle)

    // Write-then-confirm: journal the admission decision after it is computed.
    // Best-effort (journalAutoExecution never throws) — a ledger failure must not
    // fail the founder's request. No CRM mutation is performed here.
    await journalAutoExecution(buildCrmAdmissionEvidenceRow(lifecycle, decision))

    return NextResponse.json(
      {
        id,
        state: decision.state,
        admitted: decision.admitted,
        operatorStatus: decision.operatorStatus,
        reason: decision.reason,
        dispatchEnabled: decision.dispatchEnabled,
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

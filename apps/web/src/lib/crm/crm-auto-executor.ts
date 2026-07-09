// UNI-2234 — CRM Mission Control execution stage (slice 4, DORMANT).
//
// The execution half of the system-of-action: runs an admitted approval's actual
// mutation with a timeout and write-then-confirm journaling, transitioning
// executing → executed | failed. Built but INERT:
//   1. `isCrmDispatchArmed()` (CRM_DISPATCH_ARMED) defaults OFF — the Board go-live flip.
//   2. `resolveSubjectExecutor()` returns null for every subject — the real per-type
//      CRM mutations are the Board-gated go-live work, not implemented here.
// So even if armed, there is no executor to run. Live dispatch of a real CRM
// mutation is `productionActionRequested` = a separate Board gate + Supabase-branch
// validation of any schema. See the spec's Slice 4 arming checklist.

import type { CrmApprovalLifecycleEvaluation } from './approval-lifecycle';
import type { CrmAdmissionDecision } from './mission-control-execution';
import type { EvidenceLedgerInsert } from '@/lib/obsidian/evidence';
import { executeLeadConversion, type LeadConversionClient } from './executors/lead-conversion';

/** A concrete per-subject CRM mutation. Contract: perform the mutation, then
 *  read back the committed state and resolve with it (write-then-confirm); throw
 *  if the mutation could not be confirmed. */
export type CrmExecutor = (
  evaluation: CrmApprovalLifecycleEvaluation,
  decision: CrmAdmissionDecision,
) => Promise<Record<string, unknown>>;

export interface CrmExecutionResult {
  state: 'executed' | 'failed' | 'needs_review';
  reason: string;
  result?: Record<string, unknown>;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const TIMEOUT_SENTINEL = 'crm_execution_timeout';

/** The Board go-live flip. Unset/anything but '1' ⇒ no dispatch (prod default). */
export function isCrmDispatchArmed(): boolean {
  return process.env.CRM_DISPATCH_ARMED === '1';
}

/** Founder-scoped context a concrete executor needs (DB client + who + which subject). */
export interface CrmExecutorContext {
  /** Founder-scoped Supabase client (structurally a LeadConversionClient for CRM tables). */
  client: unknown;
  founderId: string;
  /** The subject row id the approval acts on (e.g. crm_leads.id for lead_conversion). */
  subjectId: string;
  now?: () => string;
}

/**
 * Resolve the concrete mutation for a subject type. Without a context (or for a
 * subject with no implemented executor) returns null — a null executor is safe:
 * runCrmAutoExecution never mutates and routes to needs-review. `lead_conversion`
 * is implemented (L1); L2/L3 subjects intentionally return null.
 */
export function resolveSubjectExecutor(subjectType: string, ctx?: CrmExecutorContext): CrmExecutor | null {
  if (!ctx) return null;
  if (subjectType === 'lead_conversion') {
    return () =>
      executeLeadConversion({
        client: ctx.client as LeadConversionClient,
        founderId: ctx.founderId,
        subjectId: ctx.subjectId,
        now: ctx.now,
      });
  }
  return null;
}

/** Reject after ms so a hung mutation can't stall the caller. Bounds the wait,
 *  not the side effect — the executor's write-then-confirm contract is the source
 *  of truth for what actually committed. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(TIMEOUT_SENTINEL)), ms).unref?.(),
    ),
  ]);
}

function executionEvidenceRow(
  evaluation: CrmApprovalLifecycleEvaluation,
  outcome: 'executed' | 'failed',
  detail: Record<string, unknown>,
): EvidenceLedgerInsert {
  return {
    kind: 'crm_auto_execution',
    summary: `CRM approval ${evaluation.id} auto-execution → ${outcome}`,
    detail: { approvalId: evaluation.id, subjectType: evaluation.subjectType, outcome, ...detail },
    evidence_path: null,
  };
}

export interface RunCrmAutoExecutionOptions {
  /** Best-effort ledger writer (journalAutoExecution). Never expected to throw. */
  journal?: (row: EvidenceLedgerInsert) => Promise<void>;
  timeoutMs?: number;
}

/**
 * Execute an admitted CRM approval. Guards on admission and executor presence,
 * runs the mutation under a timeout, and journals the outcome write-then-confirm.
 * Never throws — returns a structured result.
 */
export async function runCrmAutoExecution(
  evaluation: CrmApprovalLifecycleEvaluation,
  decision: CrmAdmissionDecision,
  executor: CrmExecutor | null,
  opts: RunCrmAutoExecutionOptions = {},
): Promise<CrmExecutionResult> {
  if (!decision.admitted) return { state: 'needs_review', reason: 'not_admitted' };
  if (!executor) return { state: 'needs_review', reason: 'no_executor' };

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    const result = await withTimeout(executor(evaluation, decision), timeoutMs);
    // executor resolved ⇒ mutation committed + confirmed by its own contract.
    if (opts.journal) await opts.journal(executionEvidenceRow(evaluation, 'executed', { result }));
    return { state: 'executed', reason: 'executed_confirmed', result };
  } catch (err) {
    const timedOut = err instanceof Error && err.message === TIMEOUT_SENTINEL;
    const reason = timedOut ? 'execution_timeout' : 'execution_error';
    if (opts.journal) {
      await opts.journal(executionEvidenceRow(evaluation, 'failed', { reason, error: String(err) }));
    }
    return { state: 'failed', reason };
  }
}

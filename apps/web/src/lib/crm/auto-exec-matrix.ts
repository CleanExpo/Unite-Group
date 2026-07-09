// UNI-2234 — Founder-approved auto-execution risk matrix.
//
// Decides whether a CRM approval subject type is safe to auto-execute
// without Phill/Board sign-off, and returns a machine-readable reason for
// every decision (never a bare boolean).
//
// Master kill switch: the `CRM_AUTO_EXECUTE` env var. Unset or anything
// other than the literal string '1' means every evaluation returns
// `safe: false` with reason 'kill_switch_off' — today's behaviour is the
// default; auto-execution must be explicitly opted into per-environment.
//
// Consumers: when `evaluateAutoExecute(...)` returns `safe: true`, the
// call site MUST call `journalAutoExecution(row)` (exported below) so the
// auto-execution is recorded in the evidence ledger. No current consumer
// acts on a `safe: true` result yet (see approval-lifecycle.ts, which is
// wired for the reason string but has no execution consumer) — wiring the
// journal call is the responsibility of whichever consumer actually
// performs the auto-execution.

import { insertEvidenceLedgerRow, type EvidenceLedgerInsert } from '@/lib/obsidian/evidence';

export type AutoExecuteSubjectType =
  | 'lead_conversion'
  | 'opportunity_commitment'
  | 'client_merge'
  | 'data_export'
  | 'other';

export type AutoExecuteTier = 'L0' | 'L1' | 'L2' | 'L3';

/**
 * Signals the caller has available to evaluate a tier's conditions.
 * Every field is optional: a missing/non-matching-type signal degrades the
 * tier to not-safe with reason 'signal_unavailable' rather than guessing.
 */
export interface AutoExecuteSignals {
  /** lead_conversion (L1): confidence score on a 0–1 scale, if the caller has one. */
  confidence?: number | null;
  /** lead_conversion (L1): true if the lead is already linked to an existing client record. */
  hasExistingClientLink?: boolean | null;
  /** opportunity_commitment (L2): deal value in AUD. */
  value?: number | null;
  /** opportunity_commitment (L2): true only when the stage move is forward-only (no regression). */
  isForwardOnlyStageMove?: boolean | null;
}

export interface AutoExecuteResult {
  safe: boolean;
  tier: AutoExecuteTier;
  reason: string;
}

export interface AutoExecuteMatrixEntry {
  tier: AutoExecuteTier;
  /** Whether this tier is allowed to auto-execute at all, independent of the kill switch. */
  enabled: boolean;
  description: string;
}

/** Tunables for the tier conditions. Not env-driven — code constants per the approved matrix. */
export const AUTO_EXEC_CONFIG: {
  l2_enabled: boolean;
  l1_confidence_threshold: number;
  l2_max_value: number;
} = {
  /** L2 (opportunity_commitment) is deactivated for the 2-week L1 proving window. */
  l2_enabled: false,
  /** L1 (lead_conversion): minimum confidence, 0–1 scale, required alongside no existing client link. */
  l1_confidence_threshold: 0.8,
  /** L2 (opportunity_commitment): maximum deal value (AUD) eligible for auto-execution. */
  l2_max_value: 500,
};

export const AUTO_EXEC_MATRIX: Record<AutoExecuteSubjectType, AutoExecuteMatrixEntry> = {
  lead_conversion: {
    tier: 'L1',
    enabled: true,
    description: 'Safe when confidence >= l1_confidence_threshold AND no existing client link.',
  },
  opportunity_commitment: {
    tier: 'L2',
    enabled: AUTO_EXEC_CONFIG.l2_enabled,
    description: 'Safe when value <= l2_max_value AND the stage move is forward-only. Disabled at launch (l2_enabled: false).',
  },
  client_merge: {
    tier: 'L3',
    enabled: false,
    description: 'High-risk — never auto-executes.',
  },
  data_export: {
    tier: 'L3',
    enabled: false,
    description: 'High-risk — never auto-executes.',
  },
  other: {
    tier: 'L0',
    enabled: false,
    description: 'Advise only — never auto-executes.',
  },
};

function isKillSwitchOn(): boolean {
  return process.env.CRM_AUTO_EXECUTE === '1';
}

function tierForSubjectType(subjectType: string): AutoExecuteTier {
  const entry = AUTO_EXEC_MATRIX[subjectType as AutoExecuteSubjectType];
  return entry ? entry.tier : 'L0';
}

/**
 * Evaluate whether a CRM approval subject is safe to auto-execute.
 * Never guesses: a required signal that is missing or the wrong type
 * degrades the result to `safe: false, reason: 'signal_unavailable'`.
 */
export function evaluateAutoExecute(
  subjectType: AutoExecuteSubjectType | string,
  signals: AutoExecuteSignals = {},
): AutoExecuteResult {
  const tier = tierForSubjectType(subjectType);

  if (!isKillSwitchOn()) {
    return { safe: false, tier, reason: 'kill_switch_off' };
  }

  if (tier === 'L3') {
    return { safe: false, tier, reason: 'high_risk_never_auto' };
  }

  if (tier === 'L0') {
    return { safe: false, tier, reason: 'advise_only' };
  }

  if (tier === 'L2') {
    if (!AUTO_EXEC_CONFIG.l2_enabled) {
      return { safe: false, tier, reason: 'l2_disabled' };
    }

    const { value, isForwardOnlyStageMove } = signals;
    if (typeof value !== 'number' || typeof isForwardOnlyStageMove !== 'boolean') {
      return { safe: false, tier, reason: 'signal_unavailable' };
    }

    if (value > AUTO_EXEC_CONFIG.l2_max_value) {
      return { safe: false, tier, reason: 'l2_value_exceeds_threshold' };
    }
    if (!isForwardOnlyStageMove) {
      return { safe: false, tier, reason: 'l2_not_forward_only' };
    }
    return { safe: true, tier, reason: 'l2_value_and_stage_ok' };
  }

  // tier === 'L1'
  const { confidence, hasExistingClientLink } = signals;
  if (typeof confidence !== 'number' || typeof hasExistingClientLink !== 'boolean') {
    return { safe: false, tier, reason: 'signal_unavailable' };
  }

  if (confidence < AUTO_EXEC_CONFIG.l1_confidence_threshold) {
    return { safe: false, tier, reason: 'l1_confidence_below_threshold' };
  }
  if (hasExistingClientLink) {
    return { safe: false, tier, reason: 'l1_existing_client_link' };
  }
  return { safe: true, tier, reason: 'l1_confidence_and_no_link_ok' };
}

/**
 * Journal an auto-execution to the evidence ledger. Callers MUST invoke this
 * whenever `evaluateAutoExecute` returns `safe: true` and the execution
 * actually happens. Best-effort: never throws — a failure here must never
 * block or fail the caller's execution flow.
 */
export async function journalAutoExecution(row: EvidenceLedgerInsert): Promise<void> {
  try {
    await insertEvidenceLedgerRow(row);
  } catch (err) {
    console.error('journalAutoExecution: evidence_ledger write failed (best-effort, ignored)', err);
  }
}

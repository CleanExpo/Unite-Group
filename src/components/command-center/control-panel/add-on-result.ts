// Action contract for the Hermes add-on approval button. Per UNI-2025, every
// CTA must declare: intent, target system, preconditions, success state,
// failure state. This module is the single source of truth for those four —
// the panel renders whatever this function returns and does not interpret
// raw HTTP codes or JSON error strings itself.
//
// The API surface (`src/app/api/command-center/control-panel/add-ons/route.ts`)
// emits these responses:
//   200 { ok: true, existing: true,  crm_task_id, task_status, requested_at }
//   200 { ok: true, existing: false, crm_task_id, task_status, requested_at }
//   400 { error: 'invalid_json' }              — malformed POST body
//   400 { error: 'invalid_add_on' }            — addOnId not in registry
//   401 { error: 'unauthorized' }              — no Supabase session
//   403 { error: 'forbidden' }                 — session, wrong email
//   500 { error: 'crm_lookup_failed' }         — Supabase SELECT errored
//   500 { error: 'crm_task_insert_failed' }    — Supabase INSERT errored
//   503 { error: 'crm_not_configured' }        — UNITE_CRM_WORKSPACE_ID unset
//   503 { error: 'crm_unavailable' }           — Supabase fetch threw

export type AddOnOutcomeKind =
  | 'created'
  | 'already_pending'
  | 'unauthorized'
  | 'forbidden'
  | 'invalid_request'
  | 'crm_not_configured'
  | 'crm_unavailable'
  | 'crm_lookup_failed'
  | 'crm_insert_failed'
  | 'network'
  | 'unknown';

export interface AddOnOutcome {
  kind: AddOnOutcomeKind;
  ok: boolean;
  title: string;
  message: string;
  nextAction: string;
  crmTaskId?: string;
  crmTaskStatus?: string;
}

interface SuccessBody {
  ok: true;
  existing: boolean;
  crm_task_id: string;
  task_status: string;
  requested_at?: string;
}

export function mapAddOnResult(
  status: number | null,
  body: unknown,
  addOnLabel: string,
): AddOnOutcome {
  // Success path — the API returned 2xx with an ok envelope.
  if (status === 200 && isSuccessBody(body)) {
    if (body.existing) {
      return {
        kind: 'already_pending',
        ok: true,
        title: 'Already pending in Unite CRM',
        message: `An approval task for "${addOnLabel}" is already open in Unite CRM (status: ${body.task_status}).`,
        nextAction: `Open Unite CRM task ${body.crm_task_id} to review or comment.`,
        crmTaskId: body.crm_task_id,
        crmTaskStatus: body.task_status,
      };
    }
    return {
      kind: 'created',
      ok: true,
      title: 'Approval task created in Unite CRM',
      message: `Task "${addOnLabel}" is now in Unite CRM with status: ${body.task_status}. Phill must approve before the add-on goes live.`,
      nextAction: `Open Unite CRM task ${body.crm_task_id} when ready to review.`,
      crmTaskId: body.crm_task_id,
      crmTaskStatus: body.task_status,
    };
  }

  const code = errorCode(body);

  if (status === 401 || code === 'unauthorized') {
    return {
      kind: 'unauthorized',
      ok: false,
      title: 'Sign in required',
      message: 'Your Command Center session expired before the approval task could be filed.',
      nextAction: 'Sign in again, then retry the request.',
    };
  }
  if (status === 403 || code === 'forbidden') {
    return {
      kind: 'forbidden',
      ok: false,
      title: 'Account not authorised',
      message: 'You are signed in, but this account is not on the operator allow-list.',
      nextAction: 'Switch to an admin account in /en/login.',
    };
  }
  if (status === 400 || code === 'invalid_json' || code === 'invalid_add_on') {
    return {
      kind: 'invalid_request',
      ok: false,
      title: 'Invalid add-on request',
      message: 'The add-on ID was not recognised by the server.',
      nextAction: 'Reload the panel and try again. If it persists, the add-on registry is out of sync with the deployed build.',
    };
  }
  if (status === 503 && code === 'crm_not_configured') {
    return {
      kind: 'crm_not_configured',
      ok: false,
      title: 'Unite CRM not configured',
      message: 'The server is missing UNITE_CRM_WORKSPACE_ID, so the task cannot be filed.',
      nextAction: 'Set UNITE_CRM_WORKSPACE_ID in Vercel env, then redeploy.',
    };
  }
  if (status === 503 || code === 'crm_unavailable') {
    return {
      kind: 'crm_unavailable',
      ok: false,
      title: 'Unite CRM unreachable',
      message: 'The Supabase request for Unite CRM failed (network or service outage).',
      nextAction: 'Check Supabase status, then retry in a minute.',
    };
  }
  if (code === 'crm_lookup_failed') {
    return {
      kind: 'crm_lookup_failed',
      ok: false,
      title: 'Unite CRM lookup failed',
      message: 'Supabase returned an error when checking for an existing approval task.',
      nextAction: 'Check Supabase logs for the latest read on the `tasks` table, then retry.',
    };
  }
  if (code === 'crm_task_insert_failed') {
    return {
      kind: 'crm_insert_failed',
      ok: false,
      title: 'Unite CRM insert failed',
      message: 'Supabase rejected the new approval-task row.',
      nextAction: 'Check Supabase logs for the latest write on the `tasks` table, then retry.',
    };
  }
  if (status === null) {
    return {
      kind: 'network',
      ok: false,
      title: 'Network error',
      message: 'The browser could not reach the Command Center API.',
      nextAction: 'Check your connection, then retry the request.',
    };
  }
  return {
    kind: 'unknown',
    ok: false,
    title: 'Approval task could not be filed',
    message: 'The add-ons endpoint returned an unexpected response.',
    nextAction: 'Retry. If it persists, check server logs for the request ID.',
  };
}

function isSuccessBody(value: unknown): value is SuccessBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.ok === true &&
    typeof v.crm_task_id === 'string' &&
    typeof v.task_status === 'string'
  );
}

function errorCode(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  return typeof v.error === 'string' ? v.error : null;
}

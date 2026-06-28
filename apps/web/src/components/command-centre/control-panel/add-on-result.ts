// Action contract for the add-on approval button. Every CTA declares its
// intent, target system, preconditions, success state and failure state.
// The panel renders whatever this function returns and does not interpret raw
// HTTP codes or JSON error strings itself.
//
// The API surface (src/app/api/command-centre/control-panel/add-ons/route.ts)
// emits these responses:
//   200 { ok: true, existing: true,  cc_task_id, task_status, requested_at }
//   200 { ok: true, existing: false, cc_task_id, task_status, requested_at }
//   400 { error: 'invalid_json' }            — malformed POST body
//   400 { error: 'invalid_add_on' }          — addOnId not in registry
//   401 { error: 'unauthorized' }            — no Supabase session
//   500 { error: 'cc_lookup_failed' }        — cc_tasks read errored
//   500 { error: 'cc_task_insert_failed' }   — cc_tasks insert errored

export type AddOnOutcomeKind =
  | 'created'
  | 'already_pending'
  | 'unauthorized'
  | 'invalid_request'
  | 'cc_unavailable'
  | 'cc_lookup_failed'
  | 'cc_insert_failed'
  | 'network'
  | 'unknown'

export interface AddOnOutcome {
  kind: AddOnOutcomeKind
  ok: boolean
  title: string
  message: string
  nextAction: string
  ccTaskId?: string
  ccTaskStatus?: string
}

interface SuccessBody {
  ok: true
  existing: boolean
  cc_task_id: string
  task_status: string
  requested_at?: string
}

export function mapAddOnResult(
  status: number | null,
  body: unknown,
  addOnLabel: string,
): AddOnOutcome {
  if (status === 200 && isSuccessBody(body)) {
    if (body.existing) {
      return {
        kind: 'already_pending',
        ok: true,
        title: 'Already pending in the command centre',
        message: `An approval task for "${addOnLabel}" is already open (status: ${body.task_status}).`,
        nextAction: `Open command-centre task ${body.cc_task_id} to review or comment.`,
        ccTaskId: body.cc_task_id,
        ccTaskStatus: body.task_status,
      }
    }
    return {
      kind: 'created',
      ok: true,
      title: 'Approval task created',
      message: `Task "${addOnLabel}" is now in the command centre with status: ${body.task_status}. The founder must approve before the add-on goes live.`,
      nextAction: `Open command-centre task ${body.cc_task_id} when ready to review.`,
      ccTaskId: body.cc_task_id,
      ccTaskStatus: body.task_status,
    }
  }

  const code = errorCode(body)

  if (status === 401 || code === 'unauthorized') {
    return {
      kind: 'unauthorized',
      ok: false,
      title: 'Sign in required',
      message: 'Your session expired before the approval task could be filed.',
      nextAction: 'Sign in again, then retry the request.',
    }
  }
  if (status === 400 || code === 'invalid_json' || code === 'invalid_add_on') {
    return {
      kind: 'invalid_request',
      ok: false,
      title: 'Invalid add-on request',
      message: 'The add-on ID was not recognised by the server.',
      nextAction: 'Reload the panel and try again. If it persists, the add-on registry is out of sync with the deployed build.',
    }
  }
  if (code === 'cc_lookup_failed') {
    return {
      kind: 'cc_lookup_failed',
      ok: false,
      title: 'Command-centre lookup failed',
      message: 'Supabase returned an error when checking for an existing approval task.',
      nextAction: 'Check Supabase logs for the latest read on cc_tasks, then retry.',
    }
  }
  if (code === 'cc_task_insert_failed') {
    return {
      kind: 'cc_insert_failed',
      ok: false,
      title: 'Command-centre insert failed',
      message: 'Supabase rejected the new approval-task row.',
      nextAction: 'Check Supabase logs for the latest write on cc_tasks, then retry.',
    }
  }
  if (status === 503 || code === 'cc_unavailable') {
    return {
      kind: 'cc_unavailable',
      ok: false,
      title: 'Command centre unreachable',
      message: 'The Supabase request failed (network or service outage).',
      nextAction: 'Check Supabase status, then retry in a minute.',
    }
  }
  if (status === null) {
    return {
      kind: 'network',
      ok: false,
      title: 'Network error',
      message: 'The browser could not reach the Command Center API.',
      nextAction: 'Check your connection, then retry the request.',
    }
  }
  return {
    kind: 'unknown',
    ok: false,
    title: 'Approval task could not be filed',
    message: 'The add-ons endpoint returned an unexpected response.',
    nextAction: 'Retry. If it persists, check server logs for the request ID.',
  }
}

function isSuccessBody(value: unknown): value is SuccessBody {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.ok === true && typeof v.cc_task_id === 'string' && typeof v.task_status === 'string'
}

function errorCode(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  return typeof v.error === 'string' ? v.error : null
}

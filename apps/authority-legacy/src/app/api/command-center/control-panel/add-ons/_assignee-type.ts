// Schema-pinned enum for tasks.assignee_type — mirrors the prod CHECK
// constraint on public.tasks (types/supabase.ts ~88486-88503). The constraint
// is `assignee_type = ANY (ARRAY['self', 'agent', 'staff', 'client'])`. Any
// value outside this set is rejected by Postgres with a CHECK violation,
// which surfaces in the Add-on registry approval flow as
// "Unite CRM insert failed" (mapAddOnResult → crm_insert_failed).
//
// The add-on approval flow assigns the task to the founder for self-review,
// so the canonical value is 'self'. Pre-fix the route hardcoded 'human',
// which is not in the enum — that was the bug.

export const TASK_ASSIGNEE_TYPES = ['self', 'agent', 'staff', 'client'] as const;
export type TaskAssigneeType = (typeof TASK_ASSIGNEE_TYPES)[number];

export const ADD_ON_ASSIGNEE_TYPE: TaskAssigneeType = 'self';

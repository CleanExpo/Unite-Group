// Regression-pin for the Add-on registry tasks-insert shape.
//
// Background: the route at /api/command-center/control-panel/add-ons used to
// hardcode `assignee_type: 'human'`, which violates the prod-schema CHECK
// constraint `assignee_type = ANY (ARRAY['self', 'agent', 'staff', 'client'])`.
// Every approval click landed on Supabase's CHECK rejection and the founder
// saw "Unite CRM insert failed" — see mapAddOnResult → crm_insert_failed.
//
// This test pins the new constant + enum so a future change can't
// silently re-introduce the bug.

import {
  ADD_ON_ASSIGNEE_TYPE,
  TASK_ASSIGNEE_TYPES,
} from '../add-ons/_assignee-type';

describe('Add-on approval — tasks.assignee_type shape', () => {
  it('matches the prod-schema CHECK enum verbatim', () => {
    expect([...TASK_ASSIGNEE_TYPES]).toEqual([
      'self',
      'agent',
      'staff',
      'client',
    ]);
  });

  it('the chosen ADD_ON_ASSIGNEE_TYPE is in the enum', () => {
    expect(TASK_ASSIGNEE_TYPES).toContain(ADD_ON_ASSIGNEE_TYPE);
  });

  it("is 'self' (founder self-approval) — not 'human' (the bug pre-fix)", () => {
    expect(ADD_ON_ASSIGNEE_TYPE).toBe('self');
    expect(ADD_ON_ASSIGNEE_TYPE).not.toBe('human');
  });
});

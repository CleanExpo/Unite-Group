import { mapAddOnResult } from '../add-on-result';

const LABEL = 'CCW kanban sync';

describe('mapAddOnResult — success path', () => {
  it('renders "created" outcome with task ID + status when existing=false', () => {
    const r = mapAddOnResult(
      200,
      { ok: true, existing: false, crm_task_id: 'task_123', task_status: 'blocked' },
      LABEL,
    );
    expect(r.kind).toBe('created');
    expect(r.ok).toBe(true);
    expect(r.crmTaskId).toBe('task_123');
    expect(r.crmTaskStatus).toBe('blocked');
    expect(r.title).toMatch(/created in Unite CRM/i);
    expect(r.message).toContain(LABEL);
    expect(r.nextAction).toContain('task_123');
  });

  it('renders "already_pending" outcome when existing=true', () => {
    const r = mapAddOnResult(
      200,
      { ok: true, existing: true, crm_task_id: 'task_999', task_status: 'in_review' },
      LABEL,
    );
    expect(r.kind).toBe('already_pending');
    expect(r.ok).toBe(true);
    expect(r.crmTaskId).toBe('task_999');
    expect(r.title).toMatch(/already pending/i);
  });
});

describe('mapAddOnResult — failure path', () => {
  it('maps 401 to unauthorized', () => {
    const r = mapAddOnResult(401, { error: 'unauthorized' }, LABEL);
    expect(r.kind).toBe('unauthorized');
    expect(r.nextAction).toMatch(/sign in/i);
  });

  it('maps 403 to forbidden', () => {
    const r = mapAddOnResult(403, { error: 'forbidden' }, LABEL);
    expect(r.kind).toBe('forbidden');
    expect(r.nextAction).toMatch(/admin account/i);
  });

  it('maps 400 invalid_json to invalid_request', () => {
    const r = mapAddOnResult(400, { error: 'invalid_json' }, LABEL);
    expect(r.kind).toBe('invalid_request');
  });

  it('maps 400 invalid_add_on to invalid_request', () => {
    const r = mapAddOnResult(400, { error: 'invalid_add_on' }, LABEL);
    expect(r.kind).toBe('invalid_request');
  });

  it('maps 503 crm_not_configured and names the env var', () => {
    const r = mapAddOnResult(503, { error: 'crm_not_configured' }, LABEL);
    expect(r.kind).toBe('crm_not_configured');
    expect(r.nextAction).toMatch(/UNITE_CRM_WORKSPACE_ID/);
  });

  it('maps 503 crm_unavailable to a retry-in-a-minute next action', () => {
    const r = mapAddOnResult(503, { error: 'crm_unavailable' }, LABEL);
    expect(r.kind).toBe('crm_unavailable');
    expect(r.nextAction).toMatch(/retry|minute/i);
  });

  it('maps 500 crm_lookup_failed to a Supabase-logs next action', () => {
    const r = mapAddOnResult(500, { error: 'crm_lookup_failed' }, LABEL);
    expect(r.kind).toBe('crm_lookup_failed');
    expect(r.nextAction).toMatch(/Supabase/);
  });

  it('maps 500 crm_task_insert_failed to a Supabase-logs next action', () => {
    const r = mapAddOnResult(500, { error: 'crm_task_insert_failed' }, LABEL);
    expect(r.kind).toBe('crm_insert_failed');
    expect(r.nextAction).toMatch(/Supabase/);
  });

  it('classifies a thrown fetch (status=null) as network', () => {
    const r = mapAddOnResult(null, null, LABEL);
    expect(r.kind).toBe('network');
    expect(r.nextAction).toMatch(/connection/i);
  });

  it('falls through to unknown for an unrecognised pair', () => {
    const r = mapAddOnResult(418, { error: 'teapot' }, LABEL);
    expect(r.kind).toBe('unknown');
  });

  it('treats a 200 with a non-ok envelope as unknown (defensive)', () => {
    const r = mapAddOnResult(200, { hello: 'world' }, LABEL);
    expect(r.kind).toBe('unknown');
  });
});

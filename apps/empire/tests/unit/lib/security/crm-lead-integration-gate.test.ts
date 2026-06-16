import { NextRequest, NextResponse } from 'next/server';

import { requireCrmLeadIntegrationAccess, type CrmLeadIntegrationGateOk } from '@/lib/security/crm-lead-integration-gate';

function request(headers: Record<string, string> = {}) {
  return new NextRequest('https://unite-group.in/api/integrations/dr-nrpg/crm/leads', {
    method: 'POST',
    headers,
  });
}

async function json(response: NextResponse) {
  return response.json();
}

describe('requireCrmLeadIntegrationAccess', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...oldEnv,
      DR_NRPG_CRM_LEAD_INTEGRATION_ENABLED: 'true',
      PI_DEV_OPS_CRM_LEAD_INTEGRATION_TOKEN: 'pi-dev-ops-only-token',
    };
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('fails closed for the DR/NRPG coverage hold before accepting otherwise valid credentials', async () => {
    process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ENABLED = 'false';

    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
    }));

    expect(gate).toBeInstanceOf(NextResponse);
    const response = gate as NextResponse;
    expect(response.status).toBe(423);
    expect(await json(response)).toEqual({ error: 'dr_nrpg_crm_lead_integration_coverage_hold' });
  });

  it('returns 503 without checking access when the Pi-Dev-Ops-only integration token is not configured', async () => {
    delete process.env.PI_DEV_OPS_CRM_LEAD_INTEGRATION_TOKEN;

    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
    }));

    expect(gate).toBeInstanceOf(NextResponse);
    const response = gate as NextResponse;
    expect(response.status).toBe(503);
    expect(await json(response)).toEqual({ error: 'crm_lead_integration_not_configured' });
  });

  it('rejects missing or wrong bearer credentials', async () => {
    const missing = await requireCrmLeadIntegrationAccess(request({
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
    }));
    const wrong = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer wrong-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
    }));

    expect(missing).toBeInstanceOf(NextResponse);
    expect((missing as NextResponse).status).toBe(401);
    expect(await json(missing as NextResponse)).toEqual({ error: 'unauthorized_crm_lead_integration' });
    expect(wrong).toBeInstanceOf(NextResponse);
    expect((wrong as NextResponse).status).toBe(401);
    expect(await json(wrong as NextResponse)).toEqual({ error: 'unauthorized_crm_lead_integration' });
  });

  it('rejects authenticated callers outside the intended DR/NRPG CRM lead integration flow', async () => {
    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'marketing-form',
    }));

    expect(gate).toBeInstanceOf(NextResponse);
    const response = gate as NextResponse;
    expect(response.status).toBe(403);
    expect(await json(response)).toEqual({ error: 'invalid_crm_lead_integration_flow' });
  });

  it('returns an auditable least-privilege gate result for valid integration requests', async () => {
    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
      'x-request-id': 'req-123',
    }));

    expect(gate).toEqual({
      ok: true,
      actor: 'pi-dev-ops-crm-lead-integration',
      flow: 'dr-nrpg-crm-lead-integration',
      credentialEnv: 'PI_DEV_OPS_CRM_LEAD_INTEGRATION_TOKEN',
      requestId: 'req-123',
      boardApprovalId: null,
      dryRunOnly: true,
    });
  });

  it('only permits production writes when the prod-write env gate and board approval header are both present', async () => {
    process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ALLOW_PROD_WRITES = 'true';

    const withoutApproval = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
    }));
    const withApproval = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
      'x-board-approval-id': 'BOARD-DR-NRPG-CRM-LEADS',
    }));

    expect(withoutApproval).toMatchObject({ ok: true, dryRunOnly: true, boardApprovalId: null });
    expect(withApproval).toMatchObject({
      ok: true,
      dryRunOnly: false,
      boardApprovalId: 'BOARD-DR-NRPG-CRM-LEADS',
    });
  });

  it('keeps dryRunOnly true when the board approval header is whitespace-only even if prod writes are env-enabled', async () => {
    process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ALLOW_PROD_WRITES = 'true';

    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
      'x-board-approval-id': '   ',
    }));

    expect(gate).toMatchObject({
      ok: true,
      dryRunOnly: true,
      boardApprovalId: null,
    });
  });

  it('fails closed on the coverage hold before inspecting any inbound headers', async () => {
    process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ENABLED = 'false';

    // The 423 coverage-hold check must run before bearer / flow / approval
    // inspection, so a hostile caller cannot use it as a probe to learn
    // anything about the configured env or header shape.
    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
      'x-board-approval-id': 'BOARD-DR-NRPG-CRM-LEADS',
    }));

    expect(gate).toBeInstanceOf(NextResponse);
    const response = gate as NextResponse;
    expect(response.status).toBe(423);
    expect(await json(response)).toEqual({ error: 'dr_nrpg_crm_lead_integration_coverage_hold' });
  });

  it('keeps dryRunOnly true when the prod-writes env is explicitly false even with a board approval header', async () => {
    process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ALLOW_PROD_WRITES = 'false';

    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
      'x-board-approval-id': 'BOARD-DR-NRPG-CRM-LEADS',
    }));

    expect(gate).toMatchObject({
      ok: true,
      dryRunOnly: true,
      boardApprovalId: 'BOARD-DR-NRPG-CRM-LEADS',
    });
  });

  it('rejects bearer credentials that match the supabase service-role key (service-role key is server-side only)', async () => {
    // The JSDoc on the gate promises the supabase service-role key is
    // never accepted as the external bearer credential. Pin that contract
    // so a future refactor that mistakenly allows service-role-as-bearer
    // fails the test.
    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer supabase-service-role-key',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
    }));

    expect(gate).toBeInstanceOf(NextResponse);
    const response = gate as NextResponse;
    expect(response.status).toBe(401);
    expect(await json(response)).toEqual({ error: 'unauthorized_crm_lead_integration' });
  });

  it('fails closed when the integration token is misconfigured to equal the supabase service-role key', async () => {
    process.env.PI_DEV_OPS_CRM_LEAD_INTEGRATION_TOKEN = 'supabase-service-role-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'supabase-service-role-key';

    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer supabase-service-role-key',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
    }));

    expect(gate).toBeInstanceOf(NextResponse);
    const response = gate as NextResponse;
    expect(response.status).toBe(503);
    expect(await json(response)).toEqual({ error: 'crm_lead_integration_credential_conflict' });
  });

  it('treats x-integration-flow as an exact-match constant and rejects spoofed flow variants', async () => {
    // The constant is `dr-nrpg-crm-lead-integration` (lowercase, hyphenated).
    // Uppercase, underscore, and trailing-slash variants must be rejected
    // so a caller cannot smuggle a different flow into the gate.
    // (Whitespace-padded variants are deliberately NOT included here:
    // `trimmedHeader` is documented to trim, so `'  dr-nrpg-crm-lead-integration  '`
    // is a valid form, not a spoof.)
    const cases = [
      'DR-NRPG-CRM-LEAD-INTEGRATION',
      'dr_nrpg_crm_lead_integration',
      'dr-nrpg-crm-lead-integration/extra',
      'dr-nrpg-crm-lead-integrationx',
      '',
    ];

    for (const flow of cases) {
      const gate = await requireCrmLeadIntegrationAccess(request({
        authorization: 'Bearer pi-dev-ops-only-token',
        'x-integration-flow': flow,
      }));

      expect(gate).toBeInstanceOf(NextResponse);
      const response = gate as NextResponse;
      expect(response.status).toBe(403);
      expect(await json(response)).toEqual({ error: 'invalid_crm_lead_integration_flow' });
    }
  });

  it('returns the literal pi-dev-ops-crm-lead-integration actor constant (not env-derived) so callers cannot spoof the actor', async () => {
    // The `actor` field on the gate result is a fixed audit label, not a
    // header or env value. Pin that the literal is exact and case-stable
    // so a downstream CRM log row that filters on actor cannot be
    // impersonated by tweaking the request.
    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
    }));

    expect(gate).toMatchObject({
      ok: true,
      actor: 'pi-dev-ops-crm-lead-integration',
    });
    expect((gate as CrmLeadIntegrationGateOk).actor).not.toMatch(/env|request|header/i);
  });

  it('returns the credential env name to the gate caller (not a redacted string) so downstream audit logs are auditable', async () => {
    // The gate returns `credentialEnv` so the integration route can include
    // it in the audit trail. Pin that the literal env name is the value
    // (and not 'REDACTED' or ''), since the env name is a *label*, not a
    // secret value.
    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
    }));

    expect(gate).toMatchObject({
      ok: true,
      credentialEnv: 'PI_DEV_OPS_CRM_LEAD_INTEGRATION_TOKEN',
    });
  });

  it('returns null requestId for a missing or whitespace-only x-request-id header (not the empty string)', async () => {
    const missing = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
    }));
    const whitespace = await requireCrmLeadIntegrationAccess(request({
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
      'x-request-id': '   ',
    }));

    expect((missing as CrmLeadIntegrationGateOk).requestId).toBeNull();
    expect((whitespace as CrmLeadIntegrationGateOk).requestId).toBeNull();
  });

  it('rejects a bearer with the wrong scheme (lowercase "bearer" must not be silently accepted)', async () => {
    // `timingSafeBearerMatch` is case-sensitive on the scheme prefix. Pin
    // that a hostile caller cannot bypass the auth check by using the
    // wrong-case `bearer` keyword.
    const gate = await requireCrmLeadIntegrationAccess(request({
      authorization: 'bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
    }));

    expect(gate).toBeInstanceOf(NextResponse);
    const response = gate as NextResponse;
    expect(response.status).toBe(401);
    expect(await json(response)).toEqual({ error: 'unauthorized_crm_lead_integration' });
  });
});

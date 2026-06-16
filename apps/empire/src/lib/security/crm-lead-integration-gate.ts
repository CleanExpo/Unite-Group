import { NextRequest, NextResponse } from 'next/server';

import { timingSafeBearerMatch } from '@/lib/security/safe-compare';

const INTEGRATION_FLOW = 'dr-nrpg-crm-lead-integration';
const TOKEN_ENV = 'PI_DEV_OPS_CRM_LEAD_INTEGRATION_TOKEN';
const ENABLED_ENV = 'DR_NRPG_CRM_LEAD_INTEGRATION_ENABLED';
const PROD_WRITES_ENV = 'DR_NRPG_CRM_LEAD_INTEGRATION_ALLOW_PROD_WRITES';
const SERVICE_ROLE_ENV = 'SUPABASE_SERVICE_ROLE_KEY';

export interface CrmLeadIntegrationGateOk {
  ok: true;
  actor: 'pi-dev-ops-crm-lead-integration';
  flow: typeof INTEGRATION_FLOW;
  credentialEnv: typeof TOKEN_ENV;
  requestId: string | null;
  boardApprovalId: string | null;
  dryRunOnly: boolean;
}

function isEnabled(value: string | undefined) {
  return value === 'true';
}

function trimmedHeader(request: NextRequest | Request, name: string) {
  const value = request.headers.get(name)?.trim();
  return value && value.length > 0 ? value : null;
}

/**
 * Least-privilege credentials gate for the DR/NRPG -> Nexus CRM lead intake.
 *
 * This is intentionally narrower than requireAdmin(): callers must present the
 * Pi-Dev-Ops-only integration token, identify the exact integration flow, and
 * pass the coverage-hold env gate before downstream code may touch CRM writes.
 * The Supabase service-role key remains server-side and must not be accepted as
 * the external bearer credential for this flow.
 */
export async function requireCrmLeadIntegrationAccess(
  request: NextRequest | Request,
): Promise<CrmLeadIntegrationGateOk | NextResponse> {
  if (!isEnabled(process.env[ENABLED_ENV])) {
    return NextResponse.json(
      { error: 'dr_nrpg_crm_lead_integration_coverage_hold' },
      { status: 423 },
    );
  }

  const expectedToken = process.env[TOKEN_ENV];
  if (!expectedToken) {
    return NextResponse.json({ error: 'crm_lead_integration_not_configured' }, { status: 503 });
  }

  if (process.env[SERVICE_ROLE_ENV] && expectedToken === process.env[SERVICE_ROLE_ENV]) {
    return NextResponse.json({ error: 'crm_lead_integration_credential_conflict' }, { status: 503 });
  }

  if (!timingSafeBearerMatch(request.headers.get('authorization'), expectedToken)) {
    return NextResponse.json({ error: 'unauthorized_crm_lead_integration' }, { status: 401 });
  }

  if (trimmedHeader(request, 'x-integration-flow') !== INTEGRATION_FLOW) {
    return NextResponse.json({ error: 'invalid_crm_lead_integration_flow' }, { status: 403 });
  }

  const boardApprovalId = trimmedHeader(request, 'x-board-approval-id');
  const prodWritesAllowed = isEnabled(process.env[PROD_WRITES_ENV]) && Boolean(boardApprovalId);

  return {
    ok: true,
    actor: 'pi-dev-ops-crm-lead-integration',
    flow: INTEGRATION_FLOW,
    credentialEnv: TOKEN_ENV,
    requestId: trimmedHeader(request, 'x-request-id'),
    boardApprovalId,
    dryRunOnly: !prodWritesAllowed,
  };
}

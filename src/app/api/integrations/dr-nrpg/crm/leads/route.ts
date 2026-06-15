import { createHash } from 'crypto';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireCrmLeadIntegrationAccess, type CrmLeadIntegrationGateOk } from '@/lib/security/crm-lead-integration-gate';

export const dynamic = 'force-dynamic';

const SOURCE = 'dr_contractor_portal';

const integrationPayloadSchema = z.object({
  sourceType: z.enum(['public_claim', 'lead_capture', 'service_request', 'triage_enrichment']),
  sourceId: z.string().trim().min(1),
  customer: z.object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email(),
    phone: z.string().trim().optional().nullable(),
  }),
  location: z.object({
    suburb: z.string().trim().optional().nullable(),
    state: z.string().trim().optional().nullable(),
    postcode: z.string().trim().optional().nullable(),
    propertyAddress: z.string().trim().optional().nullable(),
  }).default({}),
  service: z.object({
    type: z.string().trim().min(1),
    description: z.string().trim().optional().nullable(),
    requiredCertifications: z.array(z.string()).optional(),
  }),
  urgency: z.object({
    original: z.string().trim().optional().nullable(),
    normalised: z.enum(['URGENT', 'HIGH', 'STANDARD', 'SCHEDULED']),
  }),
  insurance: z.object({
    hasInsurance: z.boolean().optional(),
    provider: z.string().trim().optional().nullable(),
    claimNumber: z.string().trim().optional().nullable(),
    policyNumber: z.string().trim().optional().nullable(),
  }).optional(),
  marketing: z.object({
    consent: z.boolean().optional(),
    source: z.string().trim().optional().nullable(),
    referrer: z.string().trim().optional().nullable(),
    utm: z.record(z.unknown()).optional(),
  }).optional(),
  audit: z.object({
    correlationId: z.string().trim().optional().nullable(),
  }).optional(),
});

type IntegrationPayload = z.infer<typeof integrationPayloadSchema>;

type SupabaseClientLike = {
  from: (table: string) => any;
};

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashValue(value: string) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function splitName(name: string | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'DR/NRPG', lastName: null as string | null, displayName: 'DR/NRPG lead' };
  const [firstName, ...rest] = parts;
  return {
    firstName,
    lastName: rest.length ? rest.join(' ') : null,
    displayName: parts.join(' '),
  };
}

function isUrgent(normalised: IntegrationPayload['urgency']['normalised']) {
  return normalised === 'URGENT' || normalised === 'HIGH';
}

function classifySupabaseError(error: unknown) {
  const message = typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : String(error ?? 'unknown_error');
  if (/invalid|validation|constraint|check|foreign key|not null/i.test(message)) {
    return { errorClass: 'terminal_validation_failure', retryable: false };
  }
  return { errorClass: 'transient_persistence_failure', retryable: true };
}

function buildRecords(payload: IntegrationPayload, gate: CrmLeadIntegrationGateOk) {
  const email = normaliseEmail(payload.customer.email);
  const names = splitName(payload.customer.name);
  const dedupeKey = `${payload.sourceType}:${payload.sourceId}`;
  const urgent = isUrgent(payload.urgency.normalised);
  const capturedAt = new Date().toISOString();

  const nonSecretAudit = {
    actor: gate.actor,
    flow: gate.flow,
    credential_env: gate.credentialEnv,
    request_id: gate.requestId,
    operator_gate_satisfied: Boolean(gate.boardApprovalId) && !gate.dryRunOnly,
    dry_run_only: gate.dryRunOnly,
  };

  const additionalData = {
    dedupe_key: dedupeKey,
    source_type: payload.sourceType,
    source_id: payload.sourceId,
    integration_flow: gate.flow,
    correlation_id: payload.audit?.correlationId ?? gate.requestId,
    customer_email_hash: hashValue(email),
    location: {
      suburb: payload.location.suburb ?? null,
      state: payload.location.state ?? null,
      postcode: payload.location.postcode ?? null,
    },
    service: {
      type: payload.service.type,
      required_certifications: payload.service.requiredCertifications ?? [],
    },
    urgency: payload.urgency,
    insurance: {
      has_insurance: payload.insurance?.hasInsurance ?? null,
      provider: payload.insurance?.provider ?? null,
      has_claim_number: Boolean(payload.insurance?.claimNumber),
      has_policy_number: Boolean(payload.insurance?.policyNumber),
    },
    marketing: payload.marketing ?? null,
    gate: nonSecretAudit,
  };

  return {
    dedupeKey,
    email,
    customerEmailHash: hashValue(email),
    urgent,
    lead: {
      first_name: names.firstName,
      last_name: names.lastName,
      email,
      phone: payload.customer.phone ?? null,
      company: 'DR/NRPG property owner',
      job_title: null,
      message: payload.service.description ?? null,
      interests: payload.service.type,
      referral_source: payload.marketing?.referrer ?? payload.marketing?.source ?? null,
      marketing_consent: payload.marketing?.consent ?? false,
      email_list_id: null,
      source: SOURCE,
      status: 'new',
      assigned_owner: 'Margot',
      ip_address: null,
      user_agent: null,
      additional_data: additionalData,
      captured_at: capturedAt,
    },
    contact: {
      display_name: names.displayName,
      first_name: names.firstName,
      last_name: names.lastName,
      primary_email: email,
      primary_phone: payload.customer.phone ?? null,
      company_name: 'DR/NRPG property owner',
      source: SOURCE,
      source_detail: dedupeKey,
      marketing_consent: payload.marketing?.consent ?? false,
      consent_source: payload.marketing?.source ?? SOURCE,
      consent_captured_at: payload.marketing?.consent ? capturedAt : null,
      relationship_owner: 'Margot',
      status: 'lead_only',
      dedupe_email_key: email,
      privacy_scope: 'lead_scoped',
      additional_data: {
        dedupe_key: dedupeKey,
        customer_email_hash: hashValue(email),
        integration_flow: gate.flow,
      },
    },
    opportunity: {
      name: `${payload.service.type.replace(/[_-]/g, ' ')} - ${payload.location.suburb ?? payload.location.postcode ?? payload.sourceId}`,
      stage: 'discovery',
      status: 'open',
      source: SOURCE,
      owner: 'Margot',
      probability: urgent ? 70 : 45,
      next_action: urgent ? 'Urgent DR/NRPG follow-up required' : 'Review DR/NRPG lead intake',
      source_detail: dedupeKey,
      approval_required: false,
      approval_status: 'not_required',
      additional_data: {
        dedupe_key: dedupeKey,
        source_type: payload.sourceType,
        source_id: payload.sourceId,
        customer_email_hash: hashValue(email),
        service: payload.service,
        urgency: payload.urgency,
        location: {
          suburb: payload.location.suburb ?? null,
          state: payload.location.state ?? null,
          postcode: payload.location.postcode ?? null,
        },
        manual_follow_up_required: urgent,
      },
    },
  };
}

async function findExistingLead(supabase: SupabaseClientLike, dedupeKey: string) {
  const { data, error } = await supabase
    .from('crm_leads')
    .contains('additional_data', { dedupe_key: dedupeKey })
    .select('id, additional_data')
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; additional_data?: Record<string, unknown> } | null;
}

async function syncCrmLead(supabase: SupabaseClientLike, records: ReturnType<typeof buildRecords>) {
  const existingLead = await findExistingLead(supabase, records.dedupeKey);
  if (existingLead?.id) {
    return {
      status: 'already_synced' as const,
      leadId: existingLead.id,
      contactId: typeof existingLead.additional_data?.contact_id === 'string' ? existingLead.additional_data.contact_id : null,
      opportunityId: typeof existingLead.additional_data?.opportunity_id === 'string' ? existingLead.additional_data.opportunity_id : null,
    };
  }

  const { data: lead, error: leadError } = await supabase
    .from('crm_leads')
    .insert(records.lead)
    .select('id')
    .single();
  if (leadError || !lead?.id) throw leadError ?? new Error('crm_lead_insert_missing_id');

  const contactExisting = await supabase
    .from('crm_contacts')
    .select('id')
    .eq('dedupe_email_key', records.email)
    .maybeSingle();
  if (contactExisting.error) throw contactExisting.error;

  let contactId = (contactExisting.data as { id?: string } | null)?.id;
  if (!contactId) {
    const { data: contact, error: contactError } = await supabase
      .from('crm_contacts')
      .insert({ ...records.contact, linked_lead_id: lead.id })
      .select('id')
      .single();
    if (contactError || !contact?.id) throw contactError ?? new Error('crm_contact_insert_missing_id');
    contactId = contact.id;
  }

  const opportunityExisting = await supabase
    .from('crm_opportunities')
    .contains('additional_data', { dedupe_key: records.dedupeKey })
    .select('id')
    .maybeSingle();
  if (opportunityExisting.error) throw opportunityExisting.error;

  let opportunityId = (opportunityExisting.data as { id?: string } | null)?.id;
  if (!opportunityId) {
    const { data: opportunity, error: opportunityError } = await supabase
      .from('crm_opportunities')
      .insert({ ...records.opportunity, linked_lead_id: lead.id, linked_contact_id: contactId })
      .select('id')
      .single();
    if (opportunityError || !opportunity?.id) throw opportunityError ?? new Error('crm_opportunity_insert_missing_id');
    opportunityId = opportunity.id;
  }

  const { error: leadLinkageError } = await supabase
    .from('crm_leads')
    .update({
      additional_data: {
        ...records.lead.additional_data,
        contact_id: contactId,
        opportunity_id: opportunityId,
      },
    })
    .eq('id', lead.id);
  if (leadLinkageError) throw leadLinkageError;

  return {
    status: 'synced' as const,
    leadId: lead.id,
    contactId,
    opportunityId,
  };
}

function logSafeFailure(records: ReturnType<typeof buildRecords>, errorClass: string, retryable: boolean) {
  console.error('[DR_NRPG_CRM_LEAD_SYNC_FAILED]', JSON.stringify({
    sourceType: records.dedupeKey.split(':')[0],
    sourceId: records.dedupeKey.split(':').slice(1).join(':'),
    dedupeKey: records.dedupeKey,
    customerEmailHash: records.customerEmailHash,
    crmSyncStatus: 'failed',
    errorClass,
    retryable,
  }));
}

export async function POST(request: NextRequest) {
  const gate = await requireCrmLeadIntegrationAccess(request);
  if (gate instanceof NextResponse) return gate;

  let payload: IntegrationPayload;
  try {
    payload = integrationPayloadSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'invalid_crm_lead_payload',
      errorClass: 'terminal_validation_failure',
      retryable: false,
    }, { status: 400 });
  }

  const records = buildRecords(payload, gate);

  if (gate.dryRunOnly) {
    return NextResponse.json({
      success: true,
      status: 'dry_run',
      dryRunOnly: true,
      dedupeKey: records.dedupeKey,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      customerEmailHash: records.customerEmailHash,
      retryable: false,
      leadPreview: {
        source: records.lead.source,
        status: records.lead.status,
      },
    });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      success: false,
      error: 'crm_not_configured',
      errorClass: 'configuration_failure',
      retryable: true,
      dedupeKey: records.dedupeKey,
      customerEmailHash: records.customerEmailHash,
    }, { status: 503 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  try {
    const sync = await syncCrmLead(supabase, records);
    return NextResponse.json({
      success: true,
      status: sync.status,
      dryRunOnly: false,
      dedupeKey: records.dedupeKey,
      customerEmailHash: records.customerEmailHash,
      leadId: sync.leadId,
      contactId: sync.contactId,
      opportunityId: sync.opportunityId,
      retryable: false,
    }, { status: sync.status === 'already_synced' ? 200 : 201 });
  } catch (error) {
    const classification = classifySupabaseError(error);
    logSafeFailure(records, classification.errorClass, classification.retryable);
    return NextResponse.json({
      success: false,
      error: 'crm_lead_sync_failed',
      errorClass: classification.errorClass,
      retryable: classification.retryable,
      dedupeKey: records.dedupeKey,
      customerEmailHash: records.customerEmailHash,
    }, { status: classification.retryable ? 503 : 422 });
  }
}

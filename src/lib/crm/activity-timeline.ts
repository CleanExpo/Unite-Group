export type CrmActivityTimelineEventType =
  | 'lead_captured'
  | 'lead_qualified'
  | 'lead_converted'
  | 'contact_created'
  | 'contact_updated'
  | 'opportunity_created'
  | 'opportunity_updated'
  | 'opportunity_closed'
  | 'opportunity_reopened'
  | 'approval_requested'
  | 'approval_approved'
  | 'approval_rejected'
  | 'approval_cancelled'
  | 'approval_expired'
  | 'task_completed'
  | 'integration_stale';

export type CrmActivityTimelineCategory = 'lead' | 'contact' | 'opportunity' | 'approval' | 'task' | 'integration';
export type CrmActivityTimelineSeverity = 'normal' | 'high' | 'warning';
export type CrmActivityTimelineActionClass = 'auto' | 'approval_required' | 'investigate';

export interface CrmActivityTimelineEventInput {
  type: CrmActivityTimelineEventType;
  actor: string;
  subjectId: string;
  subjectLabel: string;
  occurredAt: string;
  source: string;
  clientSlug?: string | null;
  businessSlug?: string | null;
  requiresApproval?: boolean | null;
  boardApprovalId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CrmActivityTimelineEvent {
  type: CrmActivityTimelineEventType;
  category: CrmActivityTimelineCategory;
  severity: CrmActivityTimelineSeverity;
  actionClass: CrmActivityTimelineActionClass;
  actor: string;
  subjectId: string;
  subjectLabel: string;
  occurredAt: string;
  source: string;
  summary: string;
  clientSlug?: string;
  businessSlug?: string;
  requiresApproval?: boolean;
  metadata: Record<string, unknown>;
}

export interface CrmTimelineAgentActionInsert {
  source: 'margot';
  action_type: `crm_timeline_${CrmActivityTimelineEventType}`;
  status: 'pending' | 'done';
  idea_text: string;
  client_id: null;
  business_id: null;
  linear_ticket_id: null;
  parent_id: null;
  payload: {
    type: CrmActivityTimelineEventType;
    category: CrmActivityTimelineCategory;
    severity: CrmActivityTimelineSeverity;
    actionClass: CrmActivityTimelineActionClass;
    actor: string;
    subjectId: string;
    subjectLabel: string;
    occurredAt: string;
    source: string;
    summary: string;
    requiresApproval: boolean;
    clientSlug: string | null;
    businessSlug: string | null;
    metadata: Record<string, unknown>;
  };
}

const TYPE_CONFIG: Record<CrmActivityTimelineEventType, {
  category: CrmActivityTimelineCategory;
  severity: CrmActivityTimelineSeverity;
  actionClass: CrmActivityTimelineActionClass;
  label: string;
}> = {
  lead_captured: { category: 'lead', severity: 'normal', actionClass: 'auto', label: 'Lead captured' },
  lead_qualified: { category: 'lead', severity: 'normal', actionClass: 'auto', label: 'Lead qualified' },
  lead_converted: { category: 'lead', severity: 'high', actionClass: 'approval_required', label: 'Lead converted' },
  contact_created: { category: 'contact', severity: 'normal', actionClass: 'auto', label: 'Contact created' },
  contact_updated: { category: 'contact', severity: 'normal', actionClass: 'auto', label: 'Contact updated' },
  opportunity_created: { category: 'opportunity', severity: 'normal', actionClass: 'auto', label: 'Opportunity created' },
  opportunity_updated: { category: 'opportunity', severity: 'normal', actionClass: 'auto', label: 'Opportunity updated' },
  opportunity_closed: { category: 'opportunity', severity: 'high', actionClass: 'approval_required', label: 'Opportunity closed' },
  opportunity_reopened: { category: 'opportunity', severity: 'high', actionClass: 'approval_required', label: 'Opportunity reopened' },
  approval_requested: { category: 'approval', severity: 'high', actionClass: 'approval_required', label: 'Approval requested' },
  approval_approved: { category: 'approval', severity: 'high', actionClass: 'approval_required', label: 'Approval approved' },
  approval_rejected: { category: 'approval', severity: 'high', actionClass: 'approval_required', label: 'Approval rejected' },
  approval_cancelled: { category: 'approval', severity: 'high', actionClass: 'approval_required', label: 'Approval cancelled' },
  approval_expired: { category: 'approval', severity: 'high', actionClass: 'approval_required', label: 'Approval expired' },
  task_completed: { category: 'task', severity: 'normal', actionClass: 'auto', label: 'Task completed' },
  integration_stale: { category: 'integration', severity: 'warning', actionClass: 'investigate', label: 'Integration stale' },
};

const BLOCKED_METADATA_KEY_PARTS = [
  'token',
  'secret',
  'password',
  'authorization',
  'auth',
  'apikey',
  'boardapproval',
  'boardapprovalid',
  'approvalref',
  'rejectionreason',
  'payment',
  'billing',
  'card',
  'email',
  'phone',
  'ipaddress',
  'address',
];
const BLOCKED_METADATA_KEYS = ['ip'];
const BOARD_APPROVAL_REF_PATTERN = /\bBOARD-\d+\b/i;
const BEARER_TOKEN_PATTERN = /\bbearer\s+[a-z0-9._~+/=-]+\b/i;
const API_KEY_PATTERN = /\bapi[_ -]?key[_ :=-]*[a-z0-9._-]+\b/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:\+?\d[\d ().-]{7,}\d)/;
const PAYMENT_VALUE_PATTERN = /(?:\b(?:billing|payment)\b.*\b(?:card|method|visa|mastercard|amex|discover|\d{4})\b|\bcard\b.*\b(?:visa|mastercard|amex|discover|\d{4})\b|\b(?:visa|mastercard|amex|discover)\b\s+(?:card|ending\s+\d{4}|\d{4})\b)/i;

function clean(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function isSupportedType(type: string): type is CrmActivityTimelineEventType {
  return Object.prototype.hasOwnProperty.call(TYPE_CONFIG, type);
}

function isSensitiveMetadataKey(key: string): boolean {
  const normalizedKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return BLOCKED_METADATA_KEYS.includes(normalizedKey)
    || BLOCKED_METADATA_KEY_PARTS.some((blockedPart) => normalizedKey.includes(blockedPart));
}

function isSensitiveMetadataValue(value: string): boolean {
  return BOARD_APPROVAL_REF_PATTERN.test(value)
    || BEARER_TOKEN_PATTERN.test(value)
    || API_KEY_PATTERN.test(value)
    || EMAIL_PATTERN.test(value)
    || PHONE_PATTERN.test(value)
    || PAYMENT_VALUE_PATTERN.test(value);
}

function redactSensitiveTimelineText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED]')
    .replace(/\bBOARD-[A-Z0-9-]+\b/gi, '[REDACTED]')
    .replace(/\bbearer\s+[a-z0-9._~+/=-]+\b/gi, '[REDACTED]')
    .replace(/\bapi[_ -]?key[_ :=-]*[a-z0-9._-]+\b/gi, '[REDACTED]')
    .replace(/(?:\+\d[\d ().-]{7,}\d|\b\d{3}[-. ]\d{3}[-. ]\d{3,4}\b|\b\d(?=[\d ().-]{7,}\d)(?=[\d().-]*[ .()]\d)[\d ().-]*\d\b)/g, '[REDACTED]')
    .replace(
      /\b(?:billing\s+card\s+(?:ending\s+)?\d{4}|payment\s+card\s+\d{4}|card\s+(?:ending|number)\s+\d{4}|payment\s+method\s+(?:visa|mastercard|amex|discover)|(?:visa|mastercard|amex|discover)\s+(?:card|ending\s+\d{4}|\d{4}))\b/gi,
      '[REDACTED]',
    );
}

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  Object.entries(metadata ?? {}).forEach(([key, value]) => {
    if (/^changed[A-Z]/.test(key) && typeof value === 'boolean') {
      sanitized[key] = value;
      return;
    }

    if (isSensitiveMetadataKey(key)) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      if (typeof value === 'string' && isSensitiveMetadataValue(value)) return;
      sanitized[key] = value;
    }
  });

  return sanitized;
}

export function buildCrmActivityTimelineEvent(input: CrmActivityTimelineEventInput): CrmActivityTimelineEvent {
  const type = String(input.type);
  if (!isSupportedType(type)) {
    throw new Error(`Unsupported CRM activity type: ${type}`);
  }

  const actor = clean(input.actor);
  const subjectId = clean(input.subjectId);
  const subjectLabel = redactSensitiveTimelineText(clean(input.subjectLabel));
  const occurredAt = clean(input.occurredAt);
  const source = clean(input.source);

  if (!subjectId) throw new Error('CRM activity subjectId is required');
  if (!subjectLabel) throw new Error('CRM activity subjectLabel is required');
  if (!actor) throw new Error('CRM activity actor is required');
  if (!occurredAt) throw new Error('CRM activity occurredAt is required');
  if (!source) throw new Error('CRM activity source is required');

  const config = TYPE_CONFIG[type];
  const requiresApproval = input.requiresApproval === true || config.actionClass === 'approval_required';
  const event: CrmActivityTimelineEvent = {
    type,
    category: config.category,
    severity: config.severity,
    actionClass: config.actionClass,
    actor,
    subjectId,
    subjectLabel,
    occurredAt,
    source,
    summary: `${config.label}: ${subjectLabel} via ${source}.`,
    metadata: sanitizeMetadata(input.metadata),
  };

  const clientSlug = clean(input.clientSlug);
  const businessSlug = clean(input.businessSlug);
  if (clientSlug) event.clientSlug = clientSlug;
  if (businessSlug) event.businessSlug = businessSlug;
  if (requiresApproval) event.requiresApproval = true;

  return event;
}

export function buildCrmTimelineAgentActionInsert(
  event: CrmActivityTimelineEvent,
): CrmTimelineAgentActionInsert {
  const configuredActionClass = TYPE_CONFIG[event.type].actionClass;
  const requiresApproval = event.requiresApproval === true
    || event.actionClass === 'approval_required'
    || configuredActionClass === 'approval_required';
  const status: CrmTimelineAgentActionInsert['status'] = requiresApproval
    || event.actionClass === 'investigate'
    || configuredActionClass === 'investigate'
    ? 'pending'
    : 'done';
  const subjectLabel = redactSensitiveTimelineText(event.subjectLabel);
  const summary = redactSensitiveTimelineText(event.summary);

  return {
    source: 'margot',
    action_type: `crm_timeline_${event.type}`,
    status,
    idea_text: summary,
    client_id: null,
    business_id: null,
    linear_ticket_id: null,
    parent_id: null,
    payload: {
      type: event.type,
      category: event.category,
      severity: event.severity,
      actionClass: event.actionClass,
      actor: event.actor,
      subjectId: event.subjectId,
      subjectLabel,
      occurredAt: event.occurredAt,
      source: event.source,
      summary,
      requiresApproval,
      clientSlug: event.clientSlug ?? null,
      businessSlug: event.businessSlug ?? null,
      metadata: sanitizeMetadata(event.metadata),
    },
  };
}

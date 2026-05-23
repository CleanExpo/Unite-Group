export type CrmActivityTimelineEventType =
  | 'lead_captured'
  | 'lead_qualified'
  | 'lead_converted'
  | 'contact_created'
  | 'opportunity_created'
  | 'approval_requested'
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
  opportunity_created: { category: 'opportunity', severity: 'normal', actionClass: 'auto', label: 'Opportunity created' },
  approval_requested: { category: 'approval', severity: 'high', actionClass: 'approval_required', label: 'Approval requested' },
  task_completed: { category: 'task', severity: 'normal', actionClass: 'auto', label: 'Task completed' },
  integration_stale: { category: 'integration', severity: 'warning', actionClass: 'investigate', label: 'Integration stale' },
};

const BLOCKED_METADATA_KEY_PARTS = ['token', 'secret', 'password', 'authorization', 'apikey', 'boardapprovalid'];

function clean(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function isSupportedType(type: string): type is CrmActivityTimelineEventType {
  return Object.prototype.hasOwnProperty.call(TYPE_CONFIG, type);
}

function isSensitiveMetadataKey(key: string): boolean {
  const normalizedKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return BLOCKED_METADATA_KEY_PARTS.some((blockedPart) => normalizedKey.includes(blockedPart));
}

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  Object.entries(metadata ?? {}).forEach(([key, value]) => {
    if (isSensitiveMetadataKey(key)) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
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
  const subjectLabel = clean(input.subjectLabel);
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

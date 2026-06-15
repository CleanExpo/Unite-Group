// Redacted console.error helper for CRM daily-digest read surfaces.
//
// Service-role CRM read lanes can carry credentials, emails, query details,
// or PII in raw Error objects. This helper logs only a bounded event/stage
// label so operators can identify failures without leaking sensitive data.

export type CrmDigestReadStage = 'leads' | 'tasks' | 'opportunities' | 'unexpected';

const ALLOWED_STAGES: ReadonlySet<CrmDigestReadStage> = new Set([
  'leads',
  'tasks',
  'opportunities',
  'unexpected',
]);

const ALLOWED_CONTEXTS: ReadonlySet<'api' | 'command-center'> = new Set([
  'api',
  'command-center',
]);

/**
 * Log a CRM daily-digest read failure without exposing raw error details.
 * Callers should NOT pass the raw error object or message.
 *
 * Fails closed (no log) if either argument is outside the documented
 * union: this keeps downstream log-alerting rules and redaction parsers
 * from matching on a typo, differently-cased, or out-of-band value.
 */
export function logCrmDigestReadError(
  stage: CrmDigestReadStage,
  context: 'api' | 'command-center',
): void {
  if (!ALLOWED_STAGES.has(stage)) return;
  if (!ALLOWED_CONTEXTS.has(context)) return;
  console.error(JSON.stringify({ event: 'crm_digest_read_error', stage, context }));
}

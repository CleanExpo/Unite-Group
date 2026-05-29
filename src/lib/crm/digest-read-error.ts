// Redacted console.error helper for CRM daily-digest read surfaces.
//
// Service-role CRM read lanes can carry credentials, emails, query details,
// or PII in raw Error objects. This helper logs only a bounded event/stage
// label so operators can identify failures without leaking sensitive data.

export type CrmDigestReadStage = 'leads' | 'tasks' | 'opportunities' | 'unexpected';

/**
 * Log a CRM daily-digest read failure without exposing raw error details.
 * Callers should NOT pass the raw error object or message.
 */
export function logCrmDigestReadError(
  stage: CrmDigestReadStage,
  context: 'api' | 'command-center',
): void {
  console.error(JSON.stringify({ event: 'crm_digest_read_error', stage, context }));
}

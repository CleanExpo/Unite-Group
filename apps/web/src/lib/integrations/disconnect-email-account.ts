// src/lib/integrations/disconnect-email-account.ts
// Removes a single connected email account (Google or Microsoft) from the
// founder's credentials_vault. Founder-scoped: only the caller's own rows,
// matched on the exact mailbox address stored in `notes`. Multi-account safe —
// deletes exactly one mailbox, leaving the founder's other accounts intact.

export type EmailIntegrationService = 'google' | 'microsoft'

export async function disconnectEmailAccount(
  founderId: string,
  service: EmailIntegrationService,
  email: string,
): Promise<void> {
  const { createServiceClient } = await import('@/lib/supabase/service')
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('credentials_vault')
    .delete()
    .eq('founder_id', founderId)
    .eq('service', service)
    .eq('notes', email)

  if (error) {
    throw new Error(`Failed to disconnect ${service} account: ${error.message}`)
  }
}

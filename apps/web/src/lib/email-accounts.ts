import { isOwnedBusinessKey, type BusinessKey } from '@/lib/businesses'

// Maps Phill's email accounts to portfolio slugs.
// Forward-only addresses with no real inbox are excluded.
export type EmailProvider = 'google' | 'microsoft' | 'siteground'
export type EmailAccountScope = 'owned' | 'client' | 'personal'

export interface EmailAccount {
  email: string
  // 'ugn' = the Unite-Group Nexus HQ/parent identity (not a portfolio business).
  businessKey: BusinessKey | 'personal' | 'ugn'
  label: string
  provider: EmailProvider
  scope: EmailAccountScope
  receiptIngestion: boolean
}

export const EMAIL_ACCOUNTS: EmailAccount[] = [
  { email: 'contact@unite-group.in', businessKey: 'ugn', label: 'Unite-Group Nexus HQ', provider: 'google', scope: 'owned', receiptIngestion: false },
  { email: 'phill@disasterrecovery.com.au', businessKey: 'dr', label: 'DR Primary', provider: 'microsoft', scope: 'owned', receiptIngestion: true },
  { email: 'disasterrecoverynrp@gmail.com', businessKey: 'nrpg', label: 'NRPG Gmail', provider: 'google', scope: 'owned', receiptIngestion: true },
  { email: 'airestoreassist@gmail.com', businessKey: 'restore', label: 'Restore AI', provider: 'google', scope: 'owned', receiptIngestion: true },
  { email: 'support@carsi.com.au', businessKey: 'carsi', label: 'CARSI Support', provider: 'siteground', scope: 'owned', receiptIngestion: true },
  { email: 'phill.m@carsi.com.au', businessKey: 'carsi', label: 'CARSI Personal', provider: 'siteground', scope: 'owned', receiptIngestion: true },
  { email: 'nrpg.team@gmail.com', businessKey: 'nrpg', label: 'NRPG Team', provider: 'google', scope: 'owned', receiptIngestion: true },
  { email: 'phill@connexusm.com', businessKey: 'ccw', label: 'CCW Primary', provider: 'google', scope: 'client', receiptIngestion: false },
  { email: 'phill.mcgurk@gmail.com', businessKey: 'personal', label: 'Personal Gmail', provider: 'google', scope: 'personal', receiptIngestion: false },
  { email: 'zenithfresh25@gmail.com', businessKey: 'personal', label: 'Personal Alt', provider: 'google', scope: 'personal', receiptIngestion: false },
]

export function accountByEmail(email: string): EmailAccount | undefined {
  // Canonicalise to lowercase so a provider returning a differently-cased
  // address (e.g. Phill@ConnexusM.com) still resolves — otherwise the account's
  // footer and voice would be silently dropped.
  const canonical = email.trim().toLowerCase()
  return EMAIL_ACCOUNTS.find((account) => account.email.toLowerCase() === canonical)
}

export function getOwnedReceiptAccounts(provider?: EmailProvider): EmailAccount[] {
  return EMAIL_ACCOUNTS.filter((account) => {
    if (!account.receiptIngestion) return false
    if (account.scope !== 'owned') return false
    if (!isOwnedBusinessKey(account.businessKey)) return false
    return provider ? account.provider === provider : true
  })
}

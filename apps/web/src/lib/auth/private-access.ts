export type PrivateAccessUser = {
  id?: string | null
  email?: string | null
}

// FLAG: legacy 'unite-hub' naming inherited from the Unite-Hub WIP source.
// Consider renaming the domain + the UNITE_HUB_TEST_ALLOW_PRIVATE_ACCESS env
// flag to a Unite-Group convention in a later pass. Both must change together,
// and the e2e harness that sets them must be updated in lockstep.
const TEST_EMAIL_DOMAIN = '@unite-hub.test'

function parseAllowList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function getPrivateAccessConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    allowedUserIds: parseAllowList(env.FOUNDER_ALLOWED_USER_IDS ?? env.FOUNDER_USER_ID),
    allowedEmails: parseAllowList(env.FOUNDER_ALLOWED_EMAILS ?? env.ALLOWED_FOUNDER_EMAILS),
  }
}

export function isPrivateAccessConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const config = getPrivateAccessConfig(env)
  return config.allowedUserIds.length > 0 || config.allowedEmails.length > 0
}

export function hasPrivateAccess(
  user: PrivateAccessUser | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const config = getPrivateAccessConfig(env)

  // Fail CLOSED in production (covers Vercel preview AND prod, both NODE_ENV=production)
  // when the founder allow-list is unconfigured: an unset/empty FOUNDER_ALLOWED_* must
  // DENY, not silently expose the private single-tenant CRM to any authenticated user.
  // Fail-open is kept ONLY for local dev ergonomics.
  if (config.allowedUserIds.length === 0 && config.allowedEmails.length === 0) {
    return env.NODE_ENV !== 'production'
  }

  const userId = user?.id?.trim().toLowerCase()
  const email = user?.email?.trim().toLowerCase()

  // Non-production test-only bypass: lets the e2e harness authenticate as a
  // synthetic founder without provisioning a real allow-listed account. Triple
  // guard — NEVER reachable in production: requires NODE_ENV !== 'production',
  // an explicit opt-in env flag, AND the dedicated test email domain.
  if (
    env.NODE_ENV !== 'production'
    && env.UNITE_HUB_TEST_ALLOW_PRIVATE_ACCESS === '1'
    && email?.endsWith(TEST_EMAIL_DOMAIN)
  ) {
    return true
  }

  return Boolean(
    (userId && config.allowedUserIds.includes(userId))
    || (email && config.allowedEmails.includes(email)),
  )
}

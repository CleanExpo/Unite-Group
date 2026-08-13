/**
 * Canonical server-side accessor for the single-tenant cron actor.
 *
 * Vercel environment values can contain pasted whitespace. Passing that raw
 * value into a UUID predicate causes Postgres to reject the entire cron run,
 * so every caller receives the same trimmed, non-empty value here.
 *
 * Read at call time rather than module load so runtime/test environment changes
 * are observed and no stale value is cached between requests.
 */
export function getFounderUserId(env: NodeJS.ProcessEnv = process.env): string | null {
  const founderId = env.FOUNDER_USER_ID?.trim()
  return founderId || null
}

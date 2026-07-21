// src/lib/auth/allow-list-health.ts
// Founder allow-list drift detection.
//
// Born from the 2026-07-14 lockout: FOUNDER_USER_ID silently carried a legacy
// account's UID for ~4 months, so the guard denied the real founder the moment
// he signed in. The env vars can only be validated against live auth.users —
// this module evaluates that match so the nightly hub-sweep can flag drift
// BEFORE it becomes a lockout.

import type { getPrivateAccessConfig } from './private-access'

export type AllowListAuthUser = {
  id: string
  email?: string | null
  lastSignInAt?: string | null
}

export type AllowListHealth = {
  status: 'green' | 'yellow' | 'red'
  /** Allow-list entries that matched a real auth user */
  matchedEntries: number
  /** Configured entries (ids or emails) matching NO auth user — typo, stale UID, or \r\n corruption */
  staleEntries: string[]
  /** Days since ANY allow-listed identity last signed in; null = never */
  daysSinceAllowedSignIn: number | null
  detail: string
}

/** The founder signs in most days — if no allow-listed identity has signed in
 * for this long, the allow-list probably names the wrong account. */
export const STALE_SIGN_IN_DAYS = 14

export function evaluateAllowListHealth(
  config: ReturnType<typeof getPrivateAccessConfig>,
  users: AllowListAuthUser[],
  now: Date = new Date(),
): AllowListHealth {
  const { allowedUserIds, allowedEmails } = config

  if (allowedUserIds.length === 0 && allowedEmails.length === 0) {
    return {
      status: 'yellow',
      matchedEntries: 0,
      staleEntries: [],
      daysSinceAllowedSignIn: null,
      detail:
        'Founder allow-list is NOT configured — private access is fail-open. '
        + 'Set FOUNDER_ALLOWED_EMAILS or FOUNDER_ALLOWED_USER_IDS.',
    }
  }

  const byId = new Map(users.map((u) => [u.id.toLowerCase(), u]))
  const byEmail = new Map(
    users.filter((u) => u.email).map((u) => [u.email!.toLowerCase(), u]),
  )

  const matchedUsers = new Map<string, AllowListAuthUser>()
  const staleEntries: string[] = []

  for (const id of allowedUserIds) {
    const user = byId.get(id)
    if (user) matchedUsers.set(user.id, user)
    else staleEntries.push(id)
  }
  for (const email of allowedEmails) {
    const user = byEmail.get(email)
    if (user) matchedUsers.set(user.id, user)
    else staleEntries.push(email)
  }

  if (matchedUsers.size === 0) {
    return {
      status: 'red',
      matchedEntries: 0,
      staleEntries,
      daysSinceAllowedSignIn: null,
      detail:
        'No allow-list entry matches ANY auth user — the founder is locked out. '
        + 'Check for stale UIDs, typos, or literal \\r\\n corruption from `vercel env add` on Windows.',
    }
  }

  let freshestSignIn: number | null = null
  for (const user of matchedUsers.values()) {
    if (!user.lastSignInAt) continue
    const ts = new Date(user.lastSignInAt).getTime()
    if (Number.isFinite(ts) && (freshestSignIn === null || ts > freshestSignIn)) {
      freshestSignIn = ts
    }
  }

  const daysSinceAllowedSignIn = freshestSignIn === null
    ? null
    : Math.floor((now.getTime() - freshestSignIn) / (1000 * 60 * 60 * 24))

  if (daysSinceAllowedSignIn === null || daysSinceAllowedSignIn > STALE_SIGN_IN_DAYS) {
    const signInDetail = daysSinceAllowedSignIn === null
      ? 'has NEVER signed in'
      : `last signed in ${daysSinceAllowedSignIn} days ago`
    return {
      status: 'yellow',
      matchedEntries: matchedUsers.size,
      staleEntries,
      daysSinceAllowedSignIn,
      detail:
        `Allow-list matches ${matchedUsers.size} auth user(s), but the freshest ${signInDetail} — `
        + 'it may name the wrong account (e.g. a legacy identity instead of the founder\'s real login).',
    }
  }

  if (staleEntries.length > 0) {
    return {
      status: 'yellow',
      matchedEntries: matchedUsers.size,
      staleEntries,
      daysSinceAllowedSignIn,
      detail:
        `${staleEntries.length} allow-list entr${staleEntries.length === 1 ? 'y' : 'ies'} match(es) no auth user: `
        + `${staleEntries.join(', ')}. Active founder access still works.`,
    }
  }

  return {
    status: 'green',
    matchedEntries: matchedUsers.size,
    staleEntries: [],
    daysSinceAllowedSignIn,
    detail: `Allow-list matches ${matchedUsers.size} auth user(s); founder signed in ${daysSinceAllowedSignIn} day(s) ago.`,
  }
}

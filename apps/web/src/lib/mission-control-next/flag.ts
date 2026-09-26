/**
 * Mission Control vNext preview flag (UNI-2776). Ships DARK: only the literal string
 * 'true' enables it, so an unset, empty, or malformed value keeps the route 404.
 * Founder-only access is enforced separately by the private-access middleware.
 */
export function isMissionControlNextEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MISSION_CONTROL_VNEXT_PREVIEW === 'true';
}

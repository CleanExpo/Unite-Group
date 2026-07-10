/**
 * AI Front Desk feature flag. Ships DARK: only the literal string 'true' enables it,
 * so an unset, empty, or malformed value keeps the surface off. Every front-desk route
 * gates on this before doing any work (acceptance criterion: flag off ⇒ route rejects).
 */
export function isFrontDeskEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.UNITE_FRONT_DESK_ENABLED === 'true';
}

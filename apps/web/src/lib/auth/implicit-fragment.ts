/**
 * Parse an implicit-flow Supabase session out of a URL #fragment
 * (e.g. a magic link generated outside the browser). Returns null unless both
 * tokens are present.
 */
export function parseImplicitFragment(hash: string): { access_token: string; refresh_token: string } | null {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return null
  return { access_token, refresh_token }
}

/** Only same-site relative paths (no protocol-relative //host). */
export function safeNextPath(raw: string | null): string {
  return raw && /^\/(?!\/)/.test(raw) ? raw : '/founder/command-centre'
}

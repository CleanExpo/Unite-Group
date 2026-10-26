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

const DEFAULT_NEXT = '/founder/command-centre'

/**
 * Only same-site relative paths. Rejects protocol-relative //host, backslashes
 * (browsers treat /\\host as //host), control characters, and anything that
 * resolves to a different origin.
 */
export function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_NEXT
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return DEFAULT_NEXT
  const base = 'https://same-origin.invalid'
  try {
    const url = new URL(raw, base)
    if (url.origin !== base) return DEFAULT_NEXT
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return DEFAULT_NEXT
  }
}

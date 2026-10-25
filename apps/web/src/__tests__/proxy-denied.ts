/**
 * What a signed-out visitor gets at a path the site does not serve to them: the sign-in redirect for a private area,
 * or the not-found page for an address that is not a public page (go-live audit D11). Never the page itself.
 */
export function deniedTo(res: Response): '/auth/login' | 'not-found' | 'served' {
  const location = res.headers.get('location')
  if (location !== null) return new URL(location).pathname.replace(/\/$/, '') === '/auth/login' ? '/auth/login' : 'served'
  return res.status === 404 && (res.headers.get('x-middleware-rewrite') ?? '') !== '' ? 'not-found' : 'served'
}

// Server-safe: the thanks page (a Server Component) calls this. It must NOT live in intake-form.tsx, which is
// 'use client': calling a function exported from a client module on the server throws, and /cards/thanks 500ed.
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{1,200}$/

type Params = Record<string, string | string[] | undefined>

/** The checkout session id from the page URL: ?session_id= (Stripe's redirect placeholder). A ?ref= label is ignored. */
export function checkoutSessionId(params: Params): string | null {
  const v = params.session_id
  return typeof v === 'string' && SESSION_ID.test(v) ? v : null
}

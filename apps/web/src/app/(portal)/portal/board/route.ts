import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { signInPath } from '@/lib/portal/changes/access'
import { BOARD_PATH, decideBoardAccess, withScriptNonce } from '@/lib/portal/board/documents'
import { getPortalOwner } from '@/lib/portal/owner'
import { PORTAL_VERIFY_PATH } from '@/lib/portal/paths'
import { getUser } from '@/lib/supabase/server'

// The board concept page for the signed-in member's tenant (IAQ Magazine). A route handler, not a page, because the
// document is a complete HTML page of its own; frames are refused site-wide (frame-ancestors 'none'), so it cannot be
// embedded. This handler guards itself, like every portal page: the proxy only sends signed-out visitors to sign in.

export const dynamic = 'force-dynamic'

const PRIVATE = { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' }

// A small fixed notice: no user data goes into it, so nothing needs escaping. Inline styles only (no script).
function notice(status: number, heading: string, text: string): Response {
  const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${heading} | Unite Group</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1014;color:#e8eaed;font:16px/1.6 system-ui,sans-serif"><main style="max-width:28rem;padding:2rem"><h1 style="font-size:1.5rem;margin:0 0 .75rem">${heading}</h1><p style="margin:0 0 1.5rem;color:#b4b9c2">${text}</p><a href="/portal" style="color:#2dbb57">Go to your portal</a></main></body></html>`
  return new Response(html, { status, headers: { ...PRIVATE, 'content-type': 'text/html; charset=utf-8' } })
}

export async function GET(request: Request): Promise<Response> {
  const user = await getUser()
  const at = (path: string) => NextResponse.redirect(new URL(path, request.url), { headers: PRIVATE })
  if (!user) return at(signInPath(BOARD_PATH))

  let owner
  try {
    owner = await getPortalOwner()
  } catch {
    // A failed membership read must never look like "no portal", and never serve the page.
    return notice(503, 'Please try again', 'We could not check your portal just now. Please try again in a minute.')
  }

  const access = decideBoardAccess(true, owner)
  if (access.kind === 'sign_in') return at(signInPath(BOARD_PATH))
  if (access.kind === 'verify_second_factor') return at(`${PORTAL_VERIFY_PATH}?redirectTo=${encodeURIComponent(BOARD_PATH)}`)
  if (access.kind === 'not_found') return notice(404, 'Not part of your portal', 'This page is not part of your portal.')

  const html = await readFile(join(process.cwd(), access.document.file), 'utf8')
  const nonce = (await headers()).get('x-nonce')
  return new Response(withScriptNonce(html, nonce), {
    status: 200,
    headers: { ...PRIVATE, 'content-type': 'text/html; charset=utf-8' },
  })
}

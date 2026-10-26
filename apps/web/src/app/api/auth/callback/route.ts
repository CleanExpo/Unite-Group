// src/app/api/auth/callback/route.ts
// Supabase OAuth callback — exchanges auth code for session (PKCE flow)
// Handles: Google SSO login, any future OAuth providers

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { EmailOtpType } from '@supabase/supabase-js'

const EMAIL_OTP_TYPES = new Set(['magiclink', 'email', 'signup', 'recovery', 'invite', 'email_change'])

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const otpType = searchParams.get('type')
  const providerError = searchParams.get('error')
  const providerErrorDescription = searchParams.get('error_description')
  const rawNext = searchParams.get('next') ?? '/founder/command-centre'
  // Prevent open redirect: only allow relative paths (must start with / but not //)
  const next = /^\/(?!\/)/.test(rawNext) ? rawNext : '/founder/command-centre'

  if (providerError) {
    const loginUrl = new URL('/auth/login', origin)
    loginUrl.searchParams.set('error', providerErrorDescription || providerError)
    loginUrl.searchParams.set('redirectTo', next)
    return NextResponse.redirect(loginUrl)
  }

  const hasOtp = Boolean(tokenHash && otpType && EMAIL_OTP_TYPES.has(otpType))

  if (code || hasOtp) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: otpType as EmailOtpType })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[Supabase auth] Callback session exchange failed:', error.message)
  } else {
    // No code / token_hash: may be an implicit-flow magic link whose session is
    // in the URL #fragment (never sent to the server). Browsers carry the
    // fragment across this redirect, so the client confirm page can pick it up.
    const confirmUrl = new URL('/auth/confirm', origin)
    confirmUrl.searchParams.set('next', next)
    return NextResponse.redirect(confirmUrl)
  }

  const loginUrl = new URL('/auth/login', origin)
  loginUrl.searchParams.set('error', 'oauth_failed')
  loginUrl.searchParams.set('redirectTo', next)
  return NextResponse.redirect(loginUrl)
}

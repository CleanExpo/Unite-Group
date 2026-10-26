/**
 * Options for the founder Google sign-in (Supabase signInWithOAuth).
 *
 * `prompt: 'select_account'` forces Google's account chooser, so a browser
 * signed in to several Google accounts never silently picks the default one.
 */
export function buildGoogleSignInOptions(redirectTo: string) {
  return {
    redirectTo,
    queryParams: { prompt: 'select_account' },
  }
}

/**
 * Options for the passwordless "Email me a sign-in link" fallback
 * (Supabase signInWithOtp). Never creates a new account: only existing,
 * allow-listed founders can use it.
 */
export function buildEmailLinkOptions(emailRedirectTo: string) {
  return {
    emailRedirectTo,
    shouldCreateUser: false,
  }
}

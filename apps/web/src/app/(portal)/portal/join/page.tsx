import { isAal2 } from '@/lib/auth/mfa'
import { createClient, getUser } from '@/lib/supabase/server'

import { JoinSteps, type JoinStep } from './join-steps'
import styles from './join.module.css'

export const dynamic = 'force-dynamic'

/**
 * /portal/join?code=...  A business owner claims their portal with the invite code they were sent.
 * Steps: have a code, sign in with an email link, confirm with an authenticator or an emailed code, then claim.
 * Signing in alone gives no access: the claim needs a second-factor (aal2) session, and the database checks it.
 */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const params = await searchParams
  const code = typeof params.code === 'string' ? params.code.slice(0, 64) : ''
  const user = await getUser()

  let aal2 = false
  if (user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    aal2 = isAal2(data?.currentLevel === 'aal2' ? 'aal2' : null)
  }

  const step: JoinStep = !code ? 'code' : !user ? 'sign-in' : !aal2 ? 'second-factor' : 'claim'

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Open your business portal</h1>
      <p className={styles.lead}>Your invite gives you the portal on the free plan. Nothing is charged.</p>
      <JoinSteps step={step} code={code} email={user?.email ?? null} />
    </main>
  )
}

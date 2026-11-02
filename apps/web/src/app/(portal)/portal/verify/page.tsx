import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { VERIFY_STEP_BODY, VERIFY_STEP_TITLE } from '@/components/portal/portal-copy'
import { PortalShell } from '@/components/portal/portal-shell'
import s from '@/components/portal/portal.module.css'
import { isAal2 } from '@/lib/auth/mfa'
import { signInPath } from '@/lib/portal/changes/access'
import { safePortalReturn } from '@/lib/portal/paths'
import { createClient, getUser } from '@/lib/supabase/server'

import { SecondFactorStep } from '../join/second-factor'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Confirm it is you | Unite Group',
  robots: { index: false, follow: false },
}

/**
 * /portal/verify?redirectTo=/portal/...  An owner signed in with the emailed link (aal1) confirms the second step here.
 * Signed out -> sign in, then back to the page they wanted. Already aal2 -> straight to that page. Otherwise the same
 * authenticator step the invite claim uses; on success it refreshes, this page sees aal2 and sends them on.
 * The return path is only ever a portal page (safePortalReturn), so this cannot be used to bounce anyone elsewhere.
 */
export default async function PortalVerifyPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string | string[] }> }) {
  const params = await searchParams
  const target = safePortalReturn(typeof params.redirectTo === 'string' ? params.redirectTo : null)
  const user = await getUser()
  if (!user) redirect(signInPath(target))

  const supabase = await createClient()
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (isAal2(data?.currentLevel === 'aal2' ? 'aal2' : null)) redirect(target)

  return (
    <PortalShell kicker="Owner portal" title="Confirm it is you." lead="One more step keeps your portal safe, even if someone gets into your email." signedInAs={user.email ?? null}>
      <section className={s.section} aria-labelledby="join-step">
        <div className={s.wrap}>
          <div className={s.panel}>
            <SecondFactorStep email={user.email ?? null} title={VERIFY_STEP_TITLE} body={VERIFY_STEP_BODY} />
          </div>
        </div>
      </section>
    </PortalShell>
  )
}

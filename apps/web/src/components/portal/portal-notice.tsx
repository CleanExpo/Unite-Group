import { PORTAL_VERIFY_PATH } from '@/lib/portal/changes/access'
import { PORTAL_PATH } from '@/lib/portal/paths'

import { PortalShell } from './portal-shell'
import s from './portal.module.css'

/** A signed-in visitor with no portal yet. Friendly, and nothing from the founder area. */
export function NoPortalYet({ email }: { email: string | null }) {
  return (
    <PortalShell
      kicker="Owner portal"
      title="No portal here yet."
      lead="Your portal opens with the invite code we send you. If you are expecting one, it is on its way."
      signedInAs={email}
    >
      <section className={s.section} aria-label="What to do next">
        <div className={s.wrap}>
          <div className={s.panel}>
            <p className={s.panelText}>
              {email ? <>You are signed in as <strong>{email}</strong>. </> : null}
              If your invite was sent to a different email, sign out and sign in with that one.
            </p>
            <div className={s.actions}>
              <a href="/portal/join" className={s.ctaPrimary}>I have an invite code</a>
              <a href="/#contact" className={s.ctaSecondary}>Ask us a question</a>
            </div>
          </div>
        </div>
      </section>
    </PortalShell>
  )
}

/** An owner signed in with the emailed link only. The portal needs the second step (the authenticator app code) too. */
export function ConfirmItIsYou({ email }: { email: string | null }) {
  return (
    <PortalShell
      kicker="Owner portal"
      title="Confirm it is you."
      lead="For your security, the portal needs your second sign-in step: the code from your authenticator app."
      signedInAs={email}
    >
      <section className={s.section} aria-label="Confirm it is you">
        <div className={s.wrap}>
          <div className={s.panel} role="status">
            <div className={s.actions}>
              <a href={`${PORTAL_VERIFY_PATH}?redirectTo=${encodeURIComponent(PORTAL_PATH)}`} className={s.ctaPrimary}>
                Confirm it is me
              </a>
            </div>
          </div>
        </div>
      </section>
    </PortalShell>
  )
}

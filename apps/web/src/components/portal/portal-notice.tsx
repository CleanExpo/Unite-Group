import { PortalShell } from './portal-shell'
import s from './portal.module.css'

/** A signed-in visitor who does not own a card yet. Friendly, and nothing from the founder area. */
export function NoPortalYet({ email }: { email: string | null }) {
  return (
    <PortalShell
      kicker="Owner portal"
      title="No portal here yet."
      lead="Your portal opens once your living card is set up. If you have ordered one, we are on it."
      signedInAs={email}
    >
      <section className={s.section} aria-label="What to do next">
        <div className={s.wrap}>
          <div className={s.panel}>
            <p className={s.panelText}>
              {email ? <>You are signed in as <strong>{email}</strong>. </> : null}
              If you ordered your card with a different email, sign out and sign in with that one.
            </p>
            <div className={s.actions}>
              <a href="/cards" className={s.ctaPrimary}>See the living card</a>
              <a href="/#contact" className={s.ctaSecondary}>Ask us a question</a>
            </div>
          </div>
        </div>
      </section>
    </PortalShell>
  )
}

/** The ownership check could not run. Never shown as "no portal": that would tell an owner they have nothing. */
export function PortalUnavailable({ email }: { email: string | null }) {
  return (
    <PortalShell
      kicker="Owner portal"
      title="We could not open your portal."
      lead="Something on our side did not answer just now. Please try again in a minute."
      signedInAs={email}
    >
      <section className={s.section} aria-label="Try again">
        <div className={s.wrap}>
          <div className={s.panel} role="alert">
            <p className={s.panelText}>Your details are safe. Nothing was changed.</p>
            <div className={s.actions}>
              <a href="/portal" className={s.ctaPrimary}>Try again</a>
              <a href="/#contact" className={s.ctaSecondary}>Contact us</a>
            </div>
          </div>
        </div>
      </section>
    </PortalShell>
  )
}

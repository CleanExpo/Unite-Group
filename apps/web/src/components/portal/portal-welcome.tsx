import { ArrowUpRight, ClipboardList, Link2, PenLine, Search, ShieldCheck, Star, type LucideIcon } from 'lucide-react'

import { NO_PASSWORD_LINE, PORTAL_STEPS, STATUS_LABEL, STATUS_NOTE, type PortalStep } from './portal-copy'
import { PortalShell } from './portal-shell'
import s from './portal.module.css'

const STEP_ICON: Record<PortalStep['id'], LucideIcon> = {
  intake: ClipboardList,
  connect: Link2,
  audit: Search,
  profile: PenLine,
  reviews: Star,
}

/** The owner's welcome page: their card(s), the no-password promise and the five-step checklist. */
export function PortalWelcome({ name, email, cardSlugs }: { name: string | null; email: string | null; cardSlugs: string[] }) {
  return (
    <PortalShell
      kicker="Your portal"
      title={name ? `Welcome, ${name}.` : 'Welcome to your portal.'}
      lead="Five steps to get your business found and chosen. We do the heavy lifting and show you where things are up to."
      signedInAs={email}
    >
      <section className={s.section} aria-labelledby="portal-cards">
        <div className={s.wrap}>
          <div className={s.split}>
            <div className={s.panel}>
              <p className={s.eyebrow} id="portal-cards">{cardSlugs.length === 1 ? 'Your card' : 'Your cards'}</p>
              <ul className={s.cardList}>
                {cardSlugs.map((slug) => (
                  <li key={slug}>
                    <a href={`/c/${slug}`} className={s.cardLink}>
                      <span className={s.cardPath}>unite-group.in/c/{slug}</span>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${s.panel} ${s.promise}`}>
              <ShieldCheck size={22} aria-hidden="true" className={s.promiseIcon} />
              <p className={s.promiseText} data-testid="portal-no-password">{NO_PASSWORD_LINE}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="portal-steps">
        <div className={s.wrap}>
          <header className={s.sectionHead}>
            <p className={s.eyebrow}>Getting started</p>
            <h2 id="portal-steps" className={s.h2}>Your checklist</h2>
            <p className={s.note}>{STATUS_NOTE}</p>
          </header>
          <ol className={s.steps}>
            {PORTAL_STEPS.map((step, index) => {
              const Icon = STEP_ICON[step.id]
              return (
                <li key={step.id} className={s.step} data-status={step.status}>
                  <span className={s.stepNo}>{String(index + 1).padStart(2, '0')}</span>
                  <Icon size={22} aria-hidden="true" className={s.stepIcon} />
                  <div className={s.stepBody}>
                    <h3 className={s.stepTitle}>{step.title}</h3>
                    <p className={s.stepText}>{step.body}</p>
                    {step.id === 'connect' ? <p className={s.stepPromise}>{NO_PASSWORD_LINE}</p> : null}
                  </div>
                  <span className={s.status}>{STATUS_LABEL[step.status]}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </section>
    </PortalShell>
  )
}

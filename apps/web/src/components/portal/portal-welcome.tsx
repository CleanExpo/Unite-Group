import { ArrowRight, ClipboardList, LayoutTemplate, Link2, PenLine, Rocket, ShieldCheck, UserCheck, type LucideIcon } from 'lucide-react'

import { NO_PASSWORD_LINE, PLAN_LABEL, PORTAL_STEPS, STATUS_LABEL, STATUS_NOTE, type PortalStep } from './portal-copy'
import { PortalShell } from './portal-shell'
import s from './portal.module.css'

const STEP_ICON: Record<PortalStep['id'], LucideIcon> = {
  account: UserCheck,
  details: ClipboardList,
  connections: Link2,
  build: LayoutTemplate,
  changes: PenLine,
  launch: Rocket,
}

/** The owner's welcome page: their plan, the promise line and the pipeline checklist. Same for every business. */
export function PortalWelcome({
  email,
  plan,
  board = null,
}: {
  email: string | null
  plan: keyof typeof PLAN_LABEL
  /** A private board page for this tenant (IAQ Magazine), shown first when there is one. */
  board?: { title: string; href: string } | null
}) {
  return (
    <PortalShell
      kicker="Your portal"
      title="Welcome to your portal."
      lead="Six steps from first hello to your new website going live. We do the heavy lifting and show you where things are up to."
      signedInAs={email}
    >
      {board ? (
        <section className={s.section} aria-labelledby="portal-board">
          <div className={s.wrap}>
            <div className={s.panel}>
              <p className={s.eyebrow} id="portal-board">For the board</p>
              <a href={board.href} className={s.stepLink} data-testid="portal-board-link">
                {board.title}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      ) : null}

      <section className={s.section} aria-labelledby="portal-plan">
        <div className={s.wrap}>
          <div className={s.split}>
            <div className={s.panel}>
              <p className={s.eyebrow} id="portal-plan">Your plan</p>
              <p className={s.planName} data-testid="portal-plan">{PLAN_LABEL[plan]}</p>
            </div>
            <div className={`${s.panel} ${s.promise}`}>
              <ShieldCheck size={22} aria-hidden="true" className={s.promiseIcon} />
              <p className={s.promiseText} data-testid="portal-promise">{NO_PASSWORD_LINE}</p>
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
                    {step.id === 'connections' ? <p className={s.stepPromise}>{NO_PASSWORD_LINE}</p> : null}
                    {step.href ? (
                      <a href={step.href} className={s.stepLink}>
                        {step.linkText}
                        <ArrowRight size={16} aria-hidden="true" />
                      </a>
                    ) : null}
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

// Clean 1-2-3 hero for the Command Centre. The new uncluttered front: the user
// instantly sees the three steps and what each does. The dense console panels
// move into a "System detail" expander below. Green + orange, light, distinct
// from the generic teal/violet AI look.

import type { CSSProperties } from 'react'
import styles from './CommandSteps.module.css'

interface Step {
  n: number
  title: string
  text: string
  accent: string
  numbg: string
  numfg: string
}

const STEPS: Step[] = [
  { n: 1, title: 'Describe it', text: 'Type what you need in plain words — a post, an email, a build, a campaign.', accent: '#37b24d', numbg: '#e7f7ec', numfg: '#2b8a3e' },
  { n: 2, title: 'Agents build it', text: 'The system picks the right AI and does the work. You watch it happen.', accent: '#f59f00', numbg: '#fff4e0', numfg: '#e8590c' },
  { n: 3, title: 'Review & ship', text: 'Approve the result with one click, or send it back. Nothing ships without you.', accent: '#37b24d', numbg: '#e7f7ec', numfg: '#2b8a3e' },
]

export function CommandSteps() {
  return (
    <section className={styles.hero} aria-label="How to use Mission Control">
      <p className={styles.kicker}>Mission control</p>
      <h1 className={styles.title}>Tell it what you need. It does the rest.</h1>
      <p className={styles.sub}>Three steps. Everything else stays out of the way until you ask for it.</p>

      <div className={styles.steps}>
        {STEPS.map((s) => (
          <article
            key={s.n}
            className={styles.card}
            style={{ '--accent': s.accent, '--numbg': s.numbg, '--numfg': s.numfg } as CSSProperties}
          >
            <div className={styles.num}>{s.n}</div>
            <h2 className={styles.cardTitle}>{s.title}</h2>
            <p className={styles.cardText}>{s.text}</p>
          </article>
        ))}
      </div>

      <p className={styles.note}>Provider usage, repos, agent logs and settings live in “System detail” below — not crowding this screen.</p>
    </section>
  )
}

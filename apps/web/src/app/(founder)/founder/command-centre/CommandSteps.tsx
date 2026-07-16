'use client'

// Clean 1-2-3 hero for the Command Centre. The new uncluttered front: the user
// instantly sees the three steps and what each does — AND each card now WORKS:
// step 1 scrolls to the Idea Console on this page; steps 2 and 3 jump to the
// task-queue / in-progress-PRs sections that live on the Operations deck
// (UNI-2392 — the old idea-intake/task-queue/in-progress-prs anchors did not
// exist on this page, so every click was a silent no-op).
// Green + orange, light, distinct from the generic teal/violet look.

import type { CSSProperties } from 'react'
import styles from './CommandSteps.module.css'

interface Step {
  n: number
  title: string
  text: string
  /**
   * Where this step jumps: an in-page section id, or (when it starts with '/')
   * a route — the real section for steps 2/3 lives on the Operations deck.
   */
  target: string
  accent: string
  numbg: string
  numfg: string
}

const STEPS: Step[] = [
  { n: 1, title: 'Describe it', text: 'Type what you need in plain words — a post, an email, a build, a campaign.', target: 'idea-console', accent: '#37b24d', numbg: '#e7f7ec', numfg: '#2b8a3e' },
  { n: 2, title: 'Agents build it', text: 'The system picks the right AI and does the work. You watch it happen.', target: '/founder/command-centre/operations#task-queue', accent: '#f59f00', numbg: '#fff4e0', numfg: '#e8590c' },
  { n: 3, title: 'Review & ship', text: 'Approve the result with one click, or send it back. Nothing ships without you.', target: '/founder/command-centre/operations#in-progress-prs', accent: '#37b24d', numbg: '#e7f7ec', numfg: '#2b8a3e' },
]

function goToStep(target: string) {
  if (target.startsWith('/')) {
    // Cross-route step — the section lives on another deck; native navigation
    // lands on the hash anchor there.
    window.location.assign(target)
    return
  }
  const el = document.getElementById(target)
  if (!el) {
    // Honest failure over a silent no-op (UNI-2392).
    console.warn(`[CommandSteps] scroll target #${target} not found on this page`)
    return
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const cardReset: CSSProperties = { appearance: 'none', textAlign: 'left', width: '100%', cursor: 'pointer', font: 'inherit' }

export function CommandSteps() {
  return (
    <section className={styles.hero} aria-label="How to use Mission Control">
      <p className={styles.kicker}>Mission control</p>
      <h1 className={styles.title}>Tell it what you need. It does the rest.</h1>
      <p className={styles.sub}>Three steps. Click any step to jump straight to it.</p>

      <div className={styles.steps}>
        {STEPS.map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => goToStep(s.target)}
            className={styles.card}
            style={{ ...cardReset, '--accent': s.accent, '--numbg': s.numbg, '--numfg': s.numfg } as CSSProperties}
          >
            <div className={styles.num}>{s.n}</div>
            <h2 className={styles.cardTitle}>{s.title}</h2>
            <p className={styles.cardText}>{s.text}</p>
          </button>
        ))}
      </div>

      <p className={styles.note}>Provider usage, repos, agent logs and settings live on the Operations, Portfolio, Providers and Knowledge decks — not crowding this screen.</p>
    </section>
  )
}

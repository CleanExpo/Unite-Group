import { PILLARS, pillarPath, type Pillar } from '@/lib/public-site'

import { BUSINESSES } from './businesses'
import s from './public.module.css'
import t from './story.module.css'

// The story under the hero: five beats, each with a visual and real HTML text, each linking to its pillar.
// The businesses are the light coming in, Unite Group is the lens, and Nexus is the one focus.
// Everything is readable with no script and no motion: the frames are static, and scroll-driven motion
// is an enhancement that the stylesheet switches off under prefers-reduced-motion.
type Beat = {
  key: string
  label: string
  pillar: Pillar['slug']
  title: string
  body: string
  /** Which lens part this beat lights up. */
  part: 'none' | 'objective' | 'focus' | 'iris' | 'sensor'
}

export const BEATS: readonly Beat[] = [
  {
    key: 'businesses',
    label: 'Many businesses',
    pillar: 'visibility',
    title: 'Many businesses, each with its own leads, customers and jobs.',
    body: 'Each one keeps its own enquiries, customers and work in its own place.',
    part: 'none',
  },
  {
    key: 'visibility',
    label: 'Visibility',
    pillar: 'visibility',
    title: 'Visibility: the group sees every one of them.',
    body: 'One view across every business, so nothing sits out of sight.',
    part: 'objective',
  },
  {
    key: 'experience',
    label: 'Experience',
    pillar: 'experience',
    title: 'Experience: one standard way of serving customers.',
    body: 'The same careful standard, whichever business a customer meets first.',
    part: 'focus',
  },
  {
    key: 'conversion',
    label: 'Conversion',
    pillar: 'conversion',
    title: 'Conversion: every enquiry is caught and routed.',
    body: 'An enquiry from any business lands in one place and goes to the right one.',
    part: 'iris',
  },
  {
    key: 'intelligence',
    label: 'Intelligence',
    pillar: 'intelligence',
    title: 'Intelligence: one CRM, one picture.',
    body: 'Nexus is the one CRM and operating system where every lead, customer, job and number across the group lands and is run, by AI agents. New businesses plug in.',
    part: 'sensor',
  },
]

// [left %, top %] of each business chip, per beat. Beats 0 and 1 show the names; beats 2 and 3 show points.
const POSITIONS: readonly (readonly [number, number][])[] = [
  [[2, 6], [12, 20], [3, 36], [14, 50], [4, 64], [13, 78], [5, 90]],
  [[16, 26], [20, 33], [17, 40], [21, 47], [18, 54], [22, 61], [19, 68]],
  [[59, 24], [62, 32], [59, 40], [62, 48], [59, 56], [62, 64], [59, 72]],
  [[68, 44], [71, 46], [74, 48], [70, 50], [73, 52], [69, 54], [72, 56]],
  [],
]

function Lens({ part }: { part: Beat['part'] }) {
  const cls = (p: Beat['part']) => `${t.part} ${part === p ? t.active : ''}`
  return (
    <svg className={t.lens} viewBox="0 0 300 190" aria-hidden="true" focusable="false">
      <ellipse cx="140" cy="176" rx="130" ry="8" className={t.ground} />
      <rect x="10" y="45" width="230" height="110" rx="10" className={t.barrel} />
      <path className={cls('objective')} d="M34,62 Q64,100 34,138 Q8,100 34,62 Z" />
      <g className={cls('focus')}>
        <rect x="80" y="45" width="14" height="22" rx="2" />
        <rect x="80" y="133" width="14" height="22" rx="2" />
      </g>
      <g className={cls('iris')}>
        <rect x="130" y="45" width="8" height="40" />
        <rect x="130" y="115" width="8" height="40" />
      </g>
      <rect className={cls('sensor')} x="206" y="62" width="8" height="76" rx="1" />
      {part === 'focus' && (
        <g className={t.wire}>
          <rect x="62" y="2" width="70" height="38" rx="3" />
          <line x1="62" y1="12" x2="132" y2="12" />
          <rect x="68" y="17" width="26" height="16" />
          <line x1="100" y1="19" x2="126" y2="19" />
          <line x1="100" y1="25" x2="120" y2="25" />
          <line x1="100" y1="31" x2="126" y2="31" />
        </g>
      )}
    </svg>
  )
}

function Focus() {
  return (
    <svg className={t.phone} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="3" />
      <circle className={t.ring} cx="12" cy="12" r="8" />
    </svg>
  )
}

function Visual({ index, part }: { index: number; part: Beat['part'] }) {
  return (
    <div className={t.visual} data-beat-visual={index} aria-hidden="true">
      {POSITIONS[index].map(([left, top], i) => (
        // an unlabelled shape per business: names live only in the business list below (Phill 25/10/2026)
        <span key={i} className={t.chip} data-chip style={{ left: `${left}%`, top: `${top}%` }} />
      ))}
      <Lens part={part} />
      {index === 4 && (
        <span className={t.call}>
          <Focus />
          Nexus
        </span>
      )}
    </div>
  )
}

export function Story() {
  return (
    <section id="story" className={`${s.section} ${t.story}`} aria-labelledby="story-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>The idea</p>
        <h2 id="story-title" className={s.h2}>
          How the group fits together.
        </h2>
        <ol className={t.beats}>
          {BEATS.map((beat, i) => {
            const name = PILLARS.find((p) => p.slug === beat.pillar)!.name
            return (
              <li key={beat.key} className={t.beat} data-beat={beat.key}>
                <Visual index={i} part={beat.part} />
                <div className={t.text}>
                  <p className={s.eyebrow}>
                    {i + 1} of 5 · {beat.label}
                  </p>
                  <h3>{beat.title}</h3>
                  <p>{beat.body}</p>
                  {i > 0 && <span className={s.status}>Coming</span>}
                  <p>
                    <a href={pillarPath(beat.pillar)}>More on {name}</a>
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
        <h3 className={t.listTitle}>The businesses</h3>
        <ul className={t.businesses} data-businesses>
          {BUSINESSES.map((b) => (
            <li key={b.name}>{b.url ? <a href={b.url} rel="noopener">{b.name}</a> : b.name}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

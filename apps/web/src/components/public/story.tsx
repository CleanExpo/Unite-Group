import { PILLARS, pillarPath, type Pillar } from '@/lib/public-site'

import { ALSO, TILES } from './businesses'
import s from './public.module.css'
import { ShardAssembly } from './shard-assembly'
import t from './story.module.css'

// "How the group fits together": the six businesses are six shards that lock into the U, with Nexus, the CRM we
// are building, in the middle. Under it, the five beats. Everything is readable with no script and no motion: the
// static markup IS the assembled U, and the scroll assembly is an enhancement the stylesheet switches off under
// prefers-reduced-motion.
type Beat = {
  key: string
  label: string
  pillar: Pillar['slug']
  title: string
  body: string
}

export const BEATS: readonly Beat[] = [
  {
    key: 'businesses',
    label: 'Many businesses',
    pillar: 'visibility',
    title: 'Many businesses, each with its own leads, customers and jobs.',
    body: 'Each one keeps its own enquiries, customers and work in its own place.',
  },
  {
    key: 'visibility',
    label: 'Visibility',
    pillar: 'visibility',
    title: 'Visibility: seeing every one of them.',
    body: 'What we are building: one view across every business, so nothing sits out of sight.',
  },
  {
    key: 'experience',
    label: 'Experience',
    pillar: 'experience',
    title: 'Experience: one standard way of serving customers.',
    body: 'What we are building: the same careful standard, whichever business a customer meets first.',
  },
  {
    key: 'conversion',
    label: 'Conversion',
    pillar: 'conversion',
    title: 'Conversion: every enquiry caught and routed.',
    body: 'What we are building: an enquiry from any business lands in one place and goes to the right one.',
  },
  {
    key: 'intelligence',
    label: 'Intelligence',
    pillar: 'intelligence',
    title: 'Intelligence: one CRM, one picture.',
    body: 'Nexus is the CRM and operating system we are building for the whole group: every lead, customer, job and number in one place, run with AI agents, with room for new businesses to plug in.',
  },
]

export function Story() {
  return (
    <section id="group" className={`${s.section} ${t.story}`} aria-labelledby="story-title">
      <div className={s.wrap}>
        <h2 id="story-title" className={s.h2}>
          How the group fits together.
        </h2>
        <p className={s.lead}>Six businesses, each with its own name and customers, and one system we are building to bring them together.</p>

        <ShardAssembly>
          <ul className={t.shards} data-businesses>
            {TILES.map((b, i) => (
              <li key={b.name} className={`${t.shard} ${t[`s${i}` as 's0']}`} data-tile data-shard={i}>
                <a href={b.url} rel="noopener" className={t.tile}>
                  {b.logo && (
                    <span className={t.plate}>
                      <img src={b.logo} alt="" width={b.logo.includes('carsi') ? 360 : 192} height={b.logo.includes('carsi') ? 91 : 192} loading="lazy" decoding="async" />
                    </span>
                  )}
                  <span className={t.label}>
                    <span className={t.name} {...(b.logo ? {} : { 'data-wordmark': '' })}>
                      {b.name}
                    </span>
                    {b.line && <span className={t.line}>{b.line}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className={t.nexus} data-nexus>
            <strong>Nexus</strong>
            <span>the CRM we are building</span>
          </p>
        </ShardAssembly>

        <ul className={t.more} data-businesses-more>
          {ALSO.map((b) => (
            <li key={b.name}>{b.url ? <a href={b.url} rel="noopener">{b.name}</a> : b.name}</li>
          ))}
        </ul>

        <ol className={t.beats}>
          {BEATS.map((beat, i) => {
            const name = PILLARS.find((p) => p.slug === beat.pillar)!.name
            return (
              <li key={beat.key} className={t.beat} data-beat={beat.key}>
                <div className={t.text}>
                  <p className={t.step}>
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
      </div>
    </section>
  )
}

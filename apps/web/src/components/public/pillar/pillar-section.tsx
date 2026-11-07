import type { ReactNode } from 'react'

import pp from './pillar-solution.module.css'

export type PillarSectionTone = 'default' | 'alt' | 'hero' | 'close'

export function PillarSection({
  tone = 'default',
  labelledBy,
  children,
}: {
  tone?: PillarSectionTone
  labelledBy?: string
  children: ReactNode
}) {
  const toneClass =
    tone === 'hero' ? pp.toneHero : tone === 'alt' ? pp.toneAlt : tone === 'close' ? pp.toneClose : pp.toneDefault
  return (
    <section
      className={[pp.flow, toneClass].join(' ')}
      {...(labelledBy ? { 'aria-labelledby': labelledBy } : {})}
    >
      {children}
    </section>
  )
}

export function PillarHeading({
  id,
  label,
  title,
  lead,
}: {
  id: string
  label: string
  title: string
  lead?: string
}) {
  return (
    <header className={pp.heading}>
      <p className={pp.label}>{label}</p>
      <h2 id={id} className={pp.h2}>
        {title}
      </h2>
      {lead ? <p className={pp.lede}>{lead}</p> : null}
    </header>
  )
}

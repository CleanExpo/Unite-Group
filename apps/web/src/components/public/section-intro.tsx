import type { ReactNode } from 'react'

import si from './section-intro.module.css'

type Props = {
  id?: string
  eyebrow?: string
  title: string
  lead?: ReactNode
  as?: 'h1' | 'h2'
  align?: 'left' | 'center'
  className?: string
}

/** Shared section header — one typographic voice across the home page. */
export function SectionIntro({ id, eyebrow, title, lead, as = 'h2', align = 'left', className }: Props) {
  const Tag = as
  return (
    <header className={`${si.head} ${align === 'center' ? si.center : ''} ${className ?? ''}`}>
      {eyebrow ? <p className={si.eyebrow}>{eyebrow}</p> : null}
      <Tag id={id} className={si.title}>
        {title}
      </Tag>
      {lead ? <p className={si.lead}>{lead}</p> : null}
    </header>
  )
}

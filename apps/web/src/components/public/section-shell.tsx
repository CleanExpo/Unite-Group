import type { ReactNode } from 'react'

import s from './public.module.css'
import sh from './section-shell.module.css'

export type SectionPattern =
  | 'orient'
  | 'spotlight'
  | 'roadmap'
  | 'gallery'
  | 'system'
  | 'process'
  | 'cinema'
  | 'answers'
  | 'reach'

type Props = {
  id: string
  pattern: SectionPattern
  children: ReactNode
  /** Section index label (01–09), decorative only */
  sequence?: string
  position?: boolean
  className?: string
  'aria-labelledby'?: string
  'aria-label'?: string
}

/** Wraps home sections with a shared rail + unique atmospheric pattern. */
export function SectionShell({
  id,
  pattern,
  children,
  sequence,
  position = false,
  className,
  'aria-labelledby': labelledBy,
  'aria-label': label,
}: Props) {
  return (
    <section
      {...(position ? { 'data-position': '' } : {})}
      id={id}
      data-section={pattern}
      className={`${s.section} ${sh.shell} ${sh[pattern]} ${className ?? ''}`}
      aria-labelledby={labelledBy}
      aria-label={label}
    >
      <div className={sh.atmosphere} aria-hidden="true" />
      {sequence ? <span className={sh.sequence} data-seq={sequence} aria-hidden="true" /> : null}
      <div className={sh.rail} aria-hidden="true" />
      <div className={`${s.wrap} ${sh.inner}`}>{children}</div>
    </section>
  )
}

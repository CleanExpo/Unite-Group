import type { ReactNode } from 'react'

import ld from './legal-document.module.css'

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={ld.section}>
      <h2 className={ld.sectionTitle}>{title}</h2>
      <div className={ld.sectionBody}>{children}</div>
    </section>
  )
}

export function LegalSubHeading({ children }: { children: ReactNode }) {
  return <h3 className={ld.subHeading}>{children}</h3>
}

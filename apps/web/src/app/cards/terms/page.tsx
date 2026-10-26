import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { SiteNav } from '@/components/public/site-nav'
import { companyAbnLabel } from '@/lib/legal/company'

import { CARD_ORDER_TERMS } from './terms-content'
import s from './terms.module.css'

export const metadata: Metadata = {
  title: 'Card order terms | Unite Group',
  description: 'The terms for ordering a Living Business Card from Unite Group.',
  alternates: { canonical: 'https://unite-group.in/cards/terms' },
  robots: { index: true, follow: true },
}

type Block =
  | { kind: 'h1' | 'h2' | 'p' | 'lead'; text: string }
  | { kind: 'list'; items: string[] }

function parse(markdown: string): Block[] {
  const blocks: Block[] = []
  for (const line of markdown.split('\n')) {
    if (line.trim() === '') continue
    const item = /^\d+\. (.*)$/.exec(line)
    const last = blocks[blocks.length - 1]
    if (line.startsWith('## ')) blocks.push({ kind: 'h2', text: line.slice(3) })
    else if (line.startsWith('# ')) blocks.push({ kind: 'h1', text: line.slice(2) })
    else if (item) {
      if (last?.kind === 'list') last.items.push(item[1])
      else blocks.push({ kind: 'list', items: [item[1]] })
    } else if (/^\*\*.*\*\*$/.test(line)) blocks.push({ kind: 'lead', text: line.slice(2, -2) })
    else blocks.push({ kind: 'p', text: line })
  }
  return blocks
}

/** Points to the privacy policy at the end of section 13. Not part of the approved text. */
function PrivacyPointer() {
  return (
    <p>
      Read our <a href="/privacy-policy">privacy policy</a> for the full detail.
    </p>
  )
}

export default function CardTermsPage() {
  const abn = companyAbnLabel()
  const blocks = parse(CARD_ORDER_TERMS.replaceAll('{{ABN}}', abn))
  const out: ReactNode[] = []
  let inPrivacy = false
  blocks.forEach((b, i) => {
    if (inPrivacy && b.kind === 'h2') {
      out.push(<PrivacyPointer key="privacy-pointer" />)
      inPrivacy = false
    }
    if (b.kind === 'h1') out.push(<h1 key={i}>{b.text}</h1>)
    else if (b.kind === 'h2') {
      out.push(<h2 key={i}>{b.text}</h2>)
      inPrivacy = b.text.startsWith('13. ')
    } else if (b.kind === 'lead') {
      out.push(
        <p key={i}>
          <strong>{b.text}</strong>
        </p>,
      )
    } else if (b.kind === 'p') out.push(<p key={i}>{b.text}</p>)
    else if (b.kind === 'list')
      out.push(
        <ol key={i}>
          {b.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>,
      )
  })

  return (
    <div className={s.page}>
      <SiteNav />
      <nav className={s.nav} aria-label="Cards">
        <a href="/cards/order">Back to the order page</a>
      </nav>
      <main id="main" className={s.main}>
        <article className={s.article}>{out}</article>
      </main>
    </div>
  )
}

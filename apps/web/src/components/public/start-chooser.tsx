import s from './public.module.css'
import c from './start-chooser.module.css'

import { lowestCardPrice } from '@/lib/public-site'

// The one place the hero's primary step leads to (design-pass gaps 05.2 and 05.5). Five outcomes, one plain line each,
// no pictures. Diagnose is not live yet, so it says Coming; the Create tile is the only paid thing on sale.
const OPTIONS = [
  { key: 'discover', no: '01', name: 'Discover', href: '/pricing', line: 'See the Starter plan and add-ons' },
  { key: 'diagnose', no: '02', name: 'Diagnose', href: '/solutions/intelligence', line: 'A check of what is holding your business back', coming: true },
  { key: 'create', no: '03', name: 'Create', href: '/cards/order', line: '', paid: true },
  { key: 'results', no: '04', name: 'Explore results', href: '/cards', line: 'Watch the ten living cards we have made' },
  { key: 'talk', no: '05', name: 'Talk', href: '#contact', line: 'Ask a question and we reply by email' },
] as const

export function StartChooser() {
  // The card from-price shows only while a tier's payment link is live, the same gate as /pricing and the order page.
  const from = lowestCardPrice()
  const create = from ? `Order a living video card, from ${from}` : 'Ask us about a living video card'
  return (
    <section id="start" className={s.section} aria-labelledby="start-title">
      <div className={s.wrap}>
        <h2 id="start-title" className={s.h2}>
          Where do you want to start?
        </h2>
        <ol className={c.list}>
          {OPTIONS.map((o) => (
            <li key={o.key} className={c.item}>
              <a
                href={o.href}
                data-track="cta"
                data-track-label={`home-start-${o.key}`}
                className={`${c.tile} ${'paid' in o ? c.paid : ''}`}
              >
                <span className={c.no}>{o.no}</span>
                <span className={c.name}>{o.name}</span>
                <p className={c.line}>{o.key === 'create' ? create : o.line}</p>
                {'coming' in o && <span className={`${s.chip} ${c.coming}`}>Coming</span>}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

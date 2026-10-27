import s from './layout/public.module.css'
import c from './start-chooser.module.css'
import ps from './home-product-stack.module.css'

import { lowestCardPrice } from '@/lib/public-site'

const OPTIONS = [
  { key: 'discover', name: 'Pricing', href: '/pricing' },
  { key: 'diagnose', name: 'Nexus CRM', href: '/solutions/intelligence', coming: true },
  { key: 'create', name: 'Order a card', href: '/cards/order', paid: true },
  { key: 'results', name: 'Showroom', href: '/cards' },
  { key: 'talk', name: 'Ask a question', href: '#contact' },
] as const

export function StartChooser() {
  const from = lowestCardPrice()
  const createLabel = from ? `Order a card · from ${from}` : 'Order a card'
  return (
    <section id="start" className={`${s.section} ${ps.slice} ${ps.sliceJump}`} aria-label="Quick links">
      <div className={s.wrap}>
        <ol className={c.rail}>
          {OPTIONS.map((o) => (
            <li key={o.key}>
              <a
                href={o.href}
                data-track="cta"
                data-track-label={`home-start-${o.key}`}
                className={'paid' in o && o.paid ? c.paid : ''}
              >
                {o.key === 'create' ? createLabel : o.name}
                {'coming' in o && (
                  <span className={`${s.chip} ${c.coming}`} data-chip="coming">
                    Coming
                  </span>
                )}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

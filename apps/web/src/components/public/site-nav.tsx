import '@/styles/public-tokens.css'

import { PILLARS, pillarPath } from '@/lib/public-site'

import n from './site-nav.module.css'

/** The public contact address. unite-group.in has Google MX records (checked 26/10/2026, UNI-3034). */
export const CONTACT_EMAIL = 'contact@unite-group.in'
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`

export function SiteNav() {
  return (
    <header className={n.header}>
      <a href="#main" className={n.skipLink}>
        Skip to content
      </a>
      <div className={n.bar}>
        <a href="/" className={n.logo}>
          <img src="/landing/logos/unite-group-nexus-mark.webp" alt="" width={32} height={32} />
          Unite Group
        </a>
        <nav aria-label="Main" className={n.nav}>
          <ul className={n.links}>
            <li>
              <details className={n.dropdown}>
                <summary>What we do</summary>
                <ul className={n.menu}>
                  {PILLARS.map((p) => (
                    <li key={p.slug}>
                      <a href={pillarPath(p.slug)}>{p.name}</a>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
            <li><a href="/cards">Cards</a></li>
            <li><a href="/pricing">Pricing</a></li>
            <li><a href="/#contact">Contact</a></li>
            <li><a href="/grow">Grow your business</a></li>
          </ul>
          <a href="/cards/order" className={n.orderCta} data-track="cta" data-track-label="nav-order-card">
            Order card
          </a>
        </nav>
      </div>
    </header>
  )
}

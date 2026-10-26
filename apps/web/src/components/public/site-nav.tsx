import '@/styles/public-tokens.css'

import { PILLARS, pillarPath } from '@/lib/public-site'

import n from './site-nav.module.css'

/** The public contact address. unite-group.in has Google MX records (checked 26/10/2026, UNI-3034). */
export const CONTACT_EMAIL = 'contact@unite-group.in'
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`

const ON_PAGE = [
  { href: '/#proof', label: 'See it first' },
  { href: '/#how', label: 'How it works' },
  { href: '/#answers', label: 'Questions' },
] as const

// Position 0 — keyboard-operable dropdowns (details/summary). In-page anchors keep go-live labels (D21).
export function SiteNav() {
  return (
    <header className={n.header}>
      <a href="#main" className={n.skipLink}>
        Skip to content
      </a>
      <div className={n.bar}>
        <a href="/" className={n.logo}>
          <img src="/landing/logos/unite-group-nexus-mark.webp" alt="" width={36} height={36} />
          Unite Group
        </a>
        <nav aria-label="Main" className={n.nav}>
          <ul className={n.primary}>
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
            <li>
              <a href="/cards">Living cards</a>
            </li>
            <li>
              <a href="/pricing">Pricing</a>
            </li>
            <li className={n.growItem}>
              <a href="/grow">Grow your business</a>
            </li>
          </ul>
          <ul className={n.onPage} aria-label="On this page">
            {ON_PAGE.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
          <div className={n.actions}>
            <a href="/cards/order" className={n.orderCta} data-track="cta" data-track-label="nav-order-card">
              Order a card
            </a>
            <a href="/#contact">Contact</a>
            <a href={CONTACT_MAILTO} className={n.email} data-contact-email>
              Email us
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}

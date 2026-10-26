import '@/styles/public-tokens.css'

import { PILLARS, pillarPath } from '@/lib/public-site'

import s from './public.module.css'

/** The public contact address. unite-group.in has Google MX records (checked 26/10/2026, UNI-3034). */
export const CONTACT_EMAIL = 'contact@unite-group.in'
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`

// Position 0. The U mark and wordmark go to /. The first item is a keyboard-operable dropdown (details and summary: Enter or
// Space opens it, Tab reaches each link, no script). No "Home" item, one Contact, no two links share an href.
// See it first, How it works and Questions are in-page anchors named after their section titles (go-live audit D21) on the home page, so they exist wherever the nav shows.
export function SiteNav() {
  return (
    <header className={s.header}>
      <a href="#main" className={s.skipLink}>
        Skip to content
      </a>
      <div className={`${s.wrap} ${s.navRow}`}>
        <a href="/" className={s.logo}>
          <img src="/landing/logos/unite-group-nexus-mark.webp" alt="" width={36} height={36} />
          Unite Group
        </a>
        <nav aria-label="Main">
          <ul className={s.navList}>
            <li>
              <details className={s.dropdown}>
                <summary>What we do</summary>
                <ul className={s.menu}>
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
              <a href="/grow">Grow your business</a>
            </li>
            <li>
              <a href="/#proof">See it first</a>
            </li>
            <li>
              <a href="/#how">How it works</a>
            </li>
            <li>
              <a href="/#answers">Questions</a>
            </li>
            <li>
              <a href="/#contact">Contact</a>
            </li>
            <li>
              <a href={CONTACT_MAILTO} data-contact-email>
                Email us
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

import { PILLARS, pillarPath } from '@/lib/public-site'

import s from './public.module.css'

// Position 0. Logo goes to /. The first item is a keyboard-operable dropdown (details and summary: Enter or
// Space opens it, Tab reaches each link, no script). No "Home" item, one Contact, no two links share an href.
// Results, About and Resources are in-page anchors on the home page, so they exist wherever the nav shows.
export function SiteNav() {
  return (
    <header className={s.header}>
      <div className={`${s.wrap} ${s.navRow}`}>
        <a href="/" className={s.logo}>
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
              <a href="/#proof">Results</a>
            </li>
            <li>
              <a href="/#how">About</a>
            </li>
            <li>
              <a href="/#answers">Resources</a>
            </li>
            <li>
              <a href="/#contact">Contact</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

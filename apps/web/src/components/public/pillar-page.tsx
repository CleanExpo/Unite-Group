import '@/styles/public-tokens.css'

import { PILLARS, SHIPPED_PILLAR, lowestCardPrice, type Pillar } from '@/lib/public-site'

import s from './public.module.css'
import { SiteFooter } from './site-footer'
import { SiteNav } from './site-nav'

// One job per pillar page: say what the pillar is, that it is coming, and where to ask. The first
// breadcrumb is "Unite Group", so the word Home never appears.
export function PillarPage({ slug }: { slug: Pillar['slug'] }) {
  const pillar = PILLARS.find((p) => p.slug === slug)
  if (!pillar) throw new Error(`Unknown pillar ${slug}`)
  const live = slug === SHIPPED_PILLAR

  return (
    <div className={s.page}>
      <SiteNav />
      <main id="main" className={s.wrap}>
        <nav aria-label="Breadcrumb">
          <ol className={s.crumbs}>
            <li>
              <a href="/">Unite Group</a>
            </li>
            <li>What we do</li>
            <li aria-current="page">{pillar.name}</li>
          </ol>
        </nav>
        <article className={s.pillarHero}>
          <p className={s.eyebrow}>{pillar.name}</p>
          <h1 className={s.h1}>{pillar.headline}</h1>
          <p className={s.lead}>{pillar.intro}</p>
          <p>
            <span className={s.status}>Coming</span>
          </p>
          <h2 className={s.h2} style={{ marginTop: 32, fontSize: 20 }}>
            What it will do
          </h2>
          <ul className={s.bullets}>
            {pillar.will.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {live && (
            <aside className={s.available}>
              <h2>Available now: the video business card</h2>
              <p>From {lowestCardPrice()}, one-off price, GST included.</p>
              <a href="/cards" className={s.buttonPrimary}>
                See the living card
              </a>
            </aside>
          )}
          <p style={{ marginTop: 32 }}>
            <a href="/#contact">Ask a question</a>
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}

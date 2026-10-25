import Image from 'next/image'

import '@/styles/public-tokens.css'

import { PILLARS, SHIPPED_PILLAR, lowestCardPrice, type Pillar } from '@/lib/public-site'

import ps from './pillar.module.css'
import { SUPPORTING_SLOT } from './pillar-visuals'
import s from './public.module.css'
import { SiteFooter } from './site-footer'
import { SiteNav } from './site-nav'
import { VISUALS } from './visuals'

// One job per pillar page: say what the pillar is, that it is coming, and where to ask. The first
// breadcrumb is "Unite Group", so the word Home never appears.
export function PillarPage({ slug }: { slug: Pillar['slug'] }) {
  const pillar = PILLARS.find((p) => p.slug === slug)
  if (!pillar) throw new Error(`Unknown pillar ${slug}`)
  const live = slug === SHIPPED_PILLAR
  const hero = VISUALS[slug]
  const supportSlot = SUPPORTING_SLOT[slug]
  const support = supportSlot ? VISUALS[supportSlot] : null

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
          <div className={ps.heroGrid}>
            <div>
              <p className={s.eyebrow}>{pillar.name}</p>
              <h1 className={s.h1}>{pillar.headline}</h1>
              <p className={s.lead}>{pillar.intro}</p>
              <p>
                <span className={s.status}>Coming</span>
              </p>
            </div>
            {hero && (
              <figure className={ps.pic}>
                <Image src={hero.src} width={hero.width} height={hero.height} alt={hero.alt} preload sizes="(min-width: 1280px) 600px, (min-width: 760px) 48vw, 100vw" />
              </figure>
            )}
          </div>
          <div className={support ? ps.listGrid : ps.section}>
            <div>
              <h2 className={s.h2}>What it will do</h2>
              <ul className={s.bullets}>
                {pillar.will.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            {support && (
              <figure className={ps.pic}>
                <Image src={support.src} width={support.width} height={support.height} alt={support.alt} loading="lazy" sizes="(min-width: 1280px) 600px, (min-width: 760px) 48vw, 100vw" />
              </figure>
            )}
          </div>
          {live && (
            <aside className={s.available}>
              <div className={ps.availableRow}>
                <a href="/cards" className={ps.poster}>
                  <Image src="/cards/media/edition-blueprint-poster.jpg" width={720} height={1280} alt="The Blueprint edition of the living business card: a U sketched in white linework on navy, glowing orange" loading="lazy" sizes="200px" />
                </a>
                <div>
                  <h2>Available now: the video business card</h2>
                  <p>From {lowestCardPrice()}, one-off price, GST included.</p>
                  <a href="/cards" className={s.buttonPrimary}>
                    See the living card
                  </a>
                </div>
              </div>
            </aside>
          )}
          <p className={ps.section}>
            <a href="/#contact">Ask a question</a>
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}

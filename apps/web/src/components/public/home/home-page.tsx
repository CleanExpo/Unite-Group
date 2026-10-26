import { EDITIONS } from '@/app/cards/editions'
import { formatAud } from '@/app/grow/packages'
import { liveCardTiers } from '@/lib/public-pricing'
import {
  CONTACT_EMAIL,
  PILLARS,
  PRICE_NOTE,
  SHIPPED_PILLAR,
  lowestCardPrice,
  pillarPath,
} from '@/lib/public-site'
import { readMargotPhoneNumber } from '@/lib/margot/phone-line'
import { CONTACT_MAILTO } from '../site-nav'

import { answers } from '../answers'
import { CARD_FILM, HERO_FILM } from '../film-config'
import { FilmPlayer } from '../film-player'
import { GalleryTile } from '../gallery-tile'
import {
  HOME_CARDS,
  HOME_CONTACT,
  HOME_FAQ,
  HOME_HERO,
  HOME_HIGHLIGHTS,
  HOME_HOW,
  HOME_PILLARS,
  HOME_PROOF,
} from '../home-copy'
import { JOB_SCREENS, STEP_SCREENS } from '../home-screens'
import { ContactForm } from '../contact-form'
import { MargotPhoneLine } from '../margot-phone-line'
import pub from '../public.module.css'
import { ScreenFrame } from '../screen-frame'
import { COMING, COMING_NOTE, TODAY } from '../today-coming-data'
import { VisualImg } from '../visual-img'
import { VISUALS } from '../visuals'

import hp from './home-page.module.css'

type StartLink = {
  key: string
  no: string
  name: string
  line: string
  href: string
  coming?: boolean
  paid?: boolean
}

// Phill's five steps, names and lines (design-pass gap 05.2 / 05.5). The Create line names a price only while
// online ordering is live; see createLine.
const START_LINKS: StartLink[] = [
  { key: 'discover', no: '01', name: 'Discover', line: 'See the Starter plan and add-ons', href: '/pricing' },
  { key: 'diagnose', no: '02', name: 'Diagnose', line: 'A check of what is holding your business back', href: '/solutions/intelligence', coming: true },
  { key: 'create', no: '03', name: 'Create', line: 'Ask us about a living video card', href: '/cards/order', paid: true },
  { key: 'results', no: '04', name: 'Explore results', line: 'Watch the living cards we have made', href: '/cards' },
  { key: 'talk', no: '05', name: 'Talk', line: 'Ask a question and we reply by email', href: '#contact' },
]

const createLine = (from: string | null) => (from ? `Order a living video card, from ${from}` : START_LINKS[2].line)

const STEPS = [
  { title: 'Pick an opener', body: 'Select one of nine films from the showroom.', screen: 'pick' as const },
  { title: 'Send your details', body: 'Logo, palette, and how people should reach you.', screen: 'send' as const },
  { title: 'Approve a proof', body: 'Review a private link before anything goes live.', screen: 'approve' as const },
]

function galleryCellClass(index: number): string {
  if (index === 0) return hp.galHero
  if (index === 1 || index === 2) return hp.galTall
  return hp.galCell
}

/** Full home page — single implementation surface. */
export function HomePage() {
  const from = lowestCardPrice()
  const live = liveCardTiers()
  const films = EDITIONS.filter((e) => e.name !== 'signature')
  const [filmCard, nexusCard, pricingCard] = HOME_HIGHLIGHTS.cards
  const showroom = VISUALS.showroom

  return (
    <div className={hp.page}>
      <section data-position id="hero" className={hp.heroCinema} aria-labelledby="hero-title">
        <div className={hp.wrap}>
          <div className={hp.heroStage}>
            <div className={hp.heroMedia} data-hero-media>
              <FilmPlayer
                film={HERO_FILM}
                priority
                cover
                controls="top"
                progress
                visibleThreshold={0.12}
                className={hp.heroFilm}
              />
              <div className={hp.heroVignette} aria-hidden="true" />
              <p className={hp.heroFilmTag}>Hero film · copper U assembly</p>
            </div>
            <div className={hp.heroPanel}>
              <p className={hp.kicker}>
                <span data-wordmark>{HOME_HERO.wordmark}</span> · {HOME_HERO.kicker}
              </p>
              <h1 id="hero-title" className={hp.h1}>{HOME_HERO.title}</h1>
              <p className={hp.lead}>{HOME_HERO.lead}</p>
              <div className={hp.heroActions}>
                <a
                  href={HOME_HERO.primaryHref}
                  data-track="cta"
                  data-track-label="home-hero-start"
                  className={`${hp.cta} ${hp.ctaPrimary}`}
                >
                  {HOME_HERO.primaryCta}
                </a>
                <div className={hp.linkRow}>
                  <a href={HOME_HERO.secondaryHref} data-track="cta" data-track-label="home-hero-ask-question">
                    {HOME_HERO.secondaryCta}
                  </a>
                  {/* A literal href: golive-grow.test.ts finds every /grow link by reading the source. */}
                  <a href="/grow" data-track="cta" data-track-label="home-hero-grow">
                    {HOME_HERO.growCta}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={hp.chapterIntro}>
        <section id="start" className={hp.sectionTight} aria-labelledby="start-title">
          <div className={hp.wrap}>
            <h2 id="start-title" className={hp.pathTitle}>
              Where do you want to start?
            </h2>
            <ol className={hp.pathRail}>
              {START_LINKS.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    data-track="cta"
                    data-track-label={`home-start-${link.key}`}
                    className={link.paid ? hp.pathPaid : ''}
                  >
                    <span className={hp.pathNo}>{link.no}</span>
                    <span className={hp.pathName}>
                      {link.name}
                      {link.coming ? <span className={pub.chip} data-chip="coming">Coming</span> : null}
                    </span>
                    <p className={hp.pathLine}>{link.key === 'create' ? createLine(from) : link.line}</p>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="highlights" className={hp.sectionTight} aria-label={HOME_HIGHLIGHTS.srTitle}>
          <div className={hp.wrap}>
            <div className={hp.doors}>
              <article className={`${hp.door} ${hp.doorFilm}`} data-media-card data-spot="film">
                <div className={hp.doorMedia}>
                  <FilmPlayer film={CARD_FILM} controls="bottom" />
                </div>
                <span className={hp.aiTag}>AI-generated</span>
                <div className={hp.doorBody}>
                  <h3 className={hp.doorTitle}>
                    <a href={filmCard.href}>{filmCard.title}</a>
                  </h3>
                  <p className={hp.doorLine}>{filmCard.line}</p>
                </div>
              </article>
              <article className={hp.door} data-media-card data-spot="nexus">
                <div className={hp.doorMedia}>{VISUALS.nexus ? <VisualImg visual={VISUALS.nexus} /> : null}</div>
                <div className={hp.doorBody}>
                  <h3 className={hp.doorTitle}>
                    <a href={nexusCard.href} className={hp.doorStretch}>{nexusCard.title}</a>
                  </h3>
                  <p className={hp.doorLine}>{nexusCard.line}</p>
                  <span className={pub.chip} data-chip="coming">Coming</span>
                </div>
              </article>
              <article className={hp.door} data-media-card data-spot="pricing">
                <div className={hp.doorMedia}>{VISUALS.network ? <VisualImg visual={VISUALS.network} /> : null}</div>
                <div className={hp.doorBody}>
                  <h3 className={hp.doorTitle}>
                    <a href={pricingCard.href} className={hp.doorStretch}>{pricingCard.title}</a>
                  </h3>
                  <p className={hp.doorLine}>{pricingCard.line}</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="today" className={hp.sectionTight} aria-labelledby="today-title">
          <div className={hp.wrap}>
            <h2 id="today-title" className={hp.pathTitle}>
              Today, and what is coming
            </h2>
            <div className={hp.statusBar}>
              <div className={hp.statusRow}>
                <span className={hp.statusLabel}>Live</span>
                <ul className={hp.pillList} data-today-list>
                  {TODAY.map((item) => (
                    <li key={item.name} data-today-item>
                      <a href={item.href} className={hp.pill}>
                        <strong data-name>{item.name}</strong>
                        <span data-line>{item.line}</span>
                        <span className={`${pub.chip} ${pub.chipLive}`} data-chip="live">Live</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={hp.statusRow} data-coming>
                <span className={hp.statusLabel}>Coming</span>
                <ul className={hp.pillList} data-coming-list>
                  {COMING.map((item) => (
                    <li key={item.name} data-coming-item>
                      <span className={`${hp.pill} ${hp.pillMuted}`}>
                        <strong data-name>{item.name}</strong>
                        <span data-line>{item.line}</span>
                        <span className={pub.chip} data-chip="coming">Coming</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className={hp.statusNote} data-coming-note>{COMING_NOTE}</p>
            </div>
          </div>
        </section>
      </div>

      <section data-position id="cards" className={hp.chapterShow} aria-labelledby="cards-title">
        <div className={hp.wrapWide}>
          <header className={hp.showHead}>
            <p className={hp.eyebrow}>{HOME_CARDS.eyebrow}</p>
            <h2 id="cards-title" className={hp.sectionTitle}>{HOME_CARDS.title}</h2>
            <p className={hp.sectionLead}>{HOME_CARDS.lead}</p>
          </header>
          <div className={hp.galleryTrack}>
            <ul className={hp.galleryBento}>
              {films.map((e, i) => (
                <li key={e.name} className={galleryCellClass(i)}>
                  <GalleryTile
                    variant="home"
                    name={e.name}
                    label={e.label}
                    video={e.video}
                    poster={e.poster}
                    href={`/cards/order?edition=${e.name}`}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className={hp.offerBar}>
            <a href="/cards/order" data-track="cta" data-track-label="home-strip-order" className={pub.buttonPrimary}>
              {from ? `From ${from}` : 'Ask about a card'}
            </a>
            {live.length > 0 && (
              <>
                <ul className={hp.priceList}>
                  {live.map((t) => (
                    <li key={t.id} data-tier={t.id}>
                      {t.name} {formatAud(t.priceAud)}
                    </li>
                  ))}
                </ul>
                <p className={hp.priceNote}>{PRICE_NOTE}</p>
              </>
            )}
            <a href="/cards" data-track="cta" data-track-label="home-strip-see-card" className={pub.buttonSecondary}>
              See the living card
            </a>
            <a href={CONTACT_MAILTO} data-contact-email className={pub.buttonSecondary}>
              Email us
            </a>
          </div>
        </div>
      </section>

      <div className={hp.chapterSystem}>
        <section data-position id="pillars" aria-labelledby="pillars-title">
          <div className={hp.wrap}>
            <p className={hp.eyebrow}>{HOME_PILLARS.eyebrow}</p>
            <h2 id="pillars-title" className={hp.sectionTitle}>{HOME_PILLARS.title}</h2>
            <ul className={hp.pillarGrid}>
              {PILLARS.map((p) => {
                const shipped = p.slug === SHIPPED_PILLAR
                return (
                  <li key={p.slug} data-pillar={p.slug} {...(shipped ? { 'data-featured': '' } : {})}>
                    <article className={`${hp.pillarCard} ${shipped ? hp.pillarCardFeatured : ''}`} data-job>
                      <ScreenFrame screen={JOB_SCREENS[p.slug]} />
                      <div className={hp.pillarBody}>
                        <h3 className={hp.pillarName}>
                          <a href={pillarPath(p.slug)} className={hp.pillarStretch}>{p.name}</a>
                        </h3>
                        <p className={hp.pillarLine}>{p.line}</p>
                        <span className={pub.chips}>
                          <span className={pub.chip}>Coming</span>
                          {shipped && (
                            <span className={`${pub.chip} ${pub.chipLive}`}>
                              {from ? `Card from ${from}` : 'Card on enquiry'}
                            </span>
                          )}
                        </span>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <section data-position id="how" className={hp.processBlock} aria-labelledby="how-title">
          <div className={hp.wrap}>
            <p className={hp.eyebrow}>{HOME_HOW.eyebrow}</p>
            <h2 id="how-title" className={hp.sectionTitle}>{HOME_HOW.title}</h2>
            <p className={hp.sectionLead}>{HOME_HOW.lead}</p>
            <ol className={hp.stepGrid}>
              {STEPS.map((step, i) => (
                <li key={step.title} data-step-index={i + 1}>
                  <article className={hp.stepCard} data-step>
                    <ScreenFrame screen={STEP_SCREENS[step.screen]} />
                    <div className={hp.stepMeta}>
                      <span className={hp.stepBadge}>0{i + 1}</span>
                      <h3 className={hp.stepTitle}>{step.title}</h3>
                      <p className={hp.stepLine}>{step.body}</p>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      <section data-position id="proof" className={hp.chapterProof} aria-labelledby="proof-title">
        <div className={hp.wrap}>
          <div className={hp.proofPanel}>
            {showroom ? (
              <div className={hp.proofVisual}>
                <VisualImg visual={showroom} />
              </div>
            ) : null}
            <div className={hp.proofCopy}>
              <p className={hp.eyebrow}>{HOME_PROOF.eyebrow}</p>
              <h2 id="proof-title" className={hp.sectionTitle}>{HOME_PROOF.title}</h2>
              <p className={hp.proofLine}>{HOME_PROOF.line}</p>
              <a href="/cards" className={pub.buttonSecondary}>{HOME_PROOF.cta}</a>
            </div>
          </div>
        </div>
      </section>

      <div className={hp.chapterClose}>
        <div className={hp.wrap}>
          <div className={hp.closeGrid}>
            <section data-position id="answers" aria-labelledby="answers-title">
              <p className={hp.eyebrow}>{HOME_FAQ.eyebrow}</p>
              <h2 id="answers-title" className={hp.sectionTitle}>{HOME_FAQ.title}</h2>
              <p className={hp.sectionLead}>{HOME_FAQ.lead}</p>
              <div className={`${pub.faq} ${hp.faqBlock}`}>
                {answers().map((item) => (
                  <details key={item.q}>
                    <summary>{item.q}</summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </section>

            <section data-position id="contact" aria-labelledby="contact-title">
              <p className={hp.eyebrow}>{HOME_CONTACT.eyebrow}</p>
              <h2 id="contact-title" className={hp.sectionTitle}>{HOME_CONTACT.title}</h2>
              <p className={hp.sectionLead}>{HOME_CONTACT.lead}</p>
              <div className={hp.contactPanel}>
                <ContactForm />
              </div>
              <div className={hp.contactAside}>
                <MargotPhoneLine number={readMargotPhoneNumber()} />
                <p>
                  Or email <span>{CONTACT_EMAIL}</span>.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

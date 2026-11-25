import { Film, MessagesSquare, QrCode } from 'lucide-react'

import { SectionIntro } from '@/public/section-intro'
import m from '@/public/layout/marketing-page.module.css'

import { EDITIONS } from './editions'
import p from './showroom-page.module.css'
import f from './product-first.module.css'

/**
 * Variant B of the /cards experiment (UNI-3293): one short product-first explainer and one prominent order
 * button, in place of the ten-edition showroom. Existing film assets only. The clip does not autoplay: a play
 * is the visitor's own, so video_play measures engagement. Any-niche small-business wording; this page never
 * names the founder's other businesses.
 */
const POINTS = [
  { icon: Film, title: 'Opens like a film', line: 'A four-second opener, then your details.' },
  { icon: QrCode, title: 'One link or QR code', line: 'Print it or share it. Same card on phone and desktop.' },
  { icon: MessagesSquare, title: 'Saves to contacts', line: 'One tap, so people keep your details without retyping.' },
] as const

export function ProductFirst() {
  const signature = EDITIONS[0]
  return (
    <section className={m.heroBand} aria-labelledby="cards-title" data-cards-variant="B">
      <div className={m.wrap}>
        <div className={p.heroGrid}>
          <div className={p.heroCopy}>
            <SectionIntro
              as="h1"
              id="cards-title"
              eyebrow="Living business cards"
              title="A business card that opens like a film and ends on your logo."
              lead="Press play to see the opener. Yours ends on your own logo, ready to share by link or QR code."
            />
            <ul className={p.heroFacts} aria-label="What you get">
              {POINTS.map((point) => {
                const Icon = point.icon
                return (
                  <li key={point.title} className={p.heroFact}>
                    <span className={p.heroFactIcon} aria-hidden="true">
                      <Icon strokeWidth={1.75} size={22} />
                    </span>
                    <span className={p.heroFactText}>
                      <strong className={p.heroFactTitle}>{point.title}</strong>
                      <span className={p.heroFactLine}>{point.line}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
            <div className={m.actions}>
              <a
                href="/cards/order"
                data-track="cta"
                data-track-label="cards-explainer-order"
                className={`${m.btnPrimary} ${f.bigCta}`}
              >
                Order your card
              </a>
              <a href="#compare" data-track="cta" data-track-label="cards-explainer-compare" className={m.btnSecondary}>
                Compare the packs
              </a>
            </div>
            <p className={f.ctaNote}>One-off price, GST included. You approve a proof before anything goes live.</p>
          </div>
          <div className={f.explainer}>
            <div className={f.frame}>
              <video
                className={f.video}
                src={signature.video}
                poster={signature.poster}
                controls
                playsInline
                preload="none"
                aria-label="The signature opener, four seconds"
                data-track="video"
                data-track-label="explainer-signature"
                data-track-stop-at={signature.stopAt}
              />
            </div>
            <p className={f.caption}>The signature opener. About four seconds, AI-generated.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

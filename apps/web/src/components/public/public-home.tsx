import '@/styles/public-tokens.css'

import { Answers } from './answers'
import { CardsStrip } from './cards-strip'
import { ContactBand } from './contact-band'
import { Hero } from './hero'
import { HowItWorks } from './how-it-works'
import { PillarsRow } from './pillars-row'
import { Story } from './story'
import { Proof } from './proof'
import s from './public.module.css'
import { SiteFooter } from './site-footer'
import { SiteNav } from './site-nav'

// The public home: nav, then the eight positions in the fixed order of spec s10:
// hero (then the story, which is not a position), pillars, cards, how, proof, answers, contact, footer.
export function PublicHome() {
  return (
    <div className={s.page}>
      <SiteNav />
      <main>
        <Hero />
        <Story />
        <PillarsRow />
        <CardsStrip />
        <HowItWorks />
        <Proof />
        <Answers />
        <ContactBand />
      </main>
      <SiteFooter position />
    </div>
  )
}

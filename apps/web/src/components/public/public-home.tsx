import '@/styles/public-tokens.css'

import { Answers } from './answers'
import { CardsStrip } from './cards-strip'
import { ContactBand } from './contact-band'
import { Hero } from './hero'
import { Highlights } from './highlights'
import { HowItWorks } from './how-it-works'
import { PillarsRow } from './pillars-row'
import { StartChooser } from './start-chooser'
import { Story } from './story'
import { Proof } from './proof'
import s from './public.module.css'
import { SiteFooter } from './site-footer'
import { SiteNav } from './site-nav'

// The public home, dark, in the order Phill set on 25/10/2026: hero, three media cards, the group (not a position),
// then the positions: living cards gallery, four jobs, how it works, results, FAQ, contact, footer.
export function PublicHome() {
  return (
    <div className={s.page}>
      <SiteNav />
      <main>
        <Hero />
        <StartChooser />
        <Highlights />
        <Story />
        <CardsStrip />
        <PillarsRow />
        <HowItWorks />
        <Proof />
        <Answers />
        <ContactBand />
      </main>
      <SiteFooter position />
    </div>
  )
}

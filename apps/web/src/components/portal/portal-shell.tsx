import Image from 'next/image'

import { PublicPageShell } from '@/public/layout/public-page-shell'

import { SignOutButton } from './sign-out-button'
import s from './portal.module.css'

/** Frame for every portal page: brand bar, the hero photograph and the page body. */
export function PortalShell({
  kicker,
  title,
  lead,
  signedInAs,
  children,
}: {
  kicker: string
  title: string
  lead: string
  signedInAs: string | null
  children?: React.ReactNode
}) {
  return (
    <PublicPageShell>
      <header className={s.bar}>
        <div className={s.wrap}>
          <div className={s.barInner}>
            <a href="/" className={s.brand}>
              <Image src="/logos/unite-group-nexus-emblem-256.png" alt="" width={36} height={36} className={s.emblem} />
              <span className={s.brandName}>Unite-Group</span>
              <span className={s.brandTag}>Owner portal</span>
            </a>
            <div className={s.barRight}>
              {signedInAs ? <span className={s.who}>{signedInAs}</span> : null}
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main id="main" className={s.main}>
        <section className={s.hero} aria-labelledby="portal-title">
          {/* The Unite-Group hero: a cracked copper U lit on a dark stage. Generated brand film still, already used on
              the public home and the sign-in page, so the owner lands in the same world they signed in from. */}
          <Image
            src="/landing/media/unite-group-hero-u-poster-16x9.jpg"
            alt="A cracked copper U glowing orange on a dark, misty stage, the Unite-Group mark"
            fill
            priority
            sizes="100vw"
            className={s.heroImage}
          />
          <div className={s.heroScrim} aria-hidden="true" />
          <div className={s.wrap}>
            <div className={s.heroText}>
              <p className={s.kicker}>{kicker}</p>
              <h1 id="portal-title" className={s.h1}>{title}</h1>
              <p className={s.lead}>{lead}</p>
            </div>
          </div>
        </section>
        {children}
      </main>
    </PublicPageShell>
  )
}

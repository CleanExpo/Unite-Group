import '@/styles/public-tokens.css'

import { SiteFooter } from './site-footer'
import { SiteNav } from './site-nav'
import ls from './legal-shell.module.css'

/** Legal pages: readable light prose band inside the public nav/footer chrome. */
export function LegalPageShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className={ls.root}>
      <SiteNav />
      <main id="main" className={ls.main}>
        <p className={ls.kicker}>{title}</p>
        <div className={ls.prose}>{children}</div>
      </main>
      <SiteFooter />
    </div>
  )
}

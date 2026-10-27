import { PublicPageShell } from '../layout/public-page-shell'
import { SiteFooter } from '../site/site-footer'
import { SiteNav } from '../site/site-nav'

import { HomePage } from './home-page'

export function PublicHome() {
  return (
    <PublicPageShell>
      <SiteNav />
      <main id="main">
        <HomePage />
      </main>
      <SiteFooter position />
    </PublicPageShell>
  )
}

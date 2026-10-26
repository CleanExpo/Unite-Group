import { HomePage } from './home/home-page'
import { PublicPageShell } from './public-page-shell'
import { SiteFooter } from './site-footer'
import { SiteNav } from './site-nav'

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

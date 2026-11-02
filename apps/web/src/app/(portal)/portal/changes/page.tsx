import type { Metadata } from 'next'

import { PublicPageShell } from '@/public/layout/public-page-shell'
import m from '@/public/layout/marketing-page.module.css'
import { portalContext } from '@/lib/portal/changes/server'
import { listChangeRequests } from '@/lib/portal/changes/service'

import { AccessPanel } from './access-panel'
import { ChangeForm } from './change-form'
import u from './portal-ui.module.css'
import { RequestList } from './request-list'

// Owner portal: ask for a change to your website, see each request's progress, approve a preview.
// S1 (feat/portal-foundation) owns the shared (portal) layout and guard; this page checks access itself so it is
// safe on its own. Signed-out visitors never reach it: the proxy sends them to sign in first.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Website changes | Unite Group',
  robots: { index: false, follow: false },
}

export default async function PortalChangesPage() {
  const { access, db } = await portalContext()

  return (
    <PublicPageShell>
      <main id="main" className={m.main}>
        <section className={m.section}>
          <div className={m.wrap}>
            <header className={u.head}>
              <p className={u.eyebrow}>Your website</p>
              <h1 className={u.title}>Ask for a change</h1>
              <p className={u.lede}>
                Tell us what to change. We make it, send you a preview, and nothing goes live until you press Approve.
              </p>
            </header>
            {access.kind !== 'ok' ? (
              <AccessPanel access={access} returnTo="/portal/changes" />
            ) : (
              <ChangesBody tenantSlug={access.owner.tenantSlug} load={() => listChangeRequests(access, db)} />
            )}
          </div>
        </section>
      </main>
    </PublicPageShell>
  )
}

async function ChangesBody({ tenantSlug, load }: { tenantSlug: string; load: () => ReturnType<typeof listChangeRequests> }) {
  const result = await load()
  return (
    <>
      <div className={u.panel}>
        <h2 className={u.panelTitle}>Request a change</h2>
        <ChangeForm tenantSlug={tenantSlug} />
      </div>
      <div className={u.panel}>
        <h2 className={u.panelTitle}>Your requests</h2>
        {result.ok ? <RequestList requests={result.requests} /> : <p role="alert" className={u.err}>{result.message}</p>}
      </div>
    </>
  )
}

import type { Metadata } from 'next'

import { PublicPageShell } from '@/public/layout/public-page-shell'
import m from '@/public/layout/marketing-page.module.css'
import { portalContext } from '@/lib/portal/changes/server'
import { CHECKLIST, NO_PASSWORD_LINE } from '@/lib/portal/setup/items'
import { computeReadiness } from '@/lib/portal/setup/readiness'
import { listConnections } from '@/lib/portal/setup/service'

import { AccessPanel } from '../changes/access-panel'
import u from '../changes/portal-ui.module.css'

import { SetupCard } from './setup-card'

// Owner portal: connect Google Search Console, Bing, Google Business Profile and socials, one card per item.
// Only public links and property ids are saved. OAuth tokens are out of scope (the secrets broker comes later).

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Connect your accounts | Unite Group',
  robots: { index: false, follow: false },
}

export default async function PortalSetupPage() {
  const { access, db } = await portalContext()

  return (
    <PublicPageShell>
      <main id="main" className={m.main}>
        <section className={m.section}>
          <div className={m.wrap}>
            <header className={u.head}>
              <p className={u.eyebrow}>Getting set up</p>
              <h1 className={u.title}>Connect your accounts</h1>
              <p className={u.lede}>Work down the list at your own pace. Each card shows the steps, and three have a short video.</p>
              <p className={u.promise}>{NO_PASSWORD_LINE}</p>
            </header>
            {access.kind !== 'ok' ? <AccessPanel access={access} returnTo="/portal/setup" /> : <SetupBody load={() => listConnections(access, db)} />}
          </div>
        </section>
      </main>
    </PublicPageShell>
  )
}

async function SetupBody({ load }: { load: () => ReturnType<typeof listConnections> }) {
  const result = await load()
  if (!result.ok) {
    return (
      <div className={u.panel}>
        <p role="alert" className={u.err}>{result.message}</p>
      </div>
    )
  }
  const byKind = new Map(result.connections.map((c) => [c.kind, c]))
  const readiness = computeReadiness(result.connections)
  const nextItem = readiness.next ? CHECKLIST.find((i) => i.kind === readiness.next?.kind) : null
  return (
    <>
      <div className={u.progressRow}>
        <progress className={u.progress} max={readiness.total} value={readiness.done} aria-label="Setup progress" />
        <p className={u.progressText}>{readiness.done} of {readiness.total} done ({readiness.percent}%)</p>
      </div>
      <p className={u.next}>
        {nextItem
          ? `Next: ${nextItem.title}${readiness.next?.action === 'grant_access' ? ' (add our account, then press the button on its card)' : ''}.`
          : 'All done. Thank you. We will let you know once everything is verified.'}
      </p>
      <div className={u.grid}>
        {CHECKLIST.map((item) => <SetupCard key={item.kind} item={item} connection={byKind.get(item.kind) ?? null} />)}
      </div>
    </>
  )
}

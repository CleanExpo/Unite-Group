import { PublicPageShell } from '@/public/layout/public-page-shell'
import m from '@/public/layout/marketing-page.module.css'

import u from '../changes/portal-ui.module.css'

export default function Loading() {
  return (
    <PublicPageShell>
      <main id="main" className={m.main}>
        <section className={m.section}>
          <div className={m.wrap}>
            <p className={u.lede} role="status">Loading your checklist&hellip;</p>
          </div>
        </section>
      </main>
    </PublicPageShell>
  )
}

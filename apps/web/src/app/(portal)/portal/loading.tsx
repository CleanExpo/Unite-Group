import { PublicPageShell } from '@/public/layout/public-page-shell'

import s from '@/components/portal/portal.module.css'

export default function PortalLoading() {
  return (
    <PublicPageShell>
      <main className={s.main} aria-busy="true">
        <div className={s.wrap}>
          <p className={s.note} role="status">Opening your portal</p>
        </div>
      </main>
    </PublicPageShell>
  )
}

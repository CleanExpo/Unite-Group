import { PORTAL_VERIFY_PATH, signInPath, type PortalAccess } from '@/lib/portal/changes/access'

import u from './portal-ui.module.css'

/**
 * Shown instead of the page when the visitor is not an aal2 owner. It links onward and never redirects by itself,
 * so a signed-in founder (no portal tenant) cannot be bounced between sign-in and here.
 */
export function AccessPanel({ access, returnTo }: { access: Exclude<PortalAccess, { kind: 'ok' }>; returnTo: string }) {
  if (access.kind === 'verify_second_factor') {
    return (
      <div className={u.panel} role="status">
        <h2 className={u.panelTitle}>Confirm it is you</h2>
        <p className={u.lede}>For your security, this page needs your second sign-in step, such as the code from your authenticator app.</p>
        <div className={`${u.actions} ${u.actionsTop}`}>
          <a className={u.btn} href={`${PORTAL_VERIFY_PATH}?redirectTo=${encodeURIComponent(returnTo)}`}>Confirm it is me</a>
        </div>
      </div>
    )
  }
  return (
    <div className={u.panel} role="status">
      <h2 className={u.panelTitle}>Please sign in</h2>
      <p className={u.lede}>This page is for business owners with a Unite Group portal. Sign in with the email we have on file for you.</p>
      <div className={`${u.actions} ${u.actionsTop}`}>
        <a className={u.btn} href={signInPath(returnTo)}>Sign in</a>
      </div>
    </div>
  )
}

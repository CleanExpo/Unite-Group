# Portal S1 screenshots (02/11/2026)

Rendered by Playwright Chromium against `next dev` on the portal code of commit 5a55ae81 (captured before a rebase onto main that changed no file under apps/web), at 1440x900 (desktop) and 390x844 @2x (phone).

- `portal-welcome-*`: the real `PortalWelcome` component with sample props (name "Sam", card `sam-plumbing`), mounted on a
  temporary local-only page because there is no test owner account to sign in with. The scratch page was deleted and
  never committed.
- `portal-no-portal-yet-*`: the real `NoPortalYet` component, same method.
- `portal-signed-out-redirect-desktop` and `-phone`: a live, signed-out request to `/portal`, which the proxy sent to
  `/auth/login?redirectTo=%2Fportal`. Retaken on 02/11/2026 after the owner sign-in change: the page shows only
  "Continue with Google" and "Email me a sign-in link". The capture script counted 0 password fields and 0
  "Use email instead" buttons at both sizes.

Imagery is the existing generated Unite-Group hero still (`public/landing/media/unite-group-hero-u-poster-16x9.jpg`).

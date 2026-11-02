# Portal S1 screenshots (02/11/2026)

Rendered by Playwright Chromium against `next dev` on commit 6d481688, at 1440x900 (desktop) and 390x844 @2x (phone).

- `portal-welcome-*`: the real `PortalWelcome` component with sample props (name "Sam", card `sam-plumbing`), mounted on a
  temporary local-only page because there is no test owner account to sign in with. The scratch page was deleted and
  never committed.
- `portal-no-portal-yet-*`: the real `NoPortalYet` component, same method.
- `portal-signed-out-redirect-desktop`: a live, signed-out request to `/portal`, which the proxy sent to
  `/auth/login?redirectTo=%2Fportal`.

Imagery is the existing generated Unite-Group hero still (`public/landing/media/unite-group-hero-u-poster-16x9.jpg`).

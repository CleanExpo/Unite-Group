# Portal S1 screenshots (03/11/2026)

Rendered by Playwright Chromium against `next dev` on this branch after the rebase onto main `33964213` (UNI-3167/3168
portal work), at 1440x900 (desktop) and 390x844 @2x (phone).

- `portal-welcome-*`: the real `PortalWelcome` component with sample props (email `owner@example.test`, free plan),
  mounted on a temporary local-only page because there is no test owner account to sign in with. The scratch page was
  deleted and never committed. Shows the six pipeline stages; "Open the checklist" goes to /portal/setup and
  "Ask for a change" to /portal/changes.
- `portal-no-portal-yet-*`: the real `NoPortalYet` component (signed in, no portal), same method. Points at /portal/join.
- `portal-confirm-it-is-you-*`: the real `ConfirmItIsYou` component (owner signed in with the emailed link only, no
  second step yet), same method.
- `portal-signed-out-redirect-*`: a live, signed-out request to `/portal`, which landed on
  `/auth/login?redirectTo=%2Fportal`. The capture counted 0 password fields at both sizes.

A live signed-out request to `/portal/join` on the same server returned 200 with "Enter your invite code".

Imagery is the existing generated Unite-Group hero still (`public/landing/media/unite-group-hero-u-poster-16x9.jpg`).

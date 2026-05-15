---
type: wiki
updated: 2026-05-15
---

# RestoreAssist (RA)

iOS app for the restoration industry. Also available as PWA at restoreassist.app (prod) and restoreassist-sandbox.vercel.app (staging).

**GitHub:** CleanExpo/RestoreAssist
**Linear project:** RA-* tickets
**Target:** TestFlight → App Store; RA-1842 = App Store release ticket

## Three P0 hotfixes — sign-in loop chain (2026-05-15)

Same-day stabilisation of a 3-day production sign-in loop. All server-side; no mobile rebuild needed because both iOS + web pull live API behaviour.

| PR | Fix | Root cause |
|---|---|---|
| **#1081** | Disable Prisma-on-Edge in middleware paywall block (`void isHardPaywallWhitelisted` left in place as one-line restore mechanism) | SP-3 T15 paywall middleware imported `lib/trial-handling` which loads Prisma. Vercel Edge runtime cannot load Prisma's Node-binary engine → crashed every authenticated request → cookie state unreliable → users bounced to /login |
| **#1082** | Add bare `/dashboard`, `/reports`, `/compliance`, `/sign` paths to both `matcher` AND `LOGIN_GATE_PREFIXES` | **Next.js path-to-regexp does NOT treat `:path*` as zero-or-more for the top-level segment.** `/dashboard/:path*` only matches `/dashboard/x`, NOT bare `/dashboard`. After Google OAuth → callbackUrl=`/dashboard` → middleware skipped → client `useSession()` raced cookie write → bounced to /login. THE 3-day root cause. |
| **#1083** | Stamp `setupCompletedAt` in iOS `native-token-exchange` JWT payload | Manual JWT payload at lines 275-287 omitted the claim. Once #1082 made setup-wizard gate fire on bare `/dashboard`, every iOS native sign-in dead-ended on `/setup` inside WKWebView. |

**Lesson:** Next.js matcher `:path*` is NOT zero-or-more for the top segment. Always include the bare path AND `:path*` for every protected surface — i.e. `["/dashboard", "/dashboard/:path*"]`. Same trap on `/reports`, `/compliance`, `/sign`. Smoke test post-fix: `curl -sI /dashboard` MUST return 307 → `/login?callbackUrl=%2Fdashboard`.

**Browser-side recovery:** users on regular Chrome had stale `__Secure-next-auth.session-token` cookies from 3 days of failed loops. Fix: DevTools → Application → Storage → "Clear site data" for restoreassist.app. Incognito works immediately (no cookies). Safari path was clean throughout — only Chrome accumulated bad state.

**Sandbox drift fix:** PR #1085 merged main back into sandbox so the 3 hotfixes don't roll back on the next sandbox→main release.

## SP-8 Help Library — 100% green (2026-05-15)

In-app How-To dropdown + ⌘K fuzzy search + 8 MDX articles (one per category) + `/help` public mirror + AI-readable frontmatter (substrate for SP-G AI Setup Agent). Shipped to prod via PR #1080. 21 branded PNG placeholders (8 hero + 13 inline) uploaded to prod Cloudinary cloud `dmaulkthb` via `scripts/sp8-help-placeholders.mjs` (PR #1084). Each placeholder is brand-styled (navy `#1C2E47` base + category accent gradient) with article title baked in via SVG → Sharp. **Same public_ids overwrite cleanly** for real screenshots post-T-day — edit titles in the script and re-run, no MDX changes needed.

Smoke-tested 2026-05-15: all 21 Cloudinary URLs return 200 OK + all 8 `/help/<category>/<slug>` article pages render hero + inline images end-to-end.

## Senior Briefing Pattern — operating posture (2026-05-15)

Pi-CEO Board deliberation 2026-05-15 produced operating standard for all Claude conversations + every dispatched subagent. **AskUserQuestion is banned for any question whose answer is discoverable via available tools in ≤ 3 tool calls.** Only allowed for (a) stakeholder preferences between distinct valid options, (b) confirmation gates before irreversible actions. Every dispatched agent returns a 3-component briefing: *investigated / decided-with-evidence / shipped-or-blocked-with-reason*. Memory: `feedback_use_tools_dont_ask_questions.md`. Board directive logged at [[operational-priorities-q2-2026]] Board Directives Log.

## P0 incident chain — iOS Google native sign-in (2026-05-15 evening)

Three-stage P0 resolution. Phill confirmed first-ever successful native exchange at 10:42:28Z on his CEO account `phill.mcgurk@gmail.com`.

| PR | Fix | Root cause |
|---|---|---|
| **#1093** (round 1) | Server accepts EITHER plaintext OR SHA-256 nonce echo | **Wrong theory.** Assumed plugin SHA-256s but server expects plaintext (or vice versa). Round-1 unmerged value: extended error-message diagnostic with truncated value prefixes |
| **#1094** (round 2) | Skip nonce check entirely when claim is empty | **Actual root cause:** capgo SocialLogin 1.0.4(15) drops `options.nonce` before calling GIDSignIn → Google's idToken has no `nonce` claim. Hardcoded SHA-256 check fails 100%. Round-1 diagnostic unlocked round-2 evidence (`claim=…` empty in SecurityEvent at 10:29:08Z) |

**Evidence:** 9 attempts since 2026-05-08 — **0 successes** before round 2. SecurityEvent table queried via Supabase MCP. Server-side fix, no App Store resubmission needed (iOS app loads web layer live per `capacitor.config.json:5` `server.url: https://restoreassist.app`).

**Lesson locked:** memory `feedback_log_values_before_fixing.md` — before shipping a theory-driven fix to a comparison/validation bug, first ship a DIAGNOSTIC that logs the actual values being compared. Round-1 cost ~30min of latency + Phill's patience ("ridiculous"). Pattern: extended error messages with truncated value prefixes are tier-1 verification debt that pays back the next time the check fails.

**Cleanup:** Pre-existing `lib/oauth-native.ts:181` `window.alert` diagnostic from PR #1012 helped here too — it would have surfaced if `SocialLogin.login()` threw pre-exchange. Since Phill only saw the generic toast (no alert), we knew the failure was post-OAuth-handshake → exchange step → narrowing happened correctly via tools rather than asking him questions.

## Customer Portal + Multi-Seat Licensing — strategic wedge (2026-05-15)

PR #1096 (spec draft) + #1097 (Margot research integration) merged to sandbox. The Customer Portal is the **strategic wedge** that differentiates RestoreAssist from Encircle, DocuSketch, ServiceM8, Ascora, Tristar, Xactimate. Margot deep_research_max confirmed verbatim: *"No vendor currently offers a free, branded, mobile-first portal designed specifically to educate the homeowner, explain technical restoration processes, and decode insurance jargon."*

**Two intertwined deliverables (single architecture project):**

1. **Multi-seat licensing:** $99/mo desktop org subscription + $11/mo per-user mobile seat (one $11 covers iPhone + iPad combined). Customer Portal access is $0.
2. **Customer Portal explainer hub:** branded iPad/iPhone surface for clients, free, content-rich (process explainers + insurance-claim walkthroughs + policy-terminology glossary + about-the-business + blog posts).

**Strategic positioning:**
- DR Method (Phill's proprietary restoration approach) seeds platform-default content
- NRPG (industry network) is the content backbone — Customer Portal becomes deployment vehicle for NRPG-standardized methodology
- Cross-business synergy: NRPG membership + RA platform fee bundle on same customer

**Margot-validated Apple compliance:** Guideline 4.2.6 (Anti-Templating) confirms "same IPA, multi-mode" is the correct architecture. Per-tradie iOS apps would be rejected. Procore/Jobber/Housecall Pro precedent uses single binary + token-based deep links — same pattern.

**Quantified Margot-validated ROI:**
- Jobber Client Hub: NRR > 100%, churn ~5-7%/yr, +35% quote-win rate
- Housecall Pro: customer reviews 50 → 800 via in-app prompts
- Encircle: 15% annual revenue growth + 2× claim capacity via documentation portal
- ServiceTitan baseline: 75% of contractors offer portal but only 26% have two-way comms (RA's portal default = two-way + educational = immediate differentiation)

**Timing:** NOT for T-day. 6-week Wave 3 post-launch build. Spec lives at `docs/superpowers/specs/2026-05-15-customer-portal-multi-seat-design.md` (583 lines, research-backed).

**13 open questions still pending Phill review** before implementation plan generation kicks off. Most consequential: Apple IAP 30% cut absorbing vs pass-through; state-by-state AU content variants; NRPG content tier (bundled membership vs separate paid tier).

## SP-8 Help Library tutorial videos shipped (2026-05-15)

PR #1095 — 6 Remotion videos for the SP-8 Help categories without tutorial coverage: inspections, reports, clients-and-portal, billing, team, compliance. ~$10 ElevenLabs cost (50% of $20 budget). 75s each, 7.4-7.9MB MP4 at 1920×1080 with Sarah AU/UK voiceover. Shipped via `localPath` fallback (new optional field on `VIDEO_REGISTRY.RegistryEntry`) because YouTube upload pipeline requires admin OAuth session not available to worktree agents. Post-merge swap to `youtubeId` is a 6-line follow-up PR after running `/api/auth/youtube-consent` flow. Storyboards live off-repo at `Pi-CEO/Pi-Dev-Ops/remotion-studio/src/storyboards/ra-help-{category}-75s-2026-05-15.json`.

**VideoExplainer component extended:** `components/setup/VideoExplainer.tsx:48-66` now branches on `localPath` vs `youtubeId`. Renders native `<video controls preload="metadata" playsInline>` for local fallback. Same brand-matching wrapper.

**MDX integration:** Each of 6 SP-8 articles (`content/help/<category>/*.mdx`) embeds `<VideoExplainer slug="help-{category}" />` after intro paragraph.

## Wave 2 spec drafts + brainstorm-processed (2026-05-15)

Three Wave 2 specs drafted by parallel Explore subagents + processed by parallel research subagents in one session. All four PRs land on sandbox awaiting Phill's section-by-section approval. Wave 2 unlocks the AI-led product surface promised in marketing copy.

| PR | Spec | Net recommendation |
|---|---|---|
| #1086 | **SP-G AI Setup Agent** — bottom-sheet Sidekick that consumes SP-8 Help Library AI-readable frontmatter (`aiSummary` + `userIntents` + `successCriteria`) and drives setup/configuration tasks for the user | Approve baseline + extend existing `LiveTeacherSession`/`TeacherUtterance`/`TeacherToolCall` Prisma models (already at schema.prisma:6090-6140) instead of adding new ones. Diverging recommendations from brainstorm-processing: ship Web Speech voice in Wave 1 (vs text-only spec) + queue-and-flush offline pattern per CLAUDE.md rule 24 |
| #1088 | **SP-6 Email Provider BYOK** — `EmailIntegration` + `EmailSendJob` + provider abstraction mirroring `lib/storage/StorageProvider` | Narrow provider set: Resend + SendGrid v1; **defer SES** (sandbox-approval wall breaks UX promise). DKIM auto-downgrade. Email-class split fallback chain (transactional → platform-primary; business → BYOK-primary). Reply-To split per class |
| #1089 | **SP-H Knowledge Substrate** — Obsidian wiki → pgvector RAG via per-H2 chunking + `text-embedding-3-small` (1536d) + separate `wiki_chunks` table + Hermes cron host. SP-G's `lookup-iicrc` tool consumes the `retrieve(query, filters?, topK?)` API | **Approve all 7 defaults as drafted.** Strong precedent: `IicrcChunk` schema.prisma:5777-5793 (Q1/Q3) + `text-embedding-3-small` already wired at lib/ai/embeddings.ts:92-115 (Q2). Minor staleness flag: spec says 145 wiki files, actual count is 149 |
| **#1090** | Brainstorm-processed decision packs for all three (merged to sandbox 09:26:51Z, commit `443738d9`) | Each pack carries 3-line Verification Ledger per `[[quality-first-autonomy]]`. Independence limit: same-vendor Sonnet self-review; `opus-adversary` not triggered (tier-1 spec-doc stake) |

**Cost ceiling locked:** SP-H embedding + cron host budgeted < $50/month. SP-G token cost predicted < $0.04/session if Web Speech voice ships in Wave 1 (vs > $1/session if Whisper STT used — defer Whisper to Wave 3).

**Xcode iOS tier-1 verification (2026-05-15):** Built `App.xcodeproj` Debug for iPhone 17 Pro simulator, installed + launched (`com.restoreassist.app` pid 35761), screenshot confirmed WebView rendered restoreassist.app marketing splash with branding intact. **Independence limit disclosed:** simulator cannot drive Capgo SocialLogin native Google sheet (relies on iOS GIDSignIn which needs real device); PR #1083 `setupCompletedAt` JWT fix is server-side deployed — final verification still requires Phill's iPhone tap.

## Strategic positioning — RA is the parent-business CRM (2026-05-14)

RestoreAssist is not just a SaaS product Phill sells to other tradies — it is the **CRM the user's own restoration business ([[dr-nrpg]]) will run on**. DR/NRPG = **tenant zero**. The DR/NRPG → RA integration scaffolding exists: `DrNrpgIntegration` Prisma model + `DrNrpgJobSync` + `/api/dr-nrpg/connect` + `/api/webhooks/dr-nrpg` + `/api/cron/dr-nrpg-liveness`. The missing piece is the **job-import UX** — inbound DR/NRPG jobs should pre-populate the inspection list with one-tap "Start" action, eliminating Stage 5 admin double-handling.

## Sub-project #5 — Sign-in → Job-Close Audit (2026-05-14)

Comprehensive 19-section audit at `docs/superpowers/specs/2026-05-14-signin-jobclose-audit-design.md` (commit c3beb679, 565 lines). Identifies 9 sub-projects to close the journey loop. CEO board deliberated; ordered roadmap:

**Wave 1 (~4 weeks — the Job-Close Suite):**
1. **Onboarding hotfix** (~2 days) — finish `/api/oauth/google-drive/start` + `Organization.storageProvider` persistence. Removes broken-promise on day-1 signup.
2. **SP-E: Storage BYOK pipeline** (~1 week) — `GoogleDriveProvider` + dual-write + `StorageMirrorJob` + close-package export hook.
3. **SP-A: Job-close terminal state** (~3-4 days) — formalise `IN_BILLING` enum, write `COMPLETED`, `/api/inspections/[id]/close`, AI close-summary card. Closes the Stage-9 dead-end.
4. **SP-J: On-site handover package** (~2 weeks, own brainstorm) — single "Hand over to client" flow producing report+scope+estimate+invoice+variations+portal-invite+e-sign in one moment. Co-branding with insurer logos (Allianz, IAG, QBE, Suncorp, RACQ).

**Wave 2 (weeks 5-7 — Intelligence layer):**
5. **SP-H: Knowledge substrate** (~1 week build, own brainstorm) — Obsidian wiki → Supabase pgvector RAG. Consumed by AI lifecycle hooks + Sidekick tools.
6. **SP-G: AI Sidekick (Live Teacher)** (~2 weeks, own brainstorm) — UI surface for existing `lib/live-teacher/` scaffolding + 3 new tools (lookup-iicrc, method-recommendation, analyse-photo) + Prisma persistence + voice mode.

**Wave 3 (week 8+ — Polish):**
7. **SP-B: Auto-progression chain** (~3 days) — Stripe/Xero webhooks detect PAID, prompts close.
8. **SP-C: Completed tab + admin re-open** (~3 days).
9. **Existing brainstorm queue:** SP-3 (AI BYOK), SP-6 (Email BYOK), SP-K candidate (SMS BYOK).

**Flagged for later brainstorm:** SP-D (evidence-capture expansion: video/LiDAR/GeoMap view), SP-F (server-side role-gate consolidation).

**Top risk per CEO board:** SP-J composition impedance — dispatch 1-day end-to-end spike in Wave 1 week 1.

**Design principles locked:**
- **No double-handling of administration** — if data exists anywhere (BYOK integration, wiki, prior inspection, public registry, OAuth profile, weather API, imported job), the system pulls it. Every form field that could be pulled is a P0 gap.
- **We build the system; the business brings the infrastructure** — every external system is BYOK (storage, AI keys, email, SMS, accounting, calendar, knowledge). Setup wizard is the BYOK hub.
- **AI lifecycle hooks at every state transition** with editability invariant (user always sees a draft they confirm; no AI auto-commits).

## Sub-project #7 — Tradie evidence-capture UI (shipped 2026-05-14)

Three seams (B + D + C) shipped via PR #1009 → #1010 → prod:
- **Seam B:** `<TechLicenceBanner>` on `/dashboard` for USER-role techs without an `Authorisation`. New `/dashboard/settings/credentials` standalone page.
- **Seam D:** `<InspectionSignOff>` refactored to 4-state machine (`initial → modal → form-unlocked → submitted`). Mount-time probe of `/api/authorisations/most-recent` auto-skips modal when verified <90 days ago.
- **Seam C:** Photo evidence-capture pipeline. `<CapturePhotoFab>` (fixed bottom-right, brand `#1C2E47`) + `<CapturePhotoTagModal>` (preview + GPS + SHA-256 + caption). `lib/capture/cocoa-client.ts` for SubtleCrypto SHA-256 + navigator.geolocation (fail-soft). `POST /api/inspections/[id]/photos` extended for server-side hash recompute (MITM defense), authoritative `cocoaUserHash` from session, User-Agent excerpt as `cocoaDeviceHint`.

Schema: 4 nullable cocoa columns on `InspectionPhoto` (`cocoaSha256`, `cocoaCapturedAtUtc`, `cocoaUserHash`, `cocoaDeviceHint`). Migration applied to Supabase prior to merge.

## AI Sidekick — `lib/live-teacher/` substantially built (2026-05-14 discovery)

Pre-existing scaffolding much further along than expected:
- `router.ts`, `context-engine.ts` (tracks `missingFields`, `capturedPhotoCount`, `hasLidarScan`), `claude-cloud.ts`, `types.ts` (TeacherContext, TeacherStage `arrival → walkthrough → moisture → classification → scope → submission`, WaterCategory, TeacherTurn).
- 6 tools already built: `capture-photo`, `check-report-gaps`, `fill-scope-item`, `flag-whs-hazard`, `start-lidar-scan`, `take-reading`.
- Missing (SP-G scope): UI surface (bottom-sheet panel), 3 new tools (`lookup-iicrc`, `method-recommendation`, `analyse-photo`), `TeacherSession` + `TeacherTurnRecord` Prisma models (append-only per rule 22), voice mode (Web Speech API push-to-talk), cost gating (rules 8/9), audit-log integration, storage hook for transcripts to BYOK Drive at close.

## iOS Sign-In Diagnostic (PR #1012, 2026-05-14)

User reported Google + Apple sign-in buttons doing nothing on the iOS app. **Root cause:** `ios/App/CapApp-SPM/Package.swift` had hardcoded SPM paths to `@capgo/capacitor-social-login@8.3.20` + `@capacitor/core@8.3.1` but pnpm-lock had 8.3.22 + 8.3.3. SPM path didn't exist → native plugin failed to link → JS calls silently no-op'd. Compounded by `lib/oauth-native.ts` catch blocks swallowing errors into toasts that get clipped by iOS safe-area.

**Fix shipped (PR #1012):**
1. Visible diagnostic — `console.error` + `window.alert` in `lib/oauth-native.ts` `ensureSocialLoginInitialised` + login catch blocks (cancel messages still suppressed).
2. Regenerated `ios/App/CapApp-SPM/Package.swift` via `pnpm install && npx cap sync ios` — now references `@capgo+capacitor-social-login@8.3.22_@capacitor+core@8.3.3` paths correctly.

**LESSON LOCKED:** after ANY pnpm dep update touching `@capgo/*` or `@capacitor/*` packages, MUST run `npx cap sync ios` before iOS rebuild. The Package.swift is auto-generated but only refreshes via `cap sync`; the comment in the file ("DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands") is misleading because it IS checked into git and DOES drift if `cap sync` is skipped.

## iOS Sign-In Error Boundaries (PR #957, shipped 2026-05-13)

Root cause of the "site shuts down when I try to sign in" symptom that triggered the precautionary revert in PR #941: a React render crash bubbling out of the iOS Apple/Google native OAuth surfaces with **no error boundary to catch it**. PR #942's branch name (`feat/ios-signin-v2-with-error-boundary`) promised the boundary but the diff never added one; `components/error-boundary.tsx` sat in the codebase wired to nothing.

PR #957 fix: added Next.js App Router route-segment boundaries at `app/login/error.tsx` and `app/signup/error.tsx`. Any uncaught throw lands on a styled fallback Card with `error.digest` + `Try Again` button (calls `reset()` to remount). Both `console.error` with tagged prefix (`[login-error]`, `[signup-error]`) for grep in Vercel logs + iOS Web Inspector. No happy-path change. Catches not just the current iOS OAuth path but any future throw on these surfaces (server envelope shape changes, lazy import failures, etc.).

Companion: PR #947 (a8570387) shipped `lib/api-error-message.ts` to normalise the RA-1548 `{error: {code, message, eventId}}` envelope back to a string for `setError` callsites — 7 UI files patched, but `app/login/page.tsx` wasn't one of them (its setError calls were already string-only). The error boundary closes the residual exposure.

## Sandbox DB Recovery (2026-05-13)

Vercel `restoreassist-sandbox` prod env had its `DATABASE_URL` blanked out (cause: someone ran `vercel env add DATABASE_URL production` and pressed Enter without a value — Vercel accepts an empty value silently). Sandbox builds failed `P1001: Can't reach database server` for ~5h while Phill rotated the Supabase password three times trying to recover.

Resolution: `~/fix-ra-db.zsh` — one-command recovery script. Takes the password via hidden `read -s`, probes both candidate Supabase projects via the regional pooler (`aws-1-ap-southeast-2.pooler.supabase.com:6543`), URL-encodes the password, writes both `DATABASE_URL` (port 6543 transaction-mode pooler) + `DIRECT_URL` (port 5432 session-mode pooler — `db.{ref}.supabase.co` is IPv6-only and rejected from the Mac mini's IPv4-only LAN), stores in 1P, triggers redeploy. Defaults to sandbox; `~/fix-ra-db.zsh prod` targets production. Active sandbox Supabase: `udooysjajglluvuxkijp` (named "restoreassist-prod-2026" but functionally sandbox).

**Sandbox now LIVE at `https://restoreassist-sandbox.vercel.app`.** Prod (`restoreassist`) `DATABASE_URL` still empty; needs the prod-Supabase password — separate fix when ready.

## Current State (2026-05-08)

- **LIVE on the App Store — build 1.0(10) approved and published 2026-05-08**
- 4 rejections (builds 1.0(1)–1.0(3), then 1.0(8) failed) before approval
- RA-1842 (post-mortem) is Done. RA-2117 = pre-flight checklist for future submissions
- Path B confirmed: iOS app is free field tool, all billing/subscriptions on web.restoreassist.app
- Sign in with Apple added (4.8 compliance). Google OAuth via SFSafariViewController (4.0 compliance)

## Open Post-Launch Issues (2026-05-08)

- **RA-2074** (High, Backlog): Persistent sign-in for field technicians — no "stay logged in". Recommended fix: extend NextAuth `session.maxAge` to 30d (Option A, 30min). Adoption blocker.
- **RA-2073** (Done): Google Sign-In re-enabled on iOS shell after being gated during App Review

## RA-2117 Pre-Flight Checklist Coverage (2026-05-11)

Cross-referenced against `Sources/Why Apps Get Rejected from the App Store - Common Reasons & How to Avoid Them (2026).md`. NDC's 7 rejection categories all map to existing RA-2117 checklist items — no gaps:

| Category | RA-2117 item |
|---|---|
| 1. Metadata (screenshots, name, description) | Pre-flight screenshot capture from live build only |
| 2. Privacy & Tracking (5.1) | NSUsageDescription strings + Privacy Manifest |
| 3. UI/UX (confusing flows, incomplete features) | "Coming Soon" gating audit |
| 4. Performance / crashes | TestFlight smoke run + crash-free rate gate |
| 5. Minimum functionality | 4.2 — no thin-wrapper rejection (Capacitor 8 + native modules covered) |
| 6. Intellectual Property | Screenshot copyright scan |
| 7. In-App Purchases | Path B confirmed — billing on web.restoreassist.app, no IAP gates needed |

Pattern locked: 40%+ first-submission rejection rate cited industry-wide; RA hit 4 rejections before approval — checklist exists to make build 1.1 a single-pass submission.

## Tech Stack

- **Framework:** Next.js (App Router) — also served as PWA
- **Mobile/Native:** Capacitor 8 for cross-platform iOS/Android features
  - `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/filesystem`
  - `@capacitor/bluetooth-le` (BLE moisture meter integration)
  - `@capacitor/push-notifications`, `@capacitor/local-notifications`
  - `@aparajita/capacitor-biometric-auth` (biometric sign-in)
  - `@capgo/capacitor-social-login` (Google OAuth on mobile)
- **Auth:** `@auth/prisma-adapter`, NextAuth
- **ORM:** Prisma 6 (`@prisma/client` ^6.19.3), Node 20.x
- **AI:** `@ai-sdk/anthropic` ^3.0.74, `@anthropic-ai/sdk` ^0.92.0, `@google/genai` ^1.51.0, `@google/generative-ai` ^0.24.1 (Gemini), Vercel AI SDK
- **UI:** Radix UI primitives (full suite), Tailwind CSS
- **Testing:** Playwright smoke tests (local, CI, prod, sandbox environments)
- **Build:** `sh scripts/build.sh`, pnpm with security overrides (dompurify, postcss, etc.)

## Security (2026-05-09)

PR#916 merged: 7→0 vulnerabilities.

## Lessons Locked

- `feedback_ios_release_workflow.md` — lessons from Platform Risk memo (RA-1842); Apple App Store posture requires early DORA tracking and Platform Risk dry-runs before any release

## Agent Coverage

- **CTO bot:** DORA quartet from GitHub Actions; Platform Risk lessons memo
- **CS bot:** first-response on any RA user support tickets
- **CMO bot:** handles any RA marketing artefacts (incorporates May 2026 SEO/AEO/GEO guidelines)

## SEO, AEO & GEO Intelligence (May 2026)

AI Overviews appear in ~55% of all searches. ANZ restoration brands are absent from AI-cited answers — unclaimed opportunity. Key keyword gaps: "restoration software Australia", "IAQ equipment supplier Australia", "moisture meter expert". See [[seo-linkable-assets]] for strategy.

## Industry Partnerships & Market Positioning

### CORE Network
OnCORE was ranked the #1 Third Party Administrator (TPA) by the Restoration Industry Association (RIA) in its 2025 TPA Scorecard Report—for the third consecutive year.

**CORE Membership Benefits:**
*   **Growth:** CORE connects independent restorers with nationwide opportunities, strategic partnerships, and industry-leading resources, helping members scale faster and streamline operations.
*   **Insurance Preference:** CORE restorers are pre-vetted, highly trained, and backed by advanced claims technology, ensuring jobs are handled with speed, precision, and white-glove service.
*   **Claims Process:** Claims can be filed easily via the 24/7 claims hotline or online portal, connecting the user with a licensed CORE restorer for immediate response.
*   **Scope:** The network specializes in all types of restoration, from everyday water and fire damage to large-scale commercial and catastrophe response.

**Community Testimonials:**
*   **Bylt:** Working with CORE Group has been a game-changer, helping sharpen vision, streamline processes, and spark innovation. CORE Group is viewed as a true ally in raising industry standards.
*   **Zolman Restoration:** Partnering with CORE Network as a CORE Elite Member allows confident scaling for CAT work and large-loss response, while maintaining high client standards. The network provides access to a deep bench of vetted contractors and resources nationwide.

### Industry Standards & Compliance
The platform supports adherence to major industry standards, including:
*   S100 2021: Professional Cleaning of Textile Floor Coverings.
*   S220 2021: Professional Inspection of Hard Surface Floor.
*   S300 2025, S400 2025, S410 2025, S700 2025, S900 2025: Various specialized restoration standards.
*   S500 Water Damage Restoration fifth edition 2021.
*   S520 2024: Mould Remediation third edition 2015.
*   S540 2023: Trauma and Crime Scene Cleanup first edition 2017.
*   S800 2023: Professional Inspection of Textile Floorcovering first edition 2014.
*   SOP: General Standard Operating Procedures.
*   The system also references key documents like the Water Damage Inspection and Remediation guide.

### Competitive Landscape: Digital Documentation & Scoping

Encircle Floor Plan offers a workflow to convert simple smartphone videos into professional, Xactimate-ready floor plans in under six hours, enabling immediate estimating.

*   **Workflow Advantage:** Encircle automates documentation, eliminating the need for manual drawing, tripods, or specialized training.
*   **Efficiency:** The platform allows users to start estimates on Day 1, addressing the critical need for timely invoicing.
*   **Comparison to Competitors:**
    *   **VS DocuSketch:** While convenient, DocuSketch can involve unpredictable overage charges (hardware, tour, rush fees).
    *   **VS Magicplan:** Magicplan is suitable for single-room sketches but is clunky for full floor plans, making it difficult to scale.
*   **Industry Standards:** The platform is designed to meet rigorous industry standards, ensuring accuracy and compliance across all job types.

## Appendix: Industry Standards Reference

*   **S100:** (Placeholder for specific standard details)
*   **S200:** (Placeholder for specific standard details)

---
*(Note: The original list of standards was integrated into a structured appendix/reference section for clarity.)*
---
type: wiki
updated: 2026-05-14
---

# CARSI Review — Product Strategist (2026-05-14)

Repo: `/Users/phill-mac/pi-seo-workspace/carsi/` ([[carsi]]). Discovery audit: [[carsi-discovery-audit-2026-05-14]].

CARSI is an [[iicrc-content-initiative]]-aligned CEC training LMS targeting ~5,000 ANZ restoration/cleaning pros. Journey on paper: discover course (SEO) → enrol via Stripe → complete lessons → earn certificate → claim CECs → share to LinkedIn/portfolio → loop into [[dr-nrpg]]. In code, ~80% of that journey ships; the IICRC-credit moat and the post-completion social loop are the weakest links.

## 1. User journey trace

| Step | Code support | Files |
|---|---|---|
| **1. Catalogue browse (SEO entry)** | SHIPS. Server-rendered `/courses` with discipline filter, search bar, IICRC discipline map, CEC calculator, bundle pricing cards. Falls back DB → WP export → backend proxy → `[]`. | `app/(public)/courses/page.tsx:71-89`, `src/lib/server/public-courses-list.ts` |
| **2. Course detail PDP** | SHIPS. SEO metadata, schema.org CourseSchema + BreadcrumbSchema, hub context, EnrolButton. Re-exported intact at `/dashboard/courses/[slug]` for logged-in users. | `app/(public)/courses/[slug]/page.tsx`, `app/(dashboard)/dashboard/courses/[slug]/page.tsx:1` |
| **3. Auth gate before enrol** | SHIPS. EnrolButton re-checks auth at click and redirects guests to `/register?next=...`. JWT in jose, `auth-provider` wraps the dashboard. | `src/components/lms/EnrolButton.tsx:101-107`, `app/(auth)/register/page.tsx` |
| **4. Stripe checkout** | SHIPS. POST `/api/lms/checkout` returns `checkout_url` or `enrolled:true` for free courses. Webhook verifies signature and calls `enrollStudentInCourse`. | `app/api/lms/checkout/route.ts`, `app/api/lms/webhooks/stripe/route.ts:34-77` |
| **5. Payment-success → enrolment confirm** | SHIPS but DOUBLE-CONFIRMS. Client calls `/api/lms/enrollments/confirm` with session_id, then redirects to `/dashboard/student` on a 3-sec countdown. Webhook already handles enrolment server-side; the client confirm is a belt-and-braces fallback. | `app/(public)/courses/[slug]/payment-success/PaymentSuccessClient.tsx:24-65` |
| **6. Student dashboard landing** | **BROKEN AT BUILD.** Renames `level` → `_level`, `loading` → `_loading` but the JSX at L273/276/287/311/313/314 still references bare `loading.level` and `level?.…` — 78 TS errors. Cannot ship until fixed. | `app/(dashboard)/dashboard/student/page.tsx:70,273,276,287,311-314` |
| **7. Onboarding wizard** | SHIPS structurally — 6-step framer-motion flow (industry → role → IICRC exp → goal → disciplines → renewal preference). Mounted in dashboard layout via `<OnboardingCheck/>`. SMS reminder button hard-coded disabled (L420-425). Server save broken at TS layer (Prisma client stale). | `src/components/lms/OnboardingWizard.tsx`, `src/components/lms/OnboardingCheck.tsx`, `app/(dashboard)/layout.tsx:5,32`, `app/api/lms/auth/onboarding/route.ts` |
| **8. Lesson playback** | SHIPS. `LessonPlayer` renders video (YouTube/Vimeo embed), Drive file, or formatted body + downloads. Progress PATCH endpoint live with auth gate. `LearnCourseShell` is the unified shell. | `src/components/lms/LessonPlayer.tsx`, `src/components/lms/LearnCourseShell.tsx:73`, `app/api/lms/lessons/[lessonId]/progress/route.ts` |
| **9. Quiz/assessment** | **DEAD ROUTE.** Old quiz page redirects to `/dashboard/learn/[slug]` (`app/(dashboard)/dashboard/courses/[slug]/quiz/[quizId]/page.tsx:3-10`). `QuizPlayer.tsx` is fully implemented but **imported nowhere**. No `/api/lms/quiz*` route exists. The "Take Quiz" CTA at `app/(dashboard)/.../lessons/[lessonId]/page.tsx:67-73` points to the redirect route — clicks resolve to a non-quiz screen. | `src/components/lms/QuizPlayer.tsx`, `app/(dashboard)/dashboard/courses/[slug]/lessons/[lessonId]/page.tsx:55-77` |
| **10. Certificate PDF** | SHIPS. `buildCompletionCertificatePdf` (pdf-lib) gated on `all_lessons_complete`, marks `certificateIssuedAt` on download. | `app/api/lms/enrollments/[enrollmentId]/certificate/route.ts:36-74`, `src/lib/server/certificate-pdf.ts` |
| **11. CEC tracking + renewal** | SHIPS visually. `RenewalCockpit` + `CECProgressRing` consume `/api/lms/gamification/me/renewal-summary`. **BUT** `src/types/renewal.ts:30` notes "a 1 CEC placeholder per IICRC-tagged course was used" — the actual `cecHours` value on `LmsCourse` (schema.prisma:84) is populated only where seed scripts wrote it, not from IICRC's authoritative course catalogue. | `src/components/lms/RenewalCockpit.tsx`, `app/api/lms/gamification/me/renewal-summary/route.ts` |
| **12. NRPG points** | **NOT WIRED.** Zero NRPG points code. NRPG appears only as marketing copy on `app/page.tsx` and as a `author_nrpg_id` byline string on `/research/[slug]`. The dashboard claim "earn certificate → unlock NRPG points" has no backing API call. | (none) |
| **13. Social/portfolio share** | PARTIAL. `LinkedInShareButton` builds a `linkedin.com/profile/add` deep link (works) and tries to fetch `/api/lms/credentials/[credentialId]/linkedin-draft` for an AI draft — **that route does not exist**; the call falls through `[[...path]]` catch-all and returns `503 not implemented`. `ProgressSharePrompt` is wired into `LearnCourseShell` for lesson/course completions. | `src/components/lms/LinkedInShareButton.tsx:54-58`, `app/api/lms/[[...path]]/route.ts:188-192` |
| **14. RPL portfolio** | **STUB-ONLY.** Page calls `/api/lms/rpl/units` and `/api/lms/rpl/portfolio/me`. Neither route exists; both hit `[[...path]]` and return 503. Page renders an empty submission list against a real form. | `app/(dashboard)/dashboard/student/rpl/page.tsx:57-71`, `app/api/lms/[[...path]]/route.ts` |
| **15. Subscription pricing tier** | **STUBBED.** `/pricing` advertises Foundation $44/mo + Growth $99/mo with 7-day trial. `/api/lms/subscription/status` returns hard-coded `has_subscription:false`. `/api/lms/subscription/checkout` returns `{url:''}`. EnrolButton checks subscription status but no checkout flow exists for monthly plans. | `app/(public)/pricing/page.tsx`, `app/api/lms/[[...path]]/route.ts:74-103`, `src/components/lms/EnrolButton.tsx:49-56` |

## 2. Half-finished features

| # | Feature | Where | What's missing | TTF | In MVP? |
|---|---|---|---|---|---|
| 1 | **Student dashboard build** | `app/(dashboard)/dashboard/student/page.tsx:70,273-314` | Rename `_level`/`_loading` back, OR fix the JSX. 78 TS errors block all builds. | 30 min | YES — gate |
| 2 | **Prisma client regen** | `src/generated/prisma/` | Run `prisma generate` against the 3 latest migrations (IICRC / onboarding-resume / leaderboard-privacy). Fixes ~60 of the 78 TS errors. | 5 min | YES — gate |
| 3 | **package.json merge conflict** | `package.json:35-45`, `package-lock.json` | Resolve HEAD vs `feat/design-md-adoption`. Blocks every npm command. | 15 min | YES — gate |
| 4 | **Quiz system** | `src/components/lms/QuizPlayer.tsx` (orphan), `app/(dashboard)/.../quiz/[quizId]/page.tsx` (redirect stub), no API | Wire QuizPlayer into LearnCourseShell on lesson completion; add `LmsQuiz` + `LmsQuestion` Prisma models; build `/api/lms/quizzes/[id]` + submission endpoint; hook to CEC award. | 2-3 days | YES — IICRC CEC integrity requires assessed completion, not just lesson tick-throughs |
| 5 | **Subscription billing** | `/api/lms/[[...path]]/route.ts:74-103` (stub), `/pricing` page (live) | Real Stripe subscription product, `subscription/checkout` + `subscription/portal` routes, plan→catalogue gating on EnrolButton, dashboard billing widget. | 4-5 days | YES — pricing page is live and lying right now |
| 6 | **RPL portfolio** | `/dashboard/student/rpl/page.tsx`, no API | Build `/api/lms/rpl/units` + `/api/lms/rpl/portfolio/me` + admin review surface. CPP unit catalogue seed. | 3-4 days | NO — push to v2 (most learners don't need RPL) |
| 7 | **NRPG points sync** | (none) | NRPG API contract + outbound award call on certificate issuance + UI points badge. Toby/NRPG must publish the API first. | Blocked on NRPG side | YES — this is the strategic moat |
| 8 | **AI LinkedIn draft** | `LinkedInShareButton.tsx:54-58` | Build `/api/lms/credentials/[credentialId]/linkedin-draft` (Anthropic-backed). | 1 day | YES — fastest "wow" moment for shareability |
| 9 | **SMS resume reminders** | `OnboardingWizard.tsx:420-425` | Hard-coded disabled button, schema notes "delivery not yet wired for sms" (`prisma/schema.prisma:40-41`). | 2 days (Twilio) | NO — email-only is fine for MVP |
| 10 | **Professional directory data** | `app/(public)/professional-directory/page.tsx:193` "Full live listing coming soon" | UNI-87 Track A — NRPG credentials feed. Currently a static stub. | Blocked on NRPG side | NO — defer; static stub passes SEO |
| 11 | **Bundles backend** | `app/(public)/courses/page.tsx:36-51` calls `${backend}/api/lms/bundles` | No internal route; depends on upstream config. Bundle pricing card displays empty list. | 1 day to implement | NO — single-course buy works |
| 12 | **Contact form** | `app/api/contact/route.ts:11-22` | "Persist or forward contact submissions here (e.g. email provider, CRM) when configured" — pure no-op. | 1 day (Resend) | YES — currently silently drops leads |
| 13 | **Workflows / PRD-generation / agent-runs** | `app/(dashboard)/instructor/ai-builder/page.tsx`, `app/workflows/*`, `app/prd/generate/page.tsx`, `app/(dashboard)/dashboard/agent-runs/page.tsx`, `/agents`, `/tasks`, `/demo`, `/demo-live`, `/council-demo`, `/dashboard-analytics`, `/status-demo`, `/design-system` | Experimental surfaces from a side-quest. They exist but have no path from any nav. | n/a | NO — hide behind feature flag or delete |
| 14 | **Push notification prompt** | `src/components/lms/PushNotificationPrompt.tsx`, `next-pwa@^5.6.0`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env | PWA + VAPID configured, but no backend to send pushes (notifications endpoint is a stub returning empty array). | 2 days | NO — defer |
| 15 | **Bundle pricing** | `src/components/lms/BundlePricingCard.tsx` used on /courses index | Card renders if `getBundles()` returns items — backend route absent (see #11). | (covered by 11) | NO |

**Tally: 15 half-finished features. 8 are MVP-critical (1–4, 5, 7, 8, 12).**

## 3. Dead UI elements

| Element | Location | Behaviour |
|---|---|---|
| "Take Quiz" CTA on lesson page | `app/(dashboard)/dashboard/courses/[slug]/lessons/[lessonId]/page.tsx:67-73` | Routes to `/courses/[slug]/quiz/[quizId]` which 301s to `/dashboard/learn/[slug]` — quiz never plays. |
| "AI Draft" LinkedIn button | `src/components/lms/LinkedInShareButton.tsx:91-100` | Opens modal, hits non-existent route, shows error. The "Add to LinkedIn" deep-link sibling works. |
| "SMS reminders — coming soon" | `src/components/lms/OnboardingWizard.tsx:420-425` | Hard `disabled` + `cursor-not-allowed`. Dead by design. |
| RPL submission form | `app/(dashboard)/dashboard/student/rpl/page.tsx` | Form submits to non-existent `/api/lms/rpl/*`. Returns 503 silently — caught in `.catch(() => [])`. User gets no error. |
| "Access Course — Included in Pro" CTA state | `src/components/lms/EnrolButton.tsx:86` | Subscription state is always `none` (stub returns `false`). Code path unreachable in production. |
| Bundle pricing cards (empty state) | `app/(public)/courses/page.tsx:36-51` | `getBundles()` silently returns `[]` on fetch failure; BundlePricingCard hides itself when empty — invisible to user but the code is dead. |
| Floating chat (Anthropic) | `src/components/lms/FloatingChatGate.tsx` mounted in `app/(dashboard)/layout.tsx:33` | Calls `/api/chat` (Anthropic). Routes exists but has **no auth gate** and burns API budget on demand. Likely meant to be auth-gated. |
| `/agents`, `/tasks`, `/demo`, `/demo-live`, `/council-demo`, `/dashboard-analytics`, `/status-demo`, `/design-system` | top-level `app/*/page.tsx` | Pages exist; no nav link points to them. Experimental dead surfaces. |

**Tally: 8 dead UI surfaces. The Quiz CTA and AI Draft are the two visible to learners.**

## 4. Missing empty / loading / error states

| Surface | Issue | File |
|---|---|---|
| `/courses` (catalogue) | DB-fetch wraps in `try/catch (e) { console.error(...) }` then falls through to WP export then backend then `[]`. **No UI banner** if all three fail — user sees an empty grid that looks identical to "no courses match filter". | `app/(public)/courses/page.tsx:71-88` |
| `/courses/[slug]` | `getCourse()` returns null → `notFound()`. Hard 404 even on transient DB error. Should differentiate. | `app/(public)/courses/[slug]/page.tsx:96-100` |
| Student dashboard — first-time empty | `EnrolledCourseList` returns `null` if `enrollments.length === 0`. No "Browse the catalogue" CTA in this branch. New learner sees stat tiles + RenewalCockpit but no clear next action. | `src/components/lms/EnrolledCourseList.tsx:32-34`, `app/(dashboard)/dashboard/student/page.tsx:328+` |
| `ContinueLearningBanner` empty | Returns `null` if no snapshot — silent. Fine, but no fallback "Start your first lesson" prompt. | `src/components/lms/ContinueLearningBanner.tsx:16-17` |
| Lesson page fetch failure | Sets `setError(err.message)` and renders `<p class="text-destructive">{error}</p>` — raw API error text leaks to UI. No retry button, no support link. | `app/(dashboard)/dashboard/courses/[slug]/lessons/[lessonId]/page.tsx:30-36, 50-51` |
| Certificate fetch | API returns 403 "Certificate available only after all lessons are complete." but no UI surface I can find shows this — it's a direct download link. User clicks early, gets a JSON error page. | `app/api/lms/enrollments/[enrollmentId]/certificate/route.ts:50` |
| RPL page | Both unit list + submissions calls `.catch(() => [])`. Empty UI is indistinguishable from "no submissions". | `app/(dashboard)/dashboard/student/rpl/page.tsx:60-63` |
| Payment-success confirm failure | Sets `setConfirmError('We could not verify enrolment automatically...')` but still redirects to dashboard after 3 sec. User sees error briefly, then it disappears. | `app/(public)/courses/[slug]/payment-success/PaymentSuccessClient.tsx:33-44, 49-58` |

Skeletons (`PlaceholderCard`, `CourseCardSkeleton`) exist for the loading branch — those are fine. The gap is **fetch-failure** = silent-empty vs. **fetch-pending** = skeleton.

## 5. Onboarding gap

A brand-new CARSI learner's first 60 seconds:

1. Registers at `/register` (`app/(auth)/register/page.tsx`). No email verification gate.
2. Lands at `/dashboard` or wherever `next` query param points (default `/dashboard/student`).
3. `<DashboardLayout>` mounts `<OnboardingCheck/>` (`app/(dashboard)/layout.tsx:32`), which GETs `/api/lms/auth/me`. If `onboarding_completed === false` → opens `<OnboardingWizard/>` modal.
4. Wizard collects: industry → role → IICRC experience → primary goal → disciplines held → resume-reminder preference. POSTs to `/api/lms/auth/onboarding`. **TS-broken — `onboardingCompletedAt` does not exist in stale Prisma client (`app/api/lms/auth/onboarding/route.ts:94`).**
5. Wizard redirects to `/dashboard/student` — **the broken dashboard page from §1.6**.

**Strengths:** IICRC experience is collected (level 1/2/3, disciplines held — WRT/AMRT/FSRT/CCT/CRT/OCT/ASD). That's the right thing.

**Gaps:**
- **No "first course" recommendation step.** Wizard collects discipline data but doesn't pipe it into a "We recommend you start with X" screen. `RecommendationWidget` exists but lives on the dashboard, not the onboarding tail.
- **No empty-dashboard CTA.** New learner with zero enrolments lands on a stats screen full of dashes (`—`) and no obvious "Browse free courses" path beyond the small "Browse all" link.
- **Email verification absent.** Wizard saves to a non-verified account; Stripe receipts go to whatever was typed.
- **IICRC card upload is post-onboarding** (lives in `/dashboard/student/profile`). The IICRC integration is the strategic moat and the strongest selling point — capturing the member number in onboarding (or right after first enrolment) would let CARSI claim CEC tracking from day 1.
- **The 7-day free trial advertised on `/pricing`** has no onboarding entry. New learner cannot start a trial; they can only buy individual courses.

## 6. Five product questions Phill needs to answer

1. **Subscription vs. à la carte.** `/pricing` advertises Foundation $44/mo and Growth $99/mo with 7-day trials. Code only supports single-course Stripe Checkout. Pick one — and if subscriptions are real, this is a 4–5 day build that gates EnrolButton on plan tier. If subscriptions are aspirational, the pricing page is currently misleading buyers. **Decision:** ship subscriptions or rewrite `/pricing` to single-course pricing.

2. **Are quizzes required for CEC credit?** IICRC CEC integrity normally requires assessed completion, not lesson tick-throughs. `QuizPlayer` is a fully-built orphan. If CECs award on "all lessons marked complete" without assessment, IICRC could revoke the CEC approval — that breaks the strategic moat. **Decision:** ship quizzes before scaling, or get written confirmation from IICRC that lesson-only completion counts.

3. **NRPG points integration — who blocks whom?** NRPG-side API contract is the blocker. The marketing copy on `app/page.tsx` already claims "CARSI is a core pillar of the NRPG onboarding pathway" — buyers expect it. **Decision:** when does NRPG ship `POST /api/awardPoints`? If >30 days, replace the NRPG copy with "coming Q3" so we stop overpromising.

4. **What does "free trial" mean operationally?** No code path supports trials. Stripe Checkout is one-shot. Trial state would need: trial-start timestamp on user, gated access by `trial_end > now`, dunning email at day 6. **Decision:** is the 7-day trial language on `/pricing` aspirational? If so, remove. If real, it's part of the subscription build.

5. **Drop the experimental surfaces or productise them?** `/agents`, `/tasks`, `/demo`, `/demo-live`, `/council-demo`, `/dashboard-analytics`, `/status-demo`, `/design-system`, `/workflows`, `/prd/generate`, `/prd/[id]` exist with no nav entry. They were AI-builder side-quests. **Decision:** delete (recommended — keeps the type-check surface small), gate behind `?staff=1`, or commit to shipping them. Currently they're 12 routes of dead weight and a search-index risk.

## Report card

- **Half-finished count:** 15 (8 MVP-critical)
- **Dead-element count:** 8 (2 visible to learners)
- **Top-3 product unblockers:**
  1. **Fix the build.** Resolve `package.json` merge conflict, run `prisma generate`, fix the `_level`/`_loading` rename in student dashboard. 50 minutes restores the journey from registration → enrolment → lesson playback.
  2. **Wire the QuizPlayer.** It's already built. Without assessed completion, the IICRC CEC moat is conjectural — the entire premium-pricing thesis rides on assessment integrity.
  3. **Decide subscriptions or remove the pricing page promises.** Currently the live pricing page is selling a product the code cannot deliver. This is the largest trust-and-conversion liability and the highest-revenue lever to fix.

Both quiz wiring and subscription decisions touch shared surfaces (lesson completion → CEC award; subscription state → EnrolButton). Sequence them: build → quiz → subscriptions, then unblock [[dr-nrpg]] when their API ships.

## Cross-refs

[[carsi-discovery-audit-2026-05-14]] · [[carsi-review-technical-architect-2026-05-14]] · [[carsi-review-market-strategist-2026-05-14]] · [[carsi-board-synthesis-2026-05-14]] · [[rana-handoff-2026-05-14]] · [[carsi]] · [[iicrc-content-initiative]] · [[dr-nrpg]] · [[pi-ceo-architecture]] · [[restore-assist]] · [[master-plan-2b-by-2028-v3]] · [[swot-restoration-cluster-2026]] · [[feedback-make-calls-not-questions]] · [[opus-adversary]]

---
type: wiki
updated: 2026-05-14
---

# CARSI — Board Synthesis (CEO ranked action register) — 2026-05-14

Synthesises three [[pi-ceo-architecture]] Board reviews ([[carsi-review-technical-architect-2026-05-14]], [[carsi-review-product-strategist-2026-05-14]], [[carsi-review-market-strategist-2026-05-14]]) against the [[carsi-discovery-audit-2026-05-14]] ground truth. Single executable list for [[rana-handoff-2026-05-14|Rana Muzamil]] (Technical Lead, 28-day silent on `package.json:7`) and PM-Core to drop into Linear tomorrow morning.

Repo: `/Users/phill-mac/pi-seo-workspace/carsi/`. Branch: 12 ahead / 131 behind `origin/main`, 110 modified files, no commits in 28 days.

---

## 1. CEO headline

CARSI is **architecturally sound and operationally stalled**. Stripe checkout, pdf-lib certificates, 11 Prisma models with FK + unique constraints, 33 Playwright e2e tests, strong JSON-LD/SEO schema layer, 150-course WordPress export already serving live traffic — none of that is in doubt. What's broken is mechanical and recoverable: an unresolved merge conflict in `package.json:35-45` blocks every npm command, a stale Prisma client at `src/generated/prisma/` produces all 78 `tsc` errors via one root cause, and a real-looking live WooCommerce key + secret sit in `.env.example:1-3` open to anyone with read access.

The **Technical Architect's "abandon the branch" call is the load-bearing decision.** PM-Core has already shipped the exact CI fixes attempted in this branch's conflict 21 days ago on `origin/main` (`04d2f08`). The unique work here is 4 seed-script registrations — that's a 30-minute cherry-pick. The alternative — mechanical rebase of 131 commits across 110 dirty files — is days of busywork producing identical output. **I endorse abandon.**

Shippability verdict: **1 sprint to first ship**, given (a) the branch abandon happens this week, (b) IICRC CEC quiz wiring is treated as P0 (not P1), and (c) Phill names a tech-lead going forward. The IICRC moat (the entire premium-pricing thesis per [[iicrc-content-initiative]] and [[master-plan-2b-by-2028-v3]]) collapses if QuizPlayer stays orphaned, because lesson-tick CECs are not defensibly assessed completion.

---

## 2. P0 — must ship this week

Hard cap 6.

### P0-1 — Rotate leaked WooCommerce credentials at carsi.com.au (TODAY)
- **Action:** (a) Log into carsi.com.au WordPress → WooCommerce → Settings → Advanced → REST API → revoke `ck_f6caa7487d219e8796d13c5c277e3da4cfd2245a`. Reissue a new key pair; store in 1Password (per [[feedback-secrets-handling]]). (b) Replace `.env.example:1-3` with the placeholder block already present at lines 115–116 (`WC_CONSUMER_KEY=ck_xxx` / `WC_CONSUMER_SECRET=cs_xxx`). (c) `git log -p -- .env.example` to bound exposure window; if >7 days, treat as compromised regardless of rotation. (d) Add a `.husky/pre-commit` grep guard blocking `/(ck|cs|sk|pk|whsec|rk)_[a-zA-Z0-9]{16,}/` patterns outside placeholders.
- **File:line:** `/Users/phill-mac/pi-seo-workspace/carsi/.env.example:1-3`.
- **Owner:** Phill (rotation) + PM-Core (file edit + husky guard).
- **Effort:** 30 min.
- **Acceptance:** WooCommerce REST credentials at carsi.com.au are new; `grep -E '(ck|cs|sk|pk|whsec|rk)_[a-zA-Z0-9]{16,}' .env.example` returns 0 matches; pre-commit hook blocks any future stage of a string matching that pattern.
- **Blast radius:** Full WooCommerce REST access if recognised (read customers, read orders, mutate products). Every clone/fork/CI cache retains the secret.

### P0-2 — Resolve `package.json` + `package-lock.json` merge conflict
- **Action:** Hand-merge keeping **all 8 script keys from both sides** (HEAD: `type-check`, `lint: "eslint ."`, `test:e2e`; incoming: 4 new seed scripts `db:seed-contents-specialty-drying-courses-txt`, `db:seed-specialty-courses-resources-txt`, `db:seed-technology-inspection-tools-txt`, `db:seed-odour-smoke-psychro-drying-docx`). Resolve `lint` collision in favour of `eslint .` (matches `origin/main` `04d2f08` already merged upstream). Delete `package-lock.json`, run `npm install` to regenerate clean. Verify JSON validity: `node -e "JSON.parse(require('fs').readFileSync('package.json'))"`.
- **File:line:** `/Users/phill-mac/pi-seo-workspace/carsi/package.json:35-45`; `/Users/phill-mac/pi-seo-workspace/carsi/package-lock.json` (multiple conflict markers).
- **Owner:** PM-Core (or Rana if reachable).
- **Effort:** 15 min.
- **Acceptance:** `npm install` exits 0; `npm run build` parses `package.json` and proceeds past the postinstall `prisma generate`.
- **Blast radius:** Unblocks every npm-based command (build, install, lint, type-check, e2e, deploy, seed scripts).

### P0-3 — Run `npx prisma generate` to refresh the stale client
- **Action:** After P0-2 lands, run `npx prisma generate`. This resolves ~60 of the 78 `tsc` errors at one stroke (the entire `LmsUserSelect` / `LmsUserUpdateInput` cluster for `iicrcMemberNumber`, `iicrcExpiryDate`, `iicrcCardImageUrl`, `iicrcCertifications`, `onboardingCompletedAt`, `resumeReminderOptIn`, `leaderboardShowDisplayName`, `leaderboardDisplayName`). Then mop up the two non-Prisma residuals:
  - `app/(dashboard)/dashboard/student/page.tsx:273,276,287,311-314` — incomplete `loading`/`level` → `_loading`/`_level` rename. Either restore the public names or update consumers.
  - `src/lib/server/public-catalogue-facts.ts:95` + `src/lib/server/public-courses-list.ts:86` — `readonly OR` cast: `as LmsCourseWhereInput[]` or drop `readonly` modifier.
- **File:line:** `/Users/phill-mac/pi-seo-workspace/carsi/src/generated/prisma/` (regenerated artefact); `prisma/schema.prisma:32-45` (source of truth); migration directories `20260416120000_lms_user_iicrc`, `20260419190000_lms_user_onboarding_resume`, `20260420120000_leaderboard_privacy`.
- **Owner:** PM-Core.
- **Effort:** 20 min (5 min generate + 15 min rename + cast cleanup).
- **Acceptance:** `npx tsc --noEmit` exits 0.
- **Blast radius:** Unblocks CI, type-check, every PR red right now.

### P0-4 — Abandon the 131-behind branch; cherry-pick the 4 seed-script commits onto fresh `origin/main`
- **Action:** Open a fresh branch off `origin/main` (`carsi/seed-scripts-rescue`). Identify the 4 unique commits that added the seed scripts (`34153a1` "Register npm scripts for microbial, water damage, and specialty drying seeds", plus the parser commits `6f19b79`, `2b54dec`, `bbb5af7`, `3587fd7`, `a8fc151`, `761fb19`, `d8fc041`). Cherry-pick the script-add + parser commits onto the rescue branch. Open PR against `main`. Once merged, delete the local branch and the 110-file dirty working tree.
- **File:line:** Current branch (whichever Rana left it on) → `origin/main`.
- **Owner:** PM-Core (or whoever Phill names as new tech-lead).
- **Effort:** 30 min cherry-pick + CI cycle. Compare to days of mechanical rebase on the 131-behind branch.
- **Acceptance:** Rescue branch merges green into `main`; legacy branch closed; CARSI repo has zero in-progress merge state.
- **Blast radius:** Removes 110 stale modified files, 12 duplicate-of-main commits, and the merge-conflict state. Single source of truth restored.

### P0-5 — Wire QuizPlayer into lesson pages (IICRC CEC moat)
- **Action:** Lift the orphan `src/components/lms/QuizPlayer.tsx` into `LearnCourseShell` on lesson completion. Add `LmsQuiz` + `LmsQuestion` Prisma models (one migration). Build `/api/lms/quizzes/[id]` GET + `/api/lms/quizzes/[id]/submit` POST. Hook submission success → CEC award on the existing `LmsLessonProgress` / `LmsEnrollment` flow. Remove the dead `/courses/[slug]/quiz/[quizId]` redirect (`app/(dashboard)/dashboard/courses/[slug]/quiz/[quizId]/page.tsx:3-10`). Update the "Take Quiz" CTA at `app/(dashboard)/dashboard/courses/[slug]/lessons/[lessonId]/page.tsx:67-73` to point at the live QuizPlayer route.
- **File:line:** `src/components/lms/QuizPlayer.tsx` (orphan), `src/components/lms/LearnCourseShell.tsx:73` (mount point), `app/(dashboard)/dashboard/courses/[slug]/lessons/[lessonId]/page.tsx:55-77`, `prisma/schema.prisma` (new models).
- **Owner:** PM-Core + Phill for IICRC sign-off on assessment shape.
- **Effort:** 2–3 days (3 routes, 2 models, 1 component wire, 1 migration, 4 unit tests).
- **Acceptance:** Learner can complete a lesson, take a quiz, pass at ≥70%, see CEC awarded, download certificate. Failing the quiz blocks the cert. End-to-end Playwright test passes.
- **Blast radius:** Without this the IICRC CEC moat is conjectural. Lesson-tick CECs are not defensibly assessed completion; IICRC could revoke CEC approval; the entire premium-pricing thesis per [[iicrc-content-initiative]] and [[master-plan-2b-by-2028-v3]] collapses.

### P0-6 — Strip WordPress legacy HTML from courses.json hero
- **Action:** Add a pre-render sanitiser in `src/lib/wordpress-export-courses.ts` that strips the first `<h3>Already Purchased This Course?</h3>` + following `<p><a href="https://carsi.com.au/...">Access Here</a></p>` block from every imported course description. Re-render the catalogue. Apply to all 150 records in `data/wordpress-export/courses.json` at parse time (don't mutate the JSON — strip at the read path so a re-export doesn't re-introduce the leak).
- **File:line:** `data/wordpress-export/courses.json:6` (source of the leak); `src/lib/wordpress-export-courses.ts` (the sanitiser); `app/(public)/courses/[slug]/page.tsx` (consumer).
- **Owner:** PM-Core.
- **Effort:** 2 hours.
- **Acceptance:** Visit 5 randomly-selected `/courses/[slug]` pages; none show "Already Purchased" CTA. Catalogue rebuild produces no regression in metadata generation.
- **Blast radius:** Every course detail page currently leads its hero with a WordPress legacy "leave this site" CTA. Highest-intent visitors are being told to go away. Immediate conversion lift, no cost.

**P0 total: 6.**

---

## 3. P1 — ship next sprint (10)

### P1-1 — Wire GA4 + PostHog (analytics is currently zero)
- **Action:** Inject GA4 script + PostHog client in `app/layout.tsx`. Emit `course_view`, `enrol_click`, `checkout_started` client-side. Emit `purchase` server-side from the Stripe webhook (`app/api/lms/webhooks/stripe/route.ts`) via GA4 Measurement Protocol.
- **File:line:** `app/layout.tsx:25-87` (script injection), `src/components/lms/EnrolButton.tsx:81-150` (enrol_click), `app/api/lms/webhooks/stripe/route.ts:34-77` (purchase).
- **Effort:** 4 hours.
- **Acceptance:** GA4 real-time shows pageviews; PostHog shows `enrol_click` events; Stripe-completed sandbox checkout produces a `purchase` event in GA4 with the correct course slug.
- **Why:** Without this, P1-2 through P1-10 plus every P2 are unmeasurable. Highest-leverage market-side change.

### P1-2 — Remove `dynamic = 'force-dynamic'` from `/`, `/courses`, `/courses/[slug]`, `app/sitemap.ts`
- **Action:** Replace with `export const revalidate = 300` (ISR, 5-minute window). Call `revalidatePath('/courses')` from the admin route on course publish.
- **File:line:** `app/page.tsx:54`, `app/(public)/courses/page.tsx` (top), `app/(public)/courses/[slug]/page.tsx` (top), `app/sitemap.ts:5`.
- **Effort:** 2 hours.
- **Acceptance:** Lighthouse mobile LCP on `/courses` < 2.5s; sitemap survives a backend outage without dropping course URLs.

### P1-3 — Decide subscriptions ($44/$99) vs. à la carte; align code or `/pricing` page
- **Action:** Two paths. (A) If subscriptions ship: build Stripe subscription product, `subscription/checkout` + `subscription/portal` routes, plan→catalogue gating on EnrolButton, dashboard billing widget. 4–5 days. (B) If à la carte only: rewrite `/pricing` to remove Foundation/Growth monthly tiers + 7-day trial promise. 1 hour.
- **File:line:** `app/(public)/pricing/page.tsx`, `app/api/lms/[[...path]]/route.ts:74-103` (stub), `src/components/lms/EnrolButton.tsx:49-56`.
- **Effort:** 1 hour (rewrite) or 4–5 days (build).
- **Acceptance:** Live `/pricing` matches what the code can deliver; no buyer can click a tier that 404s or returns `has_subscription:false`.
- **Why:** Currently the live pricing page is selling a product the code cannot deliver. Trust-and-conversion liability.

### P1-4 — Public chat rate-limit (`lms/public/chat`)
- **Action:** Reuse the rate-limit map pattern from `generate-image/route.ts`. Cap at 5/min/IP and 100/day/IP. Swap in-memory Map for Upstash Redis or Vercel KV for cross-region durability.
- **File:line:** `app/api/lms/public/chat/route.ts:41`; reference pattern `app/api/generate-image/route.ts:14-28`.
- **Effort:** 4 hours.
- **Acceptance:** 11th request inside 60s from one IP returns `429`. Replay test from a fresh Vercel region shows the limit honoured (proves the KV swap).
- **Why:** Public POST + spends OpenAI credit per request + zero limit = overnight budget burn risk.

### P1-5 — Fix `JWT_SECRET` vs `JWT_SECRET_KEY` naming drift in `.env.example`
- **Action:** Rename `.env.example:27` from `JWT_SECRET_KEY` to `JWT_SECRET`. Global grep `grep -rn JWT_SECRET_KEY app src` to confirm zero source consumers. Document in `.env.example`.
- **File:line:** `.env.example:27`.
- **Effort:** 10 min.
- **Acceptance:** `grep -rn JWT_SECRET_KEY app src` returns 0.
- **Why:** Per [[feedback-secrets-handling]] and [[carsi-review-technical-architect-2026-05-14]] §3.5, silent env misreads are a recurring bug class in this empire.

### P1-6 — Add 17 missing env vars to `.env.example`
- **Action:** One PR adds: `ADMIN_JWT_SECRET`, `AI_ASSISTANT_NAME`, `BACKEND_API_KEY`, `CARSI_COURSES_XLSX_PATH`, `CRON_SECRET`, `DATABASE_CA_CERT`, `GOOGLE_GENERATIVE_AI_API_KEY`, `HOMEPAGE_FEATURED_COURSE_SLUGS`, `LMS_SYSTEM_INSTRUCTOR_ID`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BACKEND_HEALTH_PATH`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_YJS_WS_URL`, `WP_EXPORT_COURSES_PATH`, `WXR_PATH`. Each with placeholder + 1-line comment.
- **File:line:** `.env.example` (append).
- **Effort:** 30 min.
- **Acceptance:** Diff `grep -rEoh 'process\.env\.[A-Z_]+' app src | sort -u` vs `.env.example` returns 0 code-only references.

### P1-7 — Redirect post-purchase straight to first lesson (not `/dashboard/student`)
- **Action:** Change Stripe `success_url` builder in `src/lib/checkout-urls.ts` to resolve `next = /dashboard/courses/[slug]/lessons/[firstLessonId]` server-side at checkout creation (query the first published lesson by `orderIndex`). Update `app/(public)/courses/[slug]/payment-success/PaymentSuccessClient.tsx:20`.
- **File:line:** `src/lib/checkout-urls.ts`, `app/(public)/courses/[slug]/payment-success/PaymentSuccessClient.tsx:20`.
- **Effort:** 1 hour.
- **Acceptance:** Sandbox Stripe checkout for a course lands the learner on the first lesson, not the dashboard.

### P1-8 — Wire Resend for `/contact` + `/subscribe` (currently silent /dev/null)
- **Action:** Add `RESEND_API_KEY` to `.env.example`. Wire `app/api/contact/route.ts:20` (currently a literal no-op comment) to a Resend send into `contact@unite-group.in`. Wire `/subscribe` form to Resend audience (or whichever audience tool the empire standardised on).
- **File:line:** `app/api/contact/route.ts:11-22`, `app/(public)/subscribe/page.tsx`.
- **Effort:** 1 day.
- **Acceptance:** Submitting `/contact` produces an email at `contact@unite-group.in` within 60s; submitting `/subscribe` adds the email to the Resend audience.
- **Why:** Every non-purchase top-of-funnel inquiry is currently being silently dropped.

### P1-9 — Stripe webhook event-ID idempotency table
- **Action:** Add Prisma model `StripeWebhookEvent { id String @id; type String; processedAt DateTime }`. Insert at `app/api/lms/webhooks/stripe/route.ts:33`; skip processing if `event.id` already exists.
- **File:line:** `app/api/lms/webhooks/stripe/route.ts:15-80`; new model in `prisma/schema.prisma`.
- **Effort:** 4 hours.
- **Acceptance:** Replaying the same Stripe event twice produces one log line "duplicate event, skipped" on the second call. Unit test covers the path.

### P1-10 — Resolve `status` vs `isPublished` dual-flag (course publication)
- **Action:** Pick `status` (more expressive, dominant convention). Write migration `20260515_canonicalize_course_status` that backfills `isPublished` to mirror `status = 'published'`, then drops `isPublished` in a follow-up migration after a 1-sprint dual-write window.
- **File:line:** `prisma/schema.prisma:77,87`; `src/lib/server/public-courses-list.ts:8-16`; `src/lib/server/public-catalogue-facts.ts:95`.
- **Effort:** 4 hours.
- **Acceptance:** New migration applied; `OR: [{ isPublished: true }, { status: 'published' }]` query is replaced by `where: { status: 'published' }`; `readonly OR` type-cast error stays gone.

**P1 total: 10.**

---

## 4. P2 — defer (8)

| # | Item | File:line | Effort | Why deferred |
|---|---|---|---|---|
| P2-1 | NRPG points integration on certificate issuance | (none; UI stub `professional-directory/page.tsx:193`) | Blocked | NRPG API contract not published. Holding pattern: replace marketing copy on `app/page.tsx` with "NRPG sync coming Q3 2026" so we stop overpromising (see §5 question). |
| P2-2 | FK indexes: `LmsLesson.moduleId`, `LmsModule.courseId`, `LmsEnrollment.studentId`, `LmsLessonProgress.studentId`, `LmsCourse.iicrcDiscipline`, `LmsCategory.parentId` | `prisma/schema.prisma:126-188` | 1 day | Performance is fine at current scale (<150 courses). Add `CREATE INDEX CONCURRENTLY` migration when catalogue passes 500 lessons. |
| P2-3 | Husky pre-commit `tsc --noEmit --incremental` | `.husky/pre-commit:1` | 30 min | Once P0-3 lands, the failure mode it guards is already gone for one cycle. Add the guard after the rescue branch is merged. |
| P2-4 | Bump `prisma` 7.6.0 → 7.8.0 | `package.json:71,93` | 15 min | Tag-along change once P0-2 ships. |
| P2-5 | Delete 12 experimental routes (`/agents`, `/tasks`, `/demo`, `/demo-live`, `/council-demo`, `/dashboard-analytics`, `/status-demo`, `/design-system`, `/workflows`, `/workflows/[id]`, `/prd/generate`, `/prd/[id]`) | `app/agents/page.tsx`, `app/tasks/page.tsx`, etc. | 2 hours | See §5 question — needs founder call. If kept, gate behind `?staff=1`. |
| P2-6 | Embed Noto Sans TTF in pdf-lib certificate generator (unicode names) | `src/lib/server/certificate-pdf.ts:4`; `public/fonts/NotoSans-Regular.ttf` | 2 hours | First Indigenous/multilingual name on a CARSI cert will surface this; until then, deferred. |
| P2-7 | Per-discipline faceted URLs (`/courses/water-restoration`, `/courses/applied-structural-drying`, etc.) — 7 IICRC codes | New routes under `app/(public)/courses/[discipline]/page.tsx` | 1 day | High-leverage SEO play but needs P1-1 (analytics) live first to measure lift. Sprint 2. |
| P2-8 | RPL portfolio (build `/api/lms/rpl/units`, `/api/lms/rpl/portfolio/me`, admin review surface) | `app/(dashboard)/dashboard/student/rpl/page.tsx`, no API | 3–4 days | Most learners don't need RPL. v2 feature. Hide the page entry from nav until shipped. |

**P2 total: 8.**

---

## 5. Open questions for Phill — make the calls

Exactly 5. All blocking. Yes/no or pick-one.

### Q1. Abandon or rebase the 131-behind branch?
**Tech Architect recommends ABANDON. CEO endorses.** Cherry-pick the 4 unique seed-script commits onto a fresh branch off `origin/main` (~30 min) versus a mechanical rebase of 131 commits across 110 dirty files (days). PM-Core has already shipped the lint/CI fixes upstream that this branch was attempting. The 12 local commits ahead are stale duplicates.
**Pick:** ABANDON / REBASE.

### Q2. Who owns CARSI's technical leadership from this week forward?
Rana Muzamil is listed as Technical Lead in `package.json:7` but has been silent for 28 days; the 131-behind branch state is consistent with off-ramping. **Pick one:** (a) Re-engage Rana with explicit deliverables (P0-1 through P0-6 within 5 working days as the test); (b) Transfer to PM-Core + a Senior Agent as the standing tech-lead; (c) Hire/contract a replacement (Phill's call on cost). Until this is named, every action in §2 and §3 has no executable owner.

### Q3. Self-attested IICRC vs verified-via-API?
The schema captures `iicrcMemberNumber`, `iicrcExpiryDate`, `iicrcCardImageUrl`, `iicrcCertifications` (`prisma/schema.prisma:32-45`). No outbound API to iicrc.org. **Pick one:** (a) Self-attestation + clear UI disclaimer; (b) Manual admin-review queue where Phill or a moderator verifies card images at registration; (c) Scrape iicrc.org directory (legally fragile, deprioritised). This decision shapes the entire credential-trust narrative — and therefore the premium-pricing thesis per [[iicrc-content-initiative]].

### Q4. Monthly subscriptions ($44 Foundation / $99 Growth) or one-shot purchase only?
Live `/pricing` advertises subscriptions + 7-day trial. Code only supports one-shot Stripe Checkout. `/api/lms/subscription/status` returns hard-coded `has_subscription:false`. **Pick one:** (a) Ship subscriptions (4–5 day build, see P1-3 path A); (b) Rewrite `/pricing` to per-course pricing only (1 hour, P1-3 path B). Currently the pricing page is selling something the code cannot deliver.

### Q5. Delete the 12 experimental routes or keep them?
`/agents`, `/tasks`, `/demo`, `/demo-live`, `/council-demo`, `/dashboard-analytics`, `/status-demo`, `/design-system`, `/workflows`, `/workflows/[id]`, `/prd/generate`, `/prd/[id]` exist with no nav entry. AI-builder side-quests. **Pick one:** (a) Delete (recommended — keeps the type-check surface small + reduces search-index dilution); (b) Gate behind `?staff=1` query flag; (c) Commit to productising them on a stated roadmap.

---

## 6. 7-day plan

Day-by-day with the test-pass gate. Assumes Phill answers Q1, Q2, Q4 by end of Day 0 (today).

| Day | What ships | Owner | Test-pass gate |
|---|---|---|---|
| **Mon (today, Day 0)** | P0-1 WC credentials rotated at carsi.com.au; `.env.example` placeholder restored; husky guard added. Phill answers Q1/Q2/Q4. | Phill + PM-Core | `grep -E '(ck\|cs)_[a-f0-9]{32,}' .env.example` returns 0; new WC keys in 1Password. |
| **Tue (Day 1)** | P0-2 `package.json` conflict resolved; P0-3 `prisma generate` + rename + cast cleanup. P0-4 rescue branch opened off `origin/main`, seed commits cherry-picked. | PM-Core | `npm install` exits 0; `npx tsc --noEmit` exits 0; rescue PR is green in CI. |
| **Wed (Day 2)** | P0-4 PR merged into `main`; legacy branch closed. P0-6 WordPress hero sanitiser shipped + redeployed; spot-check 5 random `/courses/[slug]` pages. P1-1 GA4 + PostHog wired and emitting `course_view` / `enrol_click`. | PM-Core | Vercel production deploy green; 5 spot-checked courses show no "Already Purchased" hero; GA4 real-time shows pageviews. |
| **Thu (Day 3)** | P0-5 day 1 of 3 — `LmsQuiz` + `LmsQuestion` models + migration; `/api/lms/quizzes/[id]` GET. P1-2 remove `force-dynamic` from `/`, `/courses`, `/courses/[slug]`, `app/sitemap.ts`. P1-5 JWT_SECRET rename. | PM-Core | Migration applies; GET returns shape; Lighthouse mobile LCP on `/courses` < 2.5s. |
| **Fri (Day 4)** | P0-5 day 2 of 3 — `/api/lms/quizzes/[id]/submit` POST + CEC award hook. P1-6 17 env vars added to `.env.example`. P1-7 post-purchase redirect to first lesson. | PM-Core | Sandbox quiz pass produces CEC award visible in `/dashboard/student`; `grep -rEoh 'process\.env\.[A-Z_]+' app src` matches `.env.example`. |
| **Sat (Day 5)** | P0-5 day 3 of 3 — wire QuizPlayer into LearnCourseShell; remove dead quiz redirect; update lesson "Take Quiz" CTA; Playwright e2e covering quiz path. P1-9 Stripe idempotency table. | PM-Core | Full e2e enrol → lesson → quiz → cert path green in Playwright; replay Stripe event produces "duplicate skipped" log. |
| **Sun (Day 6)** | P1-3 — execute Phill's Q4 answer (either ship subscriptions Day 7–11 or strip `/pricing` to per-course today). P1-4 public chat rate-limit. P1-8 Resend wiring on `/contact` + `/subscribe`. P1-10 status canonicalisation migration. | PM-Core | If subscriptions: kicked off — partial deploy. If à la carte: `/pricing` page reflects code. `/contact` form produces email at contact@unite-group.in. |

**End-of-week gate:** Repo is on `main`, builds green, all tests pass, P0 1-6 closed, P1 1-2, 1-4 to 1-10 closed (P1-3 in-flight pending Q4 decision), QuizPlayer live with assessed CEC awards, GA4 measuring everything, no leaked secrets in git history.

---

## 7. Cross-refs

[[carsi]] · [[carsi-discovery-audit-2026-05-14]] · [[carsi-review-technical-architect-2026-05-14]] · [[carsi-review-product-strategist-2026-05-14]] · [[carsi-review-market-strategist-2026-05-14]] · [[iicrc-content-initiative]] · [[feedback-secrets-handling]] · [[dr-nrpg]] · [[master-plan-2b-by-2028-v3]] · [[swot-restoration-cluster-2026]] · [[industry-association-vision-2026]] · [[ccw]] · [[exit-thesis]] · [[pathway-to-2b-2026-2028]] · [[qa-lead]] · [[brand-guardian]] · [[nexus-human-voice-2026-05-11]] · [[autonomy-gap-audit-2026-05-14]] · [[curator-security-unknown]] · [[connector-routing]]

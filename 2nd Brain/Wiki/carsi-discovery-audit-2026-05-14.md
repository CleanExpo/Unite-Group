---
type: wiki
updated: 2026-05-14
---

# CARSI Discovery Audit — 2026-05-14

Repo: `/Users/phill-mac/pi-seo-workspace/carsi/` (CleanExpo/[[carsi]] LMS).
Technical Lead: see [[rana-handoff-2026-05-14]]. Working tree has 110 modified files and an in-progress merge state.

## 1. Repo shape

Top-level directories (`/Users/phill-mac/pi-seo-workspace/carsi/`):

- `app/` — Next.js App Router (admin, auth, dashboard, public route groups + `api`)
- `src/` — `ai/`, `components/`, `generated/` (Prisma client), `hooks/`, `lib/`, `styles/`, `types/`
- `prisma/` — `schema.prisma` + 7 migrations under `migrations/`
- `packages/` — internal workspaces: `shared`, `schema`, `news-worker`, `config`
- `scripts/` — 22 TS scripts: WordPress migration + 13 course-seeders + utilities
- `data/` — seed inputs: docx/txt/xlsx course catalogues, `wordpress-export/`, `wordpress-seed.sql`
- `e2e/` — Playwright specs (`carsi-journeys.spec.ts`, `prd-generation.spec.ts`, `pre-production.spec.ts`)
- `docs/` — 40+ design / architecture documents
- `public/` — static assets
- `skills/` — Claude Code skills
- `.github/` — CI workflows (modified, currently uncommitted)
- `.husky/` — pre-commit hooks (added 2026-04-15)
- `templates/`, `.cursor/`, `.vercel/`, `.vscode/`

Package manager: **npm** (Node 22.x per `package.json` engines:11–14). `package-lock.json` present.

Key dependencies (`package.json:89–134`):
- `next` 16.1.1
- `react` / `react-dom` 19.2.4 (locked via `overrides`)
- `prisma` 7.6.0 / `@prisma/client` 7.6.0 (generator output: `src/generated/prisma`)
- `tailwindcss` ^4.1.18 + `@tailwindcss/postcss` ^4.1.18
- `stripe` ^20.2.0
- `pdf-lib` ^1.17.1
- `pg` ^8.14.1, `@prisma/adapter-pg` ^7.6.0
- `@google/generative-ai` ^0.24.1 (Gemini)
- `jose` ^6.2.2 (JWT), `bcryptjs` ^3.0.3
- `cloudinary` ^2.9.0
- `framer-motion` ^12.29.0, `lucide-react` ^0.468.0
- `next-pwa` ^5.6.0, `y-websocket` / `yjs` (collaboration)
- TypeScript ^5.7.2, ESLint ^9.17.0, `@playwright/test` ^1.49.1

Build/dev/test scripts (`package.json:16–51`):
- `dev` → `next dev`
- `build` → `prisma generate && next build`
- `start` → `prisma migrate deploy && next start`
- `type-check` → `tsc --noEmit` (lives inside the `<<<<<<< HEAD` block — see §2)
- `lint` → conflicting: `eslint .` (HEAD) vs `next lint` (incoming branch `feat/design-md-adoption`)
- `test:e2e` → `playwright test e2e/` (HEAD only)
- 13 seed scripts: `db:seed-courses`, `db:seed-wp-export`, `db:seed-wp-lessons`, `db:seed-air-quality-docx`, `db:seed-safety-ppe-docx`, `db:seed-whs-compliance-docx`, `db:seed-marketing-business-docx`, `db:seed-microbial-docx`, `db:seed-water-damage-txt`, `db:seed-specialty-drying-txt`, `db:seed-contents-specialty-drying-courses-txt`, `db:seed-specialty-courses-resources-txt`, `db:seed-technology-inspection-tools-txt`, `db:seed-odour-smoke-psychro-drying-docx`

Apps (single Next.js app + 4 internal packages):
- Root Next.js app (the LMS frontend + API)
- `packages/shared` (`@shared/types`) — shared TS types
- `packages/schema` (`@carsi/schema`) — JSON-LD schema.org builders (UNI-59)
- `packages/news-worker` (`@carsi/news-worker`) — RSS news ingestion worker (UNI-81)
- `packages/config` (`@config/eslint`) — shared eslint + tsconfig base

## 2. Build health

**`npx tsc --noEmit` — FAIL** (78 errors).

First 30 error lines:
```
app/(dashboard)/dashboard/student/page.tsx(273,20): error TS2552: Cannot find name 'loading'. Did you mean '_loading'?
app/(dashboard)/dashboard/student/page.tsx(273,43): error TS2552: Cannot find name 'level'. Did you mean '_level'?
app/(dashboard)/dashboard/student/page.tsx(276,20): error TS2552: Cannot find name 'loading'. ...
app/(dashboard)/dashboard/student/page.tsx(276,50): error TS2552: Cannot find name 'level'. ...
app/(dashboard)/dashboard/student/page.tsx(287,20): error TS2552: Cannot find name 'loading'. ...
app/(dashboard)/dashboard/student/page.tsx(287,43): error TS2552: Cannot find name 'level'. ...
app/(dashboard)/dashboard/student/page.tsx(311,20): error TS2552: Cannot find name 'loading'. ...
app/(dashboard)/dashboard/student/page.tsx(313,23): error TS2552: Cannot find name 'level'. ...
app/(dashboard)/dashboard/student/page.tsx(314,32): error TS2552: Cannot find name 'level'. ...
app/api/lms/auth/me/route.ts(50,9): error TS2353: Object literal ... 'iicrcMemberNumber' does not exist in type 'LmsUserSelect'
app/api/lms/auth/me/route.ts(62,32): error TS2339: Property 'iicrcMemberNumber' does not exist on type '{ email; role; id; hashedPassword; fullName; isActive; isVerified; themePreference; createdAt; updatedAt; }'
app/api/lms/auth/me/route.ts(63,14): error TS2339: Property 'iicrcExpiryDate' does not exist on type ...
app/api/lms/auth/me/route.ts(64,31): error TS2339: Property 'iicrcExpiryDate' does not exist on type ...
app/api/lms/auth/me/route.ts(66,33): error TS2339: Property 'iicrcCardImageUrl' does not exist on type ...
app/api/lms/auth/me/route.ts(67,58): error TS2339: Property 'iicrcCertifications' does not exist on type ...
app/api/lms/auth/me/route.ts(68,29): error TS2339: Property 'onboardingCompletedAt' does not exist on type ...
app/api/lms/auth/me/route.ts(69,20): error TS2339: Property 'resumeReminderOptIn' does not exist on type ...
app/api/lms/auth/me/route.ts(71,42): error TS2339: Property 'leaderboardShowDisplayName' does not exist on type ...
app/api/lms/auth/me/route.ts(72,37): error TS2339: Property 'leaderboardDisplayName' does not exist on type ...
app/api/lms/auth/me/route.ts(116,12): error TS2339: Property 'iicrcMemberNumber' does not exist on type 'LmsUserUpdateInput'
... (many similar)
app/api/lms/auth/onboarding/route.ts(94,7): error TS2353: 'onboardingCompletedAt' does not exist in type 'LmsUserUpdateInput'
src/components/lms/ProgressSharePrompt.tsx(24,43): error TS18047: 'draft' is possibly 'null'
src/lib/server/leaderboard-xp.ts(274,7): error TS2353: 'leaderboardShowDisplayName' does not exist in type 'LmsUserSelect'
src/lib/server/public-catalogue-facts.ts(95,52): error TS2322: readonly OR is not assignable to LmsCourseWhereInput[]
src/lib/server/public-courses-list.ts(86,7): error TS2322: readonly OR is not assignable to LmsCourseWhereInput[]
```

Root cause cluster: the Prisma generated client at `src/generated/prisma/` is stale — does not include the IICRC/onboarding/leaderboard columns that exist in `prisma/schema.prisma` (lines 32–45) and in migration `20260420120000_leaderboard_privacy/`. `prisma generate` has not been re-run after recent schema additions.

**`npx eslint .` — FAIL** (1 error, 5 warnings).

`src/components/lms/CourseFormattedBody.tsx:26` — `Definition for rule 'react/no-danger' was not found` (rule referenced but plugin not loaded under the new flat config). Five additional `react-hooks/exhaustive-deps` and `@next/next/no-img-element` warnings across `reset-password/page.tsx`, `dashboard/student/page.tsx`, `FloatingChat.tsx`, `RecommendationWidget.tsx`, `admin-dashboard-data.ts`.

**`npm run build` — FAIL** (cannot even start).

Last lines:
```
npm error code EJSONPARSE
npm error JSON.parse Invalid package.json: JSONParseError: Expected double-quoted property name in JSON at position 1668 (line 35 column 1) while parsing near "...lty-drying-txt.ts\",\n<<<<<<< HEAD\n    \"ty..."
npm error JSON.parse Failed to parse JSON data.
```

**Unresolved git merge conflict in `package.json:35-45`**, between `HEAD` and branch `feat/design-md-adoption`. `package-lock.json` also contains conflict markers. This blocks every npm-based command.

**`npm test` — not defined.** No `test` script in `package.json`. `test:e2e` exists but only on the HEAD side of the conflict.

- Unit/integration tests: 0
- Playwright e2e tests: 33 `test()` calls across 3 files in `e2e/`

## 3. Database / Prisma schema

`prisma/schema.prisma` — provider `postgresql`, client generator output `../src/generated/prisma`.

Models:

- `LmsRole` (`lms_roles`, schema.prisma:12–20) — `id`, `name`, `description`; rel `userRoles`.
- `LmsUser` (`lms_users`, schema.prisma:22–55) — `id` uuid, `email`, `hashedPassword`, `fullName`, `isActive`, `isVerified`, `themePreference`, `role` (deployment-optional), `iicrcMemberNumber`, `iicrcExpiryDate`, `iicrcCardImageUrl`, `iicrcCertifications` Json, `onboardingCompletedAt`, `onboarding` Json, `resumeReminderOptIn`, `leaderboardShowDisplayName`, `leaderboardDisplayName`, `createdAt`, `updatedAt`. Rels: `userRoles`, `enrollments`, `coursesInstructing`, `userDiscounts`.
- `LmsUserRole` (`lms_user_roles`, schema.prisma:58–67) — junction (`userId`, `roleId`).
- `LmsCourse` (`lms_courses`, schema.prisma:69–97) — `slug`, `title`, `priceAud` Decimal, `isFree`, `iicrcDiscipline`, `cecHours`, `isPublished?` (nullable bool — observed bug surface in §2 errors), `status`. Rels: `instructor`, `modules`, `enrollments`, `userDiscounts`.
- `UserDiscount` (`user_discounts`, schema.prisma:107–124) — `discountType` enum (`percentage|flat|free|custom`), `discountValue` Decimal nullable, `expiryDate`, `note`, `isActive`.
- `LmsModule` (`lms_modules`, schema.prisma:126–137) — `courseId`, `title`, `orderIndex`.
- `LmsLesson` (`lms_lessons`, schema.prisma:139–154) — `moduleId`, `title`, `contentType`, `contentBody` Text, `orderIndex`, `isPreview`, `resources` Json.
- `LmsLessonProgress` (`lms_lesson_progress`, schema.prisma:156–169) — `studentId`, `lessonId`, `completed`, `completedAt`, `lastAccessedAt`, unique `(studentId, lessonId)`.
- `LmsEnrollment` (`lms_enrollments`, schema.prisma:172–188) — `studentId`, `courseId`, `status`, `paymentReference`, `enrolledAt`, `lastAccessedLessonId`, `completedAt`, `certificateIssuedAt`. Unique `(studentId, courseId)`.
- `LmsCategory` (`lms_categories`, schema.prisma:190–199) — `slug`, `name`, `parentId`, `orderIndex`.
- `LmsLearningPathway` (`lms_learning_pathways`, schema.prisma:201–213) — `slug`, `title`, `iicrcDiscipline`, `targetCertification`, `estimatedHours`, `isPublished`, `orderIndex`.

Enum: `DiscountType` (schema.prisma:99–104).

`npx prisma format` — **PASS** (formatted in 15ms, no changes required).
`npx prisma validate` — **PASS** (`The schema at prisma/schema.prisma is valid 🚀`). Update banner: 7.6.0 → 7.8.0.

Notes on models (schema.prisma):
- `LmsUser.role` (schema.prisma:30–31) — annotated as "Present in some deployments; omit in queries if unused" — indicates drift between deployments.
- `LmsCourse.isPublished` (schema.prisma:87) is nullable — drives the `readonly OR` Prisma type-cast errors in `public-catalogue-facts.ts:95` and `public-courses-list.ts:86`.
- No `Lesson.published` or `Course.isPublished` migration aligning with the `status` string field — two parallel publication flags exist.

`ls prisma/migrations/`:
```
20260325172346_initial_schema/
20260329120000_my_learning_progress/
20260330064428_update_course_schema/
20260401120000_user_discounts/
20260416120000_lms_user_iicrc/
20260419190000_lms_user_onboarding_resume/
20260420120000_leaderboard_privacy/
migration_lock.toml
```

7 migrations spanning 2026-03-25 → 2026-04-20. The three most recent (IICRC, onboarding-resume, leaderboard-privacy) ship the columns the generated Prisma client is missing — confirming the type-check failure is caused by an un-regenerated client.

## 4. API routes

59 route files total under `app/api/`. Grouped by area:

### Auth (`/api/auth/*`)
- `auth/login/route.ts` — POST — JWT login (no prior auth).
- `auth/logout/route.ts` — POST — clears cookie.
- `auth/register/route.ts` — POST — public account registration.
- `auth/refresh/route.ts` — POST — refreshes session JWT via `verifySessionToken`.
- `auth/me/route.ts` — GET — current user (requires JWT).
- `auth/forgot-password/route.ts` — POST — password-reset request.
- `auth/reset-password/route.ts` — POST — confirms password reset.

### Admin panel (`/api/admin/*`) — all gated via `getAdminSessionOrNull()`
- `admin/login/route.ts` — POST — admin sign-in (no prior auth, by design).
- `admin/courses/route.ts` — GET/POST/PATCH/DELETE — course CRUD.
- `admin/courses/[id]/route.ts` — GET/PATCH/DELETE.
- `admin/discounts/route.ts` — GET/POST — user discount management.
- `admin/discounts/[id]/route.ts` — PATCH.
- `admin/enrollments/route.ts` — POST.
- `admin/enrollments/[enrollmentId]/route.ts` — DELETE.
- `admin/users/search/route.ts` — GET.
- `admin/upload/route.ts` — POST — admin file upload (Cloudinary OR `public/uploads`).

### LMS learner (`/api/lms/*`) — gated via `getSessionClaimsFromRequest` / `verifySessionToken`
- `lms/auth/me/route.ts` — GET/PATCH (TS errors — see §2).
- `lms/auth/onboarding/route.ts` — POST (TS errors — see §2).
- `lms/checkout/route.ts` — POST — **Stripe Checkout session creation**, calls `createStripeCheckoutForCourse`. Auth-optional (logged-in users get discounts; guests can checkout).
- `lms/enrollments/me/route.ts` — GET — my enrollments.
- `lms/enrollments/confirm/route.ts` — POST — finalises enrolment after Stripe redirect; no explicit JWT gate (relies on the Stripe session reference for trust).
- `lms/enrollments/[enrollmentId]/certificate/route.ts` — GET — PDF certificate download (auth-gated; proxies upstream if configured).
- `lms/courses/[slug]/curriculum/route.ts` — GET — public curriculum read.
- `lms/courses/[slug]/pricing/route.ts` — GET — pricing with optional auth for personalised discount.
- `lms/credentials/me/route.ts` — GET — auth-gated.
- `lms/credentials/[credentialId]/route.ts` — GET — auth-gated; serves enrolment details.
- `lms/credentials/proof-pack/route.ts` — GET — proof-pack JSON.
- `lms/credentials/proof-pack/pdf/route.ts` — GET — proof-pack PDF (pdf-lib).
- `lms/credentials/proof-pack/share/route.ts` — POST — shareable link.
- `lms/learner/resume/route.ts` — GET — auth-gated.
- `lms/lessons/[lessonId]/route.ts` — GET.
- `lms/lessons/[lessonId]/progress/route.ts` — PATCH — auth-gated.
- `lms/gamification/leaderboard/route.ts` — GET.
- `lms/gamification/me/renewal-summary/route.ts` — GET — auth-gated.
- `lms/recommendations/next-course/route.ts` — GET — auth-gated.
- `lms/public/chat/route.ts` — POST — public chat assistant (OpenAI).
- `lms/webhooks/stripe/route.ts` — POST — **Stripe webhook** (`checkout.session.completed`), verifies signature via `STRIPE_WEBHOOK_SECRET`.
- `lms/[[...path]]/route.ts` — GET/POST/PATCH/PUT/DELETE — catch-all; in-memory `notesStore` stub for `/api/lms/notes/*` and an upstream proxy for everything else. Returns `503 not implemented` if no upstream.

### Workflows (`/api/workflows/*`) — gated via `verifySessionToken` `requireAuth` helper
- `workflows/route.ts` — GET/POST.
- `workflows/[id]/route.ts` — GET/PUT.
- `workflows/[id]/execute/route.ts` — POST.
- `workflows/[id]/executions/route.ts` — GET.
- `workflows/[id]/executions/[executionId]/route.ts` — GET.

### Public misc
- `public/proof-pack/route.ts` — GET — public proof-pack lookup by share token.
- `public/proof-pack/pdf/route.ts` — GET — public PDF.
- `ccw-training/verify/route.ts` — POST — CCW training verification.
- `contact/route.ts` — POST — no-op (returns ok; nothing wired to email/CRM, see §10 Resend/SMTP).
- `submit/route.ts` — POST.
- `chat/route.ts` — POST — Anthropic-backed chat.
- `generate-image/route.ts` — GET/POST — Gemini image generation. **In-memory rate-limit only; no auth gate.**
- `image-proxy/route.ts` — GET — image proxy. **No auth gate** — generic open proxy surface.
- `analytics/metrics/overview/route.ts` — GET — admin/analytics; auth gate not visible in head.
- `health/route.ts`, `health/deep/route.ts`, `health/routes/route.ts` — GET — public health checks.
- `webhooks/route.ts` — POST — generic webhook handler; verifies `process.env.WEBHOOK_SECRET`.

### Cron — all use Bearer `CRON_SECRET`
- `cron/cleanup-old-runs/route.ts` — GET.
- `cron/daily-report/route.ts` — GET.
- `cron/health-check/route.ts` — GET.

Routes calling **external services**:
- `lms/checkout/route.ts` → Stripe (`createStripeCheckoutForCourse`, `src/lib/server/local-course-checkout.ts`).
- `lms/webhooks/stripe/route.ts` → Stripe webhook verification (`constructWebhookEvent`, `src/lib/api/stripe.ts`).
- `generate-image/route.ts` → Google Gemini (`@google/generative-ai`).
- `chat/route.ts` → Anthropic.
- `lms/public/chat/route.ts` → OpenAI.
- `admin/upload/route.ts` → Cloudinary (env-gated; falls back to local `public/uploads`).
- `image-proxy/route.ts` → arbitrary HTTP fetch.
- All `lms/*` upstream proxies (`getUpstreamBaseUrl`) → legacy API host when configured.

Routes **WITHOUT auth gates** (publicly invokable):
- `contact/route.ts:11` — POST, no auth — currently a no-op but exposes form-spam vector if wired.
- `submit/route.ts:72` — POST, no auth visible.
- `chat/route.ts:6` — POST, no auth — burns Anthropic credit on demand.
- `generate-image/route.ts:47` — POST, IP rate-limit only — burns Gemini credit on demand.
- `image-proxy/route.ts:5` — GET, no auth — open proxy.
- `health/route.ts`, `health/deep/route.ts`, `health/routes/route.ts` — GET, public.
- `lms/checkout/route.ts:27` — POST, auth-optional by design.
- `lms/enrollments/confirm/route.ts:14` — POST, trust-on-Stripe-reference design.
- `lms/courses/[slug]/curriculum/route.ts:9` — GET, public catalogue.
- `lms/lessons/[lessonId]/route.ts:26` — GET, no JWT visible at function head — verify body.
- `lms/gamification/leaderboard/route.ts:21` — GET, public board.
- `lms/public/chat/route.ts:41` — POST, public assistant.
- `public/proof-pack/*` — GET, public by design (share-token model).
- `ccw-training/verify/route.ts:11` — POST, no JWT (verification by record id).
- `admin/login/route.ts:10`, `auth/register/route.ts:8`, `auth/login/route.ts:8`, `auth/forgot-password/route.ts:6`, `auth/reset-password/route.ts:7`, `auth/logout/route.ts:5` — login surfaces by design.
- `analytics/metrics/overview/route.ts:5` — GET, no obvious gate at line 5 — flag for verification.

## 5. Pages / UI surfaces

101 page files total. Grouped by route group:

### `(public)/` — marketing + catalogue (66 pages)
- `/` (`app/page.tsx`) — homepage.
- `/about` (`app/(public)/about/page.tsx`).
- `/calendar` and `/calendar/[id]`.
- `/ccw-materials`, `/ccw-training` — CCW partner pages.
- `/contact`.
- `/courses` — catalogue.
- `/courses/[slug]` — course detail.
- `/courses/[slug]/payment-success` — post-Stripe-checkout success.
- `/credentials/[credentialId]` — public credential view.
- `/ideas`.
- `/industries` index + 22 industry landing pages (aged-care, caravan-parks, childcare, commercial-cleaning, construction, data-centres, education, emergency-management, food-processing, government-defence, gyms-fitness, healthcare, hospitality, insurance, mining, museums-cultural, ndis-disability, plumbing-trades, property-management, real-estate, retail, strata, transport-logistics).
- `/jobs`, `/jobs/[id]`, `/jobs/submit`.
- `/news`.
- `/pathways`, `/pathways/[slug]`.
- `/podcast`.
- `/pricing`, `/privacy`, `/terms`.
- `/professional-directory`.
- `/research`, `/research/[slug]`.
- `/submit`, `/submit/[type]`, `/submit/[type]/success`.
- `/subscribe`, `/subscribe/success`.
- `/testimonials`.
- `/verify/training-record`.
- `/youtube`.

### `(auth)/`
- `/login` (`app/(auth)/login/page.tsx`).
- `/register`.
- `/forgot-password`.
- `/reset-password`.

### `(dashboard)/` — learner + instructor + experimental
- `/dashboard` — main learner dashboard.
- `/dashboard/courses` — enrolments list.
- `/dashboard/courses/[slug]` — enrolled course.
- `/dashboard/courses/[slug]/lessons/[lessonId]`.
- `/dashboard/courses/[slug]/quiz/[quizId]`.
- `/dashboard/credentials/[credentialId]`.
- `/dashboard/learn/[slug]`.
- `/dashboard/pathways`.
- `/dashboard/settings`.
- `/dashboard/student` — student home (TS errors — `_loading`/`_level` rename incomplete, see §2).
- `/dashboard/student/credentials`.
- `/dashboard/student/leaderboard`.
- `/dashboard/student/notes`.
- `/dashboard/student/profile`.
- `/dashboard/student/rpl`.
- `/instructor` — instructor home.
- `/instructor/ai-builder` — AI course-builder.
- `/instructor/analytics`.
- `/instructor/courses/new`, `/instructor/courses/[slug]/edit`.
- `/instructor/ideas`.
- `/agents`, `/tasks`, `/demo`, `/demo-live`.

### `(admin)/`
- `/admin` — admin home.
- `/admin/courses`, `/admin/courses/new`, `/admin/courses/[id]`, `/admin/courses/[id]/edit`.
- `/admin/discounts`.

### Top-level (outside route groups)
- `/council-demo`, `/dashboard-analytics`, `/dashboard/agent-runs`, `/design-system`, `/status-demo`, `/workflows`, `/workflows/[id]`, `/prd/generate`, `/prd/[id]`.

Pages with broken `@/` imports: none observed during tsc — all 78 TS errors are Prisma generated-client drift, not path resolution.

## 6. Env vars referenced

Unique sorted list pulled from `app/`, `src/`, `middleware.ts`:

```
ADMIN_EMAIL
ADMIN_JWT_SECRET
ADMIN_PANEL_EMAILS
ADMIN_PASSWORD
AI_ASSISTANT_NAME
ANTHROPIC_API_KEY
BACKEND_API_KEY
CARSI_COURSES_XLSX_PATH
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_CLOUD_NAME
CRON_SECRET
DATABASE_CA_CERT
DATABASE_URL
DIGITALOCEAN_API
DO_API_TOKEN
GOOGLE_GENERATIVE_AI_API_KEY
HOMEPAGE_FEATURED_COURSE_SLUGS
JWT_SECRET
LMS_SYSTEM_INSTRUCTOR_ID
LOG_LEVEL
NEXT_PUBLIC_ADMIN_EMAIL
NEXT_PUBLIC_AI_ASSISTANT_NAME
NEXT_PUBLIC_AI_ASSISTANT_TAGLINE
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_BACKEND_HEALTH_PATH
NEXT_PUBLIC_FRONTEND_URL
NEXT_PUBLIC_VAPID_PUBLIC_KEY
NEXT_PUBLIC_YJS_WS_URL
NODE_ENV
OPENAI_API_KEY
OPENAI_CHAT_MODEL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
WEBHOOK_SECRET
WP_EXPORT_COURSES_PATH
WXR_PATH
```

Cross-referenced with `.env.example`:

- **Present in `.env.example`** (declared/documented): `DATABASE_URL`, `JWT_SECRET_KEY` (note: code uses `JWT_SECRET`, `.env.example:27` defines `JWT_SECRET_KEY` — naming mismatch), `WEBHOOK_SECRET`, `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `NEXT_PUBLIC_AI_ASSISTANT_NAME`, `NEXT_PUBLIC_AI_ASSISTANT_TAGLINE`, `NEXT_PUBLIC_FRONTEND_URL`, `LOG_LEVEL`, `DO_API_TOKEN`, `DIGITALOCEAN_API`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PANEL_EMAILS`, `NEXT_PUBLIC_ADMIN_EMAIL`, `LINEAR_API_KEY`, `ANTHROPIC_API_KEY`, `NODE_ENV`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- **Referenced in code but missing from `.env.example`**: `ADMIN_JWT_SECRET`, `AI_ASSISTANT_NAME` (only `NEXT_PUBLIC_AI_ASSISTANT_NAME` documented), `BACKEND_API_KEY`, `CARSI_COURSES_XLSX_PATH`, `CRON_SECRET`, `DATABASE_CA_CERT`, `GOOGLE_GENERATIVE_AI_API_KEY`, `HOMEPAGE_FEATURED_COURSE_SLUGS`, `JWT_SECRET` (vs documented `JWT_SECRET_KEY`), `LMS_SYSTEM_INSTRUCTOR_ID`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BACKEND_HEALTH_PATH`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_YJS_WS_URL`, `WP_EXPORT_COURSES_PATH`, `WXR_PATH`.

**Security flag**: `.env.example:1-3` contains real-looking WooCommerce **consumer key + secret** committed as plain text at the top of the file (`ck_f6caa74…`, `cs_a21ea53e…`). These appear as live values, not placeholders.

## 7. Tests

- Unit/integration: **0** (`find . -name '*.test.ts' -o -name '*.spec.ts' -not -path '*/e2e/*'` returns 0).
- Playwright e2e: **33** `test()` calls across 3 files in `e2e/`.
  - `e2e/carsi-journeys.spec.ts` (28 tests)
  - `e2e/prd-generation.spec.ts`
  - `e2e/pre-production.spec.ts`

Representative test names:

Playwright (`e2e/carsi-journeys.spec.ts:89`):
```
test('landing page loads with hero content and Browse Courses CTA', async ({ page }) => { ... })
test('discipline filter works — clicking WRT shows only WRT courses', async ({ page }) => { ... })
test('invalid credentials shows error', async ({ page }) => { ... })
```

Playwright (`e2e/prd-generation.spec.ts`):
```
test("should display PRD generator form", async ({ page }) => { ... })
test("should validate requirements length", async ({ page }) => { ... })
```

No unit/integration sample exists.

## 8. Open TODOs / FIXMEs / placeholders

Filtering out HTML `placeholder=` attrs and skeleton `PlaceholderCard` UI noise (~60 false positives in `app/(public)/{news,calendar,research,podcast,jobs,youtube}/page.tsx`), real comment-tagged TODO/FIXME/coming-soon are:

- `src/components/status-command-centre/hooks/use-status-transitions.ts:80` — `// TODO: transitionDuration will be used for actual colour interpolation timing`
- `app/(public)/professional-directory/page.tsx:193` — "Directory powered by NRPG. Full live listing coming soon."
- `src/components/lms/OnboardingWizard.tsx:424` — "SMS reminders — coming soon" (UI label)

Documented "not yet wired" comments:
- `prisma/schema.prisma:40-41` — "none | email | sms — preference for unfinished-lesson reminders (delivery not yet wired for sms)."
- `src/types/renewal.ts:30` — "a 1 CEC placeholder per IICRC-tagged course was used for this summary" (intentional fallback, not unfinished work).

Clusters >3: none of substance. The placeholder noise is concentrated in 6 marketing pages but is correct skeleton-content UX, not unfinished work.

## 9. Recent commit activity

`git log --oneline -20`:

```
528ac97 fix(security): remove hardcoded admin secret fallback, add auth to workflow proxy routes (GP-314/315)
24ce5e5 ci: add playwright config and test:e2e script; skip e2e job on failure
2f27a09 fix(ci): resolve TypeScript type-check errors blocking CI
1653d8c chore(ci): wire Husky pre-commit hook to lint-staged
d84fc98 fix(ci): resolve all ESLint errors blocking CI
e426fb3 fix(security): resolve critical axios SSRF vulnerability
84b8c8e fix(ci): replace FlatCompat with native ESLint 9 flat config
b949f37 fix(ci): call eslint directly instead of next lint
967a978 fix(ci): use positional dir arg for next lint
82867a6 fix(ci): add ESLint 9 flat config + explicit lint dir
5d378af fix(ci): remove phantom backend-tests job and add type-check script
0e8f0b1 fix(security): remove hardcoded DEFAULT_ADMIN_PASSWORD from admin-auth.ts
34153a1 Register npm scripts for microbial, water damage, and specialty drying seeds.
6f19b79 Add seed script for Microbial Section B courses from DOCX.
2b54dec Add seed script for contents and specialty drying courses from TXT.
bbb5af7 Add seed script for water damage restoration courses from TXT.
3587fd7 Add parser for Microbial Section B paragraphs from DOCX compendium.
a8fc151 Add parser for contents and specialty drying course TXT format.
761fb19 Add parser for water damage restoration course TXT format.
d8fc041 Add Microbial Section B compendium DOCX for LMS seeding.
```

`git log --since='30 days ago'` returns 25+ commits, concentrated 2026-04-14 to 2026-04-16. Two themes:
1. CI stabilisation push (12 commits, all `fix(ci):` or `fix(security):`).
2. Content seeding (12 commits adding parsers + scripts + source-data files for water damage, specialty drying, microbial, marketing-business, WHS/compliance courses).

`git status` reveals **the branch has diverged: 12 local commits ahead, 131 commits behind `origin/main`**, with 110 modified files in the working tree and **unresolved merge conflicts in `package.json` and `package-lock.json`** (see §2). No commits in the last 28 days — the latest commit `528ac97` was 2026-04-16.

Flagged commits: no `wip:`, `checkpoint`, `broken`, or `revert` strings in the history. Multiple `fix(temp)`-shaped CI fixes but none labelled temp.

## 10. Connection inventory

| System | Verdict | Evidence |
|---|---|---|
| **Stripe payments** | wired live | `app/api/lms/checkout/route.ts:14` `createStripeCheckoutForCourse` → `src/lib/server/local-course-checkout.ts`; webhook `app/api/lms/webhooks/stripe/route.ts:28` `event = constructWebhookEvent(rawBody, stripeSignature)`; dep `stripe@^20.2.0`. |
| **Resend / SMTP email** | not started | `grep -rln 'resend\|smtp\|nodemailer' app src` returns 0. `app/api/contact/route.ts:20` reads "Persist or forward contact submissions here (e.g. email provider, CRM) when configured." — explicit no-op. |
| **Supabase database** | not started | `grep -rln 'supabase\|SUPABASE' app src` returns 0. Postgres is plain `pg` + Prisma (`@prisma/adapter-pg@^7.6.0`, `pg@^8.14.1`); no Supabase client. |
| **Auth (custom JWT, not NextAuth)** | wired live | `src/lib/auth/session-jwt.ts` (`verifySessionToken`, `signSessionToken`) used across all `lms/*` and `workflows/*` routes; admin path uses separate `getAdminSessionOrNull` in `src/lib/admin/admin-session.ts`. `jose@^6.2.2` + `bcryptjs@^3.0.3`. No NextAuth, no Clerk, no Supabase Auth. |
| **Linear** | referenced in docs but no code | `LINEAR_API_KEY` documented in `.env.example:108`. `grep -rln 'linear\|LinearClient' app src` returns 0. |
| **Vercel (config + env)** | wired live | `.vercel/project.json` → `{"projectId":"prj_hIQAdXiHQGGec6nNKEGzn7SyMh9p","orgId":"team_KMZACI5rIltoCRhAtGCXlxUf","projectName":"carsi-web"}`. No `vercel.json` (defaults). |
| **Telegram** | not started | `grep -rln 'telegram\|TELEGRAM' app src` returns 0. |
| **Anthropic (LLM)** | wired live | `src/lib/anthropic/client.ts`, `src/lib/anthropic/types.ts`, `src/lib/anthropic/index.ts`; consumed by `app/api/chat/route.ts`. `ANTHROPIC_API_KEY` env-gated. No SDK package in dependencies (probably wrapped via fetch). |
| **OpenAI (LLM)** | wired but env-gated | `process.env.OPENAI_API_KEY` consumed in `app/api/lms/public/chat/route.ts` (public chat assistant). `.env.example:57` `OPENAI_API_KEY=` is empty. No `openai` npm package — uses `fetch` directly. |
| **Gemini (LLM/image)** | wired live | `src/lib/image-generation/gemini-client.ts`, `src/ai/model-registry/providers/gemini.ts`. Dep `@google/generative-ai@^0.24.1`. Surface: `app/api/generate-image/route.ts`. |
| **Pi-CEO API (PI_CEO_API_KEY)** | not started | `grep -rln 'PI_CEO_API_KEY\|PI_CEO' app src` returns 0. |
| **Unite-Group internal API (UNITE_GROUP_*)** | not started | `grep -rln 'UNITE_GROUP' app src` returns 0. |
| **WordPress / WooCommerce import pipeline** | started but broken | `scripts/wp-migrate.ts:31` `const WP_API_BASE = ${WP_BASE_URL}/wp-json/wp/v2;`; `scripts/wp-migrate.ts:37` `const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY \|\| '';`. Migration is a one-shot CLI export to `data/wordpress-export/*`. `src/lib/wordpress-export-courses.ts` + `src/lib/seed/wp-export-courses-json.ts` + `src/lib/seed/wp-export-wxr-xml.ts` consume the export. Build is broken (§2), and `.env.example:1-3` has the WC consumer key/secret committed in plaintext at the file head. |
| **PDF certificate generator** | wired live | `src/lib/server/certificate-pdf.ts:4` `import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';` builds completion certificate. `src/lib/server/proof-pack-pdf.ts` builds learner proof-pack. Exposed via `app/api/lms/enrollments/[enrollmentId]/certificate/route.ts:5` `buildCompletionCertificatePdf`, `app/api/lms/credentials/proof-pack/pdf/route.ts`, `app/api/public/proof-pack/pdf/route.ts`. Dep `pdf-lib@^1.17.1`. No puppeteer/chromium/react-pdf. |
| **IICRC API or webhook** | not started | `grep -rEn 'fetch.+iicrc\|api/iicrc' app src` returns only `https://www.iicrc.org/page/...` static hrefs in `app/page.tsx`. The IICRC presence is data-modelling (schema columns `iicrcMemberNumber`, `iicrcExpiryDate`, `iicrcCardImageUrl`, `iicrcCertifications`; discipline map in `scripts/wp-migrate.ts:45–59`), not an integration. |
| **NRPG points sync** | not started | `grep -rEn 'fetch.+nrpg\|/api/nrpg\|points.*sync\|syncPoints\|awardPoints' app src` returns 0. `professional-directory/page.tsx:193` "Directory powered by NRPG. Full live listing coming soon." is the only NRPG mention — UI label, no integration code. |

---

**Summary**

CARSI is a Next.js 16 + Prisma 7 + Postgres LMS sized at **59 API routes, 101 pages, 11 Prisma models, 7 migrations, 33 Playwright e2e tests, and 0 unit tests**, with Stripe checkout + pdf-lib certificates + WordPress-export seed pipeline + Gemini/Anthropic/OpenAI LLM surfaces wired in. The repo is **currently un-buildable**: an unresolved Git merge conflict in `package.json:35-45` and `package-lock.json` between `HEAD` and `feat/design-md-adoption` breaks `npm run build`; on top of that, 78 `tsc` errors and 1 ESLint error indicate the Prisma generated client at `src/generated/prisma/` is stale relative to the [[iicrc-content-initiative]] + onboarding + leaderboard schema columns added in the three most recent migrations (Apr 16–20). The branch is **12 ahead / 131 behind origin/main** with **110 modified files** uncommitted and **no new commits in 28 days**. Real comment-tagged TODOs are **3** (one TypeScript TODO, two "coming soon" UI labels). **Broken or missing integrations: 7** (Resend/SMTP, Supabase, Linear, Telegram, [[pi-ceo-architecture]] API, UNITE_GROUP_*, IICRC API, [[dr-nrpg]] points — all "not started"; WordPress/WooCommerce pipeline classified "started but broken" via the package.json conflict; live consumer-key + secret committed in `.env.example:1-3` — violates [[feedback-secrets-handling]]).

## Cross-refs

[[carsi]] · [[carsi-review-technical-architect-2026-05-14]] · [[carsi-review-product-strategist-2026-05-14]] · [[carsi-review-market-strategist-2026-05-14]] · [[carsi-board-synthesis-2026-05-14]] · [[rana-handoff-2026-05-14]] · [[iicrc-content-initiative]] · [[dr-nrpg]] · [[pi-ceo-architecture]] · [[feedback-secrets-handling]] · [[feedback-audit-verification]] · [[master-plan-2b-by-2028-v3]] · [[swot-restoration-cluster-2026]] · [[opus-adversary]]

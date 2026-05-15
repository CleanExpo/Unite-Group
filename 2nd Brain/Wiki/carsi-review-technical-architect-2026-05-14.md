---
type: wiki
updated: 2026-05-14
---

# CARSI — Technical Architect Review (2026-05-14)

Reviewer persona: Technical Architect ([[pi-ceo-architecture]] Board).
Source audit: [[carsi-discovery-audit-2026-05-14]].
Repo: `/Users/phill-mac/pi-seo-workspace/carsi/` ([[carsi]] — branch unspecified, 12 ahead / 131 behind `origin/main`).

## 1. Headline assessment

CARSI is a real, well-architected Next.js 16 + Prisma 7 LMS — Stripe checkout wired correctly (raw body + `stripe.webhooks.constructEvent`), pdf-lib certificate generation working, 11 Prisma models with proper FK + unique constraints, 33 Playwright e2e tests covering learner journeys. **But it is currently un-shippable.** An unresolved Git merge conflict in `package.json:35-45` and `package-lock.json` makes `npm` refuse to parse — every build, install, lint, test, and CI step is blocked at line 1. On top of that, the Prisma generated client at `src/generated/prisma/` was last regenerated 2026-04-15 (before three column-adding migrations landed on 2026-04-16/19/20), producing all 78 `tsc` errors. The branch hasn't moved in 28 days, sits **131 commits behind `origin/main`** (which already contains the CI fixes this branch is duplicating — e.g. `04d2f08` upstream is the same lint-script change attempted in the conflict here), has **110 uncommitted modified files**, and ships a `.env.example` that leaks a real-looking WooCommerce consumer key + secret in plaintext at lines 1–3. The right read is not "the LMS is broken" — it's "the LMS is a stale branch on a long-running rebase the original author abandoned." Unblocking is mechanical, not architectural; the architecture is sound.

## 2. Architectural debt — P0 (blocks shipping)

### P0-1 — Unresolved merge conflict in `package.json` + `package-lock.json`
- **File:** `/Users/phill-mac/pi-seo-workspace/carsi/package.json:35-45`; `package-lock.json` (conflict markers throughout).
- **Problem:** Lines 35–45 contain raw `<<<<<<< HEAD` / `=======` / `>>>>>>> feat/design-md-adoption` markers. `npm` errors `EJSONPARSE` at position 1668; nothing in the npm script lifecycle runs. **HEAD side** owns `type-check`, `lint: "eslint ."`, `test:e2e`. **Incoming side** owns 4 seed scripts (`db:seed-contents-specialty-drying-courses-txt`, `db:seed-specialty-courses-resources-txt`, `db:seed-technology-inspection-tools-txt`, `db:seed-odour-smoke-psychro-drying-docx`) plus `lint: "next lint"`. Both sides ship real work — neither can be dropped.
- **Blast radius:** Everything. Build, install, type-check, lint, e2e, deploy.
- **Fix shape:** Hand-merge to keep **all 8 script keys** from both sides; resolve the `lint` collision in favour of `eslint .` (matches `origin/main` `04d2f08` already merged upstream). Regenerate `package-lock.json` by deleting it and running `npm install`. Verify the resolved file is valid JSON before staging (`node -e "JSON.parse(require('fs').readFileSync('package.json'))"`).
- **Acceptance criteria:** `npm install` exits 0; `npm run build` parses `package.json` and proceeds past the postinstall `prisma generate`.

### P0-2 — Stale Prisma generated client (78 tsc errors, all one cluster)
- **Files:**
  - `/Users/phill-mac/pi-seo-workspace/carsi/src/generated/prisma/` (last regenerated 2026-04-15 17:34 — confirmed via `ls -la`).
  - Schema source-of-truth: `prisma/schema.prisma:32-45` (IICRC + onboarding + leaderboard columns).
  - Migration source: `prisma/migrations/20260416120000_lms_user_iicrc/migration.sql`, `prisma/migrations/20260419190000_lms_user_onboarding_resume/migration.sql`, `prisma/migrations/20260420120000_leaderboard_privacy/migration.sql`.
  - Burn sites: `app/api/lms/auth/me/route.ts:50,62-72,116`; `app/api/lms/auth/onboarding/route.ts:94`; `src/lib/server/leaderboard-xp.ts:274`; `src/lib/server/public-catalogue-facts.ts:95`; `src/lib/server/public-courses-list.ts:86`; `app/(dashboard)/dashboard/student/page.tsx:273,276,287,311-314`.
- **Problem:** Every `tsc` error traces to one root cause: the generator's typed `LmsUserSelect` / `LmsUserUpdateInput` doesn't include `iicrcMemberNumber`, `iicrcExpiryDate`, `iicrcCardImageUrl`, `iicrcCertifications`, `onboardingCompletedAt`, `resumeReminderOptIn`, `leaderboardShowDisplayName`, `leaderboardDisplayName`. The schema and migrations have them; the generated client is stale.
- **Blast radius:** Type-check fails CI. The runtime won't crash (Prisma still talks to the columns; only the types are wrong) — but every PR is red until this is fixed.
- **Fix shape:** Resolve P0-1 first (so `npx prisma generate` can run), then `npx prisma generate`. Two unrelated bugs in the same cluster also need fixes once the regenerate is done:
  - `app/(dashboard)/dashboard/student/page.tsx:273-314` — references to `loading` / `level` that were renamed to `_loading` / `_level` somewhere upstream. The compiler is correctly flagging an incomplete rename, not a Prisma issue. Either restore the public names or update the consumers.
  - `src/lib/server/public-catalogue-facts.ts:95` + `src/lib/server/public-courses-list.ts:86` — `readonly OR is not assignable to LmsCourseWhereInput[]`. Cast `as LmsCourseWhereInput[]` or drop the `readonly` modifier on the array literal.
- **Acceptance criteria:** `npx tsc --noEmit` exits 0.

### P0-3 — Committed WooCommerce credentials in `.env.example:1-3`
- **File:** `/Users/phill-mac/pi-seo-workspace/carsi/.env.example:1-3`.
- **Problem:** First three lines of the committed example file are real-looking live credentials:
  ```
  Consumer key ck_f6caa7487d219e8796d13c5c277e3da4cfd2245a
  Consumer secret cs_a21ea53e00bf32c21d52047715551618c61fa6c5
  ```
  These are not placeholders — the format and entropy match a production WooCommerce REST API key pair. They are committed to `.env.example`, which is tracked in git and visible to anyone with repo read access (per [[feedback-secrets-handling]]: secrets never go in tracked files). Even if the live key has since been rotated, the precedent — copying a real value into the example template — means the next env will be re-pasted from this file.
- **Blast radius:** If carsi.com.au WooCommerce still recognises this pair, an attacker has full WC REST access — read customers, read orders, mutate products. Even if rotated, the secret is on every clone of this repo, every fork, every CI runner cache.
- **Fix shape:** (1) Rotate the WooCommerce key pair at carsi.com.au immediately. (2) Replace lines 1–3 with the placeholder block already present at lines 115–116 (`WC_CONSUMER_KEY=ck_xxx`). (3) Add a pre-commit guard in `.husky/pre-commit` that greps staged files for `ck_[a-f0-9]{32,}` / `cs_[a-f0-9]{32,}` and blocks commit on match. (4) Run `git log -p -- .env.example` to confirm how long this has been in history; if >7 days, treat as a compromised credential regardless of rotation status.
- **Acceptance criteria:** `.env.example` contains no entries matching `/(ck|cs|sk|pk|whsec|rk)_[a-zA-Z0-9]{16,}/` outside the canonical `_xxx` placeholder pattern.

### P0-4 — Branch is 131 commits behind `origin/main` with no commits in 28 days
- **Evidence:** `git log --oneline HEAD..origin/main` shows 131 commits including `04d2f08 fix(ci): lint script next lint → eslint .` — which is **the same change attempted in this branch's package.json conflict, already merged upstream 21 days ago**. Also upstream: `0e31e65 fix: [PM-Core auto] security headers + dependency audit (#106)`, `3e9e7bc ci: remove phantom backend-tests job (was blocking e2e/build)`.
- **Problem:** The 12 local commits ahead are stale duplicates of work already on `main`. PM-Core (the autonomous agent) has been shipping CI fixes to main while this branch sat idle. Continuing to rebase 131 commits onto a 110-file dirty working tree is the wrong move.
- **Blast radius:** Every hour spent untangling the rebase is wasted effort if the only unique-to-this-branch work is the 4 seed scripts in the package.json conflict.
- **Fix shape:** Decision call (see §8): cherry-pick the 4 seed-script commits + the WHS/marketing/microbial/safety seeders onto `origin/main`, then **delete this branch**. Don't merge a 131-commit-behind state into anything.
- **Acceptance criteria:** Branch is closed; unique commits cherry-picked into a fresh branch off `origin/main`; PR opened against `main`.

**P0 count: 4.**

## 3. Architectural debt — P1 (degrades shipping)

### P1-1 — `lms/public/chat` is public + spends OpenAI credit per request, no rate limit
- **File:** `/Users/phill-mac/pi-seo-workspace/carsi/app/api/lms/public/chat/route.ts:41`.
- **Problem:** POST is unauthenticated by design (marketing-page assistant). Compare `app/api/generate-image/route.ts:14-28` which at least has an in-memory IP rate-limit (10/min). `lms/public/chat` has none. An attacker can curl-loop this endpoint and burn the OpenAI budget overnight.
- **Fix shape:** Reuse the rate-limit map pattern from `generate-image/route.ts`, key by `request.headers.get('x-forwarded-for')`, cap at 5/min/IP and 100/day/IP. For production, swap the in-memory Map to Upstash Redis or Vercel KV (the in-memory version resets per cold start and doesn't share across regions).
- **Acceptance:** 11th request inside 60s from one IP returns `429`.

### P1-2 — Two parallel "is this course visible" flags (`status` vs `isPublished`)
- **File:** `/Users/phill-mac/pi-seo-workspace/carsi/prisma/schema.prisma:77,87`.
- **Problem:** `LmsCourse.status: String` (non-null) and `LmsCourse.isPublished: Boolean?` (nullable). The query layer (`src/lib/server/public-courses-list.ts:8-16`) checks **both**: `OR: [{ isPublished: true }, { status: 'published' }]`. This is the source of the `readonly OR` type error and a long-term correctness hazard — an admin can toggle one without the other.
- **Fix shape:** Pick one and migrate. `status` is more expressive (`draft|published|archived`), make it canonical; drop `isPublished` in a future migration after backfilling. Until then, add a `CHECK` constraint or trigger keeping them in sync.
- **Acceptance:** New migration `20260515_canonicalize_course_status` that either drops `isPublished` or constrains it to mirror `status`.

### P1-3 — Stripe webhook has no event-ID idempotency table
- **File:** `/Users/phill-mac/pi-seo-workspace/carsi/app/api/lms/webhooks/stripe/route.ts:15-80`.
- **Problem:** Signature verification is correct (raw body via `request.text()` + `stripe.webhooks.constructEvent` at line 28 — constant-time HMAC, confirmed). Idempotency is **partially** handled: `enrollStudentInCourse` returns `'already_enrolled'` if a `(studentId, courseId)` row exists (`src/lib/server/enrollment-service.ts:25`). But Stripe retries on 5xx, and there's no record of `event.id` → so a delayed second delivery after an enrollment is deleted (admin action) would silently re-enrol. Acceptable for now; needs a `stripe_webhook_events` table before scale.
- **Fix shape:** Add model `StripeWebhookEvent { id String @id; type String; processedAt DateTime }`. Insert at line 33; skip processing if `event.id` already exists.
- **Acceptance:** Replaying the same Stripe event twice produces one log line "duplicate event, skipped" on the second call.

### P1-4 — `auth_token` cookie not visible at the chat-proxy authz gate
- **File:** `/Users/phill-mac/pi-seo-workspace/carsi/app/api/chat/route.ts:11-18`.
- **Problem:** Reads `auth_token` cookie, then calls `/api/auth/me` to validate. Two issues: (a) cookie name is `auth_token`, but the LMS path uses `getSessionClaimsFromRequest` which expects `auth_token` OR `Authorization` header — verify they agree. (b) Self-fetch to `${request.nextUrl.origin}/api/auth/me` adds latency + an HTTP hop where a direct `verifySessionToken(token)` call would suffice.
- **Fix shape:** Replace the self-fetch with a direct `verifySessionToken(token)` call from `@/lib/auth/session-jwt`.
- **Acceptance:** Chat proxy completes ≤80ms server-side; no `/api/auth/me` self-call visible in traces.

### P1-5 — No `JWT_SECRET` declared in `.env.example` (code uses `JWT_SECRET`, example documents `JWT_SECRET_KEY`)
- **File:** `/Users/phill-mac/pi-seo-workspace/carsi/.env.example:27` vs all consumers using `process.env.JWT_SECRET`.
- **Problem:** Variable naming drift. New devs setting up local will set `JWT_SECRET_KEY` and JWT will silently fail to sign or verify (depending on default fallback behaviour). Per [[curator-security-unknown]], silent env misreads are a recurring bug class in this empire.
- **Fix shape:** Pick `JWT_SECRET` (matches code), rename in `.env.example:27`, run a global grep to confirm no consumer reads `JWT_SECRET_KEY`.
- **Acceptance:** `grep -rn JWT_SECRET_KEY app src` returns zero matches in source; only in `.env.example` as the canonical name.

### P1-6 — 17 env vars referenced by code, undocumented in `.env.example`
- **Reference:** Audit §6 — `ADMIN_JWT_SECRET`, `BACKEND_API_KEY`, `CARSI_COURSES_XLSX_PATH`, `CRON_SECRET`, `DATABASE_CA_CERT`, `GOOGLE_GENERATIVE_AI_API_KEY`, `HOMEPAGE_FEATURED_COURSE_SLUGS`, `LMS_SYSTEM_INSTRUCTOR_ID`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BACKEND_HEALTH_PATH`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_YJS_WS_URL`, `WP_EXPORT_COURSES_PATH`, `WXR_PATH`.
- **Problem:** Fresh Vercel deploys silently skip features depending on which env vars never got copied across.
- **Fix shape:** One PR adds all 17 to `.env.example` with placeholder values + 1-line comments. Also document `CRON_SECRET` requirement in `.github/workflows/ci.yml` so any cron-touching PR gates on its presence.
- **Acceptance:** Diffing `grep -rEoh 'process\.env\.[A-Z_]+' app src | sort -u` vs `.env.example` shows no code references missing from the example.

### P1-7 — Zero unit/integration tests; 100% of business logic untested
- **Reference:** §7 below — `find . -name '*.test.ts' -o -name '*.spec.ts' -not -path '*/e2e/*'` returns 0.

**P1 count: 7.**

## 4. Architectural debt — P2 (nice-to-have)

### P2-1 — Missing index on `lms_lessons.module_id`
- **File:** `/Users/phill-mac/pi-seo-workspace/carsi/prisma/schema.prisma:139-154`.
- **Problem:** The FK is declared (`@relation(fields: [moduleId])`) but no `@@index([moduleId])`. Same for `LmsModule.courseId` (schema.prisma:126-137). Postgres does **not** auto-index foreign keys (unlike MySQL InnoDB). Once a course has 20+ modules with 10+ lessons each, listing curriculum becomes a sequential scan.
- **Fix shape:** Add `@@index([moduleId])` on `LmsLesson`, `@@index([courseId])` on `LmsModule`, `@@index([studentId])` + `@@index([courseId])` on `LmsEnrollment`. New migration with `CREATE INDEX CONCURRENTLY` (zero-downtime on production).
- **Acceptance:** `EXPLAIN ANALYZE` on `SELECT * FROM lms_lessons WHERE module_id = $1` shows `Index Scan` not `Seq Scan`.

### P2-2 — `LmsUser.role` is annotated "Present in some deployments; omit in queries if unused"
- **File:** `prisma/schema.prisma:30-31`.
- **Problem:** Schema-doc comment confessing deployment drift. The `lms_user_roles` junction (line 58) is the canonical RBAC; the inline `role: String?` is a relic. Two sources of truth = bug surface.
- **Fix shape:** Drop `LmsUser.role` in a future migration after auditing for any code reading it. Until then, document at the model level not just the field.

### P2-3 — pdf-lib certificate generation has no font fallback if `StandardFonts.Helvetica` is missing
- **File:** `/Users/phill-mac/pi-seo-workspace/carsi/src/lib/server/certificate-pdf.ts:4`.
- **Problem:** pdf-lib's `StandardFonts.Helvetica` is bundled (won't go missing), so this is mostly theoretical — but unicode names in the IICRC member field (e.g. Indigenous/multilingual names) will render as `?` glyphs. pdf-lib needs an embedded TTF (e.g. Noto Sans) and `pdfDoc.embedFont(noto)` for full unicode.
- **Fix shape:** Embed `public/fonts/NotoSans-Regular.ttf`, use `pdfDoc.embedFont(fontBytes, { subset: true })`. Subsetting keeps file size sane.

### P2-4 — Husky pre-commit only runs `lint-staged`; no `tsc --noEmit` or schema-drift guard
- **File:** `/Users/phill-mac/pi-seo-workspace/carsi/.husky/pre-commit:1`.
- **Problem:** Lint catches style; doesn't catch a schema change that didn't get `prisma generate`-ed (the exact failure mode in P0-2). One-line addition.
- **Fix shape:** Append `npx tsc --noEmit --incremental` to the hook (use `tsconfig.tsbuildinfo` for speed). Optionally add `node scripts/check-prisma-generated-fresh.js` that compares `prisma/schema.prisma` mtime vs `src/generated/prisma/client.ts` mtime and fails commit if schema is newer.

### P2-5 — `prisma` 7.6.0 → 7.8.0 update banner
- **File:** package.json:71,93.
- **Low priority.** Once P0-1 is resolved, bump in the same PR.

**P2 count: 5.**

## 5. Connection layer gaps

| System | Audit verdict | This review's read |
|---|---|---|
| **WordPress/WooCommerce import** | started but broken | The pipeline is fine; only the `package.json` conflict blocks `npx tsx scripts/wp-migrate.ts`. After P0-1, the script needs (a) the rotated WC keys from P0-3, (b) a guard that errors out if `WC_CONSUMER_KEY` is empty rather than silently fetching unauthenticated WC endpoints (`scripts/wp-migrate.ts:37`). The script is also a one-shot CLI exporter — not a continuous sync. If continuous catalogue sync is the goal, this needs a cron-driven wrapper (not Phill's keyboard). |
| **PDF certificate (pdf-lib)** | wired live | Confirmed. Risks: P2-3 unicode; no DRM/watermark on the PDF (anyone with the URL can download a forged-looking cert); `lms/credentials/proof-pack/share/route.ts` issues share tokens but the audit doesn't show token expiry — verify `verifyProofPackShareToken` enforces a TTL. |
| **Stripe checkout** | wired live | Confirmed. Raw body + signature verification correct. P1-3 idempotency improvement is the only meaningful gap. |
| **Stripe webhook idempotency** | — | Per request: webhook uses `await request.text()` (raw, not parsed) and `stripe.webhooks.constructEvent` (constant-time HMAC) — both correct. Idempotency is partial (per P1-3). |
| **IICRC API or webhook** | not started | No outbound integration exists — schema columns (`iicrcMemberNumber`, `iicrcExpiryDate`, `iicrcCardImageUrl`, `iicrcCertifications`) only capture self-reported data. To verify a member's IICRC status programmatically, would need to scrape iicrc.org (no public API) or licensing-board integration. Decision needed: ship un-verified self-attestation, or block this feature. |
| **NRPG points push** | not started | Zero code. `professional-directory/page.tsx:193` "Directory powered by NRPG. Full live listing coming soon." is the only mention. Per CLAUDE.md / [[project-ato-app]], NRPG is one of the portfolio brands — internal integration could go through Pi-CEO API or direct Supabase, not a public NRPG endpoint. Needs an architectural decision on the connector substrate (per [[connector-routing]]). |
| **Resend/SMTP** | not started | `app/api/contact/route.ts:20` literally documents itself as a no-op. `OnboardingWizard.tsx:424` "SMS reminders — coming soon" + schema `resume_reminder_opt_in` field. Recommend Resend (already standard in this empire) + add `RESEND_API_KEY` to `.env.example`. |
| **Supabase** | not started | CARSI uses plain Postgres + Prisma + `@prisma/adapter-pg`. This is **fine** — not every brand needs Supabase. But it makes CARSI the odd one out: ATO-APP / Synthex / Pi-CEO portal_content all run Supabase. If the Pi-CEO board wants single-pane-of-glass on user data, CARSI needs a Supabase or a Pi-CEO-API ingress shim. |
| **Linear** | env documented, no code | `LINEAR_API_KEY` is in `.env.example:108`. Zero consumers in `app/` or `src/`. Either wire Linear (e.g. create an issue when a course completion fails, or sync the agent-runs board) or delete the env var from the example to stop confusing fresh devs. |
| **Telegram** | not started | No code. If the goal is failure-alerting for the build pipeline, route via Hermes (per [[project-hermes-mcp-state]]) — don't add a second Telegram client to this repo. |
| **Pi-CEO API** | not started | Zero references. If CARSI is meant to publish enrollment events into the Pi-CEO board (`PI_CEO_API_KEY`), the wire is missing. |
| **UNITE_GROUP_* internal API** | not started | Zero references. Same as above — wire missing. |

## 6. Schema / migration safety

11 models, 7 migrations. The schema is **clean** — `npx prisma format` + `prisma validate` both pass.

**Migration safety review:**
- `20260416120000_lms_user_iicrc` — 4 `ADD COLUMN IF NOT EXISTS` on `lms_users`. All nullable. **Safe to replay.** Hot-deploy safe.
- `20260419190000_lms_user_onboarding_resume` — 3 `ADD COLUMN IF NOT EXISTS`. All nullable. **Safe.**
- `20260420120000_leaderboard_privacy` — 1 `ADD COLUMN NOT NULL DEFAULT false` + 1 nullable. The `NOT NULL DEFAULT false` is a Postgres **table rewrite** on versions <11; on 11+ it's a fast metadata-only operation. CARSI's `pg@^8.14.1` driver + assumed Postgres 14+ on Vercel/Neon = fast. **Safe** assuming PG ≥ 11. Verify the production Postgres version before running.

**Missing indexes (covered in P2-1 + below):**
- `LmsLesson.moduleId` — no index → curriculum-list scan.
- `LmsModule.courseId` — no index → course-detail scan.
- `LmsEnrollment.studentId` — no standalone index (only the compound `uq_lms_enrollment(studentId, courseId)`, which Postgres can use for studentId-only queries but is suboptimal vs a single-column index).
- `LmsLessonProgress.studentId` — only on the compound unique.
- `LmsCourse.slug` is unique (`@unique` line 71) — good. `LmsCourse.iicrcDiscipline` has no index but is filtered on every catalogue query — add `@@index([iicrcDiscipline])`.
- `LmsCategory.parentId` — self-referential FK with no index.

**Missing CHECK constraints:**
- `LmsCourse.priceAud Decimal(12,2)` — should `CHECK (price_aud >= 0)`. A negative price triggers Stripe to reject silently with a confusing error.
- `LmsLessonProgress.completed = true` should imply `completedAt IS NOT NULL`. Either add a `CHECK` or change the schema to `completedAt DateTime?` driving `completed` as a generated column.
- `UserDiscount.discountValue` is nullable when `discountType = 'free'` (correct) — but no `CHECK` forcing `discountValue NOT NULL WHEN discountType <> 'free'`. Admin can save a `percentage` discount with null value.

## 7. Test coverage gaps

**33 Playwright e2e tests, 0 unit tests, 0 integration tests.**

E2E covers happy-path journeys (`e2e/carsi-journeys.spec.ts` — 28 tests for landing, catalogue, filter, login flows; `e2e/prd-generation.spec.ts`; `e2e/pre-production.spec.ts`). Useful, but slow and brittle.

**Untested business logic that would fail Phill if shipped:**

1. **Stripe webhook signature verification** (`src/lib/api/stripe.ts:184-192`) — no test that an invalid signature returns 400. Easy unit test; high-leverage.
2. **Discount math** (`src/lib/server/user-discounts.ts` — `computeDiscountedAud`, `findActiveUserDiscount`). `discountType` enum has 4 variants × null/non-null `discountValue` × expiry windows. Zero tests. A "100% discount that expired yesterday" producing a free enrolment is a real bug surface (`enrollments/confirm/route.ts:80-91`).
3. **Enrolment service idempotency** (`src/lib/server/enrollment-service.ts:25` — `already_enrolled` early return). One test; would have caught the P1-3 retry bug had it existed.
4. **JWT session lifecycle** (`src/lib/auth/session-jwt.ts` — `signSessionToken`, `verifySessionToken`, `verifyProofPackShareToken`). Token-expiry behaviour is untested. A 30-day token leak via a copy-pasted URL is a recurring threat model.
5. **Certificate PDF determinism** (`src/lib/server/certificate-pdf.ts`) — snapshot test ensuring the PDF byte output is stable for a fixed input. Today, a font-loading change would silently produce different PDFs; a learner who downloads twice gets two-non-identical certs.
6. **Catalogue published-vs-draft logic** (`src/lib/server/public-courses-list.ts:8-16`) — the `OR: [{ isPublished: true }, { status: 'published' }]` path needs tests to cover the four states (T/T, T/F, F/T, F/F).
7. **Stripe checkout: email mismatch guard** (`app/api/lms/enrollments/confirm/route.ts:50-55`) — when a logged-in user pays with a different email from their account, we 403. Untested. A regression would let user A pay for user B's account.
8. **Public proof-pack share-token TTL** (`app/api/public/proof-pack/route.ts`) — verify expiry is enforced.

Recommended ratio: ship ~30 unit tests covering the 8 surfaces above (3-4 tests each) before any new feature work.

## 8. The five questions Phill needs to answer to unblock

1. **Merge or abandon the 28-day-old branch?** (P0-4) — 131 commits behind. PM-Core has already shipped the lint/CI fixes upstream. Recommendation: **abandon the branch**. Cherry-pick the 4 unique seed-script commits (`db:seed-contents-specialty-drying-courses-txt`, `db:seed-specialty-courses-resources-txt`, `db:seed-technology-inspection-tools-txt`, `db:seed-odour-smoke-psychro-drying-docx`) onto a fresh branch off `origin/main` and PR. Burn the rest.
2. **Rotate the leaked WC consumer key now, before or after P0-4?** (P0-3) — Rotation is independent of the branch decision. Phill (or admin) needs to open carsi.com.au WordPress > WooCommerce > Settings > Advanced > REST API and revoke + reissue. Should happen **today**.
3. **Who owns the technical leadership of CARSI going forward?** Rana Muzamil is listed as Technical Lead in `package.json:7`. The 28-day silence and 131-behind state suggests either Rana has off-ramped or wasn't given clear deliverables. Either re-engage with explicit scope or transfer ownership to PM-Core + a senior agent.
4. **Is IICRC verification real or self-attested?** The schema captures `iicrcMemberNumber` + `iicrcExpiryDate` + `iicrcCardImageUrl` as self-reported. No outbound API to iicrc.org. Either (a) commit to self-attestation + a clear UI disclaimer, (b) build a manual admin-review queue where Phill or a moderator verifies card images, or (c) scrape iicrc.org's directory (legally fragile). This decision blocks the entire credential-trust narrative.
5. **What's the canonical "course published" flag — `status` or `isPublished`?** (P1-2) — One field needs to go. Pick one. Then write the deprecation migration. Pick `status` — it's already the dominant convention in the query layer and is more expressive.

---

**Report back (for the Board):**

- **P0 count: 4** (merge conflict, stale Prisma client, leaked WC secret, 131-commit-behind branch)
- **P1 count: 7** (public chat rate limit, dual publish flag, webhook idempotency, chat-proxy hop, JWT_SECRET rename, 17 undocumented env vars, zero unit tests)
- **P2 count: 5** (missing indexes, vestigial `role` column, pdf-lib unicode, husky tsc, prisma 7.8 bump)

**Top-3 unblocking questions:**
1. Abandon or merge the 131-behind branch? *(architectural — pick abandon)*
2. Who owns CARSI's technical leadership going forward?
3. Self-attested IICRC vs verified — which trust model are we shipping?

## Cross-refs

[[carsi-discovery-audit-2026-05-14]] · [[carsi-review-product-strategist-2026-05-14]] · [[carsi-review-market-strategist-2026-05-14]] · [[carsi-board-synthesis-2026-05-14]] · [[rana-handoff-2026-05-14]] · [[carsi]] · [[iicrc-content-initiative]] · [[dr-nrpg]] · [[pi-ceo-architecture]] · [[feedback-secrets-handling]] · [[feedback-audit-verification]] · [[curator-security-unknown]] · [[connector-routing]] · [[project-hermes-mcp-state]] · [[opus-adversary]]

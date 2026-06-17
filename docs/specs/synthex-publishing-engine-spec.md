# Synthex Multi-Platform Publishing Engine — Build-Ready Spec

> Produced via the `fable-engine` skill, then revised against an adversarial
> board critique. **Status: awaiting approval.** Nothing builds until Phill
> approves. Evidence tags per `.claude/rules/fabel-evidence-standard.md`:
> `[VERIFIED]` (source/official doc), `[INFERENCE]` (reasoned), `[UNCONFIRMED]`
> (assumption/secondary — in the risk register). Authored 17/06/2026 (en-AU).

---

## 1. Finish line

**Done when** Unite-Group Mission Control can take one piece of content + an
approval and publish it to any of the seven platforms (Facebook, Instagram,
LinkedIn, Reddit, X, YouTube, TikTok) through **one queue** — media
auto-transcoded/resized to that platform's spec, platform-correct metadata +
schema/OG auto-generated, uploaded via a **resumable protocol so a large file
can never hang**, **idempotent (no double-publish)**, gated by **explicit human
approval**, with live status in the Mission Control GUI — proven by `npm run
build` + `type-check` + `test` + `check:schema-drift` green.

## 2. Decision up front

Build **one unified publishing engine in this monorepo**, consolidating the two
fragmented systems (`apps/empire/src/lib/publish` + `apps/web/src/lib/integrations/social`)
behind a single `PlatformAdapter` interface and one queue. Mission Control
(apps/web) is the control plane; **Synthex is the controlled "Nexus Marketing
Agency" surface**. **v1 is single-tenant** (Unite-Group publishes its own
channels; Synthex is the brand surface) — **multi-client/agency tenancy is a
named, deferred follow-on** (it rewrites the schema; do not half-build it; see
BD-1). Media transcoding runs on a **dedicated Railway ffmpeg worker** (Vercel
functions can't — 300–800s cap `[VERIFIED]`); **Cloudinary is out of v1** (it'd be
a second transcode path + new vendor — deferred). Every upload uses the
platform's **resumable/chunked** protocol; Reddit (no resume `[VERIFIED]`) gets a
timeout + **check-before-resubmit** retry. Publishing is **approval-gated** via
the existing `CRM approval-lifecycle` (`safeToAutoExecute` type-pinned `false`
`[VERIFIED]`; new subject `social_post_publish`).

### Blocking decisions (settle BEFORE Phase 0 schema — they change the schema/order)
- **BD-1 Tenancy.** v1 single-tenant founder-scoped (recommended) vs multi-client
  agency (client/brand entity, per-client channels + approvers + audit). Pick one;
  retrofitting tenancy onto a founder-scoped queue is a rewrite. → OQ-1.
- **BD-2 Platform-readiness matrix.** Which platforms are past their access gate
  (app-review/audit/paid tier)? This **orders Phase 3** — build approved platforms
  first; un-approved ones ship as honest blocked but are *not* counted as
  delivery. → OQ-2.
- **BD-3 Approval granularity.** Per-post approval for all platforms (safest) vs
  allow-listed auto-publish for a channel after its first approved post. → OQ-4.

## 3. Goals & non-goals

**Goals**
- One queue, one adapter interface, seven platforms, **resumable uploads**.
- **Idempotency**: no double-publish, ever (data-model constraint, not just a test).
- Auto media pipeline: ingest → master mezzanine → per-platform renditions.
- **Per-platform constraint enforcement** (char/hashtag/duration/size/aspect) as a
  blocking pre-publish validator — reject/auto-truncate-with-approval *before* dispatch.
- Auto metadata/SEO: descriptions, **required alt text**, hashtags, OG, schema.org;
  **UTM/link attribution** templating per post.
- **Timezone-aware scheduling** (store UTC + display tz; correct AEST/AEDT DST).
- Approval-gated publish + FM-001..008 failure handling `[VERIFIED]`.
- Mission Control GUI: compose → draft → approve → schedule → live status → retry.

**Non-goals (v1)**
- **Multi-client/agency tenancy** — deferred follow-on (BD-1).
- **Cloudinary / second transcode path** — Railway worker only in v1.
- The Remotion video **generation** pipeline (convergence D-03) — this engine
  **publishes provided media**, it does not author video.
- Real-time websocket engagement, A/B testing, best-time-to-post ML, client
  preview-render — all later phases.

## 4. Approach (plain language)

A post is a row with content + media + a target-platform set. Media uploads once
to Supabase Storage; the Railway worker transcodes to a master mezzanine (H.264
High, MP4 faststart, AAC 48 kHz, 30 fps) + the crops every platform needs (9:16
1080×1920, 1:1 1080×1080, 16:9 1920×1080, 4:5 1080×1350) `[VERIFIED]`. A validation
pass enforces each target platform's hard limits; a metadata pass generates
captions, **alt text**, hashtags, UTM-tagged links, OG + schema.org. The post
waits at the **approval gate**. On approval, the queue dispatches per platform
through a uniform adapter using that platform's resumable upload, polling
processing where required, recording the returned id under a **(post_id, platform)
idempotency key** so a retry **checks-before-resending**. Mission Control shows
every stage live; failures follow FM-001..008. The **YouTube resumable pattern
already in the repo** (`youtube-upload.ts`, `308`/Range) is the template for
FB/X/LinkedIn/TikTok `[VERIFIED]`.

## 5. Phased plan (smallest first; each gates the next)

**Smallest genuinely-useful v1 slice (the spine, on one real platform):**
Phase 0 + 1 + 2 + **one already-access-approved platform** (per BD-2),
single-tenant, manual-approval-only, **idempotency from line one**. Proves
queue → transcode → resumable upload → approval → live status → no-double-publish
on real infra. Everything else is incremental on a proven spine.

**Phase 0 — Consolidate + schema + idempotency.**
Unify the two systems behind one `PlatformAdapter` interface + one queue with a
documented cutover (dual-run window, rollback, in-flight-post handling). Define
schema (§6) branch-first — write the migration in `apps/web/supabase/migrations/`
and validate it on a Supabase database branch (never against prod) —
**including the idempotency constraint**. Add
`social_post_publish` to `CrmApprovalSubjectType`. *DoD:* one adapter interface
both apps import; migration validated on a Supabase database branch +
`check:schema-drift` clean; unique
`(post_id, platform)` partial index live; approval subject wired; existing social
tests green.

**Phase 1 — Resumable transport state machine (NOT yet "FB pain fixed").**
Generalise the resumable client from the YouTube pattern; implement FB Resumable
Upload API (start/transfer via `file_offset`/finish) `[VERIFIED]`. *DoD:* a
pre-conformed large file uploads via chunks with progress; a simulated mid-upload
interruption resumes from the **server-reported** offset (test); idempotent
finalize. (The end-to-end FB pain is solved only once Phase 2 feeds it a
spec-compliant rendition.)

**Phase 2 — Media transcode pipeline (Railway ffmpeg worker).**
Job pulled from queue → master mezzanine + per-platform renditions → Supabase
Storage → row updated. *DoD:* one source video → 4 renditions to spec, each within
the platform's size/duration ceiling (TikTok-mobile 287.6 MB / Reddit 1 GB tightest
`[VERIFIED]`); Vercel functions only orchestrate; **FB video now publishes
end-to-end (the original pain, actually fixed).**

**Phase 3 — Per-platform adapters, ORDERED BY THE BD-2 READINESS MATRIX.**
Build access-approved platforms first; each via resumable/chunked: **X/Twitter**
(INIT/APPEND/FINALIZE/STATUS v2 `[VERIFIED]`), **Reddit** (lease→S3→submit +
websocket completion + check-before-resubmit `[VERIFIED]`), **LinkedIn** video
(initializeUpload→4 MB parts→finalize `[VERIFIED]`), **TikTok** (chunked
FILE_UPLOAD `[VERIFIED]`), **Instagram** Reels (container + status poll
`[VERIFIED]`), **YouTube** (wire the existing resumable client). Un-approved
platforms ship as honest typed `blocked` (not counted as delivery). *DoD per
platform:* publishes image + video to a sandbox/test account, or returns the
honest blocked state; constraint validator rejects over-limit content pre-dispatch.

**Phase 4 — Metadata, SEO, accessibility & attribution.**
Per-platform caption/title/hashtag generation (approval-gated, recommendation-only),
**required alt text**, OG + schema.org, **UTM templating**. *DoD:* every queued
post carries platform-correct metadata + alt text + UTM + OG/schema; no fabricated
metadata shown as live.

**Phase 5 — Mission Control control plane (GUI).**
Compose → draft → approve → schedule → queue monitor → live status → retry
(`--cc-*` tokens, SourceBadge, founder-scoped). *DoD:* full lifecycle from the GUI.

**Phase 6 — Failure modes + analytics.**
FM-001..008 `[VERIFIED]` each with a test proving its safety rule (esp. FM-006
never-double-publish, reconciled with Reddit's retry); `post_performance_metrics`
time-series + proactive per-account quota accounting.

## 6. Data model (branch-first → write migration in `apps/web/supabase/migrations/`, validate on a Supabase database branch, promote to prod `lksfwktwtmyznckodsau` ONLY via a merged + approved branch, then `check:schema-drift`)

Reuse `social_channels` (Vault-encrypted tokens `[VERIFIED]`), `social_posts`,
`social_engagements`. Add:
- `publish_queue` — `id, founder_id, post_id, platform, status (draft|pending_approval|approved|publishing|published|failed|held|window_expired), scheduled_at, scheduled_tz, attempts, next_attempt_at, last_error, idempotency_key, provider_post_id, created_at`. **Unique partial index `(post_id, platform) WHERE status NOT IN ('failed','window_expired')`** — the no-double-publish constraint. RLS founder_id; service_role bypass.
- `publish_attempt_log` — append-only attempt history (attempt_number, status, error_code, error_message, response_data jsonb, at).
- `approval_ledger` (or extend existing) — who approved/edited/connected/revoked + whether a post-approval content edit **invalidates** approval.
- `content_calendar_posts` — `id, founder_id, business_key, title, body, media_asset_ids jsonb, platforms jsonb, utm jsonb, approval_status, scheduled_at, scheduled_tz, …`.
- `media_assets` — `id, founder_id, source_url, master_url, renditions jsonb ({platform→{url,w,h,bytes,duration,validated}}), alt_text, transcode_status (queued|processing|ready|error), error`.
- `post_performance_metrics` — per-platform time-series.
All founder-scoped + RLS; tokens never plaintext. **No direct or autonomous prod
migration: promote to prod ONLY by merging an approved Supabase database branch,
with Phill's typed approval.**

## 7. Security & cost guardrails (structural)

- **Approval gate load-bearing** — publish requires `may_execute` from
  `CRM approval-lifecycle`; AI-RET-001 answer-shape gate forbids claiming
  "published" without proof `[VERIFIED]`. Post-approval content edit re-gates.
- **Idempotency** — the unique partial index + check-before-resend is the
  structural guarantee behind FM-006.
- **Secrets** — platform tokens AES-256-GCM via Vault, server-side only; never in
  client, logs, or error bodies (research found a prompt-injection in a vendor
  page — treat all scraped pages as untrusted).
- **Founder scoping + RLS** on every table/route; `security:routes-check` passes.
- **Per-platform validators** — hard pre-publish limits (char/hashtag/duration/
  size/aspect) block dispatch, not platform round-trip rejection.
- **Access gates (delivery blockers):** X needs **Basic $100/mo** `[VERIFIED]`;
  YouTube forces **private until audit** `[VERIFIED]`; TikTok unaudited =
  **SELF_ONLY** `[VERIFIED]`; LinkedIn Community Mgmt needs **review** `[VERIFIED]`;
  FB needs `publish_video` App Review `[VERIFIED]`. BD-2 readiness matrix gates Phase 3.
- **Transcode cost** — Railway worker, autoscale-to-idle; **confirm live pricing
  before the gate** so the budget cap (OQ-3) is real (current figures
  `[UNCONFIRMED]`).

## 8. Risk & assumption register

- **C/H from board critique (now addressed in-spec):** tenancy decided as BD-1
  (single-tenant v1); idempotency made a data-model constraint; Phase 3 ordered by
  BD-2 readiness matrix; Phase 1 reframed transport-only; Cloudinary dropped from v1.
- `[UNCONFIRMED]` platform limits (FB resumable 1.5 vs 1.75 GB; IG Reel size/duration
  + 25-vs-100/24h; LinkedIn 500 MB vs 5 GB; Reddit fields/caps; X v2 APPEND chunk
  cap) — verify against live uploaders before hard-coding.
- **App-review/audit/paid gates** can block live posting regardless of code —
  honest blocked states, never faked.
- **Reddit non-resumable** `[VERIFIED]` — timeout + check-before-resubmit (must
  reconcile with FM-006).
- **Dated API changes** — X v1.1 sunset 9/6/2025; IG legacy scopes deprecated
  27/1/2025; LinkedIn monthly YYYYMM versioning — pin current versions `[VERIFIED]`.
- `[INFERENCE]` Convergence deferred surfaces (D-03 Remotion, D-10 context bots,
  `process-publish-queue`, calendar approval) — this spec **assigns** the
  publish-queue + calendar-approval parts; Remotion *generation* stays out (D-03).
- `[UNCONFIRMED]` `apps/empire` path: not in the CLAUDE.md app table — re-verify
  the consolidation source paths at Phase 0 (they exist on disk but confirm
  ownership/staleness).

## 9. Open questions (≤5 — answer to unlock the build)

1. **BD-1 Tenancy.** v1 single-tenant founder-scoped (recommended), or multi-client
   agency now (bigger schema)?
2. **BD-2 Platform-readiness.** Which of FB/IG/LI/Reddit/X/YouTube/TikTok are
   already past their access gate (app-review/audit/paid tier)? Sets the live-vs-
   blocked set and Phase 3 order.
3. **Transcode approval + budget.** Approve the Railway ffmpeg worker and a monthly
   cap (pricing confirmed before build)?
4. **BD-3 Approval granularity.** Per-post approval for all platforms, or
   allow-listed auto-publish after a channel's first approved post?
5. **v1 wave.** The single-platform spine first (recommended — pick the most-ready
   platform), then widen; or a first wave of the already-approved platforms?

## 10. Verification plan (a claim isn't done until its tool result says so)

- `npm run verify:web` (+ empire equivalents); `npm run build` both apps.
- `npm run check:schema-drift` after validating any migration on a Supabase database branch.
- `npm run security:routes-check` after new routes.
- Per platform: a publish to a sandbox/test account (or mocked-fetch test of the
  resumable state machine) proving resume-from-offset, no-hang, and
  **idempotent no-double-publish on retry**; the constraint validator rejecting
  over-limit content.

---

### Appendix — sources
Platform upload APIs + media specs gathered with source URLs (Meta Graph/Video
API, Instagram Platform, LinkedIn Posts/Videos API, Reddit OAuth + reference
impls, X API v2 media upload, YouTube Data API resumable protocol, TikTok Content
Posting API; media specs via Sprout/Hootsuite/Buffer/official YouTube encoding;
transcode pricing via Vercel/Railway/Mux/Cloudinary/AWS). Crawler-blocked primary
pages (Meta, Reddit) are tagged `[UNCONFIRMED]` and must be re-confirmed in a
browser before their numeric limits are hard-coded. An adversarial board critique
(Chief Reviewer) informed this revision; its findings are folded into §2/§5/§6/§8.

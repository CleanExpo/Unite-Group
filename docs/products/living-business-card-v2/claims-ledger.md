# Claims ledger (Phase 0)

Source: origin/main `dbc58a6400de8d3e7375cb602441abbfdb497893`, worktree `living-card-v2`, read on 25 Oct 2026.
Statuses: VERIFIED (V), PARTIAL (P), UNKNOWN (U), BLOCKED (B), PROPOSED (Pr).
Paths are under `apps/web/` unless stated. Production was not queried. No form was submitted and no pay link was clicked.

| ID | Spec ref | Claim or requirement | Status | Evidence |
|---|---|---|---|---|
| C01 | 1.1 | `/cards` showroom exists | V | `src/app/cards/page.tsx:1-106`; live GET https://unite-group.in/cards returned 200 (baseline/cards-*.png) |
| C02 | 1.1 | `/cards/order` page exists | V | `src/app/cards/order/page.tsx`, `order-view.tsx`; live GET returned 200 (baseline/cards-order-*.png) |
| C03 | 1.1 | Catalogue has one signature reveal plus ten named editions | V | `src/app/cards/editions.ts:41-63` (11 entries: signature, blueprint, forge, constellation, ink, rewind, skyline, origami, portal, restoration, magnet) |
| C04 | 1.1 | Media files exist under `public/cards/media` | V | 23 tracked files (`git ls-files apps/web/public/cards/media`); SHA-256 of each recorded in baseline/media-sha256.txt (computed from this checkout) |
| C05 | 1.1 | Basic lead capture wired: enquiry form to `/api/leads` | P | Code path proven: `order/enquiry-form.tsx:38` posts to `/api/leads`; `src/app/api/leads/route.ts:37-62` inserts into `crm_leads`, returns 201 with `id`. Production success not observed (no submit allowed) |
| C06 | 1.1, 3.3 | A$249 Ready-made and A$449 Made for you exist in code | V | `order/order-view.tsx:14-29` (`CARD_TIERS`: ready 249, custom 449; env `STRIPE_PAYMENT_LINK_CARD_READY` / `_CUSTOM`) |
| C07 | 1.1 | Stripe online/offline flag from payment-link env, offline state shown when unset | V | `order-view.tsx:36-55,119-131`; link validator `src/app/grow/packages.ts:81-90` (https, buy.stripe.com only); test `src/app/cards/__tests__/cards.test.tsx:53-112` |
| C08 | 1.2 | Live Stripe links are configured, correct and authorised for public sale | U | Live page showed two "Order" buttons at $249 and $449 (baseline/cards-order-320.png), so some link env is set. Target URLs not followed (no clicking); correctness and authorisation not checked |
| C09 | 1.1 | Approved dark premium reference exists in `evidence/business-card-gold` | V | `evidence/business-card-gold/gold/recipe.md`, `design.lock.json`, reference PNGs |
| C10 | 1.1 | Visual tests exist (`playwright.visual.config.ts`, `e2e/visual/`) | V | `apps/web/playwright.visual.config.ts`; `e2e/visual/{order,coverage}.visual.ts`, `states.ts`, `__screenshots__/{desktop,mobile}` |
| C11 | 16.2 | Visual tests pass on the current SHA | U | Not run in Phase 0 (they provision a local server); rerun is a Phase 1 task |
| C12 | 1.1 | Card capture tables `card_owners`, `card_enquiries`, `card_feedback` exist (migration `20261024210000_card_enquiries_feedback.sql`) | V | Migration file lines 9-36 define all three; PR #1223 `state=MERGED`, `mergedAt=2026-10-24T12:21:06Z`, merge commit `d266e023` (gh pr view). Applied to production: per the MacBook lead's attestation only; not observed by me (see C13) |
| C13 | 1.2 | The card capture migration is applied in production | P | Lead attestation (evidence class L). Not queried by me. No app code in this repo reads or writes these tables (C19) |
| C14 | 1.1 | Owner seed merged (`20261024230000_card_owner_seed_phill.sql`) | V | File present; PR #1224 `state=MERGED`, `mergedAt=2026-10-24T18:05:14Z`, merge commit `dbc58a64` = current origin/main. Seeds slug `phill-mcgurk`; it raises if CRM tables name zero or more than one founder (lines 24-29) |
| C15 | 1.2 | The owner seed is applied in production | U | No attestation given to me; not queried |
| C16 | 1.1 | Stack: Next.js 16, TypeScript, Supabase, Playwright, Vitest | V | `package.json`: next ^16.2.11, react ^19.2.7, @supabase/supabase-js ^2.110.2, @playwright/test ^1.61.1, vitest ^3.2.7 |
| C17 | 1.1 | Synthex origin of the media is referenced; import contract unknown | P | Comment `editions.ts:1-8` names the Synthex business-card kit and a brand-kit JSON. No importer or contract found in repo |
| C18 | 1.2 | Live `/cards` and `/cards/order` match the inspected SHA | V (differs) | Re-checked 25 Oct 2026 (Phill's A4 premise that live = main was wrong). Live `https://unite-group.in/cards/order` returned 200, `cache-control: private, no-cache, no-store`, `x-vercel-cache: MISS` (also with a cache-buster), so it is NOT a CDN cache. It is served by deployment `dpl_E6hvhkwNGADKgQ4fMfLzKTdT91NU` = commit `2bfd888e` (#1218, 22-23 Oct). The domain alias `unite-group.in` was last updated at ms 1792730927234 and still points at that deployment (Vercel `get_alias`). The newest production deployment `dpl_Gkuq7ggDfA6eSJHGRvpsVohjfNNc` = `dbc58a64` (main) is READY but is not what the domain serves; #1220 (the `/cards/order` rebuild) is in `dpl_BPVsDvsemxE6qkgsgW6A5SB4GD9y`, also not serving. The old build has no "Choose your film" and does contain "Prefer to talk first" (absent from main source). Not changed by me: promoting `dbc58a64` to the domain is a production action for Phill. Consequence: nothing merged after #1218 (including `/c/<slug>`) is visible on unite-group.in until the alias is moved |
| C19 | 1.2 | Persistent client card URLs, owners, editing, modules and tenant isolation exist elsewhere | P | In this repo at origin/main: no `src/app/c`, no `/studio` route, no `card_profiles` table, no app code touching `card_owners`/`card_enquiries`/`card_feedback` (grep, scope: whole checkout except migrations/tests). Other branches and services not searched |
| C20 | 1.2 | Full enquiry creates a real, correctly owned CRM lead and a receipt | P | Lead insert is real code, owned by env `FOUNDER_USER_ID` (`route.ts:4,37-41`). The visitor gets a generic "Thanks, we have your request" (`enquiry-form.tsx:54-60`); the returned `id` is discarded, so no reference is shown. Production end to end not observed |
| C21 | 1.2 | Secure consent, review workflow, runtime AI and fulfilment exist | P | Marketing consent is separate and gates drip enrolment (`route.ts:92-101`). A public site chat agent route is allow-listed (`src/proxy.ts`, `/api/agent`). No review workflow found; fulfilment not found |
| C22 | 1.3, 9.1 | `/c/[slug]`, `/c/[slug]/contact.vcf`, `/studio/cards*` do not already exist | V | `ls src/app` shows no `c` or `studio`; grep for `vcard`/`BEGIN:VCARD`/`contact.vcf` across `apps/` found nothing |
| C23 | 2.4 | Public copy only promises working features | P | `/cards` says it "saves to contacts in one tap" (`page.tsx`, hero paragraph) but this repo has no vCard code (C22). Where contact-save lives (the delivered card kit?) is UNKNOWN |
| C24 | 9.1 | A new `/c/...` route would be reachable by the public | P | `src/proxy.ts` `PUBLIC_PATHS` and `EXACT_PUBLIC_FILES` list `/cards` and `/cards/order` only; `/c` is absent, so a new route would go through auth until allow-listed. Fix is in the Phase 1 plan |
| C25 | 11.2(4) | The anon INSERT policies are permissive and `card_slug` is raw text | V | Migration lines 70-72 and 91-93: `for insert to anon with check (true)`; slug only regex-checked (lines 18, 32). A valid-looking slug with no owner is accepted. The RLS proof only inserts owned slugs (`supabase/tests/card_enquiries_feedback_rls.sql:30-35`) |
| C26 | 11.2(3) | RLS tested with two adversarial tenants, anon, staff, collaborator, disabled owner, service role | P | Existing proof covers anon, two founders (a1, b2) and a signed-in user owning no card (test file lines 28-95). No staff, collaborator, disabled-owner or service-role case; no unowned-slug case |
| C27 | 16.2(3) | The RLS proof is executed in CI | P | `src/lib/card/__tests__/card-migration.test.ts` only string-matches the SQL (its own title says "not database execution"). The SQL needs a throwaway database. Workflow files were listed by name only (ci.yml etc.), not read in full, so a CI job running it is not ruled out |
| C28 | 17 | Marketing consent separate from essential contact | V | Checkbox `marketing_consent` default off (`enquiry-form.tsx:92-95`); `route.ts:50` stores true only when `=== true` |
| C29 | 11.1 | CRM is single-tenant today | V | `route.ts:4-8,37-41`: every lead gets `founder_id` from env `FOUNDER_USER_ID`. A per-card owner route needs new code |
| C30 | 11.2 | Card tables store no phone number | V | Migration header line 6; RLS proof checks no `phone|mobile|tel` column. The CRM path does store phone in `crm_leads` (`route.ts:44`) |
| C31 | 1.1 | Margot canonical HeyGen group/look `0e08f0af...` is completed and voice `dcd2d897...` is assigned | U | Not checked by me (HeyGen not touched; the HeyGen verification pack file is missing). Neither ID appears anywhere in the repo (grep of `src`, `docs`) |
| C32 | Margot 1 | Voice is the founder's ElevenLabs voice; avatar consent authorised | U | Founder statement in the addendum (unobserved). The addendum itself notes `consent_status: null` |
| C33 | Margot 1 | Reference video `0a822457...` exists and is a draft | U | Not checked |
| C34 | Margot 1 | Internal Margot system exists in the repo (separate from the public ambassador) | V | `apps/web/docs/margot/README.md`; `src/lib/command-centre/margot-health.ts` exist |
| C35 | 14, 18 | HeyGen spend-capable code already exists in the repo | V | `src/app/api/video/generate/route.ts:1,9,86` calls `createTalkingHeadVideo` (`src/lib/integrations/heygen`) with a per-business `heygenAvatarId`. Keep it away from card work and any render |
| C36 | 17 | Public company identity is verified | P | Live footer reads "Unite-Group Nexus Pty Ltd · ABN pending" (screenshots). `src/lib/legal/company.ts` prints "ABN pending" when `COMPANY_ABN` is unset or invalid. Whether the env is set in production is UNKNOWN |
| C37 | START 1 | Existing mission UNI-2996 | P | Commit subjects cite it (`git log` on `apps/web/src/app/cards/order`: #1220 "UNI-2996"). Linear not queried |
| C38 | 20 | Packets LBC-001..016 are reconciled with existing Linear tasks | U | Linear not queried in Phase 0 |
| C39 | 4.3 | Layout works at 320 to 1440 px with no horizontal scroll | P | Live pages measured `scrollWidth` equal to the viewport at 320/390/430/768/1440 (Playwright). BUT at 320 px on `/cards` the "Choose this" labels collide with neighbouring edition names (baseline/README note). 44-48 px touch targets not measured |
| C40 | 4.1 | Existing `/cards` is dark and the proposed public card is luminous | P | `/cards` is dark (`bg-[#0b0d10]`, `page.tsx:32`); the live `/cards/order` is cream/light. The gold recipe describes a dark page, so the live order page may not match it (see C18) |
| C41 | 4.1, START 6 | Luminous prototype HTML exists and shows three themes | U | Input `LIVING_CARD_LUMINOUS_FIRST_IMPRESSION_PROTOTYPE.html` is missing from `from-pc/`; A13 closed 25 Oct: only the three pack files exist, this input was not supplied, so the claim is UNKNOWN, not blocked |
| C42 | START 3 | Five launch-risk areas and 15 subissues from the independent review reproduced | U | `LIVING_CARD_INDEPENDENT_REVIEW_V1_2_MARGOT_ADDENDUM_2026-10-25.md` is missing; A13 closed 25 Oct: only the three pack files exist, this input was not supplied, so the claim is UNKNOWN, not blocked |
| C43 | Margot | HeyGen read-only verification receipt | U | `MARGOT_HEYGEN_READ_ONLY_VERIFICATION_2026-10-25.md` is missing; A13 closed 25 Oct: only the three pack files exist, this input was not supplied, so the claim is UNKNOWN, not blocked |
| C44 | START 1 | Root AGENTS.md / CLAUDE.md read, source SHA and dirty state confirmed | V | `AGENTS.md` (55 lines) and `CLAUDE.md` (257) present; worktree clean at start (`git status --short` empty), HEAD = origin/main = `dbc58a64...` |
| C45 | 5.1, 16.1 | Core Web Vitals targets (LCP 2.5 s, INP 200 ms, CLS 0.1); poster 150 KiB | Pr | Targets only; no measurement taken |
| C46 | 4.4 | No unmuted autoplay, play/pause/skip, captions, reduced-motion | Pr | Requirement. Existing `/cards` media controls and captions not audited in Phase 0 |
| C47 | 9.1 | Routes `/c/[slug]`, `/c/[slug]/contact.vcf`, `/studio/cards...` | Pr | Proposed; Phase 1 builds the first two only |
| C48 | 11.1 | Entities `card_profiles` to `card_audit_log` (14 tables) | Pr | Proposed; REUSE / EXTEND / NEW decision per entity is in dependency-map.md |
| C49 | 12 | API contracts `/api/public/cards/{slug}...` | Pr | Proposed; none exist |
| C50 | 13 | Rule-based help before model; tool permission tiers; per-session AI budget | Pr | Proposed; runtime AI cost is an approval item |
| C51 | 14 | Provider facts: Higgsfield Content Factory (22 Oct), Ad Multiplier (6 Oct), Kling 4.0, HeyGen Avatar V / Voice Director (20 Oct), TikTok trend report | U | External claims not re-checked; the spec itself calls them editorial signals |
| C52 | 8.5, 8.6 | Provider billing facts (Higgsfield credits vs API are separate; A$25/week RunPod figure) | U | Not checked; no provider contacted |
| C53 | 15 | K-factor, experiments A/B/C, growth metrics | Pr | Proposed designs; no event system exists (no `card_events`) |
| C54 | 17 | AU privacy, Spam Act and review-law obligations | U | Needs legal review; not assessed |
| C55 | 19 | Phase 0 to 6 programme and Gates 0 to 6 | Pr | Proposed in spec; the Phase 0 outputs listed in spec section 19 are produced in this folder |
| C56 | 21 | Release rejected on the listed failures (false success, tenant leak, etc.) | Pr | Acceptance rules; mapped into Phase 1 Done criteria |
| C57 | 7.2-7.6 | Signature film, 12 s hook, 30 s and 60 s films, archetypes 11 and 12 | Pr | Creative proposals; no generation authorised |
| C58 | 1.1 | Existing clips are about four seconds | V | `stopAt` values 3.45 to 4.4 s (`editions.ts:48-62`) |
| C59 | START 7 | Existing Higgsfield media is reusable | P | 11 local MP4 plus posters, hashes in baseline/media-sha256.txt. Licence and rights of the Higgsfield output not checked |

## Counts

Counted from the Status column of the 59 rows above: VERIFIED 21, PARTIAL 15, UNKNOWN 13, BLOCKED 0, PROPOSED 10.

Not in the ledger because the three input files are missing: the independent review's "five launch-risk areas and 15 subissues", the luminous prototype's details and the HeyGen verification receipt. Those rows (C41 to C43) are UNKNOWN: Phill closed the request on 25 Oct (A13), the input was not supplied.

## Phase 1 P0 update (25 Oct 2026)

- C25 / R2 (anon `with check (true)`): reproduced on a throwaway Postgres 15: with only migration `20261024210000`, an anonymous insert of an enquiry or feedback row for a slug nobody owns SUCCEEDS. It is a real hole in the schema as written (production state not queried). Fixed in `20261025090000_card_profiles.sql` (anon may write only for an owned card that is not an unpublished draft); proof in `supabase/tests/card_r2_anon_insert.sql`, run by `scripts/card-db-proof.sh`.
- C27: the RLS proofs are now executed (not string-matched) by `scripts/card-db-proof.sh`, locally only. Still not in CI.
- C22 / C24 / C47: `/c/[slug]`, `/c/[slug]/contact.vcf` and exact proxy rules now exist on this branch (unmerged, undeployed, unpushed).

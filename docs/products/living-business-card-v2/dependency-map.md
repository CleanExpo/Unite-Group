# Dependency map (Phase 0)

Source SHA `dbc58a6400de8d3e7375cb602441abbfdb497893`. Ledger IDs (Cnn) refer to claims-ledger.md. This is a plan; nothing is built.

## Build order

```
G0 approvals A1-A4 (approvals-needed.md)
  |
  v
[1] Data boundary: new migration FILE (not applied) ---------> [2] RLS two-tenant proof run on a throwaway DB
  |                                                               |
  v                                                               v
[3] Public read layer (published snapshot, slug validation) --> [4] /c/[slug] page (HTML first, no media needed)
  |                                                               |
  |                                                               +--> [5] /c/[slug]/contact.vcf
  |                                                               +--> [6] enquiry route + visible receipt
  v
[7] proxy.ts allow-list for /c  (needed before 4, 5, 6 can be reached in a browser)
  |
  v
[8] Playwright: 320/390/430/768/1440, media blocked, JS off, reduced motion, form failure
  |
  v
G1 independent review bound to the final SHA, then (separately) release authority
```

Later phases hang off G1 and are NOT in Phase 1: luminous front end from the prototype (needs the missing HTML), Margot "Meet Margot" (needs HeyGen receipt and approvals), AI help, media factory, growth, Stripe changes.

## What blocks what

| Item | Blocked by | Reason |
|---|---|---|
| Any migration file | A1 (data model decision) | The existing tables key everything on raw `card_slug`; a published-card table is a design choice for Phill's tech lead |
| Applying any migration to production | A2 | Existing migrations are "FOUNDER-GATED ... break-glass" (header of both card migrations); apply only via the gated path |
| Public `/c/...` in a browser | Step 7 (proxy allow-list) | `/c` is not in `PUBLIC_PATHS` (C24) |
| Persisting an enquiry for a non-founder card | A1 | `/api/leads` writes every lead to the single founder (C29) |
| Luminous design work | Missing prototype HTML (C41) | Design proof not available |
| Reproducing the 15 launch subissues | Missing review file (C42) | Not available |
| Margot media | Missing HeyGen receipt (C43), A5, A6 | IDs not verified; any render costs money |

## File ownership (no two workers on the same file)

| Lane | Files (all new unless marked) | Do not touch |
|---|---|---|
| Data / security | `apps/web/supabase/migrations/<ts>_card_profiles_publish.sql`; `apps/web/supabase/tests/card_profiles_rls.sql` | existing two card migrations (merged; changes need a forward migration) |
| Public card | `apps/web/src/app/c/[slug]/page.tsx`, `loading.tsx`, `not-found.tsx`, `card-view.tsx`, `card.module.css` | `src/app/cards/**` |
| vCard | `apps/web/src/app/c/[slug]/contact.vcf/route.ts`; `apps/web/src/lib/card/vcard.ts` | |
| Read layer | `apps/web/src/lib/card/published.ts`, `slug.ts` | `src/lib/supabase/service.ts` (reuse only) |
| Enquiry | `apps/web/src/app/api/public/cards/[slug]/enquiries/route.ts`; `apps/web/src/lib/card/enquiry.ts`; form component under `src/app/c/[slug]/` | `src/app/api/leads/route.ts` (leave as is) |
| Gate wiring | `apps/web/src/proxy.ts` (edit, one line plus a test) | everything else in proxy |
| Tests | `apps/web/src/app/c/__tests__/*`, `apps/web/src/lib/card/__tests__/*`, `apps/web/e2e/card/*` | existing `e2e/visual/**` baselines |

## Entity decisions (spec section 11.1), REUSE / EXTEND / NEW / BLOCKED

| Spec entity | Decision for Phase 1 | Why |
|---|---|---|
| card_owners | EXTEND | Exists (slug to `founder_id`); already seeded for `phill-mcgurk` |
| card_enquiries | EXTEND | Exists; anon insert is `with check (true)`, needs an "active published card" check (C25) |
| card_feedback | REUSE, untouched | Not in Phase 1 |
| card_profiles (published snapshot) | NEW | Nothing in the repo holds name, role, contact fields, published flag |
| card_revisions, card_publications | NEW later | Phase 1 needs only a `published_at` and a frozen public snapshot; full versioning is Phase 2+ |
| card_collaborators, card_modules, card_creative_assets, card_events, card_review_requests, card_ai_sessions, card_growth_experiments, card_job_queue, card_outcome_receipts, card_audit_log | BLOCKED until Phase 1 passes G1 | Out of scope; building them now would break "smallest change" |
| CRM lead (`crm_leads`) | REUSE for Phill's own card only | Single-tenant founder ownership (C29); other tenants' enquiries stay in `card_enquiries` |

## Existing code that must stay intact

`/cards` (`src/app/cards/page.tsx`), `/cards/order` (`order-view.tsx`, `enquiry-form.tsx`), `CARD_TIERS`, `src/app/cards/editions.ts`, `public/cards/media/**` (hashes in baseline/media-sha256.txt), `/api/leads`, and the visual baselines in `e2e/visual/__screenshots__`. Any diff to these needs its own approval.

## External dependencies

Supabase (production gated), Vercel preview for staging proof, Stripe (not touched in Phase 1), HeyGen/Higgsfield/Artlist/ElevenLabs (not touched). Existing HeyGen code at `src/app/api/video/generate/route.ts` and `src/lib/integrations/heygen` can spend money and must not be called by any card work (C35).

# Phase 1 (P0) plan: the smallest working persistent card

PLAN ONLY. Nothing here is built. Source SHA `dbc58a6400de8d3e7375cb602441abbfdb497893`. Covers START_HERE step 5 and spec Phase 1 / Gate 1 (LBC-002 to LBC-005, LBC-009 reduced).

## Outcome (plain English)

A stranger opens `/c/<slug>` on a phone and sees the business name, role and real Call / Email / Save contact buttons immediately, with no film, JavaScript or AI needed. Save contact downloads a correct vCard. They can send one enquiry and see a reference number only after it is really stored. Two different businesses cannot read or write each other's data. `/cards` and `/cards/order` do not change.

## Approvals needed before building

A1 (data model), A4 (live/main drift), and A3 if Phill wants the docs branch reviewed first. A2 stays closed: the migration is written and tested on a throwaway database only.

## Files to change

New (unless marked edit):

| File | What |
|---|---|
| `apps/web/supabase/migrations/<timestamp>_card_profiles_publish.sql` | `card_profiles` (slug unique, same regex as `card_owners`, `owner_founder_id`, public fields: display name, role, business name, email, phone, service area, `published_at` null by default); RLS forced; anon can read nothing directly; replace the permissive anon INSERT on `card_enquiries` so an insert is only allowed for a published card (or remove anon insert and use the server route only); header says "FOUNDER-GATED, not applied" like the existing two |
| `apps/web/supabase/tests/card_profiles_rls.sql` | Two-malicious-tenant proof (below) |
| `apps/web/src/lib/card/slug.ts`, `published.ts` | Slug validation (`^[a-z0-9-]{1,64}$`), published-snapshot read returning only public fields |
| `apps/web/src/lib/card/vcard.ts` | vCard 4.0 builder: UTF-8, CRLF, escaped `, ; \` and newlines, line folding at 75 octets, stable UID |
| `apps/web/src/app/c/[slug]/page.tsx`, `card-view.tsx`, `card.module.css`, `not-found.tsx`, `loading.tsx` | Server-rendered card; draft/unpublished/unknown slug returns the same 404; `noindex` until published; title, canonical, Open Graph |
| `apps/web/src/app/c/[slug]/contact.vcf/route.ts` | `Content-Type: text/vcard; charset=utf-8`, `Content-Disposition: attachment; filename="<slug>.vcf"`, 404 for unpublished |
| `apps/web/src/app/api/public/cards/[slug]/enquiries/route.ts` | Validate, check card is published, insert into `card_enquiries` with the service client, return `{receipt_id, status:"received", accepted_at}` only after the insert returns a row; otherwise a real error status; duplicate guard on (slug, email, ask hash, 10 minutes); body size cap; honeypot field |
| `apps/web/src/app/c/[slug]/enquiry-form.tsx` | Client form: preserves inputs on failure, shows the receipt id only from the server response, never "success" on a failed or uncertain result |
| `apps/web/src/proxy.ts` (edit) | Add `/c` to `PUBLIC_PATHS` and `/api/public/cards` to the public list; test that sibling routes (`/cards`, `/api/agents/...`) did not change |
| Tests listed below | |

Not changed: `src/app/cards/**`, `src/app/api/leads/route.ts`, `public/cards/media/**`, existing migrations, visual baselines.

## Tests

Unit (vitest, `apps/web/src/lib/card/__tests__/`, `apps/web/src/app/c/__tests__/`):
- vcard: golden file for a name with accents, a comma, a semicolon, a newline in the role; fold a long line; empty optional fields omitted; header/CRLF checked byte by byte
- slug: rejects `../`, uppercase, 65 chars, empty, unicode lookalikes
- published read: draft and null `published_at` return null; result has no `owner_founder_id` or other private field (assert exact key list)
- enquiry route: 400 on bad body; 404 on unpublished card; 201 only when the insert returns a row; 500 (not 201) when the insert fails; duplicate returns the same receipt, not a second row
- proxy: `/c/x`, `/c/x/contact.vcf`, `/api/public/cards/x/enquiries` public; `/api/agents/runner/claim` still not public

Database proof (psql on a throwaway DB, extends the style of the existing `card_enquiries_feedback_rls.sql`, which is currently only string-checked by vitest, ledger C27):
- Tenant A and Tenant B each own a card; B is malicious.
- B cannot read A's draft profile, A's enquiries or A's owner row; cannot update/delete A's profile; cannot insert a profile with A's `owner_founder_id`; cannot publish A's card.
- Anon cannot read `card_profiles` directly, cannot insert an enquiry for an unpublished or non-existent slug, cannot set `id`/`created_at`.
- A signed-in user with no card sees nothing; service role path works.
- Mutation check: temporarily restore the old `with check (true)` and confirm the "unowned slug" case goes red, so the proof is shown able to fail.

Browser (Playwright, `apps/web/e2e/card/`): widths 320, 390, 430, 768, 1440; JS disabled (name and Call link present); media/network blocked; reduced motion; keyboard path to Save contact; enquiry failure keeps inputs and shows no receipt; offline submit shows an error; one full enquiry on a fixture card in a preview database shows a receipt and the row is read back by id.

Existing suites that must stay green: `src/app/cards/__tests__/cards.test.tsx`, `src/lib/card/__tests__/card-migration.test.ts`, `e2e/visual/**` zero-tolerance screenshots for `/cards/order`.

## Done criteria (locked before building)

1. `/c/<fixture-slug>` renders name, role, Call, Email, Save contact in server HTML with JS off and media blocked, at all five widths, no horizontal scroll.
2. `contact.vcf` imports with correct name, number and email on iOS and Android (manual device receipt) and passes the byte-level golden test.
3. One non-production enquiry: form to API to a `card_enquiries` row to the receipt id shown, with the row read back by that id; failure paths never show a receipt.
4. Two-tenant proof prints its pass line on a throwaway DB and the unowned-slug mutation turns it red.
5. `/cards` and `/cards/order` unchanged: existing tests and the visual gate pass on the final SHA.
6. Nothing applied to production; no push without the release gate; no HeyGen/Higgsfield/Stripe call.
7. Independent reviewer (not the builder) reviews the exact final commit; GitHub checks green on that pushed SHA (a local pass is reported as "local checks pass").
8. Report states what is not live: production data, real owners, any other tenant's card.

## Risks

1. Live differs from main (ledger C18): the visual gate is built on main's page, not the live one. Resolve A4 first.
2. Permissive anon insert (C25) already exists in production per the lead's attestation: anyone can write enquiry rows for any well-formed slug today. The fix is a forward migration that needs A2.
3. Single-tenant CRM (C29): enquiries for another business cannot reach "their" CRM. Phase 1 only stores them and shows the owner; fan-out to a CRM is later.
4. The RLS proof has never been executed in CI (C27); building on it without running it would repeat the gap.
5. A new public route sits behind a proxy that rate-limits and applies a strict CSP; vCard downloads and forms must be tested through the real proxy, not just route handlers.
6. Copy risk: `/cards` already says "saves to contacts in one tap" (C23). Once `/c` ships that becomes true only for cards served here; check the delivered card kit separately.
7. Input gaps: the independent review and prototype are missing, so launch risks and the visual direction are not yet challenged. Do not start luminous styling until they arrive.
8. Slug squatting and enumeration: 404 for draft and unknown must look identical; reserved slugs (`admin`, `api`, `studio`) need a deny list.
9. Existing HeyGen code (C35) can spend money; keep it unreferenced from card code.

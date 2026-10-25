# Boards

## What START_HERE names (step 4, exact text)

"Build an executable dependency map and separate boards for: Security/Tenancy; Product/CRM; UX/Accessibility; Cinematic/3D; AI/Growth; with an independent release judge."

So the five boards are named exactly, in one line, plus a sixth role that is not a board:

1. Security/Tenancy
2. Product/CRM
3. UX/Accessibility
4. Cinematic/3D
5. AI/Growth

plus an independent release judge (separate from the five; a builder cannot certify its own work).

## Where the master spec differs

MASTER_SPEC section 18.2 does not use these five. It lists nine rows: Founder SPM / Orchestrator, Competitive & Futures Board, Human Experience Board, Creative Film Board, 3D & Physical Design Board, AI & Trust Board, Core App Board, Revenue/Growth Board, Independent Judge Board. Section 22 says "five parallel boards for security, human experience, visual film, core product/CRM and viral economics". START_HERE (the later, shorter directive) is taken as the authority for the five names; the spec's own wording is recorded here as a conflict, not silently merged.

Mapping used (spec rows to START_HERE boards):

| START_HERE board | Spec 18.2 rows it absorbs | Phase 1 role | First file ownership |
|---|---|---|---|
| Security/Tenancy | AI & Trust Board (security half) | Active: two-tenant RLS, anon-insert hardening | `supabase/**` |
| Product/CRM | Core App Board; Founder SPM | Active: `/c/[slug]`, vCard, enquiry receipt | `src/app/c/**`, `src/lib/card/**`, `src/app/api/public/cards/**` |
| UX/Accessibility | Human Experience Board | Active: a11y and five-width checks on the new page | `e2e/card/**`, a11y review only |
| Cinematic/3D | Creative Film Board; 3D & Physical Design Board | Not started: waits for G1 and for the missing prototype | none |
| AI/Growth | AI & Trust (AI half); Revenue/Growth Board; Competitive & Futures | Not started: no runtime AI or growth work in Phase 1 | none |
| Independent release judge | Independent Judge Board | Reviews the final SHA only; cannot be the builder | read-only |

Rule for parallel work: no two lanes edit the same file (dependency-map.md, file ownership table). Review lane choice follows the installed lane registry and the founder's review-round rule; that is a Phase 1 release step and was not touched in Phase 0.

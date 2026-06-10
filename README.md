# Unite-Group Spine (P0)

The **canonical shared-identity platform** for the Unite-Group umbrella. One contractor/member firm = **one `core.organization` party**; the six businesses (NRPG, NRPG-Onboarding, CARSI, Disaster Recovery, RestoreAssist, Synthex) become **modules/views** over this one backbone. (Model A — one shared spine.)

> Full design + adversarial review: `C:\Users\Disaster Recovery 4\nexus-consolidation-2026-06-08\14-p0-spine-design.md`
> Business structure: `…\13-business-structure.md`

## Locked decisions
- **ADAPT** RestoreAssist's clean model (Party/Org, Evidence chain-of-custody, BYOK-AI governance, RLS pattern) — **housed in a NEW greenfield Supabase store** (`packages/spine`). Do NOT mutate `restoreassist-prod`; do NOT anchor on `Unite-Group` (1,717 tables).
- **Unite-Hub** = operator cockpit, a cross-tenant `internal_staff` **consumer**, not the spine.
- Add the two entities RestoreAssist lacks: **`leadgen.lead` / `lead_routing`** and a unified **`field.job`**.
- `org_id = core.organization.party_id`; JWT-claim RLS with cached helpers, `WITH CHECK`, `FORCE`, indexed tenant columns.
- pgvector 0.8.0 + HNSW (cosine, in `extensions`), one model/dimension, tenant-filtered `match_*`.

## Binding conditions before GREEN (from adversarial review — accepted)
1. **`marketing.campaign` entity** + `campaign_id` on `leadgen.lead` & `onboarding.application` — close the Synthex/attribution gap (or a written decision Synthex is non-spine).
2. **RLS on `core.person` / `core.party` / `core.party_identifier`** + identity-isolation tests — a member sees a person only via a routed lead, customer, membership-relationship, or job. (Closes the lead-PII leak.)
3. **`match_*` sets `hnsw.iterative_scan = strict_order`** + a **two-tenant > `ef_search` completeness** GREEN test (not just the identical-vector check). (Closes silent HNSW under-return.)
4. **`internal_staff` = live `org_membership` check, never a cached JWT claim; fail CLOSED** on the machine identity.
5. **Over-merge negative test + human-review queue for sub-threshold fuzzy matches; bias to under-merge.**
6. **GREEN = "spine compiles + isolates" only — NOT a production-cutover predicate.** Cutover gets its own gate on cloned real data.

## The one irreversible, human-gated step
Production data **cutover** (backfill → dual-write → shadow-read → cutover one business at a time → **legacy-drop**). Built and rehearsed on cloned/non-prod data; the legacy-drop never runs without Phill's explicit yes.

## Layout
```
packages/spine/
  migrations/   ordered SQL (0001_core_identity, then module schemas, RLS, pgvector)
  sql/          reusable templates (match_template.sql)
  seed/         deterministic fixtures for GREEN tests
  tests/        migration-apply, RLS (SDK+JWT), type-gen freshness, seed+match, 6 per-business E2E, identity invariants
  types/        generated DB types (CI-verified fresh)
  data-access/  the ONLY sanctioned path to the spine (typed DAL; Langfuse-traced AI calls)
```

## Status
Greenfield build in progress (non-prod). Production cutover: NOT STARTED (gated).

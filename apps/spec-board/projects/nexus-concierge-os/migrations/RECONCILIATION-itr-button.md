# Adopting the core into ITR-Button (Lodgey) — reconciliation, not a paste

The first Lodgey vertical (`CleanExpo/ITR-Button`, Prisma) is **already live in a sandbox with
its own schema** — infrastructure, DB, and Stripe are built (Rana, 2026-06-22). So adopting
`core_schema.prisma` here is a **refactor of an existing, drifted schema**, not a greenfield
paste. Verified against `ITR-Button/prisma/schema.prisma` @ main (2026-06-24).

**Key finding:** ITR-Button's live schema has drifted from its own spec
(`duncan-itr-button/spec.md §6`, which defined `srt`, `professionals`, `srt_returns`, `nudges`
as first-class). The live build collapsed them, so several core invariants are **not currently
enforced in code** — most importantly never-close and the PII-free provider handoff.

## Live ITR-Button model → core table

| Core table | ITR-Button today | Adoption action |
|---|---|---|
| `vertical_pack` | `Partner` (tenant) | relate/seed a `vertical_pack` row; keep `Partner` as pack-local |
| `case` | `JourneySession` (+ `NoahSession` lifecycle) | map `JourneySession` → `case`; keep as pack-local detail |
| `srt` | **`NoahSession.srtJson Json?`** (a blob) | **promote** the blob to the first-class `srt` table: append-only, `state` machine, `next_action_at NOT NULL` (**never-close is not enforced today**) |
| `srt_return` | **absent** | **add** — no bidirectional return-SRT obligation exists today |
| `consent` | `ItrPacket.taxpayerConsentAt` (timestamp) | **promote** to `consent` (scope / regime / `revoked_at`) |
| `provider` | professional fields **inline on `ReferralLead`** (`professionalId/Name/Role`, `organisation`) | **extract** to a first-class vetted `provider` panel (`credential_ref`, `verified_at`, `active`); today there is no panel and no TPB-verification record |
| `handoff` | `ReferralLead` (carries professional PII inline) | **split** the routing into a PII-free `handoff` (opaque token only) — the current row is **not** PII-free |
| `referral_ledger` | `ReferralLead.status` | keep the attribution as `referral_ledger` (`kind`/`amount`/`disclosed`) once the provider + handoff are split out |
| `nudge` | **absent** (`NoahSession.diaryJson` blob is the closest) | **add** — the never-close follow-up engine is not built |

## What this means

- The core substrate (SQL + Prisma) is correct; **the gap is in the live vertical, not the core.**
  The Lodgey pack's "maps 1:1" holds at the **spec** level; the **live build** must be refactored
  back toward its own spec + the core (promote `srtJson`→`srt`+`srt_return`, split
  `ReferralLead`→`provider`+`handoff`+`referral_ledger`, add `nudge`+`consent`).
- This refactor touches Duncan-co-owned live app code → **gated on Phill + Duncan sign-off**
  (both Lodgey source specs' finish lines).
- It is **orthogonal to ITR-Button's current critical path**, which is external credentials, not
  schema: ATO API (client ID, redirect URIs, DSP/OSF status, M2M cert, prefill scope), XPM/BLinks
  access + target tenant + lodgement workflow, and partner-embed allowlist domains (Rana,
  2026-06-22). Those unblock live integration; this refactor aligns the data model with the OS.

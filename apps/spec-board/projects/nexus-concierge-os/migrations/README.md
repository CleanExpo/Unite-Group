# Nexus Concierge OS — core schema template (UNI-2170 Phase 1)

`0001_core_schema.sql` is the **shared core schema template**: the nine core tables
(`vertical_pack`, `provider`, `case`, `srt`, `srt_return`, `consent`, `handoff`,
`referral_ledger`, `nudge`) that every vertical instantiates.

## What this is (and isn't)

- **A template, not a live migration.** The OS is shared spec + schema, **not one shared
  database** (core spec §2). Each vertical copies this file into **its own** Supabase project
  (Lodgey AU-Sydney; RestoreAssist Unite-Hub; …) and applies it on a **database branch first**.
  No vertical is wired here — that satisfies the Phase 1 DoD ("template migration file lands +
  reviewed; no vertical wired").
- **The minimum contract.** Columns are the floor. A vertical MAY add columns (see each pack's
  §6a "pack-added columns"); it must NOT change or remove a core column — doing so means the
  pack has diverged from core, which is a core issue (UNI-2170), never a pack workaround.

## Load-bearing invariants (encoded structurally in the DDL)

| Invariant | How it's enforced | Source |
|---|---|---|
| **never-close** | `case.next_action_at` and `srt.next_action_at` are `NOT NULL`; terminal close is an explicit `closed_at`, never silence | core spec §"Case states" |
| **PII-free handoff** | `handoff.carries_pii` is `CHECK (= false)`; routing is by `opaque_token` only. A vertical needing an address (RestoreAssist) releases it **post-accept** from its own plane, keyed by the token — never in this row | restoreassist-pack §7 |
| **no TFN / gov ID** | no column stores a TFN or government ID (guard a: schema absence). The free-text PII interceptor (b) and CI grep (c) are per-vertical | core spec §7 |
| **disclosed referrals** | `referral_ledger.disclosed` recorded on every row (gating "disclose before match" is app-level) | core spec §7 |

## RLS

RLS is `ENABLED` on all nine tables with **no policy** — deny-all by default. Each vertical
**must** add its own isolation policies (per `client_slug` / per `professional_id`) before any
client access. Server-side service-role work bypasses RLS as usual.

## Applying it (per vertical)

```sh
# in the VERTICAL's repo/data plane, on a Supabase database branch — never core, never prod first
supabase db branch create core-schema
psql "$BRANCH_DATABASE_URL" -f 0001_core_schema.sql
# add the vertical's pack-local tables (pack §6b) + RLS policies, then promote the branch
```

Idempotent (`create … if not exists`) and wrapped in a single transaction — re-running is a
no-op; any failure applies nothing.

## Re-proving the template

`./verify_core_schema.sh` applies the template to a throwaway Postgres (docker `postgres:16-alpine`,
or set `PGURL` to use an existing DB), re-applies it (idempotency), and asserts every load-bearing
invariant — 9 tables, RLS-on-all-9, never-close `NOT NULL` on `case`+`srt`, PII-free `carries_pii`
CHECK, and the referral-`kind` enum. Exit 0 = all invariants hold. Run it against the template
before copying it into a vertical's plane.

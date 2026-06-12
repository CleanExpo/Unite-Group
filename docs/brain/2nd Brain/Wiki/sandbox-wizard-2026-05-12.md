---
type: wiki
updated: 2026-05-12
---

# Sandbox Wizard — Canonical Schema Mirror

Canonical entry point: `~/pi-seo-workspace/unite-group/scripts/sandbox-wizard.sh`.

## Why Supabase `create_branch` fails

Prod migration history is unreproducible — 1665 prod tables, only 32 replay from migration files. Supabase `create_branch` fails with `MIGRATIONS_FAILED` because it expects the full migration history to apply cleanly on a fresh project.

## Workflow

The wizard mirrors prod → sandbox via `pg_dump --schema-only` + per-statement DROPs.

- `DROP SCHEMA CASCADE` on 1000+-table schemas hits Postgres `max_locks_per_transaction = 64` — can't be raised at runtime on Supabase managed Postgres. Per-statement DROPs avoid the lock-table blowup.
- `pg_dump --schema=public` excludes `CREATE EXTENSION` statements. The mirror must install extensions (`vector`, `pg_trgm`) explicitly before applying the schema dump.

## Project refs

| Role | Project ref |
| --- | --- |
| Prod | `lksfwktwtmyznckodsau` |
| Sandbox | `xgqwfwqumliuguzhshwv` |

## IPv4 add-on (required)

Both projects have the IPv4 add-on enabled ($4/month each, $8/month total). Required for `pg_dump` from AU-routed connections — without IPv4, Supabase only exposes IPv6 AAAA records and the AU residential connection cannot resolve / route to them.

## Cross-refs

[[unite-group-nexus-architecture]] · [[unite-group-rls-audit-2026-05-12]] · [[operational-priorities-q2-2026]]

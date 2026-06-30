# Archived Migrations — v1

These migration files were accumulated during v1 development (2024–2026).
Archived 09/03/2026 as part of the Nexus 2.0 rebuild.

**DO NOT replay these migrations.** The Nexus 2.0 baseline schema replaces all of them.

See `../20260309000000_nexus_schema.sql` for the clean baseline.

## Formally retired

- **`177_knowledge_distillation_engine.sql`** — retired 30/06/2026 (RA-6863).
  Its `knowledge_artifacts` table keys on `tenant_id REFERENCES agencies(id)` —
  the RestoreAssist multi-tenant schema, not the apps/web (Nexus) `founder_id`
  model — so it must never be deployed to Nexus prod as-is. Superseded by the
  Nexus 2.0 baseline. Also present (identically) under `../../migrations_backup/`;
  both copies are archive-only and non-deployable.

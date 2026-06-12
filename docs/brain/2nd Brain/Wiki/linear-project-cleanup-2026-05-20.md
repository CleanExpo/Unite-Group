---
type: operating-log
updated: 2026-05-20
---

# Linear Project Cleanup - 2026-05-20

## Decision

Linear project names are now treated as the canonical routing layer for Unite-Group work. Project names should be short, business/product specific, and mapped to the responsible team key.

## Verified Workspace

- Workspace: Unite-Group
- Teams: `RA` RestoreAssist, `DR` DR-NRPG, `SYN` Synthex, `GP` G-Pilot, `UNI` Unite-Group
- Direct Linear GraphQL access worked through the secured local Hermes env.
- Pi-CEO MCP Linear tools were blocked because the running MCP subprocess did not receive `LINEAR_API_KEY`.

## Cleanup Applied

- `Duncan ITR Platform` -> Backlog
- `ATIA` -> Started
- `Bulcs` -> Backlog
- `Margot` -> Started
- `RA Billing v2` -> Completed
- `Pi-Dev-Ops` -> Backlog
- `Synthex Video Engine` -> Completed
- `RestoreAssist V2` -> Planned
- `Bron Portable Agent` -> Started
- `DR-NRPG Ops` -> Backlog
- `Disaster Recovery Website` -> Backlog
- `RestoreAssist` -> Started
- `DR-NRPG Contractor Onboarding` -> Completed
- `CARSI` -> Backlog
- `Node Starter` -> Completed
- `Synthex` -> Started
- `CCW CRM` -> Planned
- `ATO` -> Completed
- `Unite-Group` -> Started

Each project now has a short cleanup description carrying canonical name, cleanup date, and team route.

## Active Work That Remains

- [[Synthex]]: source ingestion and Supabase security advisor work.
- [[unite-crm]] / [[Unite-Group]]: source ingestion, agent architecture, and portfolio control work.
- [[dr-nrpg]]: source ingestion, Vercel/Supabase health audit, and DR website work.
- [[restore-assist]]: RestoreAssist V2, Margot voice loop, and production hardening.
- [[carsi]]: deployment chain and security advisor backlog.
- [[ccw]]: CRM command center, Telegram executive room, and health audit work.

## Rule Going Forward

Do not mass-close Linear issues from title alone. Close only when there is direct evidence of a merged PR, superseded duplicate, completed source-ingest packet, or current deployment/security state.

Detailed report: `/Users/phill-mac/Documents/Marketing Team/docs/linear-project-cleanup-2026-05-20.md`.

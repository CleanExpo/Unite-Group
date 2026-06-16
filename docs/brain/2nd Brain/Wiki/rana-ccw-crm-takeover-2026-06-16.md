---
type: wiki
updated: 2026-06-16
project: CCW-CRM / Unite-Group CRM
owner: Rana Muzamil
source: apps/web/docs/margot/ccw-crm-rana-takeover-2026-06-16.md
---

# Rana CCW-CRM Takeover — 2026-06-16

This supersedes the old May 2026 CCW-CRM standalone handoff for the current build track.

The active product is now consolidated into `CleanExpo/Unite-Group`, app root `apps/web`.

## Current Truth

CCW-CRM is **contacts MVP live + tested**, not full CRM complete.

Working:

- `/founder/contacts`
- `/founder/contacts/[id]`
- `/api/contacts`
- `/api/contacts/[id]`
- `/api/contacts/[id]/score`
- `/api/email/contacts/import`

The richer CRM migrations exist but remain pending verification/promotion:

- `apps/web/supabase/migrations/20260612020000_crm_leads.sql`
- `apps/web/supabase/migrations/20260612021000_crm_contacts_opportunities.sql`

## Rana's Takeover Sequence

1. Verify canonical CRM schema and decide `contacts` vs `crm_contacts`.
2. Harden contact API validation, duplicate detection, and provenance.
3. Build opportunities API and single-currency AUD forecast.
4. Build founder pipeline board and forecast strip.
5. Wire CRM approval request/execute endpoints.
6. Add contact activity timeline and Gmail import events.
7. Add CRM navigation cluster and command-centre CRM summary tile.
8. Run full tests, type-check, lint, build/deploy evidence.

## Linear Ticket Pack

- `CRM-001 — Verify canonical CRM schema and decide contacts vs crm_contacts`
- `CRM-002 — Harden contact API validation, duplicate detection, and provenance`
- `CRM-003 — Build opportunities API + AUD forecast rollup`
- `CRM-004 — Build founder pipeline board and forecast strip`
- `CRM-005 — Wire CRM approval request/execute endpoints`
- `CRM-006 — Add contact activity timeline and Gmail import events`
- `CRM-007 — Add CRM navigation cluster and command-centre summary tile`
- `CRM-008 — Full CRM smoke tests and deployment evidence`

Labels:

- `rana:build`
- `crm`
- `apps-web`
- `founder-os`

## Canonical Packet

Use the repo packet as the execution source:

`apps/web/docs/margot/ccw-crm-rana-takeover-2026-06-16.md`

## Stop Conditions

- No direct production DB migration without sandbox evidence.
- No secrets or `.env*` reads/writes.
- No public signup or SaaS billing scope.
- No opportunity won/converted mutation without approval execution.

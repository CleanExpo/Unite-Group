# RA → Spine Field Mapping (P3 draft — needs Phill's review)

**Source of truth used:** `CleanExpo/RestoreAssist@main:prisma/schema.prisma` (fetched read-only
2026-06-10). ⚠️ NOT yet confirmed against the live prod DB (`restoreassist-prod-2026` / udooy) —
that read needs explicit approval; code-vs-prod drift is possible (151 migrations, mid-flight
Organization→Workspace collapse). Confirm before sign-off.

**Resolver payload shape** (what `migrate.enqueue` carries; `resolve_or_update` consumes):
`{ kind, display_name, email, abn, ... }` + full row image for `source_record.source_payload`.
`source_system='restoreassist'`, `source_pk='<Model>:<cuid>'` (model-prefixed so the four entity
streams don't collide on one keyspace).

## 1. The firm (tenant) — RA `Organization` + `Workspace` → `core.party('organization')` + `core.organization`

RA is MID-COLLAPSE: both models exist. **OPEN DECISION (Phill): tenant anchor rule** — suggest:
Workspace is the operational tenant (RLS scope, billing, members); Organization carries the legal
identity (abn/legalName). Where a Workspace's owner also owns an Organization, they are ONE
`core.organization` party.

| RA field | Spine target | Notes |
|---|---|---|
| Organization.tradingName ?? legalName ?? name | core.party.display_name | |
| Organization.legalName ?? name | core.organization.legal_name | not null in spine |
| Organization.abn (@unique) | core.organization.abn | resolver ABN hard-merge key |
| Organization.acn | core.organization.acn | |
| Organization.state | core.organization.state | |
| Organization.logoUrl | core.organization.logo_url | |
| Organization.email | payload.email | role-email (info@) under-merges + review queue — proven |
| Organization.id / Workspace.id | core.party_identifier scheme='ra_org_id' / 'ra_workspace_id' | lineage |
| Workspace.stripeCustomerId / User.stripeCustomerId | core.party_identifier scheme='stripe_customer_id' | dedup signal across businesses |
| Workspace.slug | metadata (source_payload) | no spine column; don't invent one |
| Organization.tradingStatus / Workspace.status | party.is_active (ACTIVE→true else review) | |
| phone, address, website, branding, BYOK/storage fields | source_payload only | app-level config, not identity — stays in RA until its module moves |

## 2. People — RA `User` → `core.party('person')` + `core.person` + `core.org_membership`

| RA field | Spine target | Notes |
|---|---|---|
| name | party.display_name; given/family split → core.person | split heuristic; family_name null when single token |
| email (@unique) | core.person.email | resolver dirty-email merge key |
| phone | core.person.phone | |
| role (OWNER/ADMIN → owner; else member) | org_membership.role | spine roles: member/owner/staff |
| organizationId | org_membership(person→org) | |
| WorkspaceMember(workspaceId,userId,status) | org_membership | ACTIVE→active; REMOVED→left; **INVITED → no membership row until joinedAt** |
| id | party_identifier scheme='ra_user_id' | |
| subscription/billing, UI-state fields (tour, checklist, experienceMode…) | source_payload only | not identity |

⚠️ **Test pollution:** ~94% of RA-prod Users are synthetic (design doc §3.4). The resolver's
test-data skip is proven, but the precise predicate (email domain pattern? flag?) must come from a
prod read — **blocked pending approval**, listed as P3 exit criterion.
⚠️ **Three identity surfaces:** Prisma `User`, `auth.users`, lowercase `users` exist in prod.
This mapping covers Prisma `User` only; the three-surface collapse is its own P3 line item.

## 3. Customers — RA `Client` → `field.customer`

| RA field | Spine target | Notes |
|---|---|---|
| name | field.customer.name | |
| workspaceId → mapped org party | field.customer.org_id | tenant scope; null workspaceId → falls back to user's org |
| email/phone/contactPerson | **OPEN (Phill):** mint `core.person` + contact_person_id now, or defer to wave 2 | minting now = better dedup; defer = smaller wave 1 |
| isSample=true | SKIP at ingest | seeded demo rows |
| company | customer.name disambiguator / source_payload | |
| ClientUser / portal accounts | out of scope wave 1 | portal auth layer, not identity |

## 4. Jobs & evidence — RA `Inspection` → `field.job`; `EvidenceItem` → `field.evidence` (wave 2)

RA has NO unified Job (spine adds it). Inspection is the closest ancestor of evidence:

| RA field | Spine target | Notes |
|---|---|---|
| Inspection.id | field.job via party-mapped workspace → org_id; party_identifier 'ra_inspection_id' | status mapping TBD from prod enum |
| EvidenceItem.capturedById → mapped person | field.evidence.captured_by | |
| capturedAt / capturedLat / capturedLng | captured_at / gps_lat / gps_lng | |
| hashSha256 | sha256 | chain-of-custody carries over |
| evidenceClass | evidence_class | |
| title, description, roomName, device*, file*, structuredData, status, exception | metadata (jsonb) | spine keeps evidence lean; embedding generated post-migration (null at ingest) |

## Suggested waves

1. **Wave 1 (identity):** Organization + Workspace + User + WorkspaceMember + Client → core.* +
   field.customer. This is what the resolver/parity machinery is proven on.
2. **Wave 2 (operations):** Inspection→field.job, EvidenceItem→field.evidence (+ embedding backfill).
3. Reports/Invoices/Integrations stay in RA until their modules have spine homes.

## Open decisions for Phill (P3 sign-off blockers)

1. Tenant anchor rule (Workspace vs Organization, §1).
2. Contact-person minting for Clients (§3).
3. Approve a one-time read-only prod schema/predicate check (udooy) to confirm this doc + pin the
   synthetic-user filter predicate + the three-surface collapse plan.
4. Wave 1 scope confirmation.

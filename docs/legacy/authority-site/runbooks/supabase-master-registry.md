# Supabase Master Registry — Unite-Group Ecosystem

**Date:** 2026-06-02  
**Purpose:** Single source of truth for ALL Supabase projects  
**Status:** CLEANUP IN PROGRESS — PATH B SELECTED (Pre-Sale Clean Architecture)  
**Owner:** Phill McGurk / Nexus Security & DR Lead

> **Hierarchy:** Unite-Group CRM (Layer 1) → Your Products (Layer 2) → Client Tenants (Layer 3, NOT separate projects)

---

## ⚠️ CRITICAL QUESTIONS FOR PATH B DESIGN

The schema audit discovered **new projects not previously documented**.
I need answers to these before designing the consolidation:

1. **restoreassist-prod-2026** (`udooysjajglluvuxkijp`, Sydney): Is this the replacement for the original RestoreAssist project? Or a separate production instance?

2. **ATO** (`xwqymjisxmtcmaebcehw`, Sydney): Is this a new product? A government client (Australian Tax Office)? When did this start?

3. **unite-group-ops** (`vgxidmwjdbgybjmjvwbb`, Seoul): Is this a staging/ops environment? Why is it in Seoul instead of Sydney?

4. **Pi-CEO** (`zbryrmxmgfmslqzizsto`, Singapore): Is this purely an internal DevOps tool, or does it have client data? Should it remain separate or merge into CRM?

5. **DR+NRPG** (`zwzbglqzmpyfzdkblxyf`, Canada): Is this actively receiving data? Is the data already duplicated in Unite-Group CRM? **Can we delete this after migration?**

---

## ACTIVE PRODUCTION PROJECTS

### Layer 1: Unite-Group CRM (The Company Platform)

| Field | Value |
|-------|-------|
| **Project Ref** | `lksfwktwtmyznckodsau` |
| **Name** | Unite-Group |
| **Region** | ap-southeast-2 (Sydney) |
| **Purpose** | Company CRM, client management, billing, operations hub |
| **PITR** | DISABLED — **ACTION REQUIRED** |
| **Apps** | unite-group.vercel.app |
| **DR Role** | PRIMARY — must have PITR enabled |

**Tenants hosted here (multi-tenant via RLS):**
| Tenant | Client | Status |
|--------|--------|--------|
| ccw-carpet-cleaning | CCW Carpet Cleaning | Active ($ MRR) |
| bulcs-holdings | Bulcs Holdings | Active ($ MRR) |

### Layer 2: Your Products (Sold to Multiple Clients)

#### RestoreAssist
| Field | Value |
|-------|-------|
| **Project Ref (Original)** | `oxeiaavuspvpvanzcrjc` |
| **Project Ref (LIVE PROD)** | `udooysjajglluvuxkijp` — **restoreassist-prod-2026, LIVE production** (confirmed 06/07/2026 estate audit) |
| **Region** | ap-southeast-2 (Sydney) |
| **Purpose** | Property restoration SaaS |
| **PITR** | UNKNOWN — check required |
| **Product URL** | https://restoreassist.app |
| **Notes** | Standalone product, may have its own clients |

#### CARSI (added 06/07/2026 — missing from original registry)
| Field | Value |
|-------|-------|
| **Project Ref** | `ofzafxvxobjggjisrbsa` |
| **Purpose** | IICRC-aligned training LMS (carsi.com.au) — live production |
| **PITR** | UNKNOWN — check required |

#### Synthex
| Field | Value |
|-------|-------|
| **Project Ref** | `znyjoyjsvjotlzjppzal` |
| **Region** | ap-southeast-2 (Singapore) |
| **Purpose** | AI content/marketing engine |
| **PITR** | UNKNOWN — check required |
| **Notes** | Should this move to Sydney for AU/NZ data residency? **06/07/2026 estate audit:** ref `vwfgksqkajnpfjospbpe` found referenced in current Synthex code/env as the working project — the two refs need reconciliation; treat this row's ref as possibly superseded. |

#### Pi-CEO (Autonomous DevOps Agent)
| Field | Value |
|-------|-------|
| **Project Ref** | `zbryrmxmgfmslqzizsto` |
| **Region** | ap-southeast-2 (Singapore) |
| **Purpose** | AI coding/ops agent |
| **PITR** | UNKNOWN — check required |
| **Product URL** | pi-dev-ops-production.up.railway.app |

#### DR+NRPG System (Combined)
| Field | Value |
|-------|-------|
| **Project Ref** | `zwzbglqzmpyfzdkblxyf` |
| **Region** | ca-central-1 (Canada) |
| **Purpose** | Disaster Recovery + National Restoration Professionals Group |
| **PITR** | UNKNOWN — check required |
| **Notes** | **In wrong region.** DR+NRPG serves AU/NZ contractors. Should move to Sydney. Also: is this duplicated inside Unite-Group CRM already? |

### Layer 3: Client Projects (Dedicated Instances)

#### Dimitri ITR
| Field | Value |
|-------|-------|
| **Project Ref** | `vmkqrzpbeefaruhfhsow` |
| **Region** | ap-southeast-2 (Sydney) |
| **Purpose** | Tax/refund processing for Dimitri |
| **PITR** | UNKNOWN — check required |
| **Notes** | This is a dedicated client instance, not multi-tenant. Is this productized or one-off? |

### Unclassified / Newly Discovered

| Project Ref | Name | Region | Status |
|-------------|------|--------|--------|
| `xwqymjisxmtcmaebcehw` | ATO | Sydney | **NEW — NEEDS CLARIFICATION** |
| `vgxidmwjdbgybjmjvwbb` | unite-group-ops | Seoul | **NEW — NEEDS CLARIFICATION** |

---

## TEST / SANDBOX PROJECTS

| Project Ref | Name | Region | Purpose | Status |
|-------------|------|--------|---------|--------|
| `xgqwfwqumliuguzhshwv` | Unite-Group Test | us-west-1 | Sandbox/testing | **DELETED 15/06/2026** (per root CLAUDE.md — no standing sandbox; use Supabase database branches) |

---

## DEAD / STALE PROJECTS (Recommended for Deletion)

| Project Ref | Name | Region | Reason |
|-------------|------|--------|--------|
| `uqfgdezadpkiadugufbs` | (legacy, unnamed) | unknown | Stale project ref found in scripts. Confirmed dead. |
| `idthodoyefbcdgcyuilf` | Unite-Group-Project | us-west-1 | **Likely duplicate of test project.** Verify not in use, then delete. |

---

## NOT YOUR PROJECTS (Other Orgs / Personal)

| Project Ref | Name | Region | Owner Action |
|-------------|------|--------|--------------|
| `lmrbgyhftmtvvmflheiq` | Bronwyns Guide | Singapore | Not Unite-Group. Remove from this org? |
| `qwoggbbavikzhypzodcr` | Phills CRM | Sydney | Personal? Move to personal org? |
| `pwwwhoaxxtkmowifpuwf` | NodeJS Starter V1 | Singapore | Not Unite-Group |
| `ucqdyqmwjgdrdgimpzsm` | My Project | US West | Not Unite-Group |
| `phqvephylfbpkjslehks` | test-project | Singapore | Not Unite-Group |

---

## PATH B: PRE-SALE CLEAN ARCHITECTURE (SELECTED)

**Goal:** Clean, scalable, easily explainable to buyers. Multi-tenant where possible, dedicated where necessary.

### Target State (Post-Migration)

| Purpose | Project Count | Details |
|---------|--------------|---------|
| **Core CRM Platform** | 1 | Unite-Group (multi-tenant) |
| **Standalone Products** | 1-2 | RestoreAssist + Synthex (if they have own client data) |
| **Client Instances** | 1 | Dimitri ITR (or merge if productized) |
| **Operations Tools** | 0-1 | Pi-CEO (merge into CRM as internal tenant) |
| **DR+NRPG** | 0 | Merge into CRM as module |
| **Test/Sandbox** | 1 | Unite-Group Test |

### Migration Phases

**Phase 1: Foundation (Week 1)**
1. Answer critical questions (above)
2. Delete stale projects
3. Enable PITR on all production projects
4. Create Management API token for automation

**Phase 2: Schema Discovery (Week 2)**
1. Export schema from each product project
2. Map tables to multi-tenant namespaces
3. Design unified schema with `tenant_id` RLS

**Phase 3: RestoreAssist Migration (Weeks 3-4)**
1. Create `restoreassist` schema in Unite-Group
2. Migrate tables with `tenant_id` column
3. Update RestoreAssist app to connect to Unite-Group
4. Test with single tenant, then all tenants

**Phase 4: Synthex Migration (Weeks 5-6)**
1. Create `synthex` schema in Unite-Group
2. Migrate marketing/content data
3. Update Synthex app to connect to Unite-Group

**Phase 5: DR+NRPG Migration (Week 7)**
1. Merge DR+NRPG data into Unite-Group as `nrpg` module
2. Delete Canada project after verification

**Phase 6: Pi-CEO & Remaining (Week 8)**
1. Evaluate if Pi-CEO merges as internal tenant
2. Clean up regional alignment (all to Sydney)
3. Final testing

**Total Effort:** 40-80 engineering hours over 8 weeks

---

## CREDENTIALS INVENTORY

| Token Name | Location | Scope | Projects |
|------------|----------|-------|----------|
| `SUPABASE_ACCESS_TOKEN` | 1Password (Unite-Group-Infrastructure) | CLI-scoped | All (but 403 on management API) |
| `SUPABASE_URL` | 1Password | Connection string | Unite-Group production |
| `SUPABASE_SERVICE_ROLE_KEY` | 1Password | Server-side | Unite-Group production |
| `UNITE_GROUP_SANDBOX_DB_PASSWORD` | 1Password | Direct DB | Test/sandbox |
| **Management API Token** | **NEEDS CREATION** | Organization admin | All (for automation) |

---

## DECISIONS REQUIRED FROM BOARD

1. **Enable PITR on all production projects?** (~$50-60/mo total)
2. **Move DR+NRPG from Canada to Sydney?** (Data residency for AU/NZ)
3. **Approve 40-80h engineering for multi-tenant consolidation?**
4. **Delete stale projects?** (zero cost, reduces confusion)
5. **Clarify restoreassist-prod-2026 purpose?** (Is this new production?)

---

**Next Review:** After critical questions answered and Phase 1 started  
**Document Owner:** Nexus Security & DR Lead  

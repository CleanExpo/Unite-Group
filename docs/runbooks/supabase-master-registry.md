# Supabase Master Registry — Unite-Group Ecosystem

**Date:** 2026-06-02  
**Purpose:** Single source of truth for ALL Supabase projects  
**Status:** CLEANUP IN PROGRESS  
**Owner:** Phill McGurk / Nexus Security & DR Lead

> **Hierarchy:** Unite-Group CRM (Layer 1) → Your Products (Layer 2) → Client Tenants (Layer 3, NOT separate projects)

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
| **Project Ref** | `oxeiaavuspvpvanzcrjc` |
| **Region** | ap-southeast-2 (Sydney) |
| **Purpose** | Property restoration SaaS |
| **PITR** | UNKNOWN — check required |
| **Product URL** | https://restoreassist.app |
| **Notes** | Standalone product, may have its own clients |

#### Synthex
| Field | Value |
|-------|-------|
| **Project Ref** | `znyjoyjsvjotlzjppzal` |
| **Region** | ap-southeast-2 (Singapore) |
| **Purpose** | AI content/marketing engine |
| **PITR** | UNKNOWN — check required |
| **Notes** | Should this move to Sydney for AU/NZ data residency? |

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

---

## TEST / SANDBOX PROJECTS

| Project Ref | Name | Region | Purpose | Status |
|-------------|------|--------|---------|--------|
| `xgqwfwqumliuguzhshwv` | Unite-Group Test | us-west-1 | Sandbox/testing | KEEP |

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

## RECOMMENDED CONSOLIDATION ROADMAP

### Phase 1: Cleanup (This Week)
1. Delete `uqfgdezadpkiadugufbs`
2. Verify `itudeoey...` is duplicate, then delete
3. Enable PITR on: Unite-Group, RestoreAssist, Pi-CEO, DR+NRPG, Dimitri ITR

### Phase 2: Regional Alignment (Next 30 Days)
1. Move DR+NRPG from Canada → Sydney (data residency for AU/NZ contractors)
2. Move Synthex from Singapore → Sydney (if AU/NZ clients use it)
3. Move Pi-CEO from Singapore → Sydney (if it manages AU/NZ infra)

### Phase 3: Multi-Tenant Architecture (If Preparing for Sale)
**Goal:** Reduce from 6+ production projects → 2 projects max

**Architectural decision matrix:**
| Product | Current | Target | Migration Effort |
|---------|---------|--------|------------------|
| Unite-Group CRM | Own project | Keep as-is (core platform) | Low |
| RestoreAssist | Own project | Merge into Unite-Group as tenant | **High** |
| Synthex | Own project | Merge into Unite-Group as tenant | **High** |
| Pi-CEO | Own project | Keep separate (operational tool) | Low |
| DR+NRPG | Own project | Merge into Unite-Group as module | **Medium** |
| Dimitri ITR | Own project | Productize → merge as tenant | **High** |

**Effort estimate:** 40-80 hours of engineering to consolidate properly.

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

1. **Enable PITR on all production projects?** (~$50/mo total)
2. **Move DR+NRPG from Canada to Sydney?** (Data residency for AU/NZ)
3. **Consolidate products into Unite-Group multi-tenant?** (40-80h engineering, cleaner for sale)
4. **Delete stale projects?** (zero cost, reduces confusion)

---

**Next Review:** After PITR enabled and stale projects deleted  
**Document Owner:** Nexus Security & DR Lead  

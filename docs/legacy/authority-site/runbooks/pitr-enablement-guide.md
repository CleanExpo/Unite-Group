# PITR Enablement Guide — Manual Steps

**Why Manual:** Management API token requires org-level access, not project-level. Only the project owner can create this token.  
**Cost:** ~$10/mo per production project  
**Time:** 5 minutes per project  

---

## Step 1: Log into Supabase Dashboard

1. Go to: `https://supabase.com/dashboard`
2. Sign in with your GitHub/SSO

---

## Step 2: Navigate to Each Production Project

### Project 1: Unite-Group (lksfwktwtmyznckodsau)
1. URL: `https://supabase.com/dashboard/project/lksfwktwtmyznckodsau/database/backups`
2. Click **"Enable PITR"**
3. Confirm $10/mo charge
4. Wait for activation (usually instant)

### Project 2: RestoreAssist (udooysjajglluvuxkijp)
1. URL: `https://supabase.com/dashboard/project/udooysjajglluvuxkijp/database/backups`
2. Click **"Enable PITR"**
3. Confirm

### Project 3: ITR-Dimitri (vmkqrzpbeefaruhfhsow)
1. URL: `https://supabase.com/dashboard/project/vmkqrzpbeefaruhfhsow/database/backups`
2. Click **"Enable PITR"**
3. Confirm

### Project 4: Synthex (znyjoyjsvjotlzjppzal) — AFTER migration to Sydney
- Do NOT enable on Singapore project (migrating away)
- Enable on Sydney target after migration complete

### Project 5: Pi-CEO (zbryrmxmgfmslqzizsto) — AFTER migration to Sydney
- Enable on Sydney target after migration

---

## Step 3: Verify PITR is Active

For each project, check:
- Backup schedule shows hourly snapshots
- "PITR: Enabled" badge is green
- Oldest recoverable point is >= 7 days ago

---

## Step 4: Document Completion

After enabling, update `supabase-master-registry.md`:
```markdown
| Unite-Group | ... | PITR **ENABLED** |
```

---

## Total Monthly Cost

| Project | PITR Cost |
|---------|-----------|
| Unite-Group | $10/mo |
| RestoreAssist | $10/mo |
| ITR-Dimitri | $10/mo |
| **Total** | **$30/mo** |

Synthex + Pi-CEO will be enabled on Sydney target post-migration.

---

## Why This Matters

Without PITR, your Recovery Point Objective (RPO) = last daily backup (up to 24 hours of data loss).  
With PITR, your RPO = minutes (point-in-time recovery to any moment in the last 7 days).

**This is the highest-ROI security improvement in Phase 2.**


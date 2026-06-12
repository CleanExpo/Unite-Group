# Phase 2 Migration Runbook — Regional Alignment

**Status:** IN PROGRESS  
**Created:** 2026-06-02  
**Purpose:** Migrate Synthex, Pi-CEO, DR+NRPG to Sydney region  
**Pre-req:** pg_restore installed at `~/.local/bin/pg_restore`

---

## Target Architecture (Clean)

| Project | Region | Status | Action |
|---------|--------|--------|--------|
| Unite-Group (`lksfwktwtmyznckodsau`) | Sydney | Primary CRM | KEEP |
| RestoreAssist (`udooysjajglluvuxkijp`) | Sydney | Standalone product | KEEP |
| Synthex | **Singapore → Sydney** | Merge into CRM | MIGRATE |
| Pi-CEO | **Singapore → Sydney** | Merge as internal tenant | MIGRATE |
| DR+NRPG | **Canada → Sydney** | Merge as module | MIGRATE |
| Dimitri ITR | Sydney | Client instance | KEEP |
| Test | US West | Sandbox | KEEP |

---

## Migration 1: Synthex (8 Tables — EASIEST)

### Step 1: Schema Export (Source: Singapore)
```bash
# Export schema only
pg_dump \
  --host=aws-0-ap-southeast-1.pooler.supabase.com \
  --port=6543 \
  --username=postgres.znyjoyjsvjotlzjppzal \
  --dbname=postgres \
  --schema-only \
  --no-owner \
  --no-privileges \
  > /tmp/synthex-schema.sql

# Export data only
pg_dump \
  --host=aws-0-ap-southeast-1.pooler.supabase.com \
  --port=6543 \
  --username=postgres.znyjoyjsvjotlzjppzal \
  --dbname=postgres \
  --data-only \
  --no-owner \
  --no-privileges \
  > /tmp/synthex-data.sql
```

### Step 2: Import to Sydney Target
```bash
# Import schema
psql \
  --host=aws-0-ap-southeast-2.pooler.supabase.com \
  --port=6543 \
  --username=postgres.TARGET_REF \
  --dbname=postgres \
  --file=/tmp/synthex-schema.sql

# Import data
psql \
  --host=aws-0-ap-southeast-2.pooler.supabase.com \
  --port=6543 \
  --username=postgres.TARGET_REF \
  --dbname=postgres \
  --file=/tmp/synthex-data.sql
```

### Step 3: Update Synthex App
```bash
# Update .env.local
NEXT_PUBLIC_SUPABASE_URL="https://TARGET_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="NEW_KEY"

# Deploy
vercel --prod
```

---

## Migration 2: Pi-CEO (Singapore → Sydney)

Pi-CEO schema unknown. Requires schema discovery first.

```bash
# Discover schema
pg_dump \
  --host=aws-0-ap-southeast-1.pooler.supabase.com \
  --port=6543 \
  --username=postgres.zbryrmxmgfmslqzizsto \
  --dbname=postgres \
  --schema-only \
  > /tmp/piceo-schema.sql

# Review tables
grep "CREATE TABLE" /tmp/piceo-schema.sql
```

Then follow same import pattern as Synthex.

---

## Migration 3: DR+NRPG (Canada → Sydney)

Highest risk — wrong region, unknown schema.

```bash
# Export from Canada
pg_dump \
  --host=HOST_FROM_DASHBOARD \
  --port=6543 \
  --username=postgres.zwzbglqzmpyfzdkblxyf \
  --dbname=postgres \
  --schema-only \
  > /tmp/drnrpg-schema.sql

# Review before import
grep "CREATE TABLE" /tmp/drnrpg-schema.sql | wc -l
```

---

## Post-Migration Checklist

- [ ] All data migrated (row counts match)
- [ ] RLS policies recreated
- [ ] App env vars updated
- [ ] Apps deployed to new endpoints
- [ ] Old projects backed up
- [ ] Old projects deleted
- [ ] DNS/custom domains repointed
- [ ] Client notifications sent (if downtime)

---

## Password Retrieval Commands

```bash
# Get Unite-Group DB password
op read "op://Unite-Group-Infrastructure/SUPABASE_SERVICE_ROLE_KEY/credential"

# Get Synthex DB password
op read "op://Unite-Group-Infrastructure/SYNTHEX_SERVICE_ROLE_KEY/credential"
```

---

## Blockers

1. **DB passwords required** — Supabase pooler uses JWT service-role key, not direct password
2. **PITR must be enabled** on target before migration (safety)
3. **App downtime** during DNS switchover

---

**Next Action:** Obtain DB passwords and execute Synthex migration first (lowest risk, 8 tables)


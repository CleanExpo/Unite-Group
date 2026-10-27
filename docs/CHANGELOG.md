# Changelog

## [Unreleased]

### Added
- Created `supabase-db-branch` skill to codify the process for validating schema changes on Supabase database branches before prod promotion
- Updated `CLAUDE.md` to reference the new `supabase-db-branch` skill for DB validation workflow
- Updated `supabase-schema-gate` skill to cross-reference the new branch process

### Changed
- Removed "PENDING SANDBOX VERIFICATION" header from `20260612021000_crm_contacts_opportunities.sql` migration, marking it ready for prod promotion after branch verification
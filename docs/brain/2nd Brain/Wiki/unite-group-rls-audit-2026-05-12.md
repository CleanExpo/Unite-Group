---
type: wiki
updated: 2026-05-12
---

# Unite-Group Supabase Security Audit — 2026-05-12 (RA-3008)

Live `supabase get_advisors` scan on Unite-Group project (`lksfwktwtmyznckodsau`). Captured 2026-05-12 by Claude autonomous engineering session.

## Plan 1 sweep shipped 2026-05-12 — 2007 → 71

Full RLS hardening sweep applied. Advisor count dropped from 2007 → **71** (ERROR 0, WARN 23, INFO 48). 9 migrations applied:

1. Dropped `test_*` tables (3 findings instant).
2. Admin-only RLS on 13 sensitive tables.
3. Service-role-only RLS on 23 backend tables.
4. Authenticated-read RLS on 28 reference tables.
5. 10 SECURITY DEFINER views flipped to INVOKER.
6. 152 public-targeted `USING (true)` policies retargeted to `authenticated` / `service_role`.
7. 457 SECDEF functions revoked from PUBLIC + granted to `service_role` only.
8. 833 functions pinned to `search_path = 'pg_catalog, public'`.
9. 2 matviews removed from REST API.

Pre-sweep baseline retained below for historical reference.

## Headline numbers (pre-sweep baseline, 2026-05-12 morning)

| Severity | Count |
| --- | --- |
| ERROR | 84 |
| WARN | 1,902 |
| INFO | 25 |
| **Total** | **2,011** |

## Top finding categories

| Count | Finding |
| --- | --- |
| 833 | `function_search_path_mutable` (WARN) — functions with mutable `search_path` |
| 456 | `anon_security_definer_function_executable` (WARN) |
| 456 | `authenticated_security_definer_function_executable` (WARN) |
| 152 | `rls_policy_always_true` (WARN) — policies that use `USING (true)` |
| 84 | `security_definer_view` (**ERROR**) — views bypass RLS |
| 71 | `rls_disabled_in_public` (WARN) |
| 25 | `rls_enabled_no_policy` (INFO) — table locked, callers see nothing |
| 10 | `security_definer_view` repeat |
| 3 | `sensitive_columns_exposed` (**ERROR**) |

## Three ERROR-severity findings worth immediate attention

**`sensitive_columns_exposed`** — fixed in this PR migration `20260513000001_ra3008_security_hardening.sql`:
- `agent_consensus_scores` (column: `session_id`)
- `agent_negotiation_proposals` (column: `session_id`)
- `negotiation_transcripts` (column: `session_id`)

All three now `ENABLE ROW LEVEL SECURITY` + service-role-only policy. Internal agent infra continues working via service-role JWT (BYPASSRLS).

## 71 tables with RLS DISABLED — categorised follow-up

Deliberately NOT fixed in this PR. Each table needs per-domain isolation policy design before turning on RLS — flipping RLS on without a policy = empty result set, breaks anything that reads the table via anon/authenticated keys.

### Internal / infra (low risk if locked)
`test_table_simple`, `test_table_with_fk`, `test_fk`, `migration_info`, `_migrations`, `migration_test_results`, `backup_artifacts`, `rate_limit_logs`, `api_rate_limits`

→ **Action:** drop test_* tables; for the rest, service-role-only lockdown (same pattern as the 3 sensitive ones).

### Founder-scope (must enforce `auth.uid() = founder_id` or similar)
`founder_time_entries`, `founder_financial_accounts`, `founder_financial_transactions`, `founder_financial_forecasts`, `founder_email_receipts`, `founder_financial_anomalies`, `founder_panels`, `founder_panel_widgets`, `founder_kpi_snapshots`

→ **Action:** policy on `auth.uid() = founder_id` (verify column name). One follow-up ticket per concern.

### Email / contacts
`email_replies`, `email_variants`, `contact_interactions`, `contact_emails`, `campaign_metrics`

→ **Action:** workspace_id / business_id scoped policy.

### Agent negotiation infra (additional rows beyond the 3 ERRORs)
`agent_negotiation_proposals`, `agent_consensus_scores`, `negotiation_transcripts`, `negotiation_patterns`, `synthex_offer_counters`

→ **Action:** service-role-only (matches the 3 ERROR tables this PR locks down).

### Synthex / SEO infra
`synthex_visual_templates`, `synthex_local_seo_profiles`, `ai_search_visibility`, `gbp_management_queue`, `schema_markup_generated`, `llm_citation_syndication`, `synthex_library_compliance_frameworks`, `synthex_library_tone_presets`, `synthex_library_credit_packages`, `service_content_strategy`, `synthex_library_plan_definitions`, `synthex_library_languages`, `media_asset_optimization`, `local_seo_automation_rules`, `synthex_appe_templates`, `australian_seo_templates`, `synthex_suburb_mapping`

→ **Action:** these are MOSTLY catalog/library data (public-readable, write-restricted). Add `USING (true)` for SELECT + service-role for INSERT/UPDATE/DELETE.

### Guardian network
`guardian_network_tenant_fingerprints`, `guardian_network_telemetry_hourly`, `guardian_network_aggregates_daily`, `guardian_network_pattern_signatures`, `guardian_feature_catalog`

→ **Action:** tenant-scoped policy (workspace_id) for read, service-role for write.

### Unite-platform Wave 2 tables (recent — possibly intentional but unverified)
`unite_playbook_steps`, `unite_report_sections`, `unite_experiment_variants`, `unite_template_blocks`, `unite_runbook_steps`, `unite_exp_variants`, `unite_usage_dimensions`, `unite_cost_buckets`, `unite_plans`, `unite_plan_features`, `unite_billing_providers`, `unite_invoice_line_items`, `unite_event_types`

→ **Action:** verify whether these are catalog (publicly-readable) or tenant-scoped. Many appear to be catalog (`unite_plans`, `unite_event_types`).

### Permissions / RBAC
`role_permissions`, `permissions`, `role_permissions_v2`, `permissions_v2`

→ **Action:** these gate the OTHER tables. They're DEFINITELY tenant-scoped (org-level) or service-role-only. **Top priority** in the follow-up sequence.

### Misc
`global_settings`, `wiki_sources`, `integration_metadata`, `domain_memory_query_stats`

→ **Action:** evaluate per-table.

## 84 `security_definer_view` (ERROR)

Views in `public` schema that run with the definer's privileges, bypassing the caller's RLS. Each one is a cross-RLS escape. Examples:
- `xero_accounts_summary`
- `rate_limit_analytics`
- `container_status_view`
- `recent_deployments_view`
- `circuit_ab_test_summary`
- `metrics_rollup_latest`
- `onboarding_analytics`
- `dashboard_mode_analytics`
- `suburb_authority_substrate`

→ **Action:** convert to `SECURITY INVOKER` and verify the underlying tables have correct RLS. Separate ticket per view family.

## 152 `rls_policy_always_true` (WARN)

Policies that use `USING (true)` — effectively disabled RLS. The advisor flagged 152 of these. Each is a per-table review.

→ **Action:** sweep follow-up — for each, replace `USING (true)` with a proper tenant-scoped predicate. Per-domain ticket batches recommended.

## 833 `function_search_path_mutable` (WARN)

Functions defined without `SET search_path` — susceptible to schema-injection if an attacker controls a same-name function in another schema.

→ **Action:** template fix is a `ALTER FUNCTION public.X SET search_path = pg_catalog, public;` per function. Trivially batchable script.

## Recommendations for the follow-up wave

1. **Drop test_* tables** first (`test_table_simple`, `test_table_with_fk`, `test_fk`) — instant 3-finding reduction.
2. **Fix the 3 sensitive_columns_exposed** — covered by this PR.
3. **Drop or scope the 152 always-true policies** — biggest leverage (each one is a silently-disabled RLS layer).
4. **Lock down founder_* tables** — these are founder-scope PII; data leaks here are catastrophic.
5. **Convert 84 security_definer_views to invoker** — sweep PR per view family.
6. **Template `SET search_path` across 833 functions** — script-batchable.

## Cross-reference

- Past Linear: RA-490 (SHA→bcrypt), RA-835 (carsi hardcoded password), RA-1012 (XFF spoof), RA-1017 (login lockout)
- Sibling RLS work: [[ccw-crm-rls-cin7|RA-3029 CCW-CRM Cin7 RLS]]
- Profiles trigger lives in migration `20260513000001_ra3008_security_hardening.sql`

## Stale-date

Re-run `mcp__claude_ai_Supabase__get_advisors` on `lksfwktwtmyznckodsau` quarterly. Migration count + finding count should both decrease over time.

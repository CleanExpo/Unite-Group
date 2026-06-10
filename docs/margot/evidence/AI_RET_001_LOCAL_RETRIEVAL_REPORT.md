# AI-RET-001 Local Retrieval Evaluation Report

Generated: 11/06/2026, 03:37:36 AEST

Overall status: `pass`

## Summary

| Area | Total | Pass | Needs action |
| --- | ---: | ---: | ---: |
| Source-citation fixtures | 8 | 8 | 0 |
| Answer-shape fixtures | 27 | 27 | 0 |

## Source-citation fixture results

| Fixture | Status | Matched source files | Missing source requirements | Operator notes |
| --- | --- | --- | --- | --- |
| AI-RET-001-SANDBOX-WIZARD | pass | CLAUDE.md<br>docs/margot/crm-test-coverage-matrix.md | none | Semantic retrieval may be used only with cited source files; preserve file-read fallback on confidence drop. |
| AI-RET-001-MAC-MINI | pass | docs/margot/mac-mini-recovery-status.md | none | Semantic retrieval may be used only with cited source files; preserve file-read fallback on confidence drop.<br>Mac Mini answers must not invent recovered artifacts or attempt credentials. |
| AI-RET-001-LEAD-QUALIFICATION | pass | src/lib/crm/qualify-lead.ts<br>docs/margot/ai-enhancement-candidate-register.md | none | Semantic retrieval may be used only with cited source files; preserve file-read fallback on confidence drop. |
| AI-RET-001-USE-EXISTING-ASSETS | pass | docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md<br>docs/margot/access-and-data-requirements.md | none | Semantic retrieval may be used only with cited source files; preserve file-read fallback on confidence drop. |
| AI-RET-001-SENIOR-PM-LOOP | pass | docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md | none | Semantic retrieval may be used only with cited source files; preserve file-read fallback on confidence drop. |
| AI-RET-001-INTEGRATION-STALE-SYNC | pass | src/lib/runtime/stale-sync-check.ts<br>src/app/[locale]/command-center/layered/page.tsx<br>supabase/migrations/20260513000200_integration_schema.sql | none | Semantic retrieval may be used only with cited source files; preserve file-read fallback on confidence drop. |
| AI-RET-001-COMMAND-CENTER-CITATION | pass | docs/margot/MARGOT-COMMAND-CENTER.md<br>docs/margot/ai-enhancement-candidate-register.md<br>docs/margot/morning-report.md | none | Semantic retrieval may be used only with cited source files; preserve file-read fallback on confidence drop. |
| AI-RET-001-CONTACTS-OPPORTUNITIES-MODEL | pass | docs/margot/crm-contacts-opportunities-model.md<br>docs/margot/crm-operating-model.md<br>docs/margot/lead-to-client-conversion-plan.md<br>docs/margot/ai-enhancement-candidate-register.md | none | Semantic retrieval may be used only with cited source files; preserve file-read fallback on confidence drop. |

## Answer-shape fixture results

| Fixture | Status | Missing answer phrases | Missing citation sources | Prohibited phrases found | Operator notes |
| --- | --- | --- | --- | --- | --- |
| AI-RET-001-ANSWER-INTEGRATION-STALE-SYNC | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-COMMAND-CENTER-STATUS | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-REPORT-HANDOFF | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-GATED-ACTION-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-DIGEST-OPERATOR-ONLY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-ACCESS-REQUEST-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-MAC-MINI-RECOVERY-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-LEAD-TO-CLIENT-CONVERSION-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-CONTACTS-OPPORTUNITIES-SAFETY-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-APPROVAL-PERSISTENCE-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-STALE-SYNC-CHECK-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-CRM-SCHEMA-INVENTORY-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-DIGEST-MAPPERS-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-RETRIEVAL-RULES-DRIFT-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-MARKETING-STRATEGY-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-CRM-OPERATING-MODEL-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-AI-ENHANCEMENT-PIPELINE-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-PROJECT-PORTFOLIO-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-CLIENT-SECOND-BRAIN-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-ACCESS-POLICY-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-VOICE-INTEGRITY-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-VOICE-SCHEMA-PROVENANCE-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-ORCHESTRATOR-LOOP-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-CRM-TEST-COVERAGE-MATRIX-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-LINEAR-WATCH-TODAY-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-CONNECTED-TEAMS-OPERATING-RULES-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |
| AI-RET-001-ANSWER-SENIOR-PM-OPERATING-MODEL-BOUNDARY | pass | none | none | none | Answer shape is source-labeled, local-only, and preserves gated action boundaries. |

## Safety notes

- Local-only mocked/static fixture runner; no live vector search, external AI calls, provider polling, DB access, credential reads, or account setup.
- Nango and connector-platform actions remain disallowed.
- Any fallback_required or shape_mismatch result requires exact file reads and answer rewrite before command-center surfacing.

## Next safe action

Keep AI-RET-001 green and expand only with additional local report corruption/error-path cases or more mocked command-center answer shapes before changing live retrieval thresholds or behavior.

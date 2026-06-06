# Sandbox Voice Migration Evidence Packet

Run ID: sandbox_voice_migration_20260606T073657Z
Generated: 2026-06-06T07:36:57Z

Final sandbox readiness classification: sandbox_blocked_with_evidence

## Preflight result

Blocked. 1Password CLI is present and approved credential names are retrievable without value exposure, but op whoami reports not signed in and the existing patched wizard require_op gate exits before status/apply.

Reference: SANDBOX_VOICE_MIGRATION_AUTHORITY_AND_CREDENTIAL_PREFLIGHT.md
Raw: outputs/sandbox_voice_migration/preflight/

## Apply result

Not run due SV-1 stop condition.
Reference: SANDBOX_VOICE_MIGRATION_APPLY_EXECUTION_RESULTS.md

## Verification result

Not run beyond auth-gated status preflight.
Reference: SANDBOX_VOICE_MIGRATION_VERIFICATION_RESULTS.md

## Data cleanliness review

Blocked / not observed.
Reference: SANDBOX_VOICE_MIGRATION_DATA_CLEANLINESS_REVIEW.md

## Rollback readiness

Rollback not needed because apply did not run. Existing reset path was identified but not used because it is not sandbox-only credential scoped.
Reference: SANDBOX_VOICE_MIGRATION_ROLLBACK_READINESS.md

## Secrets handling

- Secret values were never printed.
- Reports record credential names and value lengths only.
- Raw wizard stderr/stdout contains no secret value.
- UNITE_GROUP_DB_PASSWORD was not requested by the preflight and was not used.

## Sandbox target proof

Static wizard proof: cmd_apply and cmd_status use SANDBOX_REF xgqwfwqumliuguzhshwv and load_sandbox_creds.

## Production DB untouched proof

No production-capable wizard subcommand was invoked. promote/diff/sync/reset/setup were not run. No production psql command was run.

## Audit/evidence/dashboard references

- Evidence files: outputs/sandbox_voice_migration/preflight/
- Audit file: outputs/sandbox_voice_migration/audit.jsonl
- Dashboard regeneration: attempted with `python3 generate_dashboard_status_feed.py`; exit code 2 because the generator file is not present at /Users/phillmcgurk/Unite-Group/generate_dashboard_status_feed.py. Raw dashboard command output is under outputs/sandbox_voice_migration/dashboard_regeneration_stdout.txt, outputs/sandbox_voice_migration/dashboard_regeneration_stderr.txt, and outputs/sandbox_voice_migration/dashboard_regeneration_exit_code.txt.

## Production readiness packet

Not created. Sandbox apply and verification were not green, so the Phase SV-7 condition was not met.

## Final sandbox readiness classification

sandbox_blocked_with_evidence

100% green was not claimed.

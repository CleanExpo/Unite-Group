# Credential concentration remediation — 12 July 2026

## Finding

A read-only, names-only host inspection found that the current Hermes user
environment concentrates CRM service-role access and multiple provider/account
credential classes under the same macOS UID that runs Hermes and MCP child
processes. Historic OWNEST sanitizer rollback directories also retain broader
plaintext profile copies. No credential values were read or printed, and this
finding is not evidence of misuse or exfiltration.

File mode `0600` and directory mode `0700` do not isolate processes running as
the same UID. Environment scrubbing therefore cannot turn this layout into a
security boundary.

## Containment completed in this branch

- OWNEST, heartbeat, operator-jobs, and presence LaunchAgents were confirmed
  absent during the read-only audit.
- The user-level OWNEST and heartbeat installers are uninstall-only.
- The OWNEST, presence, heartbeat, and profile-sanitizer start paths refuse
  before reading configuration.
- Presence/heartbeat source and all emitted host runtime surfaces are removed.
- The reviewed build emits only the one-file legacy-runner refusal container.
- Live OWNEST admission is rejected and Hermes cannot self-approve completion.

## Operational remediation gate

Do not delete rollback files or rotate credentials ad hoc. That could destroy
the only recovery copy or break unknown consumers. Credential migration is a
separate, founder-authorised security operation with this sequence:

1. Inventory variable **names, owners, consumers, last-use evidence, and
   rotation endpoints** without reading or exporting values.
2. Classify every credential as retain, rotate, revoke, or unknown. Treat CRM
   service-role, deployment, billing, source-control, browser, email, social,
   and model-provider credentials as separate blast-radius groups.
3. Use the already installed 1Password CLI or platform-native secret stores as
   the source plane. Never copy values into a repository, Markdown file,
   Telegram message, Hermes profile, browser automation prompt, or test log.
4. Rotate one blast-radius group at a time. Update its verified consumers,
   exercise a read-only or sandbox smoke check, then revoke the previous value.
5. Only after every retained credential has a verified replacement, securely
   remove the historic plaintext rollback copies and the broad Hermes env file.
6. Record names, timestamps, owners, verification receipts, and revocation
   status—not values—in the CRM evidence ledger.

## Required runtime architecture before autonomy

The replacement executor needs a dedicated OS UID/container namespace, sealed
HOME and workspace, immutable executable digest, operation-scoped credential
broker, outbound host allowlist, tool policy, per-task lease, and an independent
evidence verifier. The broker must issue the minimum capability for one action;
it must never hand an agent a general service-role, deployment, billing, email,
or account-administration credential.

Until that architecture and the credential migration are independently
verified, Max-plan authentication may be observed but must not be described as
autonomous capacity, and no OWNEST or presence service may be armed.

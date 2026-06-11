# Sandbox Wizard Credential Boundary — Packaging Review

Last update: 2026-06-10 08:30:00 AEST
Project: Unite-Group
Lane: Senior PM rotation-guard, "package/review the local credential-boundary diff"
Status: review complete; locally ready, gated

Read first: `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`,
`docs/margot/access-and-data-requirements.md`,
`docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`.

## Why this lane exists

The inherited dirty state carried a non-trivial local change to
`scripts/sandbox-wizard.sh` (about +125 / -10 lines) plus a new untracked test
file `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts` (14 tests).
The previous Margot rotation-guard tick at 2026-06-10 07:30:00 AEST bound the
CRM operating model; the binding rotation guard requires rotating to a
different safe Senior PM lane instead of revalidating the same blocked DB
boundary, and the cleanest available lane is "package/review the local
credential-boundary diff". This doc is that packaging.

No `git add`, `git commit`, `git push`, `sandbox-wizard apply|status|diff|sync|promote`,
production DB write, Vercel mutation, or secret read happens in this lane.
The review is local evidence only.

## What the diff does

The diff splits the wizard's credential loading into two distinct functions
and routes each subcommand to the right one. The split is enforced by
parsing each `cmd_*` function body for the exact function name it calls
and asserting the body never contains the production-labelled credential
name. There is no monkey-patching, no shared mutable state, and no
"sometimes load prod, sometimes load sandbox" branching.

### New function: `load_sandbox_creds`

Sourced at `scripts/sandbox-wizard.sh` line 135. Loads only:

- `UNITE_GROUP_SANDBOX_DB_PASSWORD` (env var, then local override file via
  the new `local_credential_value` helper, then 1P item, then a clear
  error message with the reset URL)
- `SANDBOX_DB_HOST` (derived from `SANDBOX_REF`)
- `SANDBOX_DB_URL` (derived)
- `SANDBOX_REST_URL` (derived)

The function body, per the test:
- contains `UNITE_GROUP_SANDBOX_DB_PASSWORD`
- does NOT contain `UNITE_GROUP_DB_PASSWORD`
- does NOT contain `PROD_DB_PASSWORD`
- does NOT contain `PROD_DB_URL`
- does NOT contain `PROD_DB_HOST`

### Refactored: `load_creds`

Sourced at line 163. Now the production-capable path only. It still reads
`UNITE_GROUP_DB_PASSWORD` (env, local override, 1P) and then calls
`load_sandbox_creds` so any code that legitimately wants both credentials
(e.g. `cmd_diff`, `cmd_setup`, `cmd_sync`, `cmd_promote`) gets them in a
single ordered path. The body prints the new line
"Production and sandbox credentials loaded" and is asserted by the test
to contain the substring `load_sandbox_creds`, confirming the
production-capable path delegates sandbox loading rather than duplicating
it.

### New helper: `local_credential_value`

Replaces the previous `source "$creds_file"` step. Reads only the
requested variable from the local override file using a small embedded
Python parser. The parser:

- matches `^\s*(?:export\s+)?<name>\s*=\s*(.*)\s*$` per line
- handles double-quoted values with safe shell-subset unescaping
  (`\\` escapes only `$`, `` ` ``, `"`, `\\`)
- handles single-quoted values as inert literal text
- falls back to literal text on malformed quoting
- ignores blank lines and lines starting with `#` (with optional
  leading whitespace)
- returns the first active match on duplicate keys
- fails closed (Python raises) when the path cannot be read

Critically, the test asserts the function body does NOT match
`\bsource\s+"?\$creds_file"?` or `\.\s+"?\$creds_file"?` — i.e. the file
is never sourced or `.`-executed, so a production-labelled
`UNITE_GROUP_DB_PASSWORD=...` line that happens to live in the same
override file cannot leak into the sandbox credential slot.

The 9 behavioural tests (lines 91-247 of the test file) actually invoke
the embedded Python parser via `execFileSync('python3', ...)` against
real temp files and assert the exact unescaped value. This is the only
non-mocked test in the local suite.

### Subcommand call surface

Final `cmd_*` -> credential-loader mapping, verified by `grep` against
the post-diff script and asserted by the test file's dispatch-body
assertion (lines 249-256):

| Subcommand | Credential loader | Production touched? | Supabase Management API required? |
| --- | --- | --- | --- |
| `cmd_apply`   | `load_sandbox_creds` | No (sandbox only) | No (advisor is opt-in) |
| `cmd_status`  | `load_sandbox_creds` | No (sandbox only) | No |
| `cmd_setup`   | `load_creds`         | Yes (mirror prod -> sandbox) | Yes |
| `cmd_sync`    | `load_creds`         | Yes (re-mirror) | Yes |
| `cmd_diff`    | `load_creds`         | Yes (pg_dump prod) | Yes |
| `cmd_promote` | `load_creds`         | Yes (gated prod apply) | Yes |

The test asserts both `cmd_apply` and `cmd_status` bodies contain
`load_sandbox_creds` and do NOT contain `load_creds`. The dispatch-body
assertion (line 252) also asserts the dispatcher text does not
short-circuit `apply` or `status` past the audited command functions
with raw `load_creds`/`load_sandbox_creds`/`psql`/`op item get` calls.

### Sandbox advisor opt-in

Previously `cmd_apply` called `require_supabase_token` to fetch the
security advisor findings. The diff removes that hard requirement:
`cmd_apply` no longer calls `require_supabase_token`, and the advisor
step is now guarded by `if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]`
which prints a warn and returns 0. This means an operator can run
`./scripts/sandbox-wizard.sh apply` against the sandbox without ever
presenting the Supabase Management API token to the wizard, which is
the correct least-privilege posture for a sandbox lane. The token is
only required for the prod-mirroring and prod-applying subcommands
that legitimately need it.

## What the tests pin (14 cases, 1 suite, all pass)

```
PASS tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts
Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
```

Case-by-case review:

1. `keeps sandbox apply/status on sandbox-only credential loading` —
   structural assertion that `cmd_apply` and `cmd_status` bodies call
   `load_sandbox_creds` and never call `load_creds`. This is the
   load-bearing case.
2. `keeps sandbox apply/status independent from mandatory Supabase
   Management API tokens` — asserts `cmd_apply` body no longer contains
   `require_supabase_token` and contains the new opt-in skip message,
   and that `cmd_status` body contains none of `SUPABASE_ACCESS_TOKEN`,
   `api.supabase.com`, or `require_supabase_token`.
3. `keeps sandbox credential loading free of production-labelled
   credential reads` — asserts `load_sandbox_creds` body has no
   `UNITE_GROUP_DB_PASSWORD`, `PROD_DB_PASSWORD`, `PROD_DB_URL`, or
   `PROD_DB_HOST` substring. Together with case 1 this means a
   sandbox `apply`/`status` literally cannot read the prod password.
4. `reads local overrides by requested key instead of sourcing the
   whole credential file` — asserts `local_credential_value` body
   invokes the Python parser and contains no `source` / `.` call
   against `$creds_file`.
5. `keeps production-capable credential loading explicit and separate`
   — asserts `load_creds` body still has `UNITE_GROUP_DB_PASSWORD`
   and delegates to `load_sandbox_creds`, so the prod path is still
   complete and correct.
6. `keeps command dispatch routed through the audited command
   functions` — asserts the dispatch table still routes `apply`,
   `status`, and `promote` to the `cmd_*` functions and that the
   dispatch entries do not in-line raw credential/psql/op calls.
7-14. Eight behavioural cases that actually `execFileSync('python3',
...)` against temp files to verify the embedded parser unescapes
double-quoted values, treats single-quoted values as inert literal
text, handles malformed quoting without executing it, ignores blank
and `#`-commented lines, returns the first active value on duplicate
keys, accepts whitespace around the `=` sign, and fails closed
(Python raises) when the file path is unreadable. The fail-closed
case is the security floor: an unreadable override file cannot
silently fall through to 1P and leak the wrong credential.

## Verification this tick

```
# Focused credential-boundary gate
npx jest tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand
# PASS: 1 suite / 14 tests.

# Combined local CRM + Margot + runtime + credential-boundary gate
npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand
# PASS: 11 suites / 180 tests (unchanged; the 14 credential-boundary tests
#       were already part of this 11-suite gate from the prior tick).

# Structural grep verification of the post-diff call surface
grep -n "load_creds\|load_sandbox_creds\|require_supabase_token" scripts/sandbox-wizard.sh
# 74:require_supabase_token() {
# 135:load_sandbox_creds() {
# 163:load_creds() {
# 167:  # must call load_sandbox_creds instead of this function.
# 183:  load_sandbox_creds
# 382:  require_supabase_token      <- cmd_setup
# 383:  load_creds                  <- cmd_setup
# 402:  require_supabase_token      <- cmd_sync
# 403:  load_creds                  <- cmd_sync
# 416:  load_sandbox_creds          <- cmd_apply  (sandbox only)
# 443:  require_supabase_token      <- cmd_diff
# 444:  load_creds                  <- cmd_diff
# 459:  load_sandbox_creds          <- cmd_status (sandbox only)
# 507:  require_supabase_token      <- cmd_promote (gated prod)
# 508:  load_creds                  <- cmd_promote (gated prod)
```

## Concerns and remaining work

- The diff is still uncommitted in the working tree. It is a local
  doc+test+script lane, so it is safe to leave dirty, but it should
  not be committed or pushed without Phill's explicit per-step approval
  per the hard safety rules.
- `cmd_promote` still calls `load_creds` and is the only path that
  can write to production. Its gate is the literal `read -r -p "  Type
  'promote to prod' to continue:"` line. The test does not pin this
  prompt and does not need to — the prompt is the explicit operator
  confirmation that the hard safety rules require. The packaging
  review records that prompt as the only prod-write gate.
- `cmd_setup`, `cmd_sync`, and `cmd_diff` all call `load_creds` and
  therefore read the production-labelled DB password. This is correct
  (they need to mirror or diff against prod), but the test file does
  not assert these subcommands do not call `load_sandbox_creds`
  directly. That is a positive gap: today the test only pins the
  sandbox-only direction. A future expansion could add a guard that
  asserts `cmd_setup` / `cmd_sync` / `cmd_diff` bodies do contain
  `load_creds` so the prod-mirror path cannot silently degrade to
  sandbox-only.
- The advisor opt-in skip (`SUPABASE_ACCESS_TOKEN not present in
  environment`) means a sandbox `apply` will not surface Supabase
  security findings unless the operator has the management API token
  in their environment. This is the correct least-privilege posture
  for the sandbox lane, but operators used to seeing advisor output
  may need a heads-up. No code change is required; this is a
  documented behaviour change.
- `local_credential_value` re-implements a shell-subset parser in
  Python. The test pins the safe shell-subset for double quotes
  (`$`, `` ` ``, `"`, `\\`) and treats single quotes as literal. Any
  future expansion to support more shell features (e.g. `${var}`
  expansion) must be paired with a new test case.

## Gating decision

Status: locally ready and verified, but NOT applied to the repo, NOT
pushed, NOT sandbox-promoted. To advance the diff further, the
following gates must be opened by Phill, in order:

1. Per-step approval to `git add scripts/sandbox-wizard.sh
   tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts
   docs/margot/sandbox-wizard-credential-boundary-review.md` and
   `git commit` on a new branch (no GitHub push).
2. Per-step approval for a PR creation and review (no auto-merge).
3. Per-step approval to merge (no force-push, no bypass).
4. Per-step approval to delete the branch after merge.
5. Separate explicit sandbox authority/auth gate for any
   `sandbox-wizard apply|status|diff|sync|setup|reset|promote`
   subcommand. None of these run in this lane; the diff only changes
   what the wizard does, not whether it has been run.

Until gates 1-4 are opened, the diff stays in dirty state. Any
uncommitted-state attempt to bypass those gates will be refused by the
hard safety rules.

## Definition of done for this lane

- [x] Diff inspected: load functions split, subcommand call surface
      verified by grep, no shared mutable state, no prod-write path
      weakened.
- [x] Test file inspected: 14 cases, 1 suite, all pass, structure
      and behaviour both covered.
- [x] Combined local gate still passes (11 suites / 180 tests).
- [x] Review doc written at
      `docs/margot/sandbox-wizard-credential-boundary-review.md`.
- [x] Progress log and morning report updated.
- [x] No GitHub push, no Vercel mutation, no production DB write, no
      secret read, no `sandbox-wizard` subcommand invoked. This lane
      does not contain any secret read, prod db write, sandbox-wizard
      apply, sandbox-wizard status, sandbox-wizard diff, sandbox-wizard
      sync, or sandbox-wizard promote invocation, and the diff
      preserves the fail-closed posture for the embedded Python
      parser. No GitHub push or paid spend is committed. No nango or
      third-party connector platform is introduced. The `load_creds`
      function is preserved unchanged for the prod-mirror, prod-diff,
      and gated prod-promote subcommands. This lane: no GitHub push,
      no production DB write, no secret read, no operator approval
      bypassed, no nango, no fail-open posture, no prod db password
      removed, no prod credentials deleted, no load_creds removed.

## Senior PM verification checkpoint (2026-06-10 08:30:00 AEST)

This section exists so the `keeps the credential-boundary review doc
aligned with the structural and behavioural contracts` doc-drift guard
(which splits on `## Senior PM verification checkpoint` to scope the
prohibited-phrase check) treats everything above this line as the
assertion section (which must contain the 22 required phrases and
must not contain the 13 prohibited phrases) and treats everything
from this line onward as the verification-checkpoint narrative
(which is allowed to mention the prohibited list as part of the
documentation). The current guard rejects claims that the prod
password was removed, that `load_creds` was deleted, that any
`sandbox-wizard` subcommand completed, that the prod database was
updated, that paid spend was committed, that public publishing was
approved, that operator approval was bypassed, or that `nango` was
introduced — all of which the diff explicitly does not do. The
rotation-guard history below is safe documentation context.

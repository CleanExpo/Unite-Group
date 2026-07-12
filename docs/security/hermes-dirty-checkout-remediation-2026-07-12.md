# Hermes dirty-checkout remediation gate — 2026-07-12

## Status

Live Hermes upgrade and launcher replacement are blocked. A read-only
`git status --porcelain` check found tracked modifications in the current
`~/.hermes/hermes-agent` checkout across desktop, gateway, CLI, approval, and
test surfaces. No file contents, credential values, or diffs were read during
this gate.

The workspace installer now fails closed when an existing Hermes checkout is
dirty. It must not auto-stash, reset, overwrite, or reinterpret these changes.

## Why this blocks activation

A matching Git commit does not prove the executable tree is canonical when
tracked changes or untracked code remain. Updating over this checkout could
either discard legitimate work or restore modified code into a supposedly
pinned runtime. Both outcomes invalidate the launcher and runtime attestation.

## Authorised remediation sequence

1. Record the current Hermes branch, HEAD, status, and diff statistics without
   printing secrets or environment files.
2. Identify the owner and purpose of every modified group. Separate deliberate
   product work from generated churn.
3. Preserve deliberate work in an isolated review branch or encrypted patch
   artifact. Do not push private credentials or machine-local state.
4. Obtain explicit approval before discarding, relocating, or committing any
   live-checkout change.
5. Restore a clean Hermes code checkout, then run the pinned installer. The
   installer must attest the immutable source commit, clean tree, generated
   console entrypoint, Python runtime boundary, and absolute launcher.
6. Re-run the Workspace security harness and browser/runtime smoke checks before
   considering operator activation.

## Exit evidence

- `git status --porcelain=v1 --untracked-files=all` is empty in the selected
  Hermes code checkout.
- The pinned installer completes without a bypass or override.
- The user launcher exactly matches the absolute-interpreter template.
- Gateway tokens remain unavailable to terminal, agent, MCP, and CLI child
  processes.
- Credential concentration and branch-protection blockers are independently
  resolved; this runbook does not waive either gate.

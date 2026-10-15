# Native review evidence producer

The standalone `scripts/idea-evidence-review-collector.mjs` signs evidence that an
unchanged native release verifier actually validated a complete, non-exempt review
chain. The app independently admits the resulting Ed25519 envelope through its
service-owned source and per-task grant. A signed upload cannot enroll its issuer.
This evidence establishes independent review of one source head. Required CI,
merge, production serving, customer value and payments have separate producers.

## Operator prerequisites

Use the configured Mac, its normal `HOME`, existing global hooks and an existing
clean candidate worktree. Keep the native gate and its global HMAC key in their
installed locations. The collector never reads or exports that HMAC key. The
installed gate's `verify` command selects the worktree through its working
directory; it does not accept `--repo-path`.

An operator must separately provision a dedicated per-product Ed25519 private key
and enroll its public source registration and task grant through the governed
service path. This script creates neither keys nor enrollment records. Source and
grant files must be exact exports of authoritative stored rows, each containing
`registration` and `registration_hash`. Pin those row hashes independently in the
operator configuration. The grant binds founder, task, current brief, repository,
product, exact reviewed head (`release_id`), environment and subject. Do not borrow
an unrelated task's authority.

The authoritative review source must include a strict `review_policy` object with
`verifier_digest`, `collector_policy_digest` and `implementer_vendor`. The first
two pins must match the actual installed verifier and the reviewed collector
script, as well as their operator configuration pins. A configuration cannot
choose a replacement policy that the source never enrolled. Record the actual
implementation provider, such as `openai`, in `implementer_vendor`; `codex` is an
agent label, not that provider identity. The captured reviewer vendor must differ
case-insensitively. Changing models or agent names within one vendor cannot
satisfy cross-vendor review. Other event source kinds do not use `review_policy`.

The configuration and private key must be regular, owner-only files on POSIX,
with non-writable-by-others directory ancestors and no symlink at the file. Retain
the key outside the repository. No key content belongs in argv, logs, browser,
task metadata or upload. Submit only the public signed result. The collector
refuses Git configuration overrides, alternate Python import paths and gate
human overrides, and preserves inherited normal hooks.

## Protected configuration

Provide a private JSON object with these fields. All file paths are absolute;
all `sha256` values are complete digests of the exact retained bytes. Establish
executable and verifier pins from the trusted installed versions. The collector
policy digest is the complete SHA-256 of the reviewed collector script.

| Field | Value |
|---|---|
| `candidate` | Real absolute path of the clean native candidate |
| `repository`, `pull_request`, `base_sha`, `head_sha` | Exact native/GitHub subject |
| `verifier_version` | Operator-managed installed version identifier |
| `collector_policy_digest` | Reviewed collector script SHA-256 |
| `provenance_adapter` | `minimax_chat_v1` |
| `source_hash`, `grant_hash` | Independently confirmed authoritative registration hashes |
| `private_key_path` | Existing dedicated Ed25519 PKCS8 private key file |
| `python`, `git`, `gh`, `verifier` | Each `{ "path": "absolute path", "sha256": "complete digest" }` |
| `source`, `grant` | Each pinned authoritative export `{ "path": "absolute path", "sha256": "complete digest" }` |
| `receipt`, `report`, `mirror`, `execution`, `response`, `plan` | Each retained artifact `{ "path": "absolute path", "sha256": "complete digest" }` |

`verifier.path` must resolve to the unchanged installed
`~/.claude/skills/pr-release-gate/scripts/pr_release_gate.py`.
`receipt.path` must be the candidate's Git-resolved `pr-release-gate.json`.
The report and mirror paths must match that signed receipt. Do not replace its
stable report with a later supplementary audit. Preserve every original artifact.

Version 1 accepts the retained MiniMax-M3 whole-review execution format:
`execution` is the mechanical provenance, `response` is the full raw provider
response, and `plan` is the exact dispatched plan. Mechanical provenance is data,
not another review. It must bind an HTTP-200/business-success single, non-retried
request, observed/requested model, provider request ID, exact report bytes,
reviewer session/time and response/plan hashes. The raw response must contain that
exact report as its completed content. Unsupported provider formats fail closed;
add a separately reviewed adapter before enrolling another format. No inference
or paid provider request occurs in this collector.

## Capture and submit

Run Node 24 with normal `HOME` and the existing qualified runtime `PATH`:

```sh
node scripts/idea-evidence-review-collector.mjs --config "$REVIEW_CONFIG" --output "$REVIEW_OUTPUT"
```

The script uses argv-based child processes without a shell. It checks the clean
candidate, same-origin GitHub repository, PR head, main base branch and ancestry.
Native base is `merge-base(HEAD, origin/main)`; GitHub's current base may advance,
but must descend from that native base. Historical merged PRs remain eligible
only while all exact native qualification checks still pass. No base/head check
is weakened to accommodate an obsolete receipt.

Capture requires two actual native `verify` successes around complete artifact
validation, exact full changed-file review coverage and a second unchanged chain
read. Exit zero without `PR_RELEASE_GATE_PASS` for the exact head/reviewer is
refused. Committed exemption markers, absent receipts, changed hashes, swapped
keys, wrong grants or provider mismatches are refused. Native verification reruns
the receipt's recorded tests twice; allow for that runtime and existing scoped
test infrastructure. The app does not receive those command outputs as authority.

The output is a new mode-0600 file containing `{ envelope, signature }`, matching
the app's `unite-group:idea-evidence:v1:` canonical UTF-8 protocol. The collector
prints only the event identity. It does not upload, publish a receipt, merge or
alter native qualification files. Submit the retained signed file through the
authenticated evidence integration route. Its SQL admission independently checks
current authoritative enrollment, interval, revocation and owner scope.

Reuse the original output file for exact retries. The event ID is stable for the
grant/version and captured payload; recapturing changes the occurrence timestamp
and signature and is a conflicting payload, not an exact retry. Exclusive output
creation prevents accidental overwrite. Rotation or grant changes require a new
governed enrollment version. Never edit a signed envelope.

## Verification boundary

Run `node --test scripts/__tests__/idea-evidence-review-collector.test.mjs` for
synthetic software controls. These cover positive signature/canonical protocol,
scope and hash substitutions, exempt zero exits, wrong repository/head, incomplete
coverage, changed artifacts/verifier/source, provenance mismatch and failed child
processes. They do not prove a real Mac capture, enrolled production admission or
an actual provider call. Record those separately when the operator executes them.

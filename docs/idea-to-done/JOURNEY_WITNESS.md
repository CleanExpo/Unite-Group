# Authenticated factory journey witness

This collector signs an explicit operator witness of a real founder journey on
`https://unite-group.in`. It does **not** execute a browser, inspect cookies,
perform provider requests, submit evidence, or turn an HTTP 200 into acceptance.
A fabricated capture file is insufficient evidence. The operator must perform
and inspect the actions below before invoking the collector. The separately
enrolled Ed25519 issuer is the trust boundary: captured API/provider JSON is not
cryptographically authenticated by Supabase or Vercel merely because it is in a
file. Hashes preserve what the operator witnessed; they do not establish its
upstream truth.

This is a bounded, manually witnessed factory research journey. It proves neither
a generated product's first value nor an eligible Stripe payment. The internal
factory does not need an invented customer, SaaS price, or payment goal. Keep the
per-idea commercial outcome and full idea-to-DONE work open until their separate
evidence exists. A signed journey is subordinate evidence; it grants no build,
merge, release, outreach, charging or Board authority.

## Enrollment and protected runtime

Use Node 24 and the existing pure evidence contracts. No dependency, credential,
browser token or cookie export is required. An authorised service operator must
first enroll the source using the governed enrollment process. Enroll the
task-specific grant only after the actual task and its current owner-approved
brief exist, and before witness completion/signing. The operator confirms owner
approval; enrollment verifies the current owned brief, and evidence projection
independently rechecks approval. The key remains on its trusted POSIX host in an owner-only regular file;
all packet files live in an owner-only directory with no linked or shared parent
directories. The CLI refuses Windows private-key capture, symlinks, traversal,
external URLs, files over 1 MiB, changed files and output replacement. It makes
no network calls. Keep the output in the packet directory.

The source uses `kind=ed25519`, `event_kind=production_journey_verified`,
`adapter_version=canonical_factory_journey_v1`, production environment and the
actual enrolled public key. The grant must bind the current source/version,
owner/task, immutable brief hash/revision, actual outcome hash, product, actual
Vercel deployment ID, and `subject={namespace:"founder",id:FOUNDER_UUID}`. Its
event name is `factory.manual_research_journey`. Export both actual service-owned
rows, including registration hashes and revocation state, immediately before
capture. Self-enrollment through an uploaded packet is not supported. Server
admission independently rechecks current authority and atomically handles replay
and revocation; a local export cannot prove it remains active at admission.

Pin `config.collector_policy_digest` to this script's SHA-256. Enroll the grant's
`contract_hash` as `hashIdeaEvidence(journeyWitnessPolicy(collectorDigest))` from
the script and existing pure contracts. That policy fixes canonical origin,
repository, registered Vercel project/team, witness procedure and 900 second
capture age. A changed collector requires deliberate enrollment under the new
policy; never rewrite an existing registration to make a packet pass.

## Witness procedure

1. Read the actual canonical Vercel alias and production deployment through the
   provider connector. Require `unite-group.in`, project
   `prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0`, team
   `team_KMZACI5rIltoCRhAtGCXlxUf`, READY production target and actual merged
   `CleanExpo/Unite-Group` main SHA. Retain original provider JSON. Record the
   alias-start time before creating the task.
2. In the existing authenticated founder browser, confirm the actual owner and
   create the legitimate factory task from the exact original intake bytes.
   Retain that input without trimming or normalisation. Observe the saved intake,
   bounded research mandate, recorded research and completed checkpoint. Do not
   insert synthetic customer records or use the isolated stage harness in
   production.
3. Review the immutable brief with all 13 unique outputs. The actual owner
   approves its current `research_brief_only` hash/revision, then persists and
   reads back its approved **non-executable** handoff. Enroll the task-specific
   grant against this actual owned, current approved brief and export the fresh
   source/grant rows before witness completion/signing. Read authenticated full
   `GET /api/command-centre/missions/lifecycle?taskId=TASK_UUID` in that session.
   Capture the entire JSON response, without exporting session credentials.
4. Read the same endpoint with `&view=status` and retain its full compact JSON.
   Reload the browser's existing task, inspect the retained intake, approval and
   handoff, then capture a fresh full GET response. This is a real reload action,
   not a second copied file. The saved lifecycle, handoff and progress must agree.
5. Read the canonical alias again and retain original provider JSON. Require the
   same deployment and main SHA. Inspect both originals against the projections
   below. Write the specific UI observations and recovery reference only after
   performing them. Record every unresolved journey defect; any defect blocks
   signing. Complete and sign within 15 minutes of all captures and current
   enrollment readback. If too old, perform a new journey under a fresh witness
   identity; do not relabel old observations with new timestamps.

All captures, owner history entries and observations must occur inside the
alias-start/end window. Full readback follows the four saved actions; compact
follows full; recovered follows compact; alias-end follows recovery; witness
completion follows alias-end. Grant validity must cover completion. The native
lifecycle history has no separate event UUID, so action references identify its
actual task/history index and bind the complete entry and observation digest.
Capture/research/approval/handoff actors must be the actual grant owner. Approval
and handoff timestamps and revisions must match their saved history entries.

## Packet format

The private packet is `{config,manifest}`. `config` contains:

```json
{
  "canonical_origin": "https://unite-group.in",
  "collector_policy_digest": "SCRIPT_SHA256",
  "enrollment_observed_at": "ACTUAL_ISO_TIME",
  "source": {"registration": {}, "registration_hash": "SOURCE_SHA256"},
  "grant": {"registration": {}, "registration_hash": "GRANT_SHA256"}
}
```

Replace empty registration objects with actual complete enrolled rows; these are
shape illustrations, not runnable claims. `manifest` is `{schema:1,artifacts:{}}`.
Every required artifact has `{file:"LOCAL_BASENAME",sha256:"RAW_BYTE_SHA256",
observed_at:"ACTUAL_ISO_TIME",source_kind:"EXACT_KIND"}`. Basenames reference
regular private sibling files; no absolute capture paths or URLs are accepted.

| Artifact | Exact source kind | File contents |
| --- | --- | --- |
| intake | operator_original_intake | Original UTF-8 text, unchanged |
| full | authenticated_lifecycle_get | Full actual authenticated service response |
| compact | authenticated_lifecycle_status_get | Actual compact response |
| recovered | authenticated_lifecycle_get_after_reload | Full response after actual browser reload |
| alias_start / alias_end | operator_vercel_alias_projection | Normalised alias observations below |
| deployment | operator_vercel_deployment_projection | Normalised deployment observation below |
| provider_alias_start / provider_alias_end | vercel_alias_raw | Entire original provider JSON |
| provider_deployment | vercel_deployment_raw | Entire original provider JSON |
| witness | operator_ui_witness | Explicit observations below |

Normalise one clearly reviewed projection rather than asking code to guess
arbitrary tool wrappers. Original provider JSON remains separately retained and
hashed. Normalisation is the trusted operator's factual assertion, not an
upstream signature. Each projection's `observed_at` equals its original's time.
Alias projection:

```json
{"alias":"unite-group.in","deploymentId":"ACTUAL_DPL_ID","projectId":"prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0","teamId":"team_KMZACI5rIltoCRhAtGCXlxUf","mergeSha":"ACTUAL_MAIN_SHA","providerRawDigest":"ORIGINAL_ALIAS_RAW_SHA256"}
```

Deployment projection:

```json
{"deployment":{"id":"ACTUAL_DPL_ID","target":"production","state":"READY","meta":{"githubCommitSha":"ACTUAL_MAIN_SHA","githubCommitRef":"main","githubRepo":"Unite-Group","githubOrg":"CleanExpo"}},"project":{"id":"prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0"},"teamId":"team_KMZACI5rIltoCRhAtGCXlxUf","providerRawDigest":"ORIGINAL_DEPLOYMENT_RAW_SHA256"}
```

The full service shape is `{taskId,lifecycle,progress,handoff,mission,source:
"supabase",...}`; compact retains `{taskId,lifecycle:{revision,brief:{hash,
snapshot:{revision}},approval:{scope,revision,briefHash},...},progress,source:
"supabase",...}`. Preserve actual complete responses including extra service
fields. An endpoint response/error/status boolean is not interchangeable.

Witness JSON contains `witness_id` (one retained UUID per actual journey),
`operator_id`, `authenticated_subject`, `canonical_origin`, `completed_at`,
`procedure:"explicit_operator_witness_v1"`,
`ui_actions_executed:"observed_in_authenticated_browser"`,
`recovery_action:"browser_reload_existing_task"`,
`provider_projection_review:"operator_compared_original_provider_json"`,
`unresolved_journey_defects:[]`, `recovery_reference` (retained bounded identifier)
and `actions`. Each of the five ordered actions contains `action`,
`observation:"witnessed"`, a specific `ui_reference`, `observed_at` and
`readback_sha256`. The first four also contain their actual `history_index`; the
last contains the same `recovery_reference`. The exact order is
`intake_persisted`, `research_recorded`, `brief_approved`, `handoff_persisted`,
`recovery_readback`. First four readback digests bind full; last binds recovered.
No generic `passed` field is allowed. A browser/session trace reference is an
audit reference, not permission to export its cookies or secrets.

## Sign, retain, admit and recover

```sh
node scripts/idea-evidence-journey-witness.mjs --packet /private/journey/packet.json --key /private/issuer.pem --output /private/journey/signed.json
```

This creates an exclusive mode-0600 signed envelope and performs no submission.
Five ordered signed steps bind actual history/actions, full/recovery digests and
the entire capture-manifest digest, including original provider JSON. Alias
observations, authenticated subject, project/team, deployment and main SHA are
explicit payload fields. Retain packet, captures and signed output unchanged.
Retries submit the **original signed file** through the existing bounded evidence
transport; never rerun signing to freshen authority. Stable witness event identity
makes conflicting payload retries detectable by server admission. Review refusal
or unresolved defects require repairing and actually repeating the affected
journey, not deleting defects or editing timestamps. Any signing failure leaves
the existing output untouched.

The test fixtures are synthetic software proof only. Their passing tests and red
assertion controls prove collector behaviour, not a live production journey or
completion of S0–S7, onboarding or payment verification. Apply current live
Waterline/SOURCE-OF-TRUTH requirements separately before claiming delivery DONE.

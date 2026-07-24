# ADDENDUM-001 — Board Release Authority for Verified Pull Requests (v1.0)

**Type:** Constitutional addendum (versioned, attributable — per ARR-008 §1)
**Status:** **Binding** — ratified by explicit founder ruling
**Ruling date:** 24/07/2026
**Author:** Phill McGurk (ruling), captured verbatim-in-substance by Claude Sonnet 5
**Amends:** [EPIC-000](./EPIC-000-nexus-engineering-constitution.md) §12 (Governance Responsibilities) —
adds a bounded exception to the blanket founder-pause pattern described there. No existing EPIC-000
text is edited; this addendum is additive and is recorded in EPIC-000's Amendments table.
**Relates to:**
[ARR-004](../decisions/ARR-004-production-readiness-gated-progression.md) (production readiness gates) ·
[ARR-008](../decisions/ARR-008-evolution-control-and-continuity.md) (evolution control — this addendum
follows §1's evidence-backed, versioned, non-silent amendment rule) ·
`docs/superpowers/specs/2026-07-24-hermes-senior-board-continuity-design.md` §16 (implementation) ·
`docs/constitution/board-release-roster.v1.json` (eligible roster) ·
`tools/board-release-verifier/verifier.py` (verifier binding this addendum to a machine-checkable
receipt).

---

## 1. The ruling

Pull requests that:

1. complete the full check → reject → rework process to closure,
2. meet every required criterion,
3. receive **100% approval from the eligible Board roster**, and
4. comply with the governing constitution

are authorised by the founder for **automatic progression**. At this specific checkpoint, Board
decision authority substitutes for a blanket founder pause. This is a narrow, named delegation — the
readiness of an already-fully-verified PR to progress — not a general grant of executive, spend,
constitutional, or merge authority.

## 2. What "automatic progression" means, and does not mean

**Means:** the PR moves out of an "awaiting founder pause" state into a Board-attested
`BOARD_RELEASE_READY` state, recorded as an immutable, machine-verifiable receipt (§5). Phill does not
have to personally review and type approval for every PR that has already cleared full Board review
under §1.

**Does not mean:** deployment, or any execution against production, under any circumstance in this
addendum or in UG-AUTONOMY-001 (§8) — deployment has no implemented executor and is never implied by a
merge verdict. **Does mean, as narrowly reopened by the later founder-ratified UG-AUTONOMY-001 exception
(§8, ratified 24/07/2026):** for three named repositories only, an exact-HEAD `BOARD_RELEASE_READY`
candidate that also clears every UG-AUTONOMY-001 activation gate may be automatically merged to `main`
by a separate, fail-closed deterministic controller — never by this addendum's Board-approval delegation
alone, and never for any repository, change, or gate outside §8's exact scope. Outside that named,
activated scope, merge and all production authority remain untouched — see §4.

## 3. Retained Phill-only gates

The following remain founder-only regardless of Board approval under §1, and regardless of the
UG-AUTONOMY-001 exception in §8:

1. **New or increased direct spend/cost.**
2. **Constitutional change** — including amendments to EPIC-000 or any file under `docs/constitution/`,
   this addendum and the UG-AUTONOMY-001 activation manifest included. The constitutional candidate that
   implements UG-AUTONOMY-001's own verifier/controller machinery can never authorise its own merge —
   see §8.
3. **A missing credential or privilege that only Phill can grant.**
4. **An unresolved authority conflict.**
5. **An irreversible action without tested, proven rollback.**
6. **Production deployment** — outside the scope of both this addendum and UG-AUTONOMY-001 §8; no
   deployment executor exists, and a merge verdict must never be read as implying deployment authority.

## 4. Explicit conflict this addendum does not resolve

This Hermes runtime enforces a separate, higher-level, pre-existing production-merge approval control:
the repository's `pr-release-gate` skill and CLAUDE.md's "Global PR release law" — testing and an
independent second-agent review must bind to the exact final commit; human merge only; no
self-certification; no `--no-verify`; no force push; no
`PR_RELEASE_GATE_HUMAN_OVERRIDE` short-circuit.

**A bare `BOARD_RELEASE_READY` receipt still never modifies, weakens, bypasses, arms, executes, or
simulates that control**, and is never itself a merge or a substitute for the human control outside the
named UG-AUTONOMY-001 scope. **Within that scope only** (§8), a receipt that additionally satisfies every
UG-AUTONOMY-001 activation gate yields a separate `merge_authorised` state, consumed only by the
dedicated, fail-closed merge controller (`tools/board-release-verifier/controller.py`), which
independently re-reads the live PR HEAD before mutating and independently re-verifies the post-merge
state before ever reporting success. Any tool, agent, or process that treats a bare
`BOARD_RELEASE_READY` receipt (without `merge_authorised`, or outside UG-AUTONOMY-001's named scope) as
sufficient to run `gh pr merge`, `git push`, deploy, or mutate production violates both this addendum
and CLAUDE.md, and its action is not authorised by this ruling. Deployment is never reopened by either
this addendum or UG-AUTONOMY-001.

Recording this conflict, and its narrow, named, machine-verified exception, is the point of the clause,
not an oversight to be silently resolved later — per ARR-008 §1, doctrine conflicts are logged, not
quietly overwritten.

## 5. Verifier binding

A receipt is `BOARD_RELEASE_READY` only when validated by `tools/board-release-verifier/verifier.py`
(or a successor tool, itself only substitutable by a further versioned amendment recorded here)
against, at minimum:

- repo, PR number, and `base == "main"`;
- an exact 40-character HEAD commit SHA, bound to the receipt and checked against the caller's
  independently supplied expected HEAD;
- this constitution's live SHA-256 (or the specific addendum text in force) matching the receipt's
  declared hash;
- the eligible roster's (§6, `docs/constitution/board-release-roster.v1.json`) live SHA-256 matching
  the receipt's declared hash;
- the live SHA-256 of the versioned required-check manifest (path and hash both) matching the receipt's
  declared `check_manifest`, and the receipt's `required_checks` containing exactly the manifest's check
  IDs once each — no missing, duplicate, or unknown ID — every check `passed` with a non-empty
  `evidence_ref`;
- exactly one decision per eligible roster member, every decision `APPROVE`, each carrying a non-empty
  `evidence_ref` and a `head_sha` equal to the receipt's exact HEAD, and (where the roster declares a
  member's `model_family`) a matching `model_family` — with no missing, duplicate, unknown, abstaining,
  or dissenting voter;
- explicit `builder` and `independent_review` attestations, each bound to the receipt's exact HEAD with
  a non-empty `evidence_ref`: `builder.tool`/`builder.family` must be `claude-cli`/`anthropic`,
  `independent_review.tool`/`independent_review.family` must be `codex-cli`/`openai`, and the two
  families must differ — the final reviewer can never be the family that authored the work;
- every rejection in the PR's history closed with evidence and a successor or review reference;
- `direct_spend` and `constitutional_change` both explicitly `false`;
- an unexpired, well-formed timestamp — and `issued_at` may never be later than the verifier's
  injected verification time: **zero future issuance**, with no grace period (equality passes; one
  second in the future fails closed);
- the required-check manifest's own `repo` field matches the live/expected repository exactly — the
  manifest is bound to one governed repository at a time, and CARSI/RestoreAssist remain fail-closed
  for merge authorisation until separately versioned, repo-bound manifests are installed for them
  (no command from the Unite-Group manifest is ever invented or reused for those repos).

**Any single failed condition fails the whole receipt closed.** The verifier itself never calls
`gh`/`git push`/merge/deploy. It emits `board_release_ready` (evidence for a human) and, separately,
`merge_authorised` (§8) and `deployment_authorised` (always `false` — no deployment executor exists).
Its output states plainly that a separate control still governs any repo or change outside
UG-AUTONOMY-001's named, activated scope (§4, §8).

## 6. Eligible Board roster (summary — canonical list is the roster file)

Per the Senior Board roster defined in `docs/superpowers/specs/2026-07-24-hermes-senior-board-continuity-design.md`
§6: **Margot (chair)**, **Empire (orchestrator)**, and **Codex (independent reviewer)** hold decision
or independent-challenge authority and are eligible voters. **Claude** is the builder on most PRs
(`claude-cli`/`anthropic`) and cannot approve its own work — the final reviewer must never be the same
model family as the builder it is reviewing. **OWNEST** remains advisory-only per §6.3 until its isolated
runtime is separately built and admitted, and does not hold a binding vote. The **deterministic verifier**
is a required check, not a Board vote. The canonical, hashable list is
`docs/constitution/board-release-roster.v1.json`; this section is a summary only and is not itself
authoritative if the two diverge — the roster file is.

## 7. Relationship to existing doctrine

- Does not edit EPIC-000 §1–16 body text. Recorded solely via a new row in EPIC-000's Amendments table
  and this file.
- Narrower than ARR-004's stage ladder: this addendum governs only the PR-review-completion checkpoint,
  not stage promotion, overall production readiness, or the wider safety-gate set in the HSBC-1 design
  (`docs/superpowers/specs/2026-07-24-hermes-senior-board-continuity-design.md` §11), which is
  unaffected.
- Implements, for the HSBC-1 design, the distinction between Board-authorised progression and
  founder-only consequential gates — see that document's §16.

## 8. UG-AUTONOMY-001 — automatic merge exception (founder ruling 24/07/2026)

A later, separate founder ruling on the same date, ratified in CLAUDE.md's Global PR release law
section and recorded here per ARR-008 §1. It narrowly reopens automatic **merge** (never deployment)
for exactly three repositories, on top of — never instead of — every gate in §1–§5 above.

**Eligible repos.** `CleanExpo/Unite-Group`, `CleanExpo/CARSI`, `CleanExpo/RestoreAssist` only, as
independently hash-bound in `docs/constitution/ug-autonomy-001-activation.v1.json` (the "activation
manifest") and additionally enforced as a constant, defense-in-depth allowlist inside
`tools/board-release-verifier/controller.py` — a tampered or drifted activation manifest can never
widen the controller's own ceiling; both must independently agree.

**Split states.** The verifier emits `merge_authorised` and `deployment_authorised` as two entirely
separate, non-aliased booleans. `merge_authorised` is `true` only when `board_release_ready` holds, the
repo is eligible, the candidate is non-constitutional, and complete exact-HEAD activation evidence
(tested rollback, a present post-deployment verification plan, and manifest-bound restart/canary
evidence) is supplied. `deployment_authorised` is **always `false`** in this implementation, with an
explicit reason (`no deployment executor is implemented`) — it is never implied by `merge_authorised`
and there is no compatibility alias between the two.

**Self-authorisation is impossible.** Any candidate whose `changed_paths` touch either protected/governing
path family — `docs/constitution/**` (including the very files implementing this exception) or
`tools/board-release-verifier/**` (the verifier/controller/their tests, so a change to the gate can never
approve itself) — can never set `merge_authorised: true`. Both families are founder-manual regardless of
how complete the surrounding activation evidence is; this addendum, its activation manifest, and any
future constitutional text remain founder-only.

**Retained founder-only stops (§3) apply without exception:** new or increased direct cost, constitutional
change, a missing credential/privilege only Phill can grant, an unresolved authority conflict, and any
irreversible action without tested rollback. None of these can be satisfied by activation evidence alone.

**Controller, not verifier, mutates.** `tools/board-release-verifier/verifier.py` remains side-effect-free
and never calls `gh`/`git push`/merge/deploy. A separate `tools/board-release-verifier/controller.py`
independently re-reads the live PR HEAD, requires it OPEN, based on `main`, not a draft, `MERGEABLE`,
and `mergeStateStatus: CLEAN`, re-checks HEAD immediately before mutation, merges only with GitHub's
`sha=<exact head>` precondition, and independently re-reads the PR afterward — requiring `state: MERGED`,
a non-empty `mergedAt`, an unchanged `headRefOid`, and `mergeCommit.oid` equal to the (format-validated)
merge API SHA — before ever reporting a verified merge. A merge-API "success" that fails this independent
re-read is reported as `merge_unverified`, never as completion.

**Deployment excluded.** Neither this addendum nor UG-AUTONOMY-001 authorises, arms, executes, or
implies production deployment. No deployment executor exists in this implementation.

---

*Filed 24/07/2026. Versioned v1.0. Binding. Amendments to this addendum itself must follow ARR-008 §1 —
evidence-backed, versioned, never silent.*

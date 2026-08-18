---
name: waterline
description: Audit any piece of work — the current session, a PR, a branch, or a Linear ticket — for its Waterline authority class, its delivery-Ladder rung, and its AAA evidence rating. Use when the user types /waterline, asks "what stage is this at", "is this done / shippable / complete", "rate this AAA", or whenever a session is about to claim done, complete, shipped, or live. Also use to settle any disputed stage claim — this skill is the auditor of record for the Ground-Truth Standard's Waterline line.
---

# Waterline — delivery-stage and authority audit

> **Binding, not definition.** The authority classes are defined once, in the
> constitution (`docs/constitution/EPIC-000-nexus-engineering-constitution.md`,
> §"The Waterline — autonomy gate"). The earned lifecycle is defined once, in
> **UNI-2517** (Linear, founder-authored SSOT). The Ladder mapping, AAA semantics
> and the required report line are defined once, in
> `.claude/rules/ground-truth-standard.md`. This skill binds to all three and
> redefines none — redefinition is a Class 3 constitutional amendment. It computes
> and reports. Evidence, evaluation, or model consensus cannot lower a class, and
> only receipts — never labels — advance a stage.

## Invocation

`/waterline [target]` where target is one of:

- *(nothing)* — the current session's active deliverable (default)
- `pr <number>` — a pull request
- `branch <name>` — a branch head
- `ticket <UNI-…>` — a Linear ticket's claimed work

## Procedure

1. **Pin the SHA.** Resolve the target to the exact commit SHA (and, for released
   work, the deployment/version identifier). Every receipt below binds to that
   SHA — evidence for another SHA is `AA` at best (binding incomplete). If the
   working tree is dirty, say so: a dirty tree cannot be pinned, and results are
   provisional.
2. **Re-fetch the spine.** Read the Ladder table from
   `.claude/rules/ground-truth-standard.md` and, when Linear is reachable, fetch
   UNI-2517 fresh (`mcp__Linear__get_issue`) — never from memory or a paraphrase.
   If Linear is unreachable, say "UNI-2517 unavailable from here — using the rule
   file's mapping table" and carry on; do not stop, do not guess at changes.
3. **Walk the rungs, 1 → 12.** For each rung, enumerate the APPLICABLE UNI-2517
   evidence classes (structural · implementation · behavioural ·
   integration/security · visual · review · release · outcome), then assemble
   receipts from **real sources only**:
   - **git** — `git log`/`git show` for the SHA; PR state via the GitHub MCP
     (`pull_request_read`), never a summary doc.
   - **CI** — check runs for THAT SHA, plus `config/ci-evidence-manifest.json`
     completeness rules via `scripts/ci-evidence-manifest.mjs`: a suite that
     executed zero tests is not evidence, however green the job concluded.
   - **Gate logs** — `.handoff-logs/*.log` where present (note: this register
     stopped on 09/07/2026; per-SHA `gates-*.log` files live on founder machines
     and are usually ABSENT here).
   - **Linear** — the ticket read live. A Linear status label is a **claim, not a
     receipt** (183 Done tickets once had zero merge evidence).
   - **Vercel MCP** — deployment and provider receipts for rungs 7–8. PRODUCTION
     requires a provider receipt, not merge state.
   - **Supabase MCP** — schema state where the work touches a table (read-only;
     the schema-gate skill's rules apply).
   - **Live walk** — for rung 8, the actual routes walked and authenticated;
     200 ≠ real.
   - **Acceptance / handover / warranty / payment registers** — rungs 9–12. These
     registers largely do not exist yet; see Absence rule.
4. **Absence rule** (by reference to the harness-wrapper contract's Tier-2 rule):
   a receipt that should exist and does not → report `ABSENT: <named register>`
   and rate that evidence class FAIL. **Never substitute the nearest-looking
   file.** A source unreachable from this container → "unavailable from here"
   (never "not configured"), rated FAIL with the reason.
5. **Rate.** Per rung: `AAA` = every applicable class proven `[VERIFIED]` and
   bound to the pinned SHA/version · `AA` = proven, binding incomplete · `A` =
   inference-supported only · `FAIL` = unconfirmed or absent. Overall = the
   **minimum** across claimed rungs. Never round up.
6. **Authority check.** Classify the *next advancing action*'s Waterline class
   from the constitution's table, fail-closed on ambiguity — e.g. advancing past
   RELEASE_READY is SHIP_AUTHORISED, a Class 3 founder action. State plainly what
   this session may NOT do autonomously.

## Report shape

```
Waterline audit — <target> @ <sha> (<date DD/MM/YYYY>)

| Rung | State | Rating | Receipts |
|---|---|---|---|
| 1 Design | BUILD_AUTHORISED | AAA | <receipt> |
| … | … | … | … |

Grounded <DD/MM/YYYY>: <each receipt actually read> — <source>
Next advancing action: <action> = Class <n> — <who may take it>

Waterline: Class <0-3> · Stage <UNI-2517 state> (rung <n>/12 <name>) · <AAA|AA|A|FAIL> — evidence: <receipts>
```

The terminating line uses the Ground-Truth Standard's grammar exactly. Rungs not
yet reached are listed as `— (not reached)`, not rated: the rating covers claimed
work, the FAIL ratings cover claimed-but-unevidenced work.

## Failure honesty

- Linear / Vercel / Supabase MCP unavailable → the affected classes are reported
  "unavailable from here" and rated accordingly. The audit still completes.
- The skill never degrades to memory, a handoff's prose, or a paraphrase of
  UNI-2517 — it re-fetches each run (P1, P8 of the Ground-Truth Standard).
- If the target's own claims (a PR body, a ticket) disagree with the receipts,
  the receipts win and the disagreement is stated in the report.

## Red flags that mean the audit was skipped or gamed

- A `Waterline:` line whose Stage exceeds its receipts.
- A rating above the minimum rung ("AAA overall" with a FAIL rung claimed).
- A receipt quoted for a different SHA than the pinned one.
- A Linear status, a doc, or a commit message offered as a receipt.
- An absent register silently replaced by the nearest-looking file.

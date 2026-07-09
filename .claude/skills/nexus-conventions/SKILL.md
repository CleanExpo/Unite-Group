---
name: nexus-conventions
description: The engineering constitution for the Unite-Group Nexus monorepo (CleanExpo/Unite-Group). Use whenever writing, reviewing, planning, or committing ANY code in this repo — features, fixes, migrations, crons, CRM Mission Control or autonomy work, integrations, Synthex event handling — even if the user never mentions conventions. Also use when drafting commit messages or PR descriptions, or when deciding how to gate, flag, or arm a new capability.
---

# Nexus conventions

The Nexus is the system-of-action for a multi-business empire run by one founder.
Every unsafe default becomes a silent production incident that nobody is paged
about, so the repo survives on a small set of idioms. Follow them even when a
shortcut would "work" — the idioms exist because the shortcuts already failed.

## The NorthStar rule: honest sources

Never fabricate data. Readers report their source honestly — `'not_connected'`,
`'error'` — rather than inventing rows or plausible values. When a signal is
missing or wrong-typed, degrade to `'signal_unavailable'`; never guess. UI
components show honest empty and not-connected states instead of placeholders
that look like data. If you cannot verify something, say so in the output
rather than smoothing over it.

## Write-then-confirm

Every authoritative write reads back to confirm it landed. A write failure over
a completed mutation surfaces a 500 — never a green 200 on top of a stale row.
Throw on any persistence failure so no false `'executed'` is ever journaled.
Dedup on a stable id (e.g. the approval id) so retries stay safe.

## Dormant by default, gated arming

New capabilities ship inert. The standard to meet in every PR: "merging this
arms nothing." The pattern has three layers:

1. **Admission gate** — a kill switch (e.g. `CRM_AUTO_EXECUTE`) that is unset
   in prod by default; unset means nothing is admitted.
2. **Arming flag** — a separate dispatch flag (e.g. `CRM_DISPATCH_ARMED`,
   default off) flipped only at go-live.
3. **Founder/Board gate** — the go-live flip itself is a human decision,
   documented as an arming checklist, never a side effect of a merge.

Where possible, be doubly inert (flag off AND null executors) so prod
behaviour is provably unchanged. Behaviour-neutral until armed.

## The autonomy ladder

- **L1** — low-risk subjects. May auto-execute only when admitted AND armed.
  Admission signals (confidence, existing entity links) are threaded only on
  the `may_execute` path; every non-executable decision stays unsafe
  regardless of signals.
- **L2 / L3** — always `needs_review`. Executors resolve to null. Do not
  build L2/L3 execution paths without an explicit founder decision.

## Reuse the operator-gateway backbone

Job-like work lands in `operator_jobs` + `operator_events` — do not invent a
parallel harness. Status transitions follow the gateway idiom:
`blocked → running → done | failed`, one `status_changed` event per hop.
Outcome statuses (`running`, `done`, `failed`) must stay OUTSIDE the autopilot
poller's claim set (`planned`, `queued`) so the Mac-side runner can never
double-claim work that another path is executing synchronously.

## Migrations are founder-gated

Prod schema changes ship as a separate migration, flagged `FOUNDER-GATED` in
the commit, applied via the standard migration path after review — never
inline with feature code. Before writing code that assumes schema, run the
`supabase-schema-gate` skill (read-only verification against prod comes
first, always).

## Commit and PR format

Subject: conventional commit + Linear ref.
Body: explain the safety invariant, not just the change — a reviewer should
understand what CANNOT happen after this merge. End with the gate line and
co-author trailer for AI-assisted work.

**Example:**

```
feat(crm): real lead_conversion executor, wired behind the arming gates (UNI-2234 go-live)

Step 1 of the go-live: the concrete L1 lead_conversion mutation. STILL
DORMANT — runs only when admitted AND CRM_DISPATCH_ARMED=1 (default off)
AND CRM_AUTO_EXECUTE=1. Merging this arms nothing.

- executeLeadConversion(): founder-scoped write-then-confirm — guards the
  lead is convertible, creates the client contact, marks the lead
  converted, then reads back to confirm. Throws on any failure so no
  false 'executed' is journaled.

Semantics FLAGGED for founder confirmation before arming.

Gate: tsc PASS · eslint clean · vitest 501 files / 3077 passed (+10).

Co-Authored-By: Claude <noreply@anthropic.com>
```

## External facts are verified live

Model IDs, package and SDK versions, API parameters, provider limits and
pricing all change underneath the repo. Verify them against live sources
(Exa MCP, web search, official docs) before pinning; route every pin through
an env var or a single constants module so it updates in one place; and when
a pinned external fact changes, add a verification line to the PR body:
`Verified live <date>: <fact> — <source>`. Full procedure: the live-verify
skill.

## When in doubt

Prefer inert, honest, and reversible. If a semantic question arises (what
counts as "converted", which column is authoritative), do not guess — flag it
in the PR as `FLAGGED for founder confirmation` and build the safe default.
Run the full gate (tsc, eslint, vitest) before declaring any work done, and
report real counts, never "tests pass" without running them.

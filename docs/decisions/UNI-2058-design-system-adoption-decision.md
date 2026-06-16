# UNI-2058 — Phase 0: Design-System Adoption Decision

> Decision record resolving the Phase-0 gate of the "Unite-Hub Layered Design
> System" epic (UNI-2057). Phase 0 gated UNI-2059→2066. Decided 2026-06-16.

## Decision

**Keep the existing Scientific Luxury design system as canonical. The "layered
light/paper" redesign is NOT adopted, because its source material is
unrecoverable.** The dependent phases (UNI-2059 token port, UNI-2060 primitives,
UNI-2061–2066 screen ports) are **superseded / blocked-on-source** and should be
closed unless the original prototypes are located.

This is, in the Phase-0 framing, effectively **option C (cherry-pick) collapsed
to "keep existing"** — there is nothing left to cherry-pick into.

## Evidence (verified 2026-06-16)

The epic and all its phases reference source under
`design/unite-hub-layered/` (prototypes + JSX). That source **does not exist in
any reachable location**:

- `[VERIFIED]` Not in `CleanExpo/Unite-Hub` git history — `git log --all
  --diff-filter=A -- design/unite-hub-layered` over the full mirror bundle
  (189 refs, complete history) returns **no commit that ever added it**.
- `[VERIFIED]` Not on any current Unite-Hub branch (`git ls-tree` across all
  remote heads → 0 files).
- `[VERIFIED]` Not on the local Unite-Hub working copy
  (`/Users/phillmcgurk/Unite-Hub/design/` — absent).
- `[VERIFIED]` Not in the monorepo `apps/web` (`design/unite-hub-layered` absent).

UNI-2057 described it as "live HTML prototypes + JSX source … on branch
`design…`" — that branch was evidently never pushed and is not in the backup
bundle, so it is lost short of a copy on another machine/download.

## Rationale

- The dependent phases cannot proceed: UNI-2059 ports `shared-tokens.css`,
  UNI-2061–2066 port specific `*-layered.html` prototypes — all missing.
- The existing **Scientific Luxury** system (OLED Black `#050505`, Cyan
  `#00F5FF`, `rounded-sm`) is live and consistent across `apps/web`
  (`globals.css` tokens + the `founder/*` surfaces). It is not broken; there is
  no functional gap forcing a re-theme.
- Building the UNI-2060 primitive library speculatively (with no source spec and
  no consumer) would violate the repo's No-Invaders rule ("no speculative
  scaffolding").

## Consequences / recommended issue actions

| Issue | Recommended action |
|---|---|
| **UNI-2058** (Phase 0) | **Done** — this decision. |
| UNI-2059 (tokens), UNI-2060 (primitives) | Close as **superseded** (source lost). |
| UNI-2061–2066 (screen ports) | Close as **superseded** (prototypes lost). |
| UNI-2057 (epic) | Close once children are closed. |

**Reopen trigger:** if Phill locates the `unite-hub-layered` prototypes (another
machine, a download, a design tool export), drop them under
`apps/web/docs/design/unite-hub-layered/`, reopen UNI-2059, and the phased port
resumes from Phase 1.

## Note on the existing CRM surfaces

The contact CRM surface shipped on 2026-06-16 (UNI-2062, PR #239) was built on the
existing Scientific Luxury system precisely because the layered prototypes were
unavailable — consistent with this decision.

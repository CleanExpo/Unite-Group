# Living Business Card 2.0: Phase 0 (UNI-2996)

Phase 0 is read-only discovery plus this planning folder. No product code, migration, push, deploy, paid generation or HeyGen render happened. The branch is `docs/living-card-v2-phase0`; it has not been pushed.

## Source

- Repository: CleanExpo/Unite-Group, worktree `/Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/living-card-v2`
- Source SHA (origin/main, fetched 25 Oct 2026): `dbc58a6400de8d3e7375cb602441abbfdb497893` (PR #1224, owner seed)
- Branch: `docs/living-card-v2-phase0`, created from that SHA
- Git status at start: clean (empty `git status --short`)
- Workflow: the /spm skill (`~/.claude/skills/spm/SKILL.md`) was read. It produces a 19-section `spec.md` plus an `engineering.md` that must pass `engineering_gate.py`, and begins with a Founder's Board activation (entry file exists on the Storage Unit volume but was not opened). The brief asked for a Phase 0 planning folder, not a spec, so this folder follows START_HERE steps 1 to 4 and spec section 19 (Phase 0) instead. No `spec.md` or `engineering.md` was produced and the engineering gate was not run, so no "engineering gate PASS" is claimed. Phase 1 should start with a proper /spm spec built on these files.

## Inputs read

In `/Volumes/Mini Mini 2T Storage/session-handoffs/living-card-v2/`:

1. `LIVING_CARD_CODEX_CLAUDE_START_HERE_V1_2.txt` (81 lines), read in full
2. `LIVING_BUSINESS_CARD_V2_MASTER_SPEC_V1_2_MARGOT_INTEGRATED_2026-10-25.md` (1201 lines), read in full
3. `MARGOT_UNITE_GROUP_CANONICAL_AMBASSADOR_ADDENDUM_2026-10-25.md` (141 lines), read in full

The brief files were not rewritten.

## Inputs missing (UNKNOWN)

`/Volumes/Mini Mini 2T Storage/session-handoffs/from-pc/` held only `README.txt` and a folder `CODEX SETUP 24-10-2026 061514` (unrelated setup material, not opened). `.last-sync` says `06:05:04 FAILED` (scp: "FOR CLAUDE - Business Card/*: No such file"). Not present, searched by name under `from-pc/`:

- `LIVING_CARD_INDEPENDENT_REVIEW_V1_2_MARGOT_ADDENDUM_2026-10-25.md`: the five launch-risk areas and 15 subissues (START_HERE step 3) cannot be reproduced or challenged
- `LIVING_CARD_LUMINOUS_FIRST_IMPRESSION_PROTOTYPE.html`: the design proof for START_HERE step 6
- `MARGOT_HEYGEN_READ_ONLY_VERIFICATION_2026-10-25.md`: the HeyGen receipt; all Margot IDs are therefore UNVERIFIED by me

## What is in this folder

| File | Purpose |
|---|---|
| claims-ledger.md | 59 claims checked against the code: V 20, P 16, U 10, B 3, Pr 10 |
| dependency-map.md | Build order, file ownership, entity reuse decisions |
| boards.md | The five boards named in START_HERE (plus judge) and how the spec differs |
| approvals-needed.md | Every item that needs Phill, with a recommended default |
| phase1-p0-plan.md | Plan only for the persistent card, vCard, one enquiry receipt and two-tenant RLS tests |
| baseline/ | 10 full-page screenshots of the live pages, plus SHA-256 of the 23 media files |

## Baseline screenshots (live, read-only GET, 25 Oct 2026)

Captured with Playwright (chromium headless shell) against https://unite-group.in. All ten requests returned HTTP 200 and the page width equalled the viewport (no sideways scroll). One line per image, from looking at it:

- `cards-320.png` (320x4019): dark showroom, one column; the "Choose this" links collide with the edition names on the two-column rows (for example "Blueprint Choose thisForge", "Constellation Choose Ink"), so labels run together.
- `cards-390.png` (390x4186): same dark page; labels sit beside the names and are readable; cards in two columns, ten clips plus the square signature.
- `cards-430.png` (430x4325): same layout with a little more room; no overlap seen.
- `cards-768.png` (768x3370): hero text left, signature clip right, then a three-column edition grid; the tenth tile sits alone on the last row.
- `cards-1440.png` (1440x2163): wide hero, then a five-column edition grid in two rows, three steps and footer "Unite-Group Nexus Pty Ltd · ABN pending".
- `cards-order-320.png` (320x2647): cream page; "Get your own living card", two price boxes (Ready-made $249, Made for you $449) with dark-orange order buttons, a three-per-row opener picker, then the enquiry form; header link "See all editions".
- `cards-order-390.png` (390x2640): same page, price boxes full width, picker three across, form stacked.
- `cards-order-430.png` (430x2712): same as 390 with slightly wider boxes.
- `cards-order-768.png` (768x1712): two price boxes side by side, six-wide picker, form in two columns.
- `cards-order-1440.png` (1440x1719): content held to a narrow centred column, same blocks as 768; no hero film is shown (the source has one, so the live page is not main HEAD, see ledger C18).

Limits: these are static full-page captures; the media tiles were not played, no pay link was followed, and no performance, touch-target or contrast measurement was taken.

## Gate

Phase 0 docs only. Nothing here says anything is live. The next step needs Phill's answers in approvals-needed.md (items A1 to A4 before Phase 1 starts).

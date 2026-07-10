---
name: carsi
description: Brand context for CARSI (carsi.com.au) — write on-voice, factually-grounded content for the online restoration/cleaning training LMS. Fires when producing CARSI course, marketing, or social copy (org slug `carsi` in credential-triage event routing). Loads brand, voice, key entities, and the fail-closed IICRC/CEC claims guardrail so agents never make an unapproved accreditation claim.
---

# carsi — CARSI brand context

Online training LMS for the restoration/cleaning industry. Content inherits the Unite-Group Nexus
human voice (`~/2nd Brain/2nd Brain/Wiki/nexus-human-voice-2026-05-11.md`) and layers the facts
below. **Accreditation language here is fail-closed** — see the guardrail.

## Brand

- **Name / URL:** CARSI — `carsi.com.au`.
- **Product:** online training LMS with a course catalogue for restoration/cleaning practitioners.

## Voice

Nexus human voice for a **technician/firm seeking training** audience: instructional, credible,
credential-careful. Open on a named learner and the job the course helps them do; keep claims exact.

## Key entities (real)

- `carsi.com.au` — the LMS.
- Course catalogue (`data/seed/courses-catalog.json`); CEC = **Continuing Education Credits**.
- CI compliance backstops: `npm run check:iicrc-compliance` and `check:iicrc-terminology` scan course + marketing surfaces for stray/over-reaching IICRC/CEC claims.

## What NOT to claim (fail-closed — this is load-bearing)

IICRC / CEC framing is **opt-in per course** and **fail-closed** (CLAUDE.md; ROOT-CAUSE fix PR #517):

- Do **not** use "IICRC-approved", "certified with CARSI", or equivalent accreditation phrasing.
- Do **not** state a specific CEC-hour number ("Earn N IICRC CECs") unless the course is a genuine IICRC discipline with a **founder-set `cecHours > 0`** AND its slug is allowlisted (`CEC_APPROVED_SLUGS`).
- Do **not** infer CEC hours from course duration — that inference path was removed; treat null as 0.
- Do **not** imply CARSI is an IICRC accreditation body. It delivers training; it does not accredit.
- When unsure whether a course carries CECs, say **nothing** about CECs.

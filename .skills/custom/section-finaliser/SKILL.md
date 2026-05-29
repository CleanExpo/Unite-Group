---
name: section-finaliser
category: workflow
version: 1.0.0
priority: P2
auto_load: false
triggers:
  - finalising a feature section for production
  - moving a section from RED/AMBER to GREEN
  - "is this section done?" / done-gate / section sign-off
  - before committing a section's completed work
description: |
  Apply this skill WHEN declaring any section (a page + its API + its data source) production-ready.
  A single-pass done-gate that runs every invariant check for the Unite-Hub stack in order and
  refuses to pass a section until all gates are green WITH proof. Use AFTER implementing/wiring a
  section and BEFORE marking it GREEN in the ledger. P2 — load on finalisation/verify tasks.
context: fork
---

# Section Finaliser

## The Default Being Overridden

Left unchecked, LLMs default to:
- Declaring a section "done" after the happy-path renders once
- Skipping loading/error/empty states because the data was present in the test
- Committing before running the full verify suite

This skill overrides those with: **a section is done only when every gate passes with evidence.**

---

## ABSOLUTE RULES (Never Violate)

**NEVER** mark a section GREEN without running the full verify command and seeing it pass.
**NEVER** skip the real-data proof (see `mock-vs-real-detector`).
**ALWAYS** update `.claude/memory/PRODUCTION-LEDGER.md` when a section changes status.

---

## The done-gate (run top to bottom; stop at first failure)

```
1. AUTH        → route has `getUser()` 401 guard; founder-scoped `.eq('founder_id', user.id)`
2. DYNAMIC     → route has `export const dynamic = 'force-dynamic'`
3. REAL DATA   → mock-vs-real-detector passes (no silent mock; explicit not-connected state)
4. BOUNDARIES  → segment has loading.tsx AND error.tsx; page handles empty state
5. DESIGN      → no Lucide/Hero icons; rounded-sm only; semantic colour tokens (no bg-blue-500)
6. VERIFY      → pnpm run type-check && pnpm run lint && pnpm run test && pnpm build  (ALL pass)
7. PROOF       → render the page; confirm real data shows; confirm error/empty states render
8. LEDGER      → update PRODUCTION-LEDGER.md status + commit with section name in message
```

## Verify command (the loop)

```bash
pnpm run type-check && pnpm run lint && pnpm run test && pnpm build
```

If any gate fails: fix root cause (do not bypass), re-run from gate 1. Do not `|| true`, do not skip lint, do not `--no-verify`.

## Per-section checklist template (paste into the section's PR/commit)

```
SECTION: <name>
[ ] auth + founder scope
[ ] force-dynamic
[ ] real data (source traced, no silent mock)
[ ] loading.tsx + error.tsx + empty state
[ ] design tokens (no Lucide, rounded-sm)
[ ] type-check / lint / test / build all pass
[ ] visually verified real data + error state
[ ] ledger updated
```

## Output

Report the gate table with ✓/✗ per gate and the verify output tail. Only the user-facing
"VERIFICATION CHECKLIST" (per `.claude/rules/verification-gate.md`) closes a section.

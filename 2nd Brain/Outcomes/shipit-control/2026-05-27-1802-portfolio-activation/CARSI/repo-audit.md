# CARSI Shipit repo audit

Generated: 2026-05-27T18:02:37+10:00
Repo: https://github.com/CleanExpo/CARSI.git
Path: /Users/phillmcgurk/CARSI
Rana authority: final production merge authority.

## Current state
- Exists: True
- Git: True
- Branch: main
- Head: 7cc2241
- Dirty files: 1
- Package scripts: {"build": "prisma generate && next build", "lint": "eslint .", "type-check": "tsc --noEmit"}
- Test status: not_run_no_test_script
- Workflows: 6
- Env examples/contracts: 1

## Blockers
- missing_test_script

## Risk / gaps
- working_tree_dirty:1_files

## Prioritized Linear task candidates
- Add or document repo test command for Shipit Checklist acceptance
- Prepare sandbox PR task to isolate dirty worktree changes before Rana merge review

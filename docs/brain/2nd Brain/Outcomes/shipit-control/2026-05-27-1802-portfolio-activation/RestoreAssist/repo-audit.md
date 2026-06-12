# RestoreAssist Shipit repo audit

Generated: 2026-05-27T18:02:37+10:00
Repo: https://github.com/CleanExpo/RestoreAssist.git
Path: /Users/phillmcgurk/RestoreAssist
Rana authority: final production merge authority.

## Current state
- Exists: True
- Git: True
- Branch: main
- Head: 8c216f79
- Dirty files: 88
- Package scripts: {"build": "NODE_OPTIONS=\"--max-old-space-size=8192\" sh scripts/build.sh", "lint": "eslint .", "type-check": "NODE_OPTIONS=\"--max-old-space-size=8192\" tsc --noEmit"}
- Test status: not_run_no_test_script
- Workflows: 11
- Env examples/contracts: 2

## Blockers
- missing_test_script

## Risk / gaps
- working_tree_dirty:88_files

## Prioritized Linear task candidates
- Add or document repo test command for Shipit Checklist acceptance
- Prepare sandbox PR task to isolate dirty worktree changes before Rana merge review

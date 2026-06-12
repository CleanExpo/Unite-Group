# Synthex Shipit repo audit

Generated: 2026-05-27T18:02:37+10:00
Repo: https://github.com/CleanExpo/Synthex.git
Path: /Users/phillmcgurk/Synthex
Rana authority: final production merge authority.

## Current state
- Exists: True
- Git: True
- Branch: main
- Head: afba962b
- Dirty files: 6
- Package scripts: {"build": "next build --webpack", "lint": "eslint . --max-warnings 0", "test": "jest --config jest.worktree.cjs", "type-check": "tsc --noEmit"}
- Test status: script_available_not_run_activation_pass
- Workflows: 13
- Env examples/contracts: 2

## Blockers
- None

## Risk / gaps
- working_tree_dirty:6_files

## Prioritized Linear task candidates
- Prepare sandbox PR task to isolate dirty worktree changes before Rana merge review

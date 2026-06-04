# CCW Shipit repo audit

Generated: 2026-05-27T18:02:37+10:00
Repo: https://github.com/CleanExpo/CCW-CRM.git
Path: /Users/phillmcgurk/CCW-CRM
Rana authority: final production merge authority.

## Current state
- Exists: True
- Git: True
- Branch: main
- Head: 3c7cfcd
- Dirty files: 1
- Package scripts: {"build": "next build", "lint": "eslint src", "type-check": "tsc --noEmit", "test": "vitest run"}
- Test status: script_available_not_run_activation_pass
- Workflows: 8
- Env examples/contracts: 1

## Blockers
- None

## Risk / gaps
- working_tree_dirty:1_files

## Prioritized Linear task candidates
- Prepare sandbox PR task to isolate dirty worktree changes before Rana merge review

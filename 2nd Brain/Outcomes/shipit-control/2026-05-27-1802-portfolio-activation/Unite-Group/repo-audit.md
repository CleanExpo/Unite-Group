# Unite-Group Shipit repo audit

Generated: 2026-05-27T18:02:37+10:00
Repo: https://github.com/CleanExpo/Unite-Group.git
Path: /Users/phillmcgurk/Unite-Group
Rana authority: final production merge authority.

## Current state
- Exists: True
- Git: True
- Branch: feat/command-center-daily-digest-server-read
- Head: daf72c4
- Dirty files: 3
- Package scripts: {"lint": "eslint .", "build": "next build", "test": "jest --testPathPattern=tests/pipelines --runInBand", "type-check": "tsc --noEmit", "security:routes-check": "ts-node --transpile-only -O '{\"module\":\"commonjs\",\"moduleResolution\":\"node\"}' scripts/check-route-inventory.ts"}
- Test status: script_available_not_run_activation_pass
- Workflows: 5
- Env examples/contracts: 2

## Blockers
- None

## Risk / gaps
- working_tree_dirty:3_files

## Prioritized Linear task candidates
- Prepare sandbox PR task to isolate dirty worktree changes before Rana merge review

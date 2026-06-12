# Unite-Hub canonical migration inventory

Generated: 2026-05-27T18:07:00+10:00
Canonical repo: CleanExpo/Unite-Hub
Deprecated migration source: CleanExpo/Unite-Group
Freeze artifact: /Users/phillmcgurk/2nd-brain/Outcomes/shipit-control/2026-05-27-1807-unite-hub-canonical-migration/UNITE-GROUP-FREEZE.md
No production mutation performed.

## Open PRs
- CleanExpo/Unite-Group: 2
- CleanExpo/Unite-Hub: 0

## Local unmerged diffs / branches
- Unite-Group status entries: 3
- Unite-Group unmerged branches: chore/post-pr200-cleanup, docs/ccw-machines-category-copy, docs/ccw-product-category-topic-brief, docs/linear-watch-refresh-2053-review, docs/linear-watch-refresh-2055-review, docs/margot-pr175-merge-evidence, feat/ccw-eofy-organic-copy-pack, feat/command-center-daily-digest-server-read, feat/crm-approval-lifecycle-helper, feat/crm-timeline-write-hooks, feat/crm-timeline-write-hooks-clean, feat/margot-crm-command-spine, feat/margot-crm-contacts-api, feat/margot-crm-contacts-approval-defaults, feat/margot-crm-contacts-opportunities-migration, feat/margot-crm-daily-digest-helper, feat/margot-crm-daily-digest-route, margot-command-center-approval-ui, margot/addon-task-status-evidence, margot/digest-page-read, margot/digest-read-surface, pidev/fix-rotate-jwt-sensitive-2026-05-25
- Unite-Hub status entries: 0

## Docs/config drift
- Drift count: 269
- Sample: .env.example, .github/design-md-lint.baseline.txt, .github/scripts/design-md-lint.sh, .github/workflows/ci.yml, .github/workflows/deepsec-weekly.yml, .github/workflows/design-lint.yml, .github/workflows/review-board.yml, .github/workflows/rotate-admin-jwt.yml, docs/AUTO-PUBLISH-FAILURE-MODE-REGISTER.md, docs/MIGRATION-PROTOCOL.md, docs/SOURCES.md, docs/adr/ai-marketing-advisor.md, docs/audit/silent-fail-buttons-2026-05-18.md, docs/brand/README.md, docs/brand/voice-audit-2026-05-13-post.csv, docs/brand/voice-audit-2026-05-13.csv, docs/brand/voice-audit-2026-05-13.md, docs/dr-nrpg-service-area-command-center-2026-05-20.md, docs/integrations/README.md, docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md

## File inventory counts
- Unite-Hub files: 1968
- Unite-Group files: 1204
- Common paths: 69
- Missing in Unite-Hub: 1135
- Common but different: 58

## Missing in Unite-Hub by area
- src/lib: 273
- docs/margot: 220
- src/app: 204
- src/components: 136
- config: 40
- scripts: 38
- public: 34
- supabase/migrations: 31
- tests/unit: 31
- database: 25
- tests/integration: 17
- docs/superpowers: 12
- src/types: 7
- .github/workflows: 4
- docs/brand: 4
- docs/plans: 3
- hooks: 3
- supabase/functions: 3
- tests/developers: 3
- tests/pipelines: 3

## Different common files by area
- src/components: 24
- config: 7
- src/lib: 6
- docs/margot: 5
- src/app: 5
- public: 2
- .github/workflows: 1
- CLAUDE.md: 1
- README.md: 1
- components.json: 1
- next-env.d.ts: 1
- package-lock.json: 1
- postcss.config.mjs: 1
- src/hooks: 1
- tsconfig.tsbuildinfo: 1

## Exact migration actions / Linear tasks
- PENDING: critical — Migrate Unite-Group open PR #205 into Unite-Hub or close as superseded — Review https://github.com/CleanExpo/Unite-Group/pull/205 head feat/command-center-daily-digest-server-read -> main; cherry-pick/recreate required delta against CleanExpo/Unite-Hub sandbox branch; Rana reviews final PR.
- PENDING: critical — Migrate Unite-Group open PR #204 into Unite-Hub or close as superseded — Review https://github.com/CleanExpo/Unite-Group/pull/204 head margot/digest-page-read -> main; cherry-pick/recreate required delta against CleanExpo/Unite-Hub sandbox branch; Rana reviews final PR.
- PENDING: high — Triage Unite-Group local uncommitted/untracked diff before archive — 3 local status entries in /Users/phillmcgurk/Unite-Group; copy only required deltas into Unite-Hub sandbox branch.
- PENDING: high — Review Unite-Group unmerged branches — Branches not merged to main/master: chore/post-pr200-cleanup, docs/ccw-machines-category-copy, docs/ccw-product-category-topic-brief, docs/linear-watch-refresh-2053-review, docs/linear-watch-refresh-2055-review, docs/margot-pr175-merge-evidence, feat/ccw-eofy-organic-copy-pack, feat/command-center-daily-digest-server-read, feat/crm-approval-lifecycle-helper, feat/crm-timeline-write-hooks, feat/crm-timeline-write-hooks-clean, feat/margot-crm-command-spine, feat/margot-crm-contacts-api, feat/margot-crm-contacts-approval-defaults, feat/margot-crm-contacts-opportunities-migration, feat/margot-crm-daily-digest-helper, feat/margot-crm-daily-digest-route, margot-command-center-approval-ui, margot/addon-task-status-evidence, margot/digest-page-read; migrate required commits into Unite-Hub or mark obsolete.
- PENDING: high — Migrate docs/config drift from Unite-Group to Unite-Hub — 269 docs/config drift paths found; start with .env.example, .github/design-md-lint.baseline.txt, .github/scripts/design-md-lint.sh, .github/workflows/ci.yml, .github/workflows/deepsec-weekly.yml, .github/workflows/design-lint.yml, .github/workflows/review-board.yml, .github/workflows/rotate-admin-jwt.yml, docs/AUTO-PUBLISH-FAILURE-MODE-REGISTER.md, docs/MIGRATION-PROTOCOL.md.
- PENDING: medium — Classify files present only in deprecated Unite-Group source — 1135 paths missing from Unite-Hub; classify by keep/migrate/drop using inventory area counts.
- PENDING: medium — Resolve common-file content drift — 58 common files differ; migrate intentional deltas to Unite-Hub with tests.

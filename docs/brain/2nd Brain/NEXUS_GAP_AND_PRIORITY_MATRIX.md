# Nexus Gap and Priority Matrix

Status: diagnostic discovery output
Date: 2026-06-04
Scope: Unite-Group Nexus ecosystem local inspection
Evidence base: local filesystem inspection of `/Users/phillmcgurk/2nd-brain`, `/Users/phillmcgurk/Unite-Group`, `/Users/phillmcgurk/Unite-Hub`, `/Users/phillmcgurk/Synthex`, `/Users/phillmcgurk/RestoreAssist`, `/Users/phillmcgurk/Disaster-Recovery`, `/Users/phillmcgurk/Pi-CEO`; portfolio registry `/Users/phillmcgurk/Unite-Hub/.portfolio/PORTFOLIO.yaml`; selected README/CLAUDE/docs/scripts/routes/agent files.
Guardrail: this is understanding and diagnostic mapping only. No implementation, deploy, DB write, external account, or publishing action was performed.


Scoring: Severity = Critical / High / Medium / Low. Effort = S/M/L/XL. Confidence reflects available local evidence.

| Gap name | Segment | Severity | Business impact | Technical impact | Revenue impact | Effort | Confidence | Evidence available | Owner agent | Priority | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|
| No mandatory diagnostic layer before execution | Command/orchestration | Critical | Repeated explanations and disconnected work | Agents build without context | High indirect | M | High | User prompt + fragmented assets | Context Discovery Agent | P0 | Enforce FROM_REQUEST_TO_EXECUTION workflow |
| CRM ownership split between Unite-Group and Unite-Hub | Business ops | Critical | Wrong system may receive CRM work | Duplicate routes/migrations/tests | High | M | High | Active migration branch + both repos have CRM | CRM Ops Agent | P0 | Finish ownership map and migration plan |
| Margot cron/model routing failure | Automation | Critical | PM automation unreliable | Ticks fail before work | Medium | S | High | Latest logs show unsupported model | Technical Reality Agent | P0 | Inspect Hermes cron/profile model config and fix to supported model |
| Approval mechanisms fragmented/stale | Governance | High | Work stalls or unsafe approvals | Multiple incompatible approval stores | High | M | High | AQ stale, Pi-CEO approvals, Synthex/RA gates | Human Clarification Agent | P0 | Define canonical approval object and stale approval handling |
| No single dashboard status feed | Dashboard | High | Phill cannot see whole ecosystem | Multiple dashboards duplicate logic | High | M | High | Many dashboard surfaces, no shared feed | Dashboard Reporter | P0 | Create feed schema before UI work |
| Work-discovery not bridged to task execution | Project management | High | Candidate work does not become output | Manual report-to-task gap | High | M | High | work-discovery outputs + Agentic Nexus v0 | Prioritisation Agent | P1 | Convert top candidates into approval-gated task drafts |
| Obsidian is storage not intelligence | Memory | High | Context still must be manually explained | No entity graph/index | Medium | M | High | Vault docs and source map | Documentation Agent | P1 | Add project/add-on/agent/workflow links and evidence ledger |
| Agent registries fragmented | Agent ops | High | Wrong/missing owner assignments | Many definitions across repos | Medium | M | High | Unite-Hub .claude agents, Pi agentskills, Synthex agents | Asset Inventory Agent | P1 | Build canonical agent registry with owner/status |
| Local worker path portability issues | Automation | High | Workers fail across machines | Hardcoded `/Users/phill-mac` and `/Users/phillmcgurk` paths | Medium | S | High | Pi-CEO start script and Agentic Nexus script | Technical Reality Agent | P1 | Replace hardcoded paths with config/env |
| Research ingest lacks robust evidence quality | Research | Medium | Speculative recommendations | 429s/timeouts and noisy source logs | Medium | M | Medium | Research ingest outputs + source map | Research Evidence Agent | P1 | Add source quality/backoff and confidence labels |
| Synthex marketing intelligence lacks live inputs | Growth | Medium | SEO/AEO/GEO actions may be DATA_REQUIRED | No GSC/GA/page inventory in vault | High | M | High | Synthex source map | SEO Intelligence Agent | P1 | Inventory existing Google data and page lists |
| RestoreAssist readiness not generalised | ShipIt | Medium | Other projects lack RA-grade gates | Inconsistent release validation | Medium | M | High | RA Phase 3 RC plan | QA Agent | P2 | Extract portfolio ShipIt template |
| Pi-CEO Nexus API and Agentic Nexus v0 overlap | Command/orchestration | Medium | Confusing control-plane direction | JSONL local vs Supabase API | Medium | L | High | Both systems inspected | Dependency Mapping Agent | P2 | Decide boundary: local discovery vs production client ops |
| Missing local context for CARSI/CCW/NRPG | Client fulfilment | Medium | Incomplete portfolio map | Cannot validate status | Medium | S | High | Portfolio registry only | Asset Inventory Agent | P2 | Locate repos or mark as external/missing |
| Dashboard UI concepts ahead of data model | Dashboard | Medium | More UI without truth | Components may duplicate state | Medium | M | High | Multiple dashboard dirs/specs | Dashboard Reporter | P2 | Pause UI additions until feed exists |
| Duplicate Margot docs across repos | Memory/docs | Medium | Conflicting updates likely | Byte-identical docs copied | Low | S | High | Subagent inspection | Documentation Agent | P2 | Choose canonical location and mirror/read-only references |
| Package manager/version inconsistencies | Engineering | Medium | CI/build confusion | npm/pnpm mixed and repo-specific | Low | S | High | package files | Engineering Agent | P3 | Record per-project build contract in registry |
| Live-Nexus display source unclear | Dashboard | Low | Demo potential blocked | Spec without located repo | Medium | S | Medium | Pi-CEO docs mention repo | Asset Inventory Agent | P3 | Locate source or mark paused |
| Too many archived agent systems | Agent ops | Low | Cognitive clutter | Old migrations/agents archived | Low | M | High | Unite-Hub archives, Synthex archives | Asset Inventory Agent | P3 | Tag archived vs active in register |
| Revenue opportunity register missing | Revenue | High | Priorities not tied to money | No consistent ROI scoring | High | M | Medium | User goal + CRM/Synthex/DR assets | Business Value Agent | P1 | Add revenue opportunity links to SSOT |

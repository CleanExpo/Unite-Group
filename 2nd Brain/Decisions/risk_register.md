---
type: risk-register
generated: 2026-05-26
owner: hermes-strategy
review_cadence: weekly (Sunday board)
---

# Risk register — Unite-Group Nexus

Risk = (likelihood × impact). Status: OPEN | MITIGATING | ACCEPTED | CLOSED.

| ID | Risk | Likelihood | Impact | Status | Mitigation owner | Mitigation |
|---|---|---|---|---|---|---|
| R-001 | LLM cost runaway from unbounded board deliberation | High | High | MITIGATING | pi-dev-ops-orchestrator | Tier routing (Llama for SCAN/GAP, frontier only for Senior PM + Board); per-persona soft cap $25/day with alert; PLR-3 telemetry monthly |
| R-002 | Brand drift from unaudited Margot outbound to partners → external customers | Med | Critical | OPEN | hermes-strategy | Margot HITL gate (SG-H2) — Llama cheap-pass against brand-essence adjective set before any send. Deadline 2026-07-26. |
| R-003 | Autonomous PR ships broken code to RestoreAssist customers | Med | Critical | MITIGATING | restoreassist-shipit | Auto-merge gate (SG-P3) requires green tests + BRA score >=0.7 + safe-paths-only + 7-day post-merge canary before label trust extends |
| R-004 | TMUX agent (T1+) executes destructive command via prompt injection | Low | Critical | MITIGATING | pi-dev-ops-orchestrator | Validator policy ratified PR #277, 112-test suite as merge gate; chflags uappend on audit ledger; per-token allowlist not raw-regex |
| R-005 | GitHub App credentials leaked from Pi-CEO env | Low | Critical | OPEN | pi-dev-ops-orchestrator | App scope limited to content:write on specific repos only; secret scanning enabled on Pi-Dev-Ops; redaction patterns include ghp_/ghs_/github_pat_ |
| R-006 | Persona module misclassifies severity → escalation flood | Med | Med | OPEN | pi-dev-ops-orchestrator | Severity scoring grilled before persona ships; outcomes feedback adjusts thresholds; manual mute for runaway personas |
| R-007 | Phill becomes the bottleneck for approvals queue (queue grows faster than reviewed) | High | High | OPEN | hermes-strategy | Time-box approvals to 5min total/day via voice digest; auto-deny anything sitting >72h in queue; quarterly approval-pattern review to identify which classes can be pre-authorized |
| R-008 | Discovery loop produces low-signal noise → backlog spam | High | Med | MITIGATING | hermes-delivery | Severity threshold; dedup by content hash; Brand Resonance Agent gate as second filter; monthly persona prompt evolution (HLR-3) tunes for signal |
| R-009 | Mac Studio order delays block local LLM Phase | Low | Med | OPEN | phill | MacBook Pro sufficient for MVP per user; Mac Studio is acceleration not gate; budget for order to be placed by W2 if growth signal appears |
| R-010 | CIP PRs sit in "applied to prod, unmerged" limbo > 48h | High | Med | MITIGATING | hermes-delivery | Independent code review on PRs #272-276 must complete this week; PR #271 migration rolled back if review surfaces blockers |
| R-011 | Cross-persona conflicting proposals on same Linear issue | Med | Med | OPEN | hermes-delivery | Linear team-scoping prevents most collisions; CMO+CTO+Persona conflicts surface to weekly board for adjudication |
| R-012 | Outcomes feedback loop attribution wrong (credits/blames wrong persona) | Med | Med | OPEN | pi-dev-ops-orchestrator | Persona-id propagated through PR title prefix + Linear label + audit ledger; outcomes table joins on those keys; monthly reconciliation in board |
| R-013 | Duncan or Toby's Telegram identity stolen → impersonation submits via CIP | Low | Critical | MITIGATING | hermes-strategy | G3.3 trust layer (telegram_user_id cross-check on every inbound) — landed in PR #275 hardening commit; backup: per-thread anti-replay nonce |
| R-014 | Hermes daemon (gpt-5.5 via Codex) backend SLA degrades or rate-limits | Med | High | OPEN | hermes-strategy | Fall-back: route founder utterances through Pi-CEO frontier tier (Anthropic) directly; Hermes is convenience surface not load-bearing |
| R-015 | Founder loses interest / burns out before M12 inflection | Low | Critical | OPEN | phill | Voice-first review (SG-H3) reduces minutes/day to ~5; sole purpose of HLR-1 daily 6-pager; quarterly "is this still fun?" check-in |
| R-016 | Compliance event in RestoreAssist (IICRC, NDIA, insurance regulator) lands before autonomous compliance scanner detects | Low | Critical | MITIGATING | restoreassist-shipit | RLR-3 monthly compliance check; legal review on ESCALATE-class findings; subscription to relevant regulator email feeds |
| R-017 | Mac Studio (when ordered) becomes single point of failure for always-on agents | Low | High | OPEN | pi-dev-ops-orchestrator | Hybrid topology — Railway keeps network-edge (Telegram webhook, autonomy poller); Mac Studio for local LLM only; degrade gracefully to cloud LLM on Mac outage |

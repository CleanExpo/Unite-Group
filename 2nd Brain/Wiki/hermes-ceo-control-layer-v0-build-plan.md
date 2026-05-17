---
type: plan
updated: 17/05/2026
owner: Hermes CEO Operator
status: v0-implementation-ug-v0-02-spec-complete
board: unite-group-portfolio-ops
---

# Hermes CEO Control Layer v0 — Build Plan

Goal:
Stand up an autonomous CEO control layer that drives production readiness, revenue, defensibility, and valuation growth without role confusion across CRM, marketing, and execution repos.

Non-negotiable boundaries:
- Unite-Group / Unite CRM = portfolio CRM source of truth
- Synthex = marketing/campaign production engine only
- RestoreAssist/ATO/DR-NRPG/CCW/CARSI/etc = execution assets
- No green status without verifiable evidence
- No auto-publish, no paid spend, no secret exposure

Model and budget routing (v0):
- Controller/decisions/security/merge: Codex Max
- Worker research/triage: Qwen tiers (35b-a3b default; 27b code comprehension; flash monitoring; plus only for very large context)
- If Qwen profiles are not available locally, mark as YELLOW and run via default profile only until model profiles are provisioned.

Workstream sequence (7 tasks):
1) Governance + model-routing baseline
2) Intake normalization contract (Plaud/chat/docs/repo signal -> structured brief)
3) CRM-first routing policy (Synthex-only-if-marketing gate)
4) Kanban execution spine (durable tasks, dependencies, handoff rules)
5) Verification gates (repo/test/deploy evidence requirements)
6) RYG dashboard + daily Hermes update scout
7) Persistence and rollback safety pack (runbooks, canary, failure modes)

Dependency graph:
- T1 -> T2 -> T3 -> T4 -> T5 -> T6
- T2,T3,T5,T6 -> T7

Final board card IDs (unite-group-portfolio-ops):
- UG-V0-01 Governance and model-routing baseline -> t_eaaf5bdd
- UG-V0-02 Intake normalization contract -> t_3918d547
- UG-V0-03 CRM-first routing policy and classifier -> t_d9368686
- UG-V0-04 Kanban execution spine and handoff protocol -> t_3b3b3ec0
- UG-V0-05 Verification gates (repo, tests, production claims) -> t_d76d7b96
- UG-V0-06 RYG dashboard and daily Hermes update scout automation -> t_514ef718
- UG-V0-07 Persistence, rollback, and canary safety pack -> t_a353499e

Global safety gates (apply to every task):
- Gate A: No production mutation in v0 planning phase
- Gate B: Every claim includes command output/log link/artifact path
- Gate C: Any tool outage (Pi-CEO/Margot/Linear/CRM) gets one retry max, then fallback to Kanban + local files
- Gate D: No completion marked GREEN without explicit pass evidence

Definition of done for v0 spec phase:
- Core contracts and gates are documented and versioned
- Board cards have durable outcomes tracked in Hermes Kanban
- Build plan is persisted locally for handoff/restart safety

## UG-V0-06 — RYG dashboard + Hermes update scout (complete for v0)

Status:
- Complete for v0 scope (canary-level validation complete; no production mutation)

Evidence artifacts:
- Scout script: /Users/phill-mac/Pi-CEO/scripts/hermes_update_scout.py
- Scheduler mirror: /Users/phill-mac/.hermes/scripts/hermes_update_scout.py
- Daily report folder: /Users/phill-mac/2nd Brain/2nd Brain/Wiki/ops/hermes-update-scout/
- Latest report: /Users/phill-mac/2nd Brain/2nd Brain/Wiki/ops/hermes-update-scout/2026-05-17.md
- Raw evidence JSON: /Users/phill-mac/2nd Brain/2nd Brain/Wiki/ops/hermes-update-scout/2026-05-17.json
- Cron job: 2d1dad83b591 (ug-v0-06-hermes-update-scout-daily), schedule 0 6 * * * (local delivery)

Validation summary (17/05/2026):
- hermes update --backup: pass (performed canary update + backup)
- hermes doctor: pass
- hermes --version: pass
- hermes gateway status: pass
- hermes config check: pass
- hermes curator run --dry-run: pass
- Recommendation: CANARY (hold production promotion)

Known caveats:
- `hermes config migrate --dry-run` flag unavailable in current CLI
- `hermes update --backup` combines backup + update side effect

## UG-V0-02 — Plaud intake normalization contract (schema/spec)

Status:
- Spec complete
- UI not started (explicitly out of scope for this step)

Objective:
Normalize intake from Plaud recordings, chat briefs, and repo signals into one contract that can be routed CRM-first, then Kanban execution with verification metadata.

Contract version:
- ug.intake.normalized.v0.1

### 1) Normalized envelope schema

```json
{
  "schema_version": "ug.intake.normalized.v0.1",
  "intake_id": "string-uuid",
  "captured_at": "ISO-8601",
  "source": {
    "channel": "plaud|chat|repo_signal|doc",
    "source_ref": "string",
    "actor": "string",
    "confidence": 0.0
  },
  "brief": {
    "title": "string",
    "summary": "string",
    "problem": "string",
    "desired_outcome": "string",
    "constraints": ["string"],
    "business_context": {
      "portfolio_entity": "unite-crm|synthex|restoreassist|dr-nrpg|ccw|carsi|other",
      "role_class": "crm|marketing|execution_asset|ops",
      "acquisition_link": "string"
    }
  },
  "work_classification": {
    "work_type": "product|ops|marketing|incident|research|admin",
    "urgency": "low|medium|high|critical",
    "risk_level": "low|medium|high",
    "requires_human_approval": true,
    "safe_autonomy": false
  },
  "routing": {
    "crm_first_required": true,
    "crm_record": {
      "system": "unite-crm",
      "record_type": "task|opportunity|incident|client-note",
      "record_id": "string-or-null"
    },
    "marketing_gate": {
      "is_marketing_work": false,
      "route_to_synthex": false,
      "reason": "string"
    },
    "execution_target": {
      "kanban_board": "unite-group-portfolio-ops",
      "task_id": "string-or-null",
      "owner": "string"
    }
  },
  "evidence": {
    "claims": [
      {
        "claim": "string",
        "status": "unverified|verified|blocked",
        "proof": ["path-or-url"]
      }
    ],
    "test_requirements": ["string"],
    "production_gate_requirements": ["string"]
  },
  "delivery": {
    "ryg": "GREEN|YELLOW|RED",
    "blockers": ["string"],
    "next_action": "string",
    "owner": "string",
    "due_date": "dd/mm/yyyy",
    "budget_note": "string"
  },
  "audit": {
    "created_by": "margot|hermes|system",
    "created_session": "string",
    "updated_at": "ISO-8601"
  }
}
```

### 2) Example A — Plaud recording intake

```json
{
  "schema_version": "ug.intake.normalized.v0.1",
  "intake_id": "2ef0ae1e-5f81-4d5a-869a-642f7b8d8e93",
  "captured_at": "2026-05-17T07:12:30+10:00",
  "source": {
    "channel": "plaud",
    "source_ref": "plaud:file_01HZXV...",
    "actor": "phill.mcgurk",
    "confidence": 0.93
  },
  "brief": {
    "title": "Staging IdP credential expiry blocks release smoke tests",
    "summary": "Voice note reports staging E2E blocked by expired IdP secret.",
    "problem": "Cannot verify production readiness without staging smoke pass.",
    "desired_outcome": "Reissue credential and run full smoke suite with evidence.",
    "constraints": ["No production mutation", "Security team controls credential issuance"],
    "business_context": {
      "portfolio_entity": "restoreassist",
      "role_class": "execution_asset",
      "acquisition_link": "Production reliability proof for enterprise readiness"
    }
  },
  "work_classification": {
    "work_type": "incident",
    "urgency": "high",
    "risk_level": "high",
    "requires_human_approval": true,
    "safe_autonomy": false
  },
  "routing": {
    "crm_first_required": true,
    "crm_record": {
      "system": "unite-crm",
      "record_type": "incident",
      "record_id": null
    },
    "marketing_gate": {
      "is_marketing_work": false,
      "route_to_synthex": false,
      "reason": "Operational release blocker, not campaign work"
    },
    "execution_target": {
      "kanban_board": "unite-group-portfolio-ops",
      "task_id": null,
      "owner": "default"
    }
  },
  "evidence": {
    "claims": [{
      "claim": "Staging IdP credential is expired",
      "status": "unverified",
      "proof": []
    }],
    "test_requirements": ["Run full E2E smoke suite after credential restore"],
    "production_gate_requirements": ["No GREEN until smoke suite pass logs attached"]
  },
  "delivery": {
    "ryg": "YELLOW",
    "blockers": ["Security credential reissue pending"],
    "next_action": "Open security reissue request and queue smoke run",
    "owner": "Security Team + QA",
    "due_date": "18/05/2026",
    "budget_note": "No extra model spend required"
  },
  "audit": {
    "created_by": "margot",
    "created_session": "voice-intake-session",
    "updated_at": "2026-05-17T17:28:14+10:00"
  }
}
```

### 3) Example B — Chat brief intake

```json
{
  "schema_version": "ug.intake.normalized.v0.1",
  "intake_id": "7fbc5df1-f42c-4bf8-8f4e-fafcb35d2ef3",
  "captured_at": "2026-05-17T17:00:00+10:00",
  "source": {
    "channel": "chat",
    "source_ref": "hermes:session:latest",
    "actor": "phill.mcgurk",
    "confidence": 0.98
  },
  "brief": {
    "title": "Implement UG-V0-02 Plaud intake normalization contract",
    "summary": "Create schema/spec with examples; persist to spec file and Kanban.",
    "problem": "Intake arrives in inconsistent formats across channels.",
    "desired_outcome": "Single normalized contract for routing and execution.",
    "constraints": ["Do not build UI", "Do not block on Linear auth"],
    "business_context": {
      "portfolio_entity": "unite-crm",
      "role_class": "crm",
      "acquisition_link": "Improves operating system repeatability and auditability"
    }
  },
  "work_classification": {
    "work_type": "ops",
    "urgency": "high",
    "risk_level": "medium",
    "requires_human_approval": false,
    "safe_autonomy": true
  },
  "routing": {
    "crm_first_required": true,
    "crm_record": {
      "system": "unite-crm",
      "record_type": "task",
      "record_id": null
    },
    "marketing_gate": {
      "is_marketing_work": false,
      "route_to_synthex": false,
      "reason": "Portfolio operations contract definition"
    },
    "execution_target": {
      "kanban_board": "unite-group-portfolio-ops",
      "task_id": "t_3918d547",
      "owner": "default"
    }
  },
  "evidence": {
    "claims": [{
      "claim": "Spec file updated with normalized contract",
      "status": "verified",
      "proof": ["/Users/phill-mac/2nd Brain/2nd Brain/Wiki/hermes-ceo-control-layer-v0-build-plan.md"]
    }],
    "test_requirements": ["Schema examples parse as valid JSON"],
    "production_gate_requirements": ["N/A for spec-only change"]
  },
  "delivery": {
    "ryg": "GREEN",
    "blockers": [],
    "next_action": "Start UG-V0-03 routing policy implementation",
    "owner": "Hermes CEO Operator",
    "due_date": "18/05/2026",
    "budget_note": "Saved high-tier model spend by avoiding Linear auth dependency"
  },
  "audit": {
    "created_by": "hermes",
    "created_session": "cli-session",
    "updated_at": "2026-05-17T17:28:14+10:00"
  }
}
```

### 4) Example C — Repo signal intake

```json
{
  "schema_version": "ug.intake.normalized.v0.1",
  "intake_id": "e6c5b4f2-7118-45eb-aadb-4f31cb3f6f74",
  "captured_at": "2026-05-17T06:05:00+10:00",
  "source": {
    "channel": "repo_signal",
    "source_ref": "github:CleanExpo/Unite-Group:ci-failure:run-9821",
    "actor": "github-actions",
    "confidence": 0.89
  },
  "brief": {
    "title": "CI failure on main branch blocks deployment confidence",
    "summary": "Pipeline reports failing tests in verification stage.",
    "problem": "Cannot claim GREEN readiness while CI is red.",
    "desired_outcome": "Root cause identified and tests re-run with pass evidence.",
    "constraints": ["No merge to main without pass", "No production claim without gate evidence"],
    "business_context": {
      "portfolio_entity": "unite-crm",
      "role_class": "execution_asset",
      "acquisition_link": "Reliability and release discipline evidence"
    }
  },
  "work_classification": {
    "work_type": "product",
    "urgency": "high",
    "risk_level": "high",
    "requires_human_approval": true,
    "safe_autonomy": false
  },
  "routing": {
    "crm_first_required": true,
    "crm_record": {
      "system": "unite-crm",
      "record_type": "incident",
      "record_id": null
    },
    "marketing_gate": {
      "is_marketing_work": false,
      "route_to_synthex": false,
      "reason": "Engineering quality gate issue"
    },
    "execution_target": {
      "kanban_board": "unite-group-portfolio-ops",
      "task_id": null,
      "owner": "default"
    }
  },
  "evidence": {
    "claims": [{
      "claim": "Main CI currently failing",
      "status": "unverified",
      "proof": ["github run URL"]
    }],
    "test_requirements": ["Repeat failing suite", "Run targeted fix tests", "Run full regression gate"],
    "production_gate_requirements": ["All required CI checks GREEN", "Attach run IDs"]
  },
  "delivery": {
    "ryg": "YELLOW",
    "blockers": ["Failing CI checks pending root-cause fix"],
    "next_action": "Create Kanban execution task with failing test evidence",
    "owner": "Engineering",
    "due_date": "18/05/2026",
    "budget_note": "Use low-cost worker for log triage; reserve Max for final merge decision"
  },
  "audit": {
    "created_by": "system",
    "created_session": "repo-monitor-cron",
    "updated_at": "2026-05-17T06:05:10+10:00"
  }
}
```

### 5) Acceptance criteria for UG-V0-02 (spec phase)

- One canonical schema version exists and is documented
- Three channel examples exist: Plaud recording, chat brief, repo signal
- Routing explicitly enforces CRM-first and Synthex marketing gate
- Evidence + RYG fields embedded so no unverifiable GREEN claims
- Persisted in local spec file and linked in Hermes Kanban outcome

## Linear sync note

Linear sync remains a separate YELLOW admin task and is intentionally not blocking UG-v0 execution in this plan state.

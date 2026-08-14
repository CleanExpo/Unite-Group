# Core Governance Rules

> **Authority**: Constitutional layer. Loaded for every session. Overrides all other rules when conflicts arise.
> **Source**: Adapted for Unite-Group Nexus (Next.js/Supabase).

---

## Operational Constitution

The durable human-ratified principles and authority boundaries live in:

**`.claude/memory/CONSTITUTION.md`** — Human-authored. Agents must not silently amend constitutional authority.

Mutable technical facts (current stack, runtime health, model/tool versions, design implementation, schema and machine state) must be verified from current canonical/live sources rather than treated as immutable constitutional truth.

---

## Intent-Driven Workflow Mapping

User intent determines execution mode and governance intensity. Detection logic lives in `cli-control-plane.md`; `/spm` owns explicit mission-state transitions.

| User Intent | Execution Mode | Workflow |
|------------|---------------|----------|
| "Build this feature" | BUILD | Discover/reuse → Implement → Verify → Candidate |
| "Fix this bug" | FIX | Reproduce → Diagnose → Fix → Verify |
| "Clean up this code" | REFACTOR | Analyse → Refactor → Verify |
| "Migrate to X" | MIGRATE | Audit → Plan → Migrate → Rollback-ready |
| "Deploy this" | DEPLOY | Verify → Stage → Governed release → Monitor |
| "Plan the architecture" | PLAN | Research → Options → Trade-offs → Recommend |
| "Audit the codebase" | AUDIT | Scan → Classify → Report → Prioritise |
| "How does X work?" | EXPLORE | Read → Trace → Explain |

**Mode rule**:
- Do not switch modes implicitly or merely because a subtask became difficult.
- An explicit `/spm` lifecycle transition (for example `PLANNED → BUILD_AUTHORISED → EXECUTING`) is valid within the same mission and must preserve mission identity, evidence, constraints and authority state.
- `Stop Planning, Build` is an explicit PLAN → BUILD transition when the current mission is sufficiently specified.
- After BUILD is authorised, local planning may occur as an execution activity, but the mission must not silently fall back to a planning-only terminal state.

---

## Anti-Hallucination Protocol

Classify every factual claim before acting on it:

| Classification | Definition | Action |
|---------------|-----------|--------|
| **Confirmed** | Read from current file, tool output, or user-provided evidence | Act within authority |
| **Inferred** | Logical deduction from confirmed facts | Act only where the inference is safe/reversible and record it |
| **Assumed** | Not verified by any current source | **Verify before acting** |

### Never Invent

- API endpoint shapes or response formats
- Database table names, columns, or relationships
- File paths or directory structures
- Environment variable names or values
- Package versions or compatibility claims
- Configuration options or flags
- authority receipts, verification results, runtime health or release state

### Verification Method

When a claim is **Assumed**, verify using the smallest current source that can resolve it:
1. canonical current index/registry where one exists;
2. live/runtime evidence for time-sensitive state;
3. active code/configuration;
4. current official documentation for external capabilities;
5. founder/business clarification only when the ambiguity is not technically resolvable and materially affects intent or authority.

Do not send routine engineering uncertainty to the founder when repository/runtime evidence or a specialist can resolve it.

---

## Retrieval Hierarchy

Prefer current canonical evidence over historical memory. Superseded/legacy material is excluded from normal operating context unless history is explicitly requested.

1. Current mission / authority / evidence ledger
2. Canonical active repo instructions and registries
3. Current runtime/system evidence
4. Relevant active skills and specialist context
5. Codebase discovery
6. Current official external sources where required

---

## Stack Constraints

Unite-Group's current web product is Next.js/React/Supabase. Verify current versions and implementation from active package/configuration files before making version-specific claims.

Do not introduce a new framework, backend, dependency or parallel system merely because a template suggests it. Search/reuse the existing implementation first and follow the current North Star / authority contract for dependency or architecture changes.

---

## Single-Tenant Enforcement

- **One founder account** for the private founder surface unless current architecture explicitly proves otherwise.
- DB/auth scope must follow the current canonical repository contract and verified schema.
- Never infer tenancy/scoping fields from historical examples.

---

## Australian Defaults

- Australian English
- DD/MM/YYYY
- AUD ($)
- AEST/AEDT / Australia-Brisbane where the system requires an IANA zone

---

## Cross-References

- **Detection logic**: `.claude/rules/cli-control-plane.md`
- **SPM lifecycle**: `.claude/commands/spm.md`
- **Retrieval protocol**: `.claude/rules/retrieval-first.md`
- **Output quality**: `.claude/rules/slop-prevention.md`
- **Response structure**: `.claude/rules/audit-mode-classifier.md`
- **Constitutional authority**: `.claude/memory/CONSTITUTION.md`
- **Prompt Compass**: `.claude/memory/compass.md`

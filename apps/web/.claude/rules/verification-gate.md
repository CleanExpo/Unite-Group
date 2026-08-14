# Verification Gate — Always-On Rule

> **Authority**: Always loaded. Applies to build/fix/refactor/migration work and any completion claim.
> **Purpose**: Prevent false completion by requiring current evidence. Routine technical verification is owned by Nexus, not by the founder.

---

## Core rule

A task may advance only to the strongest state its evidence proves.

For software work, verification is performed by the system using the applicable layers:

1. deterministic checks — lint/type/tests/build and task-specific contracts;
2. independent review where required;
3. integration/runtime evidence;
4. Playwright browser journeys for user-facing work;
5. console/network/error inspection;
6. Computer Use or equivalent visual/desktop observation when structured browser evidence cannot prove the real UI state;
7. release and post-release evidence for production/COMPLETE claims.

**Do not make Phill the default QA tester.** Do not ask him to click through routine technical checks, find file paths, interpret stack traces, or confirm that implementation mechanics work when Nexus can verify them itself.

Human input is appropriate when the unresolved item is genuinely subjective or authoritative, for example:
- product/business preference;
- brand judgement not captured by a ratified design contract;
- consequential production/spend/destructive approval;
- a material ambiguity in intended outcome;
- acceptance that inherently depends on founder preference rather than technical correctness.

---

## Proof before language

Do not use stronger language than the evidence supports.

- **IMPLEMENTED** — code/config changed; verification may still be pending.
- **VERIFIED** — required checks actually executed and receipts/evidence exist.
- **RELEASE_READY** — candidate/review/CI/staging/visual requirements satisfied; production action not implied.
- **DEPLOYED** — deployment provider/runtime evidence proves the target candidate reached the intended environment.
- **COMPLETE** — intended outcome plus all applicable post-release/customer-path evidence is proven.

If evidence is missing or stale, use an honest lower state such as `UNVERIFIED`, `BLOCKED`, `STALE` or `UNKNOWN`.

---

## User-facing verification packet

For user-facing changes, Nexus should produce evidence such as:

```text
VISUAL VERIFICATION — [feature]

Environment: [local/staging/production]
Candidate:   [branch/SHA/PR]
Journey:     [navigation/action path]
Playwright:  PASS / FAIL / NOT_APPLICABLE
Console:     CLEAN / findings
Network:     CLEAN / findings
Visual:      PASS / findings
Evidence:    [trace/screenshot/report refs]
```

This packet is **evidence for the founder**, not a checklist assigning the verification work to the founder.

---

## Non-user-facing changes

Documentation/configuration/test-only changes still require evidence appropriate to their risk:
- syntax/schema validation where applicable;
- relevant tests/checks;
- diff review;
- current-reference/conformance checks for operating instructions;
- security/authority checks for sensitive configuration.

A file edit existing on a branch is not, by itself, proof of correctness.

---

## Recovery

If an agent has claimed completion without sufficient proof:

1. downgrade the state to the strongest actually-proven state;
2. identify the missing evidence;
3. perform the verification or route it to the appropriate technical specialist;
4. repair failures and re-verify;
5. escalate to the founder only if the remaining blocker is a genuine business/authority decision.

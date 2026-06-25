---
name: adversarial-evaluator
description: Evaluates agent output adversarially before committing — prevents self-assessment bias
---

# Adversarial Evaluator Skill

## When to invoke

After any agent produces output that will be committed, published, or acted on.
Do NOT self-evaluate — spawn a separate evaluator instance.

## Evaluation contract

The generator agent produces output in this format:

```
GENERATOR OUTPUT:
[the work product]

GENERATOR CLAIM:
[what the generator says was achieved]

EVALUATION CRITERIA:
[the rubric — 3-5 specific, checkable criteria]
```

The evaluator agent (spawned separately, no access to the generator's reasoning) must:

1. Read ONLY the output and criteria — not the generator's process
2. For each criterion: PASS / FAIL / PARTIAL with one-sentence evidence
3. Produce a final VERDICT: ACCEPT / REVISE / REJECT
4. For REVISE: list exactly what must change (no vague "improve X")
5. For REJECT: state the blocking failure

## Usage in workspace-dispatch

After the worker agent completes a task, call this skill:

1. Package the output + original task as GENERATOR OUTPUT
2. Spawn a fresh Claude instance with only this skill + the packaged output
3. Do not pass the worker's chat history to the evaluator
4. Only ACCEPT verdict proceeds to the next task in the DAG
5. REVISE sends the specific changes back to the worker (max 2 revision loops)
6. REJECT escalates to the orchestrator

## Evaluation rubrics by task type

### Code implementation

- Does it compile / type-check?
- Does it match the spec exactly (no scope creep)?
- Are there security issues (XSS, injection, exposed secrets)?
- Are existing tests passing?

### Content / copy

- Does it satisfy the stated purpose?
- Is it factually accurate (no hallucinated claims)?
- Does it use the correct tone and brand voice?
- Is it complete — no placeholders or [TODO] markers?

### Research / analysis

- Are all claims sourced or tagged [INFERENCE]/[UNCONFIRMED]?
- Is the conclusion supported by the evidence presented?
- Are counterarguments addressed?

## Anti-patterns (evaluator must flag these)

- "Looks good overall" without criterion-by-criterion evidence
- Passing output that contains [TODO], [placeholder], or stub functions
- Accepting output that adds scope beyond what was requested
- Letting "probably works" pass — only verified pass or fail

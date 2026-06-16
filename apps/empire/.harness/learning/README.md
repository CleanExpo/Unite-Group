# `.harness/learning/`

This directory is the **signal sink** for the weekly distillation routine
defined in **RA-1745** (Training vs Inference Pipeline). Five JSONL logs
accumulate structured entries about what the system should learn from;
the distillation routine reads them weekly and folds the lessons back
into Claude's operating instructions.

## Files

| File | Captures |
| --- | --- |
| `adversary-disagreements.jsonl` | Times the contrarian / qa-lead / brand-guardian disagreed and the disagreement led to a real correction |
| `ci-failures.jsonl` | CI red lights, classified by category (flake / regression / new-class) |
| `user-corrections.jsonl` | Times the user (Phill) explicitly corrected an approach or output |
| `false-positives.jsonl` | Detector / scanner / linter false-positives that wasted attention |
| `incident-postmortems.jsonl` | Production incidents — root cause, mitigation, lesson |

## Schema

One JSON object per line, no trailing newline issues. Required keys:

```json
{
  "ts": "2026-05-18T16:59:00Z",
  "category": "adversary-disagreement|ci-failure|user-correction|false-positive|incident",
  "summary": "one-line description",
  "lesson": "what the system should change",
  "evidence": "file:line, PR URL, or tool output reference"
}
```

Optional keys: `severity` (low|med|high), `tags` (string array), `linked_pr` (URL).

## Lifecycle

1. **Capture hooks** (RA-1745, shipping separately) append entries automatically when the conditions are met.
2. **Weekly distillation routine** reads the five files, clusters by lesson, and proposes updates to `CLAUDE.md` / wiki / skills.
3. **After distillation**, entries older than 90 days are archived to `.harness/learning/archive/YYYY-MM/`.

## Do not

- **Don't manually craft entries to "teach" the system** — entries should come from real events the hooks capture. Hand-curated entries pollute the distribution.
- **Don't commit raw stack traces or secrets** — entries are committed to git. Sanitise paths and tokens before they reach the log.
- **Don't delete entries** — archive after 90 days, but don't drop on the floor. The distillation cycle is the only consumer that mutates the corpus.

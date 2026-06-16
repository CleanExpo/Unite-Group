# SKILL: /review-metrics — Review Board Trend Report

**When to use**: To analyse the Review Board's effectiveness, find recurring patterns, and track improvement over time.

## Usage

```
/review-metrics
/review-metrics --last 30d
/review-metrics --specialist security
/review-metrics --verdict REQUEST_CHANGES
```

## What it does

1. Reads `.review-metrics.jsonl` (append-only metrics log)
2. Aggregates by time window, verdict, and specialist
3. Identifies recurring finding patterns (same issue appearing in multiple PRs)
4. Reports specialist effectiveness (findings that actually led to fixes)
5. Outputs a markdown trend report

## Steps

```bash
node scripts/review/review-metrics.js --last 30d
```

## Sample Output

```markdown
## Review Board Metrics — Last 30 Days

**Total PRs reviewed:** 24
**Approve rate:** 71% (17/24)
**Request Changes rate:** 29% (7/24)

### Verdict Distribution
| Verdict | Count | % |
|---|---|---|
| APPROVE | 17 | 71% |
| REQUEST_CHANGES | 7 | 29% |

### Top Finding Types (across all PRs)
| Specialist | Findings | Critical | High |
|---|---|---|---|
| security | 12 | 3 | 5 |
| typescript | 9 | 0 | 4 |
| testing | 8 | 0 | 3 |

### Recurring Issues (appeared in 3+ PRs)
- [security] Hardcoded API key in test files (5 PRs)
- [typescript] Missing return type on async functions (4 PRs)
- [testing] Missing error path coverage (3 PRs)

### Risk Tier Distribution
| Tier | Count |
|---|---|
| CRITICAL | 2 |
| STANDARD | 15 |
| TRIVIAL | 7 |
```

## Notes
- Metrics log location: `.review-metrics.jsonl`
- Each entry is one line of JSON (append-only)
- Log never deleted — provides permanent audit trail

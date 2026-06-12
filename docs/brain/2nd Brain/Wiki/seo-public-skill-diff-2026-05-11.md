---
type: wiki
updated: 2026-05-11
---

# SEO Public Skill Diff — `zubair-trabzada/dataforseo-claude`

> **Audit date:** 2026-05-11
> **Public repo:** https://github.com/zubair-trabzada/dataforseo-claude (HEAD as of clone)
> **Our suite:** `~/.claude/skills/seo-*` + `~/.claude/skills/seo/` + `~/.claude/agents/seo-*.md`
> **Verdict:** **Our suite IS this public skill.** Already adopted. Zero cherry-picks needed.

---

## Headline Finding

The public skill at `zubair-trabzada/dataforseo-claude` is the **exact upstream** of our installed `seo-*` suite. Every `SKILL.md` is byte-identical (verified by `diff -q`). Every Python script is identical except for the shebang line, which our install patches to point at `~/.claude/skills/seo/.venv/bin/python3` instead of `#!/usr/bin/env python3`. The 5 subagent files in the public `agents/` directory are byte-identical to the files we already have at `~/.claude/agents/seo-*.md`.

This is not a candidate for cherry-picking. It is the source we already installed.

---

## Surface Coverage

### Our suite (14 entry points + 5 subagents)

Ranked by frequency of likely use:

| Rank | Skill | Purpose |
|---|---|---|
| 1 | `seo` | Master toolkit / router |
| 2 | `seo-quick` | 60-second snapshot (3 parallel API calls) |
| 3 | `seo-audit` | Full audit, composite score 0-100, spawns 5 subagents |
| 4 | `seo-keywords` | Volume + CPC + difficulty + intent |
| 5 | `seo-rankings` | Live SERP rank check across keywords |
| 6 | `seo-technical` | On-page crawl up to 100 pages |
| 7 | `seo-competitors` | Top 10 competitors + SERP overlap |
| 8 | `seo-content` | Topical authority + content recommendations |
| 9 | `seo-backlinks` | Backlink profile + toxicity flags |
| 10 | `seo-content-gap` | Competitor keyword intersection |
| 11 | `seo-compare` | Head-to-head two-domain comparison |
| 12 | `seo-watchlist` | Multi-domain rank tracking |
| 13 | `seo-report` | Markdown report from saved audit |
| 14 | `seo-report-pdf` | PDF report from saved audit |

Plus 5 subagents at `~/.claude/agents/`: `seo-keywords.md`, `seo-technical.md`, `seo-competitors.md`, `seo-content.md`, `seo-backlinks.md` — invoked by `seo-audit` via the Agent tool.

Shared scripts at `~/.claude/skills/seo/scripts/`:

- `dataforseo_client.py` (208 lines) — shared HTTP client
- `keyword_research.py` (125 lines)
- `domain_overview.py` (126 lines)
- `backlinks.py` (130 lines)
- `on_page_audit.py` (121 lines)
- `serp_check.py` (138 lines)
- `generate_pdf_report.py` (268 lines)
- `preflight.sh` — credential check

### Their suite (13 sub-skills + 5 subagents + 7 scripts)

Identical to ours. They have the same `seo-*` sub-skills, same `agents/`, same scripts.

---

## Overlap Matrix

| Capability | Theirs | Ours | Status |
|---|---|---|---|
| `seo` master skill | yes | yes | identical (byte-for-byte) |
| `seo-audit` orchestrator | yes | yes | identical |
| `seo-keywords` | yes | yes | identical |
| `seo-rankings` | yes | yes | identical |
| `seo-technical` | yes | yes | identical |
| `seo-competitors` | yes | yes | identical |
| `seo-content` | yes | yes | identical |
| `seo-backlinks` | yes | yes | identical |
| `seo-content-gap` | yes | yes | identical |
| `seo-compare` | yes | yes | identical |
| `seo-watchlist` | yes | yes | identical |
| `seo-quick` | yes | yes | identical |
| `seo-report` | yes | yes | identical |
| `seo-report-pdf` | yes | yes | identical |
| 5 `agents/seo-*.md` subagents | yes | yes (at `~/.claude/agents/`) | identical |
| `dataforseo_client.py` | yes | yes | identical except shebang |
| `keyword_research.py` | yes | yes | identical except shebang |
| `domain_overview.py` | yes | yes | identical except shebang |
| `backlinks.py` | yes | yes | identical except shebang |
| `on_page_audit.py` | yes | yes | identical except shebang |
| `serp_check.py` | yes | yes | identical except shebang |
| `generate_pdf_report.py` | yes | yes | identical except shebang |
| `preflight.sh` | yes | yes | identical |
| `schema/audit_input.example.json` | NO | **yes (ours only)** | our extension |

---

## Cherry-Pick Recommendations

**None.** There is nothing in the public skill that is not already in our installed suite. Our installed suite IS the public skill (same fork point, same commit).

---

## Discard List

The entire public repo can be ignored as a source of new capability. Specifically:

- `/tmp/dataforseo-claude-public/seo/SKILL.md` — identical to ours
- `/tmp/dataforseo-claude-public/skills/*/SKILL.md` (all 13) — identical to ours
- `/tmp/dataforseo-claude-public/agents/*.md` (all 5) — identical to `~/.claude/agents/seo-*.md`
- `/tmp/dataforseo-claude-public/seo/scripts/*` — identical apart from shebang patching
- `install.sh` — we already ran the equivalent install; no upgrade signal here

---

## What We Have That They Don't

- **`schema/audit_input.example.json`** at `~/.claude/skills/seo/schema/` — example payload for the audit input (our addition; not in public repo).

That's the only divergence in our favour.

---

## Forward-Looking Signal

Worth tracking the public repo for future commits — if `zubair-trabzada` ships new sub-skills (e.g. local-pack tracking, brand-monitoring SERP entity tracking, Google Discover analysis, AI Overview presence detection), those would be genuine cherry-pick candidates. Set a quarterly check.

**Action item:** schedule a quarterly diff (`git pull` in `/tmp/dataforseo-claude-public/` and re-run this audit). Add to Hermes cron — next check 2026-08-11.

---

## Verdict

**Discard public skill as a current-state cherry-pick source. Suite is already adopted in full.** Track upstream for net-new features quarterly.

See also: [[system-opportunities-2026-05-11]] §"DataForSEO Claude public skill diff" — the trigger for this audit.

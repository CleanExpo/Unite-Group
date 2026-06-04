#!/usr/bin/env python3
"""Local-only Unite-Group agentic intelligence scan.

Reads local vault/repo state and writes two Markdown outcome reports:
- project gap analysis
- command-center digest

No network calls. No external side effects. Python 3.9 compatible.
"""
from __future__ import annotations

import datetime as _dt
import subprocess
from pathlib import Path
from collections import Counter

ROOT = Path('/Users/phillmcgurk')
VAULT = ROOT / '2nd-brain'
REPOS = {
    '2nd-brain': ROOT / '2nd-brain',
    'unite-group-authority-site': ROOT / 'Unite-Group',
    'unite-hub-crm': ROOT / 'Unite-Hub',
    'synthex': ROOT / 'Synthex',
    'restoreassist': ROOT / 'RestoreAssist',
    'disaster-recovery-qld': ROOT / 'Disaster-Recovery',
    'pi-ceo-dev-ops': ROOT / 'Pi-CEO',
}


def run(cmd, cwd=None):
    p = subprocess.run(cmd, cwd=str(cwd) if cwd else None, text=True, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return p.returncode, p.stdout.strip()


def git_status(path):
    if not (path / '.git').exists():
        return {'exists': path.exists(), 'branch': 'no-git', 'dirty': [], 'remote': ''}
    _, status = run('git status --short --branch', path)
    _, remote = run('git remote -v | head -2', path)
    lines = status.splitlines()
    branch = lines[0] if lines else 'unknown'
    dirty = lines[1:]
    return {'exists': True, 'branch': branch, 'dirty': dirty, 'remote': remote}


def count_vault():
    md = list(VAULT.rglob('*.md'))
    folders = {}
    for name in ['Sources', 'Sketches', 'Grills', 'Pitches', 'Decisions', 'Personas', 'Outcomes']:
        p = VAULT / name
        folders[name] = len(list(p.glob('*.md'))) if p.exists() else 0
    types = Counter()
    for f in md:
        try:
            text = f.read_text(errors='ignore')
        except Exception:
            continue
        if text.startswith('---'):
            fm = text.split('---', 2)[1]
            for line in fm.splitlines():
                if line.startswith('type:'):
                    types[line.split(':', 1)[1].strip()] += 1
    return len(md), folders, types


def known_gaps(statuses):
    gaps = []
    def add(gid, severity, category, project, title, evidence, owner, next_action, approval='none'):
        gaps.append({
            'id': gid, 'severity': severity, 'category': category, 'project': project,
            'title': title, 'evidence': evidence, 'owner': owner,
            'next_action': next_action, 'approval': approval
        })
    add('GAP-20260604-001', 'P1', 'ARCH', 'portfolio', 'No shared cross-ecosystem agent protocol', 'Audit found Synthex, Unite-Hub, RestoreAssist, DR and Hermes each define agents differently.', 'Nexus Executive Orchestrator', 'Create shared agent registry from existing agents; do not invent new vendor.')
    add('GAP-20260604-002', 'P1', 'EVID', 'portfolio', 'No unified evidence ledger implementation', 'Evidence schema now documented, but no JSONL/reader/writer exists yet.', 'Evidence Librarian', 'Implement local evidence-ledger JSONL writer/reader and use it in scan outputs.')
    add('GAP-20260604-003', 'P1', 'DASH', 'portfolio', 'No unified command-center digest/dashboard feed', 'Dashboards exist per repo but no shared aggregator; this script now creates Markdown MVP only.', 'Dashboard Operator', 'Add JSON dashboard item feed after this Markdown MVP is reviewed.')
    add('GAP-20260604-004', 'P1', 'AUTO', 'pi-ceo-dev-ops', 'Pi-CEO Nexus scheduler/action execution not fully active', 'Audit: scheduler gated/dry-run by env; discovery loop implemented; outbound action execution missing.', 'Automation Engineer', 'Review scheduler env and design safe local dry-run report before enabling any action.')
    add('GAP-20260604-005', 'P1', 'ENG', 'unite-group-authority-site', 'Personal intelligence scripts reference missing lib modules', 'Audit: scripts/personal-intelligence-* import ../src/lib/personal-intelligence, but directory missing.', 'Senior Fullstack Engineer', 'Inspect scripts/imports and create implementation plan or restore missing module path.')
    add('GAP-20260604-006', 'P2', 'DATA', 'unite-group-authority-site', 'Obsidian path fields exist but no sync worker', 'Audit: tasks table has obsidian_path/synced fields but no filesystem sync logic.', 'Integration Engineer', 'Design read-only vault sync adapter using existing Synthex patterns.')
    add('GAP-20260604-007', 'P2', 'SEO', 'portfolio', 'SEO/AEO/GEO intelligence is siloed by repo', 'Synthex has strongest SEO/AEO/GEO stack; other repos have local sitemaps/llms.txt but no shared authority map.', 'SEO Lead', 'Generate cross-repo entity/content authority inventory.')
    add('GAP-20260604-008', 'P2', 'QA', 'portfolio', 'QA/governance protocols are inconsistent across repos', 'RestoreAssist/Synthex/DR/Unite-Hub each have different gates and workflows.', 'QA Lead', 'Create shared verification matrix mapped to existing gates per repo.')
    if statuses.get('disaster-recovery-qld', {}).get('exists'):
        add('GAP-20260604-009', 'P2', 'DOC', 'disaster-recovery-qld', 'Disaster-Recovery CLAUDE.md corruption reported', 'Read-only audit reported binary garbage in CLAUDE.md.', 'Documentation Architect', 'Verify file corruption and repair only after preserving original content.')
    if statuses.get('2nd-brain', {}).get('dirty'):
        add('GAP-20260604-010', 'P2', 'OPS', '2nd-brain', '2nd-brain has many untracked/generated local artifacts', 'git status shows modified state and many untracked Sources/Outcomes.', 'Senior PM Office', 'Classify generated artifacts: commit, archive, or leave local.')
    return gaps


def md_table(rows, cols):
    out = ['|' + '|'.join(cols) + '|', '|' + '|'.join(['---'] * len(cols)) + '|']
    for r in rows:
        out.append('|' + '|'.join(str(r.get(c, '')).replace('\n', '<br>').replace('|', '/') for c in cols) + '|')
    return '\n'.join(out)


def main():
    today = _dt.date.today().isoformat()
    now = _dt.datetime.now().strftime('%Y-%m-%d %H:%M')
    statuses = {name: git_status(path) for name, path in REPOS.items()}
    md_count, folders, types = count_vault()
    gaps = known_gaps(statuses)

    project_rows = []
    for name, st in statuses.items():
        project_rows.append({
            'project': name,
            'branch': st['branch'],
            'dirty_count': len(st['dirty']),
            'evidence': str(REPOS[name]),
        })

    gap_rows = [{
        'id': g['id'], 'sev': g['severity'], 'cat': g['category'], 'project': g['project'],
        'gap': g['title'], 'owner': g['owner'], 'approval': g['approval']
    } for g in gaps]

    gap_doc = f"""---
type: outcome
component: agentic-intelligence-layer
status: complete
created: {today}
owner: gap-detection-engine
evidence_paths:
  - AGENTIC_SYSTEM_START_HERE.md
  - GAP_DETECTION_ENGINE.md
  - EVIDENCE_LEDGER_SCHEMA.md
links:
  - \"[[AGENTIC_SYSTEM_START_HERE]]\"
  - \"[[GAP_DETECTION_ENGINE]]\"
---

# Project Gap Analysis — {today}

Generated by local-only script: `.agentic/scripts/agentic_intelligence_scan.py` at {now}.

## Vault health

- Markdown files: {md_count}
- Folder counts: {folders}
- Frontmatter type counts: {dict(types.most_common(20))}

## Repo state snapshot

{md_table(project_rows, ['project', 'branch', 'dirty_count', 'evidence'])}

## Top gaps detected

{md_table(gap_rows, ['id', 'sev', 'cat', 'project', 'gap', 'owner', 'approval'])}

## Next actions

1. Implement evidence-ledger JSONL writer/reader locally.
2. Generate shared agent registry from existing repo-local agents.
3. Add dashboard JSON feed next to this Markdown digest.
4. Inspect Unite-Group personal-intelligence missing module path before any code fix.
5. Classify untracked 2nd-brain artifacts before broad commits.

## Safety

- No network calls.
- No external writes.
- No production DB writes.
- No deploys.
"""

    actions = [{
        'rank': i + 1,
        'action': g['next_action'],
        'owner': g['owner'],
        'severity': g['severity'],
        'evidence': g['evidence'][:90],
        'approval': g['approval'],
    } for i, g in enumerate(gaps[:5])]

    digest_doc = f"""---
type: outcome
component: agentic-command-center
status: complete
created: {today}
owner: dashboard-operator
evidence_paths:
  - DASHBOARD_COMMAND_CENTER_SPEC.md
  - Outcomes/{today}-project-gap-analysis.md
links:
  - \"[[DASHBOARD_COMMAND_CENTER_SPEC]]\"
  - \"[[GAP_DETECTION_ENGINE]]\"
---

# Agentic Command Center Digest — {today}

Generated by local-only script: `.agentic/scripts/agentic_intelligence_scan.py` at {now}.

## Top 5 next actions

{md_table(actions, ['rank', 'action', 'owner', 'severity', 'evidence', 'approval'])}

## P0/P1 gaps

{md_table([r for r in gap_rows if r['sev'] in ('P0', 'P1')], ['id', 'sev', 'cat', 'project', 'gap', 'owner', 'approval'])}

## Research queue

1. Verify current Obsidian CLI/Bases/Local REST availability on this Mac before designing adapters.
2. Verify Unite-Group missing `src/lib/personal-intelligence` imports and intended source of truth.
3. Verify DR `CLAUDE.md` corruption before repair.
4. Map existing agents from Synthex, Unite-Hub, RestoreAssist, DR and Hermes skills into one registry.

## Build queue candidates

1. Local evidence-ledger JSONL writer/reader.
2. Dashboard JSON feed generated from gap records.
3. Shared agent registry file generated from existing assets.
4. Source-to-Shape autopromoter using current vault conventions.

## Approvals required

None for the local-only scanner/reporting MVP.

Board approval remains required for deploys, prod DB writes, external/client comms, public publishing, billing/legal/accounting actions, and new vendors.

## What to ignore today

- Do not add vector/RAG infrastructure yet.
- Do not create external connector/vendor accounts.
- Do not wire production automation until local evidence/gap outputs are stable.
- Do not treat these reports as live dashboard truth until refreshed by script.

## Verification

- Script completed locally.
- Reports written under `Outcomes/`.
- Inputs were local filesystem and git status only.
"""

    (VAULT / 'Outcomes').mkdir(exist_ok=True)
    gap_path = VAULT / 'Outcomes' / (today + '-project-gap-analysis.md')
    digest_path = VAULT / 'Outcomes' / (today + '-agentic-command-center.md')
    gap_path.write_text(gap_doc)
    digest_path.write_text(digest_doc)
    print(str(gap_path))
    print(str(digest_path))

if __name__ == '__main__':
    main()

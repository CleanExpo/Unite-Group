#!/usr/bin/env python3
"""Agentic Nexus local-first control plane v0.

Safe vertical slice only: init registries, create task, claim, run one local artifact,
write evidence, create approval gate, update dashboard. No network calls.
Python 3.9 compatible.
"""
import argparse
import datetime as dt
import json
from pathlib import Path
import uuid

ROOT = Path('/Users/phillmcgurk/2nd-brain')
BASE = ROOT / '.agentic_nexus'
REG = BASE / 'registries'
STATE = BASE / 'state'
ART = BASE / 'artifacts'
RUNS = BASE / 'runs'
DASH = BASE / 'dashboard'


def now():
    return dt.datetime.now(dt.timezone.utc).astimezone().isoformat(timespec='seconds')


def date_id():
    return dt.datetime.now().strftime('%Y%m%d')


def ensure_dirs():
    for p in [REG, STATE, ART, RUNS, DASH]:
        p.mkdir(parents=True, exist_ok=True)


def append_jsonl(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a', encoding='utf-8') as f:
        f.write(json.dumps(obj, sort_keys=True) + '\n')


def read_jsonl(path):
    if not path.exists():
        return []
    rows=[]
    for line in path.read_text(encoding='utf-8').splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, sort_keys=True) + '\n', encoding='utf-8')


def latest_tasks():
    tasks={}
    for row in read_jsonl(STATE/'tasks.jsonl'):
        tasks[row['task_id']] = row
    return tasks


def load_workers():
    return json.loads((REG/'workers.json').read_text(encoding='utf-8'))['workers']


def select_agent(task_type):
    mapping={
        'research':'Research Director Agent', 'evidence':'Evidence Validator Agent', 'build':'Principal Software Engineer Agent',
        'qa':'QA/Test Agent', 'ui_review':'UI/UX Review Agent', 'seo':'SEO/AEO/GEO Agent', 'growth':'Marketing Strategy Agent',
        'docs':'Documentation Agent', 'dashboard':'Dashboard Reporter Agent', 'ops':'Business Operations Agent',
        'finance_awareness':'Finance Awareness Agent', 'legal_awareness':'Legal/Compliance Awareness Agent', 'shipit':'QA/Test Agent'
    }
    return mapping.get(task_type, 'Senior Project Manager Agent')


def route_worker(task_type):
    if task_type in ['build','qa','ui_review','shipit']:
        return 'build-worker'
    if task_type in ['research','evidence','seo','growth','finance_awareness','legal_awareness']:
        return 'research-bi-worker'
    return 'command-node'


def approval_for(task_type, risk):
    if risk in ['high','critical']:
        return 'board'
    if task_type in ['build','shipit']:
        return 'board'
    # v0 intentionally triggers an approval gate for every run artifact before follow-up execution.
    return 'board_review'


def init(_args):
    ensure_dirs()
    workers={
        'workers':[
            {'worker_id':'command-node','role':'control-plane','status':'idle','capabilities':['queue','approval','dashboard','registry','obsidian'],'current_task_id':None,'last_heartbeat':now()},
            {'worker_id':'build-worker','role':'build','status':'idle','capabilities':['git','worktree','docker','node','python','test','build','playwright'],'current_task_id':None,'last_heartbeat':now()},
            {'worker_id':'research-bi-worker','role':'research-business-intelligence','status':'idle','capabilities':['obsidian','research','seo','aeo','geo','strategy','content','python'],'current_task_id':None,'last_heartbeat':now()}
        ]
    }
    projects={'projects':[
        {'project':'2nd-brain','path':'/Users/phillmcgurk/2nd-brain','kind':'memory-control-plane','default_worker':'command-node'},
        {'project':'unite-group','path':'/Users/phillmcgurk/Unite-Group','kind':'authority-site','default_worker':'build-worker'},
        {'project':'unite-hub','path':'/Users/phillmcgurk/Unite-Hub','kind':'crm','default_worker':'build-worker'},
        {'project':'synthex','path':'/Users/phillmcgurk/Synthex','kind':'content-seo','default_worker':'research-bi-worker'},
        {'project':'restoreassist','path':'/Users/phillmcgurk/RestoreAssist','kind':'product','default_worker':'build-worker'},
        {'project':'disaster-recovery','path':'/Users/phillmcgurk/Disaster-Recovery','kind':'product','default_worker':'build-worker'}
    ]}
    agents={'agents':['Hermes CEO Orchestrator','Senior Project Manager Agent','Research Director Agent','Evidence Validator Agent','Principal Software Engineer Agent','QA/Test Agent','UI/UX Review Agent','SEO/AEO/GEO Agent','Marketing Strategy Agent','Brand Authority Agent','Business Operations Agent','Finance Awareness Agent','Legal/Compliance Awareness Agent','Documentation Agent','Dashboard Reporter Agent']}
    write_json(REG/'workers.json', workers)
    write_json(REG/'projects.json', projects)
    write_json(REG/'agents.json', agents)
    update_dashboard()
    print('Agentic Nexus initialized')


def create_task(args):
    ensure_dirs()
    task_id='ANX-%s-%04d' % (date_id(), len(read_jsonl(STATE/'tasks.jsonl'))+1)
    task={
        'task_id':task_id,
        'created_at':now(), 'updated_at':now(),
        'project':args.project,
        'source_trigger':'manual',
        'requested_outcome':args.outcome,
        'task_type':args.type,
        'assigned_agent':select_agent(args.type),
        'assigned_worker':route_worker(args.type),
        'status':'queued',
        'priority':args.priority,
        'risk_level':args.risk,
        'approval_requirement':approval_for(args.type,args.risk),
        'evidence_requirement':'research_brief' if args.type in ['research','seo','growth'] else 'artifact_log',
        'linked_files':[], 'linked_repo':None, 'output_artifacts':[], 'validation_commands':[],
        'next_action':'Worker should claim this task from the control plane.',
        'failure_task_created':None
    }
    append_jsonl(STATE/'tasks.jsonl', task)
    update_dashboard()
    print(task_id)


def claim(args):
    ensure_dirs()
    tasks=latest_tasks()
    for task in tasks.values():
        if task['status']=='queued' and task['assigned_worker']==args.worker:
            task=dict(task)
            task['status']='claimed'; task['updated_at']=now(); task['next_action']='Assigned worker should run the task.'
            append_jsonl(STATE/'tasks.jsonl', task)
            heartbeat(args.worker, task['task_id'], 'busy')
            update_dashboard()
            print(task['task_id'])
            return
    print('NO_CLAIMABLE_TASK')


def heartbeat(worker_id, task_id=None, status='idle'):
    workers=load_workers()
    for w in workers:
        if w['worker_id']==worker_id:
            w['status']=status; w['current_task_id']=task_id; w['last_heartbeat']=now()
    write_json(REG/'workers.json', {'workers':workers})


def run_task(args):
    ensure_dirs()
    tasks=latest_tasks()
    target=None
    for task in tasks.values():
        if task['assigned_worker']==args.worker and task['status'] in ['claimed','queued']:
            target=task; break
    if not target:
        print('NO_RUNNABLE_TASK'); return
    task=dict(target); task['status']='running'; task['updated_at']=now(); task['next_action']='Agent is producing artifact.'
    append_jsonl(STATE/'tasks.jsonl', task)
    run_id='RUN-%s-%s' % (date_id(), uuid.uuid4().hex[:8])
    run_dir=RUNS/run_id; run_dir.mkdir(parents=True, exist_ok=True)
    artifact_dir=ART/task['task_id']; artifact_dir.mkdir(parents=True, exist_ok=True)
    artifact=artifact_dir/'artifact.md'
    artifact.write_text("""---
type: artifact
component: agentic-nexus-smoke-test
task_id: %s
run_id: %s
created: %s
owner: %s
---

# Agentic Nexus Smoke-Test Artifact

## Requested outcome

%s

## Work performed

- Control plane accepted the manual task.
- Worker `%s` claimed the task.
- Agent `%s` produced this artifact.
- Evidence record and approval gate were generated.

## Evidence

- Task ID: `%s`
- Run ID: `%s`
- Artifact path: `%s`

## Safety

No network calls, production writes, merges, deploys, deletes, publishing, email, billing, auth, or database-policy changes were performed.

## Next action

Review approval record before any follow-up execution.
""" % (task['task_id'], run_id, now(), task['assigned_agent'], task['requested_outcome'], args.worker, task['assigned_agent'], task['task_id'], run_id, artifact))
    (run_dir/'run.log').write_text('started=%s\ntask=%s\nworker=%s\nartifact=%s\nstatus=artifact_ready\n' % (now(), task['task_id'], args.worker, artifact), encoding='utf-8')
    ev_id='EVID-%s-%04d' % (date_id(), len(read_jsonl(STATE/'evidence.jsonl'))+1)
    evidence={'evidence_id':ev_id,'created_at':now(),'linked_task':task['task_id'],'linked_project':task['project'],'source_path_or_url':str(artifact),'source_type':'artifact','date_gathered':dt.date.today().isoformat(),'freshness':'current','confidence_score':90,'claim_supported':'Agentic Nexus vertical slice produced a local artifact through queued worker execution.','contradiction_status':'none','business_relevance':'high','recommended_action':'Human should review approval gate before follow-up execution.','approval_required':task['approval_requirement']}
    append_jsonl(STATE/'evidence.jsonl', evidence)
    approval_id='APR-%s-%04d' % (date_id(), len(read_jsonl(STATE/'approvals.jsonl'))+1)
    approval={'approval_id':approval_id,'task_id':task['task_id'],'requested_action':'Approve or reject follow-up execution after smoke-test artifact review.','risk_level':task['risk_level'],'evidence_summary':'Artifact %s and evidence %s created.' % (artifact, ev_id),'status':'approval_pending','human_decision':None,'created_at':now()}
    append_jsonl(STATE/'approvals.jsonl', approval)
    task['status']='approval_pending'; task['updated_at']=now(); task['output_artifacts']=[str(artifact)]; task['validation_commands']=['python3 .agentic_nexus/scripts/agentic_nexus.py status']; task['next_action']='Human approval required before any follow-up execution.'
    append_jsonl(STATE/'tasks.jsonl', task)
    heartbeat(args.worker, None, 'idle')
    update_dashboard()
    print(str(artifact))


def update_dashboard():
    ensure_dirs()
    tasks=list(latest_tasks().values())
    evidence=read_jsonl(STATE/'evidence.jsonl')
    approvals=read_jsonl(STATE/'approvals.jsonl')
    workers=json.loads((REG/'workers.json').read_text(encoding='utf-8'))['workers'] if (REG/'workers.json').exists() else []
    status={'updated_at':now(),'tasks':tasks,'workers':workers,'evidence_count':len(evidence),'approval_count':len([a for a in approvals if a.get('status')=='approval_pending']),'next_action':'Review approval queue or create the next safe task.'}
    write_json(DASH/'status.json', status)
    lines=['# Agentic Nexus Command Center','', 'Updated: %s' % status['updated_at'], '', '## Workers']
    for w in workers:
        lines.append('- `%s` status=%s current_task=%s heartbeat=%s' % (w['worker_id'], w['status'], w.get('current_task_id'), w['last_heartbeat']))
    lines += ['', '## Tasks']
    if tasks:
        for t in tasks:
            lines.append('- `%s` %s project=%s worker=%s agent=%s next=%s' % (t['task_id'], t['status'], t['project'], t['assigned_worker'], t['assigned_agent'], t['next_action']))
    else:
        lines.append('- No tasks yet.')
    lines += ['', '## Approvals', '- Pending approvals: %s' % status['approval_count'], '', '## Evidence', '- Evidence records: %s' % status['evidence_count'], '', '## Next action', status['next_action'], '']
    (DASH/'status.md').write_text('\n'.join(lines), encoding='utf-8')


def status(_args):
    update_dashboard()
    print((DASH/'status.md').read_text(encoding='utf-8'))


def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest='cmd', required=True)
    sub.add_parser('init')
    ct=sub.add_parser('create-task'); ct.add_argument('--project', required=True); ct.add_argument('--type', required=True); ct.add_argument('--outcome', required=True); ct.add_argument('--priority', default='P2'); ct.add_argument('--risk', default='low')
    cl=sub.add_parser('claim'); cl.add_argument('--worker', required=True)
    rn=sub.add_parser('run'); rn.add_argument('--worker', required=True)
    sub.add_parser('status')
    args=p.parse_args()
    {'init':init,'create-task':create_task,'claim':claim,'run':run_task,'status':status}[args.cmd](args)

if __name__=='__main__':
    main()

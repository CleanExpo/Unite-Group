Task: build S2a only against spec revision 5 and locked w_d12e3c3508b3.
Base: c6e2103e42fda7e83f65982f11fab4f8f6f11c2a.
Routing: local-only senior implementation with independent local review; no new spend.
Ownership: lead_tests owns lead route, notifications and SendGrid; health_migration owns health, SQL and authenticated view; heartbeat owns heartbeat. Root integrates config, privacy, type tests and evidence.
Gates: locked run.sh tests/types/typetests/lint/env/heartbeat/migration; all required red controls and byte-identical restoration.
State: implementing, dependency links being restored offline.
Limits: no cloud, secrets, commit, push, PR or deployment. AC10/11/12/14 not run.
TaskCreate/TaskUpdate tools unavailable in this session; this local task record supplies the trail.

TaskUpdate: local C1-C7 all exit0; 23 red/restored command observations across20 plantings verified. Local build handoff ready; release/database gates held.

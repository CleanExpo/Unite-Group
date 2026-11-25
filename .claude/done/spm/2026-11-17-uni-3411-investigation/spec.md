# SPM Spec: Restoration World investigation engine (UNI-3411, part 1 of 2)

Header: v1, 17/11/2026, author Claude (Opus 5.5) for Phill McGurk. Amendments append below this line.

### Contents
1 Task · 2 Context · 3 Value · 4 Outcome · 5 Scope · 6 Existing capability · 7 Bench · 8 Judge · 9 Solution · 10 UX · 11 Technical · 12 Security · 13 Verification · 14 Stress · 15 Acceptance · 16 Goal · 17 Crew · 18 Handoff · 19 Recommendation

## 1. Task

UNI-3411 asks for IE-001, a playable indoor-environment investigation (one building, Five Whys) in Restoration World. Its content (causes, findings, sources) must come from the UNI-3410 research seed. That seed is not released: no remote branch, no PR, not on main (Grounded 17/11/2026: `gh api repos/CleanExpo/Unite-Group/branches` filtered on 3410|indoor returned nothing; `contents/docs/research/indoor-environment?ref=main` returned 404). Phill said on 17/11/2026: "Yes, start UNI-3411" on the parts that do not need the research.

This spec covers part 1: the engine. A job can carry an investigation: several possible causes, up to five steps taken one at a time, each step's finding rules causes out, every choice scores and explains why, an unsafe early action loses points and says why, and the player names a cause at the end while the causes still standing stay listed. Part 2 (IE-001 content from the seed, the cutaway rendering, video QA) waits for UNI-3410.

Intake defaults (Phill has not answered; work rests on these, reversible and local):
- A1 Outcome: the engine in the service plus the Godot client showing it, 2 PRs like UNI-3457.
- A2 Reason: IE-001 then goes in as data only.
- A3 Guardrail: only a fake SIMULATED fixture exercises it; it is never in the playable library; no health or exposure claims; founder merges.

## 2. Current context

- Service: CleanExpo/Unite-Group `apps/web/src/lib/restoration-world/`, worktree `D:\Restoration World\rw-service`, branch `rw/uni-3411-investigation` from main c86922abf (Grounded 17/11/2026: `git switch -c rw/uni-3411-investigation origin/main` exit 0).
- The reducer (`scenario.ts` reduceWorld) owns all job state. `library.ts` holds the 49 scenarios, their decisions, `revealJob` (the one rule for what a job shows, UNI-3457) and `checkLibrary` (load-time data checks). SCHEMA_VERSION is 8 (`scenario.ts:194`).
- Client: CleanExpo/Restoration-World (Godot 4). `client/core/rw_types.gd` is generated from `world.schema.json` and checked by `tools/check_types.py`. `client/ui/job_board.gd` shows stops, water call and decisions (`job_board.gd:295-347`).
- Done: contract for this branch is DRAFT w_0608eba26e1c; selftest ok (preflight).
- North Star: `Wiki/founder-operating-code.md` status UNVERIFIED (not read this session).
- Codex is the review lane (founder 17/11/2026). Cursor is out of usage.

## 3. Problem and value

Today a job is a fixed list of right-or-wrong questions. Indoor-environment work (dampness, condensation, leaks) is diagnosis: several causes look the same, tests rule some out, and the classic failure is treating the symptom (spray and paint over mould) before finding the cause. The game cannot teach that yet.

Value: the engine lets UNI-3411 IE-001, and later CARSI IE-001 to IE-004 cases (GP-721), ship as data. It moves Phill's App Store goal ($29/month, PMs and restorers; memory founder-goal-app-store) by adding the kind of case trainees cannot practise safely on real jobs. Cost: subscription work only, no new spend.

## 4. Desired outcome

A trainee on an investigation job: calls the stops, then sees a list of possible causes and the first step. Each step offers choices. Taking one shows what it found, which causes it rules out, its points and why. A choice like "spray and paint over it now" loses points and explains why. After the last step the trainee names the cause. The verdict says if it was right and lists the causes the evidence did not rule out. Then the job's normal decisions (if any) follow, and the debrief shows the score.

Hard-day case: the evidence leaves two causes standing. The engine must not pretend there is one answer: the accepted list can hold more than one cause, and the verdict names every cause still standing.

## 5. Scope

In:
- Service: investigation types, judging, reveal rule, load checks, reducer commands, schemaVersion 9, fixture used by tests only.
- Client: regenerated types, the job board shows the investigation and sends its commands, client tests with the fixture.

Out (part 2, after UNI-3410): IE-001 content, any real cause/finding text, the 3D cutaway and pathway overlays, video QA, frame budgets. Also out: any change to the 49 scenarios, the L2 claim, workforce, database, Supabase, Vercel.

## 6. Existing capability

Searched (capability, not name): `grep -n "investigat\|five whys\|cause\|rules out\|hypothes" apps/web/src/lib/restoration-world` found no investigation mechanic; decisions are single right-answer (`library.ts:277-288`, `judgeDecision` `library.ts:925`). Reuse: `revealJob` pattern (one rule for what shows), `checkLibrary` (load-time refusal), reducer command parsing (`scenario.ts:674-696`), schema generator `schema/gen-gdscript.ts`, client `job_board.gd` decision rendering. No new dependency.

## 7. Specialist bench receipt

T2 (F2 I0 N1 X1 S0; `tier.py 2 0 1 1 0` printed T2) · seats: architecture, test oracle, judge (disconfirming) · rounds max 2 · board_version and leveling_version per `references/moa-board.md` / `leveling.md` as installed. Seat verdicts are appended below when they return.

## 8. Judge challenge

Rubric /100 recorded with deductions after the judge seat returns. Hard floors: no security surface (S0); fully reversible (I0, unmerged branches); authority is Phill's typed "Yes, start UNI-3411".

## 9. Proposed solution

New file `investigation.ts` (types and pure judging), wired into `library.ts` and `scenario.ts`.

Data (per scenario, `INVESTIGATIONS: Partial<Record<ScenarioId, Investigation>>`, empty in production):
- `causes`: 2 or more `{ id, label }`, all open at the start.
- `steps`: 1 to 5, each `{ id, prompt, options }`; each option `{ id, label, finding, rulesOut: causeId[], points: integer, unsafe: boolean, why, source }`.
- `accepted`: 1 or more cause ids, the causes the sound path leaves standing.
- `simulated: true` (literal type), so no investigation can be typed without the label.

Job (schema v9) adds `investigation: JobInvestigation | null`:
- `causes`: all `{ id, label }` (labels only; the answer is not in a label by rule).
- `open`: cause ids not ruled out by the steps called so far (derived).
- `steps`: the steps called plus the next one, in order; an uncalled step shows only `id, prompt, options {id,label}`; a called step adds `call {optionId, finding, rulesOut, points, unsafe, why, source}`.
- `causeCall`: null until called, then `{ causeId, accepted, correct, stillOpen, why }`.
- `score`: sum of called points, plus the cause points once called; null until the first step is called.
- `simulated: true`.

Rules:
- Order: stops, then the water call where the job has one, then the investigation steps one at a time, then the cause call, then the job's decisions (if any), then finish. Diagnosis before remediation.
- Commands: `call-step {stepId, optionId}`, `call-cause {causeId}`. Refusals: `stops-not-called`, `water-not-called`, `invalid-command` (unknown id, a step not shown, a cause not in the list), `step-already-called`, `cause-already-called`, `steps-not-done` (cause before last step), `cause-not-called` (decision or finish before the cause).
- Cause judging: correct when the named cause is in `accepted` and still open. The why always lists every cause still open ("Not ruled out: ...") so alternatives stay visible. Cause points: +2 right, 0 wrong (constants, one owner).
- Unsafe: an option with `unsafe: true` must have negative points (load check), and its why must explain.
- revealJob is extended, not copied: it stays the one rule for what a job shows.
- checkLibrary refuses: fewer than 2 causes; 0 or more than 5 steps; a step with fewer than 2 options; duplicate ids; `rulesOut` naming an unknown cause; `accepted` empty or naming an unknown cause; an accepted cause that the best-points option of every step rules out (the sound path must leave it standing); an unsafe option with points >= 0; any empty finding, why or source.
- Fixture: `investigation.fixture.ts`, title and every line start "SIMULATED fixture", source "test fixture, not training content", no health, exposure, spore or standard claims. Tests inject it with `vi.mock('./library', ...)`; production `INVESTIGATIONS` stays `{}`.

## 10. UX requirements

Client job board: under the stops and water call, a "Possible causes" list (ruled-out causes struck through with a plain "ruled out" word, not colour alone), then each shown step: prompt, option buttons while open, then the finding, points and why after the call. After the last step, one button per open cause ("This is the cause"). Then the verdict. Text only, existing card style, no new art (Premium Visual rule 1 applies to marketing pages; this is the game UI).

## 11. Technical requirements

- TypeScript strict, no `any`, no new dependency. Pure functions; the reducer stays deterministic.
- Schema: `world.schema.json` v9 with `JobInvestigation`; `gen-gdscript.ts` regenerates `rw_types.gd`; `schema.test.ts` stays green.
- Existing 49-scenario behaviour unchanged: a job with no investigation has `investigation: null` and plays exactly as at v8.
- Client: `check_types.py` and `check_l2_values.py` exit 0; gdUnit tests cover the investigation panel with the fixture JSON produced by the service.

## 12. Security and privacy

No auth, PII, money, network or secrets touched (S0). Content risk: the engine could later carry health claims. Guard: `simulated: true` literal, fixture-only today, and part 2 content passes UNI-3410's non-diagnosis gates before it lands.

## 13. Verification plan

- CHECK: vitest restoration-world and strict tsc (check.cmd) exit 0.
- WALK: a hash-locked script plays the fixture through replayWorld, every option of every step and every cause, and checks at every step that the job JSON holds no finding, rulesOut, points, unsafe flag, why or source for an uncalled option, no accepted list before the cause call, no step beyond the next, and that refused commands return the named codes. It also replays all 49 scenarios and checks every job's `investigation` is null and the v8 job fields are unchanged apart from schemaVersion (positive control: the fixture job does show the called fields).
- CONTROLS: in a temp copy (never the worktree), each planted fault fails WALK or CHECK: all steps shown at once; finding shown before the call; accepted shown before the cause call; cause accepted before the last step; unsafe option with positive points passes checkLibrary; an open-cause list that ignores rulesOut.
- CLIENT: client worktree clean; check_types and check_l2_values exit 0; gdUnit tests exit 0.
- SCOPE: service diff touches only `apps/web/src/lib/restoration-world/`.
Sandbox: all runs local, no network, no production. Temp copies under the OS temp folder.

## 14. Loop and stress testing

Every option of every step and every cause (exhaustive on the fixture: steps x options x causes). Out-of-order commands at each stage. Replaying all 49 scenarios on every suited house for the no-change check.

## 15. Acceptance criteria (become the Done contract)

1. CHECK: `proof.py check` exits 0 (vitest restoration-world, then check.cmd strict tsc).
2. WALK: `proof.py walk` exits 0 (the WALK rules in section 13).
3. CONTROLS: `proof.py controls` exits 0 (each planted fault in section 13 fails; the clean copy passes).
4. CLIENT: `proof.py client` exits 0 (the CLIENT rules in section 13).
5. SCOPE: `proof.py scope` exits 0.
proof.py and walk.mts are hash-locked in the contract.

## 16. Goal command

`/goal UNI-3411 part 1: investigation engine (service + client), schemaVersion 9, criteria CHECK WALK CONTROLS CLIENT SCOPE of the locked contract pass on the final HEAD; Codex review PASS; draft PRs green on GitHub; Phill merges.`

## 17. Implementation sequence and crew

1. Service types, judging, reveal, load checks, reducer, schema v9, fixture, tests (lead, Opus).
2. Client types regen, job board panel, gdUnit tests (lead).
3. proof.py and walk.mts (lead), lock.
4. Review: Codex (independent lane). Release from WSL per memory rw-release-from-wsl.
Loadout: spm (plan), engineering-requirements (gate), done-harness (contract), pr-release-gate (release), unslop (PR text). Pi Durable: UNAVAILABLE (not needed).

## 18. Session-handoff seed

Branch `rw/uni-3411-investigation` (service), client branch to be cut from Restoration-World main. Contract w_0608eba26e1c. Part 2 waits on UNI-3410 release.

## 19. Recommendation

Build part 1 now. It is reversible, needs no research content, and makes IE-001 a data-only change once UNI-3410 lands.

---

## Amendment v2, 17/11/2026: bench round 1 folded (convergent criticism, no round 2)

Seven seats reviewed v1 cold (boris, eng-failure, eng-observability, eng-test, eng-contract, eng-frontend, eng-release). Their must-fix items converge: four seats found the fixture seam, three found the stuck-player path, three found the client order copy, two found the card height. Per leveling.md "Convergent criticism", every agreed must-fix is folded here and no round 2 runs. Where v2 and v1 differ, v2 wins.

### V2-1 Fixture seam (replaces the vi.mock plan)

The investigation table is passed in, never mocked. `revealJob(job, tables)`, `checkLibrary(houses, decisions, investigations)`, `reduceWorld(state, input, tables)` and `replayWorld(commands, tables)` take an optional table argument that defaults to the production `INVESTIGATIONS`, a frozen empty object. Only vitest, walk.mts and the client's l2_values.ts pass the fixtures. vi.mock is not used. No file reachable from `service/serve.ts` imports `investigation.fixture.ts` (SCOPE checks it).

### V2-2 Invariants (replaces the best-path rule)

A finding is a fact: a poor choice wastes time or is unsafe, it never produces false evidence. checkLibrary refuses an investigation unless:
- (a) no option's rulesOut contains an accepted cause, so the accepted causes stay open on every path and the player can never be stuck;
- (b) each step has exactly one option with the most points (no ties);
- (c) taking the most-points option at every step leaves open exactly the accepted causes;
- (d) every unsafe option has points below 0;
- (e) 2 to 6 causes, 1 to 5 steps, 2 to 4 options per step, unique ids, rulesOut and accepted name only listed causes, accepted is not empty;
- (f) no empty text, and text caps: prompt 160, label 80, finding 200, why 240, source 80 characters.
call-cause accepts any listed cause. It is correct when the cause is accepted. The why always names every cause still open ("Not ruled out: ...").
Overturn condition: if the UNI-3410 IE-001 design needs a misleading test result as a teaching point, rule (a) becomes "every path leaves at least one cause open", checked by walking every path.
Recorded disagreement: eng-test asked for a fixture state where an accepted cause is ruled out and judged wrong. Rule (a) makes that state impossible by construction, so the chair (boris) ruling stands and that test is dropped.

### V2-3 Wire shape

- A step always carries `call: null` until called, like JobDecision. An uncalled option is exactly `{ id, label }`.
- JobInvestigation keys: `causes, open, steps, causeCall, score, simulated`.
- causeCall, after the call: `{ causeId, correct, acceptedCauses, stillOpen, why }`. There is no boolean named `accepted`.
- score: null until the first step is called, then the sum of called points, plus 2 once the cause is called right (CAUSE_POINTS, one owner).
- New ResultCode values: `step-already-called`, `cause-already-called`, `steps-not-done`, `cause-not-called`. New CommandType values: `call-step`, `call-cause`. parseCommand emits them with a fixed key order.
- call-step or call-cause on a job with no investigation returns `invalid-command`.
- The job's decisions are shown only after the cause call (revealJob), and finish-job refuses with `cause-not-called` before it.

### V2-4 Client

- One helper decides what may be called: stops called, water called where needed, and investigation null or its causeCall set. The decision buttons, the Finish button and the briefing all use it. No other copy of the order exists in the client.
- The step and cause buttons go through the send gate, are in `command_buttons()`, are disabled while a send is out, and send `step_called` / `cause_called` signals that world.gd connects beside `decision_called`. After a rebuild, focus moves to the first enabled button.
- The panel shows a SIMULATED label when `simulated` is true. Ruled-out causes carry the words "ruled out". A called step collapses to one line (choice, finding, points); the why and source show for the latest call only.
- Debrief: "N of M calls right" is unchanged for every job; an investigation adds its own line "Investigation: X points. Cause: right/wrong." The cause call is not counted in N of M.
- `displayed()` includes the investigation text, and `holds_content()` is true at every stage of the largest fixture.
- A new client test covers a v9 client meeting a v8 service (the mismatch text shows).

### V2-5 Fixtures and the client fixture file

- Two fixtures, both SIMULATED: SHAPE (at least 3 causes, 2 accepted, at least 2 steps, one unsafe option, one option that rules out nothing, every finding, why and source string unique) and MAX (5 steps, 6 causes, 4 options per step, every text at its cap). walk.mts checks both shapes before it walks.
- `l2_values.ts` writes `client/harness/investigation_jobs.json` from the service with the fixtures passed in. `check_l2_values.py` compares it byte for byte, and its control run plants a drift that it must catch.

### V2-6 Verification additions

- WALK also: (1) builds a golden copy from main c86922abf in a temp checkout by replaying the same command scripts over all 49 scenarios on every suited house, and compares the v9 output byte for byte as canonical JSON after removing exactly `investigation` and setting `schemaVersion` to 8; (2) searches the whole serialised job for each uncalled option's unique finding, why and source strings, and checks the keys `points`, `unsafe` and `acceptedCauses` by name; (3) asserts the exact refusal code for every out-of-order command; (4) sends call-step and call-cause to all 49 scenarios and expects `invalid-command`; (5) sends malformed call-step and call-cause payloads and expects a named code, never a throw.
- schema.test.ts checks the exact keys of JobInvestigation, an uncalled step, an uncalled option, a step's call and causeCall, before the first step, mid-way and after the cause call, with the fixture passed in.
- The service logs a 500: http-server writes the error stack to stderr, and the service records the attempt with status 500.
- CONTROLS plants, each in a temp copy and each required to fail WALK or CHECK: all steps shown at once; a finding shown before its call; accepted causes shown before the cause call; a cause call accepted before the last step; an unsafe option with points 0 or more loads; open ignores rulesOut; correct ignores accepted; the why leaves out one open cause; CAUSE_POINTS not 2; rule (a) removed; rule (b) removed; steps-not-done returned as invalid-command; decisions shown before the cause call; a v8 field changed (a judgeDecision why); the reducer adds a key the schema lacks; a throwing reducer branch leaves no attempt entry.
- CLIENT also: the service worktree is clean, and its HEAD is printed in the receipt; a dirty service tree makes CLIENT fail.

### V2-7 Release and part 2

- Merge order: service PR first, then the client PR straight after. Each PR body names the other and its head SHA.
- After merge, whoever restarts the local service checks `GET http://127.0.0.1:8787/health` shows schemaVersion 9 and the client shows no mismatch. Until then the change is merged, not running.
- A2 corrected: IE-001 is not data-only. Part 2 must either attach it to one of the 49 scenarios (that scenario's play order changes, and its fixtures and client tests are rerun) or add a 50th scenario id (the 49-count check in checkLibrary changes). Section 19's claim is corrected to "IE-001 needs its data plus that one placement decision".

# LLM Code-Generation Roots — the evidence record behind the Ground-Truth Standard

> **Status**: Companion to `.claude/rules/ground-truth-standard.md`. The rule
> binds; this record evidences. Every historical claim below was verified against
> a primary source fetched live on 18/08/2026 (through this container's fetch
> relay — direct egress to most academic hosts is proxy-denied here, and each
> entry's line says exactly what was fetched); anything that could not be
> verified is tagged `[UNCONFIRMED]` and listed in the register at the end.
> Every repo claim was re-verified against the artefact itself on 18/08/2026
> (path and lines cited), not inherited from any prior session's prose.
> Relationship to `docs/agent-governance-playbook.md`: that document is a DRAFT
> prior synthesis whose §8 gap register seeded the gap analysis consumed here;
> this record consumes it without ratifying it — ratification is the founder's
> act. Locale: en-AU; verbatim quotations keep their original spelling.

## 1. The plain one-page version

**What goes wrong.** When robots write code, each robot tends to believe the
robot before it, and nobody looks at the real thing. Robot one says "the tests
pass". Robot two builds on that sentence without running the tests. Robot three
builds on robot two. That is the Chinese-whispers stack: a tower of sentences
standing where a tower of proof should be. The fix is not a smarter robot — it
is a rule that every robot must go back and look: at the real folder, the real
build log, the real database, the real ticket.

**The nine rules, in plain words.**

1. Don't trust the last robot's story — go look at the real thing yourself.
2. Before you build something, check it isn't already built. Before you call a
   function, check it exists.
3. Checking one piece only proves that piece. Say what you checked and what you
   couldn't see from where you stood.
4. A message saying "it worked" is not proof. The machine's own verdict — the
   exit code, the file that actually changed — is proof.
5. Try to break your own work before showing it to anyone.
6. Ten opinions from the same brain are one opinion. Real second opinions come
   from genuinely different checkers.
7. Every time work crosses a boundary — one branch to another, one session to
   the next — re-check the assumptions it carries.
8. Never write down a number that goes stale — recompute it fresh each time. A
   document saying "I am correct" proves nothing.
9. Know which step of the job you are on, and never claim a later step before
   you have the receipts for the earlier one.

**The twelve steps of the job (the Ladder), in plain words.** Design the thing.
Build it in small proven pieces. Test that the tests really test. Get it
attacked by an independent reviewer. Put the pieces together and prove they
still work together. Rehearse on a practice stage. Ship it, with the receipts
tied to the exact version shipped. Walk through it like a customer. Get the
client's signed yes. Hand over the keys. Stand behind it while it runs. Send
the invoice and get paid. **The job is done when the customer pays and it still
works** — everything before that is a step, not the finish line.

## 2. The historical evidence chain

The failure modes of LLM code generation are not new. They were named, incident
by incident, across ninety years of computing. Two texts are the poles of the
whole record: Naur 1985 (a program is the theory in its builders' minds — text
alone cannot carry it, so a fresh mind must rebuild the theory from the
artefact) and Thompson 1984 (trust chained through unverified intermediaries is
not trust). An LLM session is a permanently theory-less programmer joining the
team for one day: both poles apply to it with full force.

### 2.1 Foundations, 1936–1949 (+ Codd 1970)

**Turing 1936 — computation is explicit, finite, checkable.**
In plain words: a program is nothing but small steps a machine can check.
> "The 'computable' numbers may be described briefly as the real numbers whose
> expressions as a decimal are calculable by finite means."
Verified live 18/08/2026: Turing, "On Computable Numbers" (1936), opening
sentence — https://www.cs.virginia.edu/~robins/Turing_Paper_1936.pdf

**Goldstine & von Neumann 1947–48 — plan before code.**
In plain words: the first programming doctrine ever written says draw the plan
first.
> "Coding begins with the drawing of the flow diagrams. This is the dynamic or
> macroscopic stage of coding."
Verified live 18/08/2026: Planning and Coding of Problems for an Electronic
Computing Instrument (IAS), §7.9 —
https://www.ias.edu/sites/default/files/library/pdfs/ecp/planningcodingof0103inst.pdf

**Wilkes 1949 — debugging dominates, from day one.**
In plain words: the man who ran the first practical stored-program computer
learnt within weeks that finding his own errors would be most of the work.
> "a good part of the remainder of my life was going to be spent in finding the
> errors in my own programs"
Verified live 18/08/2026: Wilkes as quoted by Campbell-Kelly, CACM 54(9), 2011
— https://cacm.acm.org/opinion/in-praise-of-wilkes-wheeler-and-gill/
(The 1985 Memoirs page itself was not fetchable from here; the CACM printing is
the verified source.)

**Codd 1970 — derive, never store.**
In plain words: a stored copy of something computable goes stale and lies.
> "strongly redundant if it contains at least one relation that possesses a
> projection which is derivable from other projections of relations in the set"
Verified live 18/08/2026: Codd, CACM 13(6) 1970, §2.2.1 —
https://www.seas.upenn.edu/~zives/03f/cis550/codd.pdf

### 2.2 The crisis named, 1968–1972

**NATO Garmisch 1968 — the software crisis.**
In plain words: the field admitted, out loud, that building software was in
crisis, and demanded engineering discipline.
> "participants came to realize the degree of common concern about what some
> were even willing to term the 'software crisis'"
Verified live 18/08/2026: Randell's archive page for the NATO reports —
http://homepages.cs.ncl.ac.uk/brian.randell/NATO/NATOReports/index.html

**McIlroy 1968 — look on the shelf before you build.**
In plain words: the founding statement of reuse, from the same conference.
> "I claim we have done enough of this to start taking such things off the
> shelf."
Verified live 18/08/2026: McIlroy, "Mass Produced Software Components", NATO
1968 pp. 138–155, his own transcription —
https://www.cs.dartmouth.edu/~doug/components.txt

**Dijkstra 1970 — testing shows presence, never absence.**
In plain words: a passing check proves only what it checked.
> "Program testing can be used to show the presence of bugs, but never to show
> their absence!"
Verified live 18/08/2026: EWD249, "On the reliability of mechanisms" —
https://www.cs.utexas.edu/~EWD/transcriptions/EWD02xx/EWD249/EWD249.html

**Dijkstra 1972 — the humble programmer.**
In plain words: good programmers work within the limits of their own heads.
> "The competent programmer is fully aware of the strictly limited size of his
> own skull; therefore he approaches the programming task in full humility"
Verified live 18/08/2026: EWD340, Turing lecture —
https://www.cs.utexas.edu/users/EWD/transcriptions/EWD03xx/EWD340.html

**Conway 1968 — systems copy their builders' communication.**
In plain words: how the builders talk to each other becomes the shape of the
system — including a relay of agents playing whispers.
> "organizations which design systems … are constrained to produce designs
> which are copies of the communication structures of these organizations"
Verified live 18/08/2026: Conway, "How Do Committees Invent?", Conclusion —
http://www.melconway.com/Home/Committees_Paper.html

**Hoare 1969 — correctness is a claim about all inputs.**
In plain words: what a program does is provable, not vibes.
> "the elucidation of sets of axioms and rules of inference which can be used
> in proofs of the properties of computer programs"
Verified live 18/08/2026: Hoare, CACM 1969, abstract —
https://dl.acm.org/doi/10.1145/363235.363259

**Royce 1970 — the misread waterfall says "do it twice".**
In plain words: the paper everyone cites for single-pass delivery actually
warns that single-pass delivery fails.
> "I believe in this concept, but the implementation described above is risky
> and invites failure."
Verified live 18/08/2026: Royce, WESCON 1970, immediately after Figure 2; the
paper's own §"STEP 3: DO IT TWICE" —
https://www.cs.umd.edu/class/spring2003/cmsc838p/Process/waterfall.pdf

**Weinberg 1971 — egoless programming.**
In plain words: attachment to your own code blinds review; the work must be
attackable.
Verified live 18/08/2026: publisher's page for The Psychology of Computer
Programming (topics incl. egoless programming) —
http://www.dorsethouse.com/books/psy.html

**Parnas 1972 — modules hide decisions; interfaces are contracts.**
> "Every module in the second decomposition is characterized by its knowledge
> of a design decision which it hides from all others."
Verified live 18/08/2026: Parnas, CACM 1972 —
https://www.win.tue.nl/~wstomv/edu/2ip30/references/criteria_for_modularization.pdf

### 2.3 Verification and evidence, 1974–1986

**Lehman 1974/1980 — evolving programs decay unless tended.**
> "As an evolving program is continually changed, its complexity, reflecting
> deteriorating structure, increases unless work is done to maintain or reduce
> it."
Verified live 18/08/2026: Lehman, Proc. IEEE 1980 —
http://users.ece.utexas.edu/~perry/education/SE-Intro/lehman.pdf

**Brooks 1975 — conceptual integrity above all.**
In plain words: one coherent mind's design beats a committee of layers.
> "I will contend that conceptual integrity is the most important consideration
> in system design."
Verified live 18/08/2026: The Mythical Man-Month ch. 4, publisher's sample —
http://ptgmedia.pearsoncmg.com/images/0201835959/samplechapter/chap4.html

**Fagan 1976 — inspection beats late testing on cost.**
> "Rework done at these levels is 10 to 100 times less expensive than if it is
> done in the last half of the process."
Verified live 18/08/2026: Fagan, IBM Systems Journal 15(3) 1976 —
https://www.ida.liu.se/~TDDC90/labs/lab-papers/fagan76.pdf

**Knuth 1977 — proof is not execution.**
In plain words: even a proof is not the same as running the thing.
> "Beware of bugs in the above code; I have only proved it correct, not tried
> it."
Verified live 18/08/2026: Knuth's own FAQ (drafted 22/03/1977) —
https://www-cs-faculty.stanford.edu/~knuth/faq.html

**Hoare 1980 — simplicity is the precondition of verifiability.**
> "so simple that there are obviously no deficiencies and the other way is to
> make it so complicated that there are no obvious deficiencies"
Verified live 18/08/2026: "The Emperor's Old Clothes", CACM 1981 scan —
https://people.eecs.berkeley.edu/~prabal/resources/osprelim/Hoa81.pdf

**Thompson 1984 — the Chinese-whispers theorem.**
In plain words: you cannot trust a layer you did not verify, no matter how many
trustworthy-looking layers sit between you and it.
> "The moral is obvious. You can't trust code that you did not totally create
> yourself."
Verified live 18/08/2026: "Reflections on Trusting Trust", CACM 27(8) 1984 —
https://people.cs.umass.edu/~emery/classes/cmpsci691st/readings/Sec/Reflections-on-Trusting-Trust.pdf

**Saltzer, Reed & Clark 1984 — only the endpoints can verify the whole.**
> "can completely and correctly be implemented only with the knowledge and help
> of the application standing at the end points of the communication system"
Verified live 18/08/2026: "End-to-End Arguments in System Design", author's
copy — https://web.mit.edu/Saltzer/www/publications/endtoend/endtoend.pdf

**Naur 1985 — programming as theory building.**
In plain words: the program is the theory in the builders' heads. Text alone —
docs, handoffs, comments — cannot carry it. A new mind must rebuild the theory
from the artefact. An LLM is a new mind every session.
> "not to produce programs, but to have the programmers build theories of the
> manner in which the problems at hand are solved by program execution"
Verified live 18/08/2026: Naur, Microprocessing and Microprogramming 15 (1985)
253–261, author's own reprint page — http://www.naur.com/comp/c1-4.html

**Meyer 1986 — design by contract.**
> "The precondition expresses requirements that any call must satisfy if it is
> to be correct; the postcondition expresses properties that are ensured in
> return"
Verified live 18/08/2026: Meyer, IEEE Computer, author's archive —
https://se.inf.ethz.ch/~meyer/publications/computer/contract.pdf

**Knight & Leveson 1986 — independence must be engineered.**
In plain words: teams who never spoke to each other still wrote programs that
failed on the same inputs. Diversity of failure has to be designed, not
assumed — N copies of one lens are one lens.
> "the number of tests in which more than one program failed was substantially
> more than expected"
Verified live 18/08/2026: Knight & Leveson, UVA repository record —
https://libraopen.library.virginia.edu/entities/publication/4ac33eeb-79b4-46e4-aef9-f6ec56a62286

**Parnas & Clements 1986 — fake the rational process, never the evidence.**
In plain words: present the clean staged story of the work — while admitting
the real path iterated — but never fake the receipts.
> "The good news is that we can fake it. We can present our system to others as
> if we had been rational designers"
Verified live 18/08/2026: "A Rational Design Process: How and Why to Fake It" —
http://users.ece.utexas.edu/~perry/education/SE-Intro/fakeit.pdf

### 2.4 Catastrophes as evidence, 1985–1999

**Therac-25 (Leveson & Turner 1993) — reuse without understanding kills.**
> "Reusing software modules does not guarantee safety in the new system to
> which they are transferred and sometimes leads to awkward and dangerous
> designs."
Verified live 18/08/2026: IEEE Computer 1993 scan —
https://www.cs.columbia.edu/~junfeng/08fa-e6998/sched/readings/therac25.pdf

**Ariane 5 Flight 501 (1996) — the canonical whispers-stack disaster.**
In plain words: working Ariane 4 code was reused without re-checking its
assumptions against the new rocket. Thirty-seven seconds.
> "This time sequence is based on a requirement of Ariane 4 and is not required
> for Ariane 5."
Verified live 18/08/2026: Inquiry Board report (ESA), archived full text —
http://sunnyday.mit.edu/nasa-class/Ariane5-report.html

**Mars Climate Orbiter (1999) — the unchecked interface contract.**
> "the root cause for the loss of the MCO spacecraft was the failure to use
> metric units in the coding of a ground software file"
Verified live 18/08/2026: MCO Mishap Investigation Board Phase I report, NASA
Lessons Learned — https://llis.nasa.gov/llis_lib/pdf/1009464main1_0641-mr.pdf

### 2.5 Modern restatements

**Lamport — writing exposes sloppy thinking; specify above the code.**
> "Writing is nature's way of letting you know how sloppy your thinking is."
Verified live 18/08/2026: Lamport, "Why We Should Build Software Like We Build
Houses" (author's copy; the same line is the Guindon-attributed epigraph of
Specifying Systems) — https://lamport.azurewebsites.net/pubs/wired.pdf

**Ousterhout 2018 — complexity is incremental; zero tolerance.**
> "Complexity is incremental … Once complexity arises, hard to eliminate …
> Must adopt a zero-tolerance attitude: everything matters."
Verified live 18/08/2026: Ousterhout's own CS190 lecture notes (A Philosophy of
Software Design chs. 1–2) —
https://web.stanford.edu/~ouster/cgi-bin/cs190-winter18/lecture.php?topic=complexity

## 3. The nineteen observed failure modes

Every row is an incident recorded in this repository; repo evidence re-verified
against the artefact on 18/08/2026. Modes map to the owning principles of the
Ground-Truth Standard (P1–P9).

| # | Mode (plain name) | Repo evidence [VERIFIED 18/08/2026] | Historical root | Owns |
|---|---|---|---|---|
| 1 | Rebuilt what already existed | Commit `8854644` (PR #1020) body, §"WHAT I DID NOT LOOK FOR, AND SHOULD HAVE"; `docs/decisions/ARR-006-engineering-evidence-framework.md:34-38` (Concierge OS nearly rebuilt; 49-tool-call sweep) | McIlroy 1968 | P2 |
| 2 | Trusted a prior session's prose over git | `docs/session-handoffs/handoff-20260717-mission-nexus-constitution.md:25-27` — a handoff claimed "main @ `8585c147` … safe to stop"; main was 116 commits ahead at `52f4ee07` | Naur 1985 | P1 |
| 3 | Validated the part, ignored the whole | `CLAUDE.md:91-105` — ~20 defects across PRs #1017/#1018, "essentially all … one shape" | Dijkstra 1970; Saltzer 1984 | P3 |
| 4 | False green — message vs exit code | `CLAUDE.md:102` — "Three silent-success bugs survived review precisely because the human-readable output looked fine" | Wilkes 1949; Knuth 1977 | P4 |
| 5 | The gate that never ran; the empty evidence sink | `.harness/learning/` — five 0-byte `.jsonl` files (ls verified); `scripts/ci-evidence-manifest.mjs:7-10` — required check green with 3 of 22 tests executed (UNI-2567) | Fagan 1976 | P4 |
| 6 | Hallucinated delivery claim | `.spm/2026-07-16-audit-reconciliation.md:93` — "run2's coverage note is a hallucinated delivery claim" (UNI-2288) | Knuth 1977 | P9 |
| 7 | Self-attestation as evidence | `.spm/2026-07-17-strategic-architecture-review.md` §C8 — "armed in prod" was a one-line doc commit; 183 Done tickets, zero merge evidence | Thompson 1984 | P1, P9 |
| 8 | Container-scoped absence reported as system absence | `CLAUDE.md:83-90` — "Container scoping is not absence … say 'unavailable from here', never 'not configured'" | Saltzer 1984 | P3 |
| 9 | Failed read rendered as honest-empty, then written on | `.spm/2026-07-16-audit-reconciliation.md` D002–D063 family — "failed POST still clears+closes form … false success" | Hamilton-era fail-loud doctrine; positive controls (ARR-006 §2) | P4 |
| 10 | Stacked PRs stranded off `main` | `AGENTS.md:13-16` — PRs #281/#282/#283 based on a feature branch; recovered via #285 | Brooks 1975 (integration) | P7 |
| 11 | Re-orientation loops — too many work registers | `CLAUDE.md:195-196` — "Six places to look for work is why sessions re-orient instead of building" (UNI-2523) | Brooks 1975 (conceptual integrity) | P1 |
| 12 | Lapping — each fix introduces the next defect | `docs/session-handoffs/handoff-20260814-0012-branch-split-slice1-merged.md` §9 — six consecutive rounds, every finding introduced by the previous fix | Lehman 1974 | P5 |
| 13 | Tests passing for the wrong reason | `scripts/swarm/selftest.mjs:5-9` — three times a test's NAME claimed more than its BODY exercised | Dijkstra 1970; mutation-control practice | P3 |
| 14 | Documents asserting their own status | `NORTH-STAR.md:40` — self-retraction of a false registration claim ("the unearned-authority claim") | Parnas & Clements 1986 (narrative ≠ evidence) | P8 |
| 15 | Evidence bound to the wrong thing | `scripts/ci-evidence-manifest.mjs:18,36-37` — "A file cannot vouch for itself"; "binding the JOB never bound the FILE" | Thompson 1984 (provenance) | P3, P7 |
| 16 | Correlated reviewers counted as independent | Commit `fdb7c6c` (PR #1018) §"LINEAGE, NOT IDS"; `scripts/swarm/lib/lineage.mjs:4-16` — one model under three aliases read as a three-model quorum | Knight & Leveson 1986 | P6 |
| 17 | A defect that hid the code from review | Commit `76c13c1` (PR #1017) — the NUL byte: TypeScript compiled, 68 tests passed, all 17 CI checks green, and no reviewer could see a line of the file | Therac-25 (a defect that disables the safety system) | P5 |
| 18 | Acting on an instruction without checking it can work | Commit `76c13c1` body — the sandbox repoint "cannot achieve what it was asked for — including because MY OWN advice in #1007 recommended it" | Royce 1970; Ariane 5 | P7 |
| 19 | Committed derived values decay | `FOUNDER-QUEUE.md:31` — "F2 and F6 sat at 41 while the real answer was 42, one day after they were written" | Codd 1970 | P8 |

## 4. The fold matrix — completeness as a checkable assertion

Assertion: **every mode above is owned by at least one principle, and every
principle owns at least one mode.** Check it by reading the Owns column:
P1{2,7,11} · P2{1} · P3{3,8,13,15} · P4{4,5,9} · P5{12,17} · P6{16} ·
P7{10,15,18} · P8{14,19} · P9{6,7}. No mode is orphaned; no principle is
speculative. A future mode that fits no principle is a signal to amend the rule
— by its own amendment path, not silently (SOURCE-OF-TRUTH rule 7).

## 5. The Ladder, explained

**Why rungs 9–12 are not new lifecycle states.** UNI-2517 (Linear,
founder-authored, P0) defines the earned lifecycle and bans competing finish
lines: prompt controls "must consume one machine-readable lifecycle rather than
define local meanings." The Ladder therefore consumes: rungs 1–8 are UNI-2517's
states grouped for plain reading; rungs 9–12 (Acceptance, Handover, Warranty,
Payment) are the population of UNI-2517's **outcome** evidence class on the way
to `COMPLETE` — "intended customer/business behaviour verified after release",
carried to the commercial endpoint NORTH-STAR.md names as the metric of record
(`NORTH-STAR.md:26`).

**Reconciliation with the earlier state machine.**
`apps/web/.claude/rules/execution-mode-transition.md:22-29` defines
BUILD_AUTHORISED → … → RELEASE_READY with the same state names — an earlier,
apps/web-scoped cut of the same machine, ending three states short of
UNI-2517's `COMPLETE`. UNI-2517 is the founder-authored SSOT; the apps/web file
is prior art, not a competitor. Its completion rule ("A build is not complete
because a plan exists, code was written, a commit exists, a PR opened, CI
passed, or a deployment returned success", line 76) is fully preserved in the
Ladder. Any future divergence is FLAGGED for founder decision, not edited
silently from here.

**A worked AAA example.** A feature at rung 5 (Integrate / CI_GREEN) claims
AAA. Applicable evidence classes there: structural, implementation,
behavioural, integration. AAA requires each proven `[VERIFIED]` and bound to
the exact SHA — e.g. the CI evidence manifest's completeness verdict for that
SHA, not a green badge (a suite that executed zero tests is not evidence,
`config/ci-evidence-manifest.json:3`). If the vitest receipts are from
yesterday's SHA: AA. If the claim rests on "CI looked green": A. If the
required suite self-skipped: FAIL — that is UNI-2567, the incident that built
the manifest. The overall rating of a multi-rung claim is the minimum rung —
an AAA build with a FAIL acceptance rung is a FAIL claim, because the customer
outcome is the point (NORTH-STAR: green gates are the means, not the goal).

## 6. Doctrine reconciliation — consumed, corrected, not duplicated

**Consumed by reference (never restated):** the Evidence Standard
(`.claude/rules/fabel-evidence-standard.md`); the fable-engine approval gate;
the Waterline classes (`docs/constitution/EPIC-000-nexus-engineering-constitution.md:263-281`);
UNI-2517; the standing lesson (`CLAUDE.md:91-105`); apps/web prior art
(`execution-mode-transition.md`, `slop-prevention.md`, `verification-gate.md`,
`core.md`); the absent-register rule
(`docs/mission-control/harness-wrapper-contract.md:157-158`).

**Corrected — enforcement this record does NOT cite as live**, verified absent
on 18/08/2026: the review-board CI (`apps/empire/.github/workflows/` no longer
exists); `design-lint.yml` (cited by `.claude/DESIGN.md`, never created);
`.review-metrics.jsonl` (absent); `.harness/learning/` capture hooks (never
shipped — the five sinks are 0-byte). The Ground-Truth Standard names its own
unenforced surface honestly (its §"What this rule does not enforce").

**Recommended mechanisms, not built here:** a dead-doctrine detector (G7); a
doctrine-layer precedence rule (G8); mechanical enforcement of the required
lines — a CI grep — and a root SessionStart hook (G10). G10 is the recommended
first follow-up: it is the cheapest way to convert the rule from advisory to
enforced, per the repo's own verdict that "the constraint is enforcement, not
doctrine" (`docs/session-handoffs/handoff-20260717-mission-nexus-constitution.md:144-146`).

## 7. The citation contract

Every historical quotation in this record carries a
`Verified live <date>: <fact> — <source URL>` line resolved during authorship,
or is tagged `[UNCONFIRMED]` in the register below. A quotation that loses its
source in a future edit reverts to `[UNCONFIRMED]` — it does not keep its
status by inertia (P8: derive, never store). Repo citations name path and
lines; a repo citation that no longer matches its artefact is a defect in this
record, not in the artefact.

## [UNCONFIRMED] register

- **Gall 1975, "A complex system that works is invariably found to have evolved
  from a simple system that worked."** The book's existence and 1975 first
  edition are verified (Internet Archive record,
  https://archive.org/details/systemantics00john), but the sentence itself was
  not readable from this container (scan access-restricted; the author's former
  site is defunct). `[UNCONFIRMED]` as a verbatim quotation; not used in the
  rule's table.
- **"Negative code" as a McIlroy quotation.** No primary source found this run;
  only uncited attributions. Not presented as a McIlroy quotation anywhere in
  this record or the rule. McIlroy's verified primary artefact (Mass Produced
  Software Components) carries the reuse principle instead.
- **Wilkes' Memoirs 1985 exact page wording.** The CACM 2011 printing is
  verified (used above); the book page itself was not independently fetchable
  from here.

# Evidence and acceptance — Nexus Idea-to-DONE v0.1

15 October 2026 · Scope: product definition and next build prompt

## 1. Evidence register

| ID | Source and observation | Supports | Limitations |
|---|---|---|---|
| E01 | [Original intake](SOURCE_INTAKE.txt), supplied by Phill | Research-only submission boundary, adaptive discovery, evidence pack and simulation example | Supplied intent and proposed workflow; not external validation of demand, integrations or feasibility |
| E02 | Session answer: “Define the intake/research product and create its next build prompt” | Current deliverables | No runtime implementation requested this session |
| E03 | Pressure question answered: “Full operation through launch, onboarding and payment verification” | Full product scope, including delivery and commercial operation | Does not specify a particular provider, budget or per-idea revenue target |
| E04 | [SETUP](../../SETUP.md) and workspace file inspection | Pi-CEO is a staging bundle; no runnable app manifest here | Does not establish the current live application's architecture |
| E05 | [Nexus master specification](../nexus-command-center/NEXUS_AUTONOMOUS_COMMAND_CENTER_SPEC.md), [operating contract](../nexus-command-center/AGENT_OPERATING_CONTRACT.md), [proposed schema](../nexus-command-center/cc_schema_apply.sql) | Existing intended intake, queue, evidence, approvals and tool-broker concepts to reuse | Documentation and proposed SQL are not runtime evidence; no migrations executed |
| E06 | [UNI-2182](https://linear.app/unite-group/issue/UNI-2182/nexus-mvp-build-unified-work-intake-api-endpoint-that-parses-natural), read 15 October 2026 | Tracker marks intake API Done; attachment points to [PR 424](https://github.com/CleanExpo/Unite-Group/pull/424) | PR contents, merge and live route were not independently verified |
| E07 | [UNI-2192](https://linear.app/unite-group/issue/UNI-2192/nexus-cli-plain-english-work-item-intake-command-with-project-router), [UNI-2197](https://linear.app/unite-group/issue/UNI-2197/nexus-cli-plain-english-work-intake-command-with-project-router), read 15 October 2026 | Both similar CLI intake tickets are Canceled; duplicate/reuse discovery is necessary | Cancellation does not prove CLI capability is absent; inspect current source and rationale |
| E08 | [Lovable Plan mode](https://docs.lovable.dev/features/plan-mode), retrieved 15 October 2026 | Documented pattern: investigate, review/edit/version a plan, approve before building | Official feature documentation only; no hands-on evaluation or purchasing recommendation |
| E09 | [Ask Devin](https://docs.devin.ai/work-with-devin/ask-devin), retrieved 15 October 2026 | Documented pattern: code-context investigation and tailored prompt handoff with session status | Does not establish support for this user's accounts or research/business workflow |
| E10 | [Miro AI overview](https://miro.com/ai/ai-overview/), retrieved 15 October 2026 | Documented pattern: visual context, annotations and planning artifacts inform subsequent work | Marketing documentation; no assessment of effectiveness or integration permissions |
| E11 | Read-only independent critic reviewed the intake and targeted Nexus documents | Challenge found missing lifecycle, research sufficiency, version-bound approval, delivery proof and commercial truth contracts | Agent critique, not independent market/customer evidence |

The proposed design combines reviewable planning (E08), context-preserving handoff (E09) and annotated visual context (E10) with the local evidence/queue direction (E05). This is a design inference, not proof of superiority or unmet demand. Other inspiration links in the intake were not evaluated in this pass.

Do not infer current standards, safety procedures, property rights or CARSI/RestoreAssist/Expo/Trade Nights/NRPG interfaces from the intake. Those remain research tasks for the simulation idea.

## 2. Decisions and challenge findings

**Confirmed:** definition and next prompt now; full operation as product scope; simulation retained as test input. **Recommended:** extend Nexus after source discovery; staged implementation S0–S7; independent proof records rather than one completion percentage. **Assumed:** initial operator is Phill and the platform starts as an internal tool. **Unverified:** actual application capabilities, supported subscription automation, provider access, budget, demand and commercial thresholds.

Independent challenge identified five missing contracts in the supplied intake and existing proposed architecture: authoritative idea state; research sufficiency; version-bound approval/handoff; commit/release-bound delivery proof; customer/payment truth. The product definition and prompt explicitly add each. The reviewer recommended validating the research-to-handoff path first. Phill's subsequent scope answer requires retaining launch, onboarding and payment operation; that smaller path is therefore the first validation increment, not the full endpoint.

Rejected approach: turn the long form into a mandatory questionnaire. Reason: blocks research and repeats questions sources can answer.

Rejected approach: build the example 3D simulation now. Reason: current request is the intake/research operating product and its next prompt; the example still has unresearched material decisions.

Rejected approach: treat an AI Board approval or tracker Done status as delivery/commercial proof. Reason: neither proves authorised scope, actual merge, working release or paid customer.

## 3. Acceptance scenarios for implementation

These checks are a proposed verification contract. **None has been run against a product implementation in this session.** “Pass” below describes expected behaviour, not an observed result.

| ID / requirement | Scenario and expected result | Stage |
|---|---|---|
| AT-01 — Partial capture | Paste the simulation intake with unanswered fields. Save an idea, preserve raw input, show inferred interpretation and open decisions; do not require all fields or dispatch a simulation builder. | S1 |
| AT-02 — Domain independence | Submit an unrelated small service-business idea. Reuse the lifecycle without cleaning/property/competency fields becoming global requirements. | S1–S2 |
| AT-03 — Durable shared state | Update via web, observe the same version in terminal; interrupt a research job, restart and resume its checkpoint. Repeat an intake with its idempotency key: one idea remains. Concurrent stale edits are rejected with a recoverable conflict. | S1–S2 |
| AT-04 — Evidence honesty | Import a preference, unverified claim, duplicated press-release sources and contradictory observation. Preserve classifications/provenance; contradictions stay visible; agent agreement does not verify the claim. | S2 |
| AT-05 — Research boundaries | Exhaust a configured allowance or disconnect the supported account. Checkpoint work, return partial findings and a specific blocker. No paid API fallback, made-up allowance or permission expansion occurs. | S2 |
| AT-06 — Consequential question | Discover an answerable source fact and an unresolved audience preference. Retrieve the fact; ask only the preference if it changes the recommendation, with “Research this” available. Keep independent work moving. | S2 |
| AT-07 — Pack completeness | Generate a proposed brief with each of the 13 original Part C outputs present or explicitly blocked/deferred/not applicable with reason. Sources, options, counter-evidence, experiment and open decisions are traceable. No invented property dimensions or rights. | S2 |
| AT-08 — Exact-version authority | Approve brief v1 with evidence/design hashes and allowed actions. Make a material v2 edit; queued/resumed v1 dispatch is rejected. Revocation while running prevents the next affected side effect. Unrelated valid authority remains usable. | S3 |
| AT-09 — Prompt integrity | Export prompt and manifest. Confirm all references/criteria/authority match one snapshot. Tamper a hash, target repo or scope; dispatch rejects it. Non-executable preview remains accessible. | S3 |
| AT-10 — Access and hostile input | A second owner cannot read or mutate the first owner's private idea. Put instructions to send secrets in a source document; research records it as untrusted content and never performs the action. Exports/logs omit secrets. | S1–S3 |
| AT-11 — Idempotent effects and sync | Time out a harness dispatch and authorised Linear write after provider acceptance. Retry: one external job/issue remains. Sync outage is visible and later reconciles without overwriting domain stage with a Linear status. | S3–S4 |
| AT-12 — Commit-bound verification | Pass checks on commit A, then modify to B. A's check evidence cannot satisfy B. Failed/unrun required gates prevent verified engineering readiness. Independent review is recorded for the relevant revision. | S4 |
| AT-13 — Main merge proof | Create an open PR, then merge into the wrong branch in a labelled fixture. Neither reaches merged-to-main. Correct provider merge into the intended main records PR, merge SHA and observation time. | S4 |
| AT-14 — Live journey and recovery | Simulate a healthy HTTP response with a broken core user journey: live verification fails. Force a failed release; run documented recovery, keep incident history and require fresh proof for the recovered release. | S5 |
| AT-15 — Authorised operation | Prepare a campaign, onboarding action and release. No external effect without relevant authority. Supply valid standing scope: permitted actions run without duplicate approval requests; prohibited actions remain blocked. | S5–S6 |
| AT-16 — Activation | Create an account without completing the defined first valuable action: registered only. Complete the action on an identified release: activated evidence appears, with minimal customer data. | S5 |
| AT-17 — Payment truth | Feed test payments, pending invoices, failed payments and a real successful captured/settled payment under the agreed outcome contract. Only eligible live evidence counts. Verify webhook authenticity through the provider's supported method. | S6 |
| AT-18 — Replay, refunds and currencies | Replay a valid payment event: no double count. Apply refund/dispute: update current net/client eligibility while retaining history. Multiple currencies remain separate unless an explicit conversion method/date is recorded. | S6 |
| AT-19 — Full outcome and honest failure | With no agreed count/window/activation definition, commercial acceptance is blocked. Once defined, compute milestones from evidence. An expired unsuccessful experiment returns not achieved and a next decision; it cannot silently lower the target or mark DONE. | S6–S7 |
| AT-20 — Operator usability | Phill reviews a researched example, corrects it, follows evidence, approves a version and obtains the handoff without re-entering context. Check keyboard/small-screen operation and reference-list accessibility. Ten-minute review is a proposed benchmark to validate, not an observed result. | S2–S7 |

## 4. Simulation seed: what the product should show initially

**Known from the supplied brief:** Australian cleaning/restoration business and training simulation; realistic navigable 3D; management/staff-development inspirations; named ecosystem connections to investigate; possible Australian commercial property reference; eventual industry reuse; existing supported paid-account preference; no automatic paid API fallback.

**Need to research:** demand and alternatives; strongest first audience; learning effectiveness and expert review; current procedures/requirements; property evidence/rights; rendering/device feasibility; actual interfaces and access; economics and commercial experiments.

**Need a consequential decision when alternatives are ready:** initial user/outcome/session; visual trade-offs; target devices; credible first scenario; research/development budgets; offer and validation thresholds. Do not ask all at once.

**Initial status:** captured / research scoped when a valid mandate exists. Brief unapproved. Development not started. Merge, launch, activation and paying clients unverified. No property chosen, engine selected, accreditation claimed or integration invented.

## 5. Verification of this documentation delivery

Current work adds only definition, prompt, evidence/acceptance and an exact source copy, plus local clarification records. No runtime application, schema, account configuration or production service was changed. Existing hermes-profile/config.yaml modification and config.yaml.bak were left untouched.

Verification performed is recorded in [DELIVERY_CHECK.md](DELIVERY_CHECK.md). Runtime lint, typecheck, application tests and live validation are inapplicable to this documentation-only session; AT-01–AT-20 remain unrun until implementation. Source-integrity, local-link and required-contract checks are appropriate now. No new Linear items were created and no external messages were sent.

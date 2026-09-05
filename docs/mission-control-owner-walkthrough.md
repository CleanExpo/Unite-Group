# Mission Control owner walkthrough

05/09/2026 · Observations and recovery work packet. This report does not authorise new provider, credential, build or release actions and does not claim the unfinished fixes are deployed.

## Request and observed outcome

The owner asked for the actual SPM manager to walk Mission Control and remove usability bottlenecks. The desired journey is to capture an idea once, understand what happened, recover from a failed connection and continue the same mission through a clearly owned next step.

The parent session's authenticated live walkthrough at **05/09/2026 05:49 UTC (15:49 AEST)** recorded deployed main revision **`e62cc715`** and saved mission **`0d6a120c-69ff-4963-ac4a-c5345b36a1ff`**. These are session observations, not a fresh live check performed while writing this document.

| Observation | Meaning and limit |
| --- | --- |
| GitHub repository catalogue returned `auth_error` | The server connection could not read the accessible repository list. This is distinct from the founder being signed out of Unite-Group. The catalogue groups upstream 401 and non-rate-limit 403; that status alone does not prove an expired token. |
| The preparation API returned HTTP 502; the saved classification remained unknown | The idea was persisted as the mission above. Classification did not establish a plan, build or release. Avoid resubmitting the idea merely to recover the failed step. |
| Original classification cause was swallowed | At the time of the walkthrough, the generic failure was insufficient to identify the provider/runtime cause. Do not label it a missing key, provider outage or invalid model without diagnostic evidence. |
| Owner UI and diagnostic corrections are implemented locally | Capability buttons are visible; five primary workspaces and seven additional destinations remain reachable; constrained mission layouts stack; the next action shows its actual owner. Strict classification preserves sanitised errors and offers same-mission recovery. Full validation, independent review and live deployment remain separate gates. |

The root session is using the local SPM process. No Pi planning-service invocation, accepted remote SPM assignment or autonomous Pi browser walkthrough is claimed. See [the Pi delivery linkage contract](mission-control-pi-delivery-bridge.md) for the actual functions, missing HTTP seam and repository-binding limits.

## Operator recovery: GitHub

The catalogue reads `process.env.GITHUB_TOKEN` in `apps/web/src/lib/command-centre/delivery-repositories.ts:64`. Existing portfolio, repository campaign, observation and PR readers use the same deployment credential. A founder login or a new Vault entry does not replace it. There is no existing GitHub OAuth reconnect endpoint in `apps/web`; Settings email connections and the LLM provider pool are different integrations.

1. Identify the deployment/environment serving the failing page. Review credential configuration metadata there without printing the value. Preserve the distinction between a missing token, rejected authentication, denied repository access and rate limiting.
2. Have the authorised connection operator repair or replace that environment's `GITHUB_TOKEN` for the intended account and required repository access. This is an operational repair, not a request to paste a token into chat or a mission. Apply the deployment's normal configuration/release process; do not silently borrow another machine's GitHub session.
3. Re-read the authenticated `GET /api/command-centre/missions/repositories` endpoint. Follow its numeric `nextCursor` pages until complete; confirm the intended repositories are visible. Do not mistake one successful page for the complete account list.
4. Recheck portfolio/repository campaign signals, then continue the saved mission. Record the repaired deployment revision, timestamp and sanitised result without credential values or raw provider response bodies.

Existing `/api/integrations/status` equates a nonempty `GITHUB_TOKEN` with connected. `/api/health/connectors` also treats `GITHUB_APP_ID` alone as configured, although the catalogue cannot use that alone. Neither indicator proves a successful repository read. The recovery UI should explain the failed server connection and offer a recheck after repair; it must not label an unrelated Settings or Vault destination “Reconnect GitHub”.

## SPM assignment work packet — proposed, not accepted

**Target:** `CleanExpo/Unite-Group`, `apps/web`, canonical Mission Control and the existing saved mission. Pin the exact candidate/deployed revision before each verification. **Assignment state:** acceptance by a full-delivery SPM is not evidenced here. The existing branch-build `build_spm` role does not establish that ownership.

The SPM should accept responsibility for the owner journey, name the next action and recovery owner, and attach the walkthrough evidence to the same mission. Requirements, preparation, approvals, retries and eventual results must remain correlated to that mission and its current spec revision. Pi's repository-bound pipeline is not a shortcut around this contract.

Acceptance criteria:

- One idea submission creates one durable mission. A classification failure clearly states that the idea was saved, shows its current stage and allows the same mission to continue without duplicate intake.
- Repository authentication failures have a concrete recovery explanation, preserve useful input and distinguish connection failure from an empty list. Successful pagination verifies the intended repository identity before preparation.
- Classification diagnostics retain a sanitised error category and correlation reference sufficient for the operator to investigate. They exclude credentials, raw provider payloads and private idea text from public errors/logs. The original root cause remains unknown until evidence establishes it.
- Navigation and owner controls are exercised on the actual candidate, including narrow screens and failure recovery; source changes or sample previews alone do not close live acceptance.
- Any SPM planning output is labelled as proposed until reviewed. A real accepted assignment, next action and recovery/escalation owner are recorded before full-delivery ownership is shown as active.
- No retry implies build, merge or release authority. Preparation and approved execution remain separate; an actual release and authenticated outcome receipt are required before the mission is marked delivered.

The local browser harness passed 41 checks across 1440, 1024 and 390 pixel widths, including all twelve destinations, visible capabilities and the sample mission's actual next-action owner, with no browser errors. Sample data does not prove provider access or a production SPM assignment.

**Still open:** GitHub operational repair; identification of the Margot classification root cause; full application verification and independent review of the UI/diagnostic changes; real SPM assignment acceptance; deployment and the repeated authenticated owner journey. No plan, build or release success is inferred from the saved idea.

Grounded 05/09/2026: parent authenticated walkthrough recorded saved mission `0d6a120c-69ff-4963-ac4a-c5345b36a1ff`, main `e62cc715`, repository `auth_error` and classification 502 at 05:49 UTC; source mapping confirms the catalogue credential and Pi bridge limits above.

Waterline: Observed failure and proposed recovery packet; corrections in progress, live acceptance pending. This document is evidence and a work packet, not a delivery-success receipt.

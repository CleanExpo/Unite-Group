# Unite-Group Pixel Office proposal

## Before-build plan

Build a standalone, local design proposal for a visual business owner. The office is the memorable centrepiece; readable panels translate its activity into a mission, accountable owner, next action and evidence. This proposes an owner overlay for the existing office engine, not a replacement engine or a working integration.

- **Palette:** daylight `#F1F5F4`, paper white, ink `#233F46`, eucalyptus `#0C766E`, peacock `#287F98`, muted plum `#966C95`; attention `#AF6B20` is reserved for decisions.
- **Type:** local Trebuchet MS for friendly, characterful headings; local Segoe UI/system sans for controls and body. Comfortable 15–16px body copy; no remote fonts.
- **Layout:** left-aligned owner decisions, an original top-down pixel office in the centre, and a readable team inspector on the right. A restrained stage ribbon sits below the office. A brief composer turns optional preset chips into explicit requirements. On mobile, decisions, office, inspector and brief become one readable column.

```text
Brand / About                  Persistent sample-data notice
Your office                    Sample business / project filter
Decisions      Pixel office / stage ribbon       Team inspector
               Local brief + requirement chips
```

## Pre-build critique

A generic dashboard of status counters would hide the owner's actual question: who has the idea, and what happens next? Remove counters and ornamental charts. Spend the visual detail on a small four-department pixel floor, with recognisable sample people as actual keyboard-accessible controls. Keep the surrounding panels quiet and distinct in purpose. Avoid the rejected navy/gold theme. Labels and scenario content must repeatedly make clear that the prototype is fictional; selection and editing must never imply a real approval, backend write, or live worker action.

## Acceptance checks

- Margot, SPM, Engineer and Reviewer selections update the inspector, mission stages and accessible selection state.
- Sample business/project filtering changes available people, sample decisions and brief context without exposing inaccessible controls.
- Decision buttons open the relevant sample inspector and explain the decision; they do not approve anything.
- Preset chips append/remove visible local requirements without duplicates. A user can edit the local idea.
- A persistent sample banner and proposal explanation remain present; no external assets, requests, storage, dependencies or real actions.
- At 1440px and 390px: readable text, visible keyboard focus, no horizontal overflow, screenshots inspected.

## Integration boundary

Proposed additions: owner decisions, a mission inspector, business/project selection, a stage ribbon, and explicit brief requirements around the existing office view. Real connections, repository inventory, agent execution, approvals, evidence verification and release controls require a separate implementation review. This file does not claim they exist.

## Verification and post-build critique

Implemented the single-file prototype with original inline SVG artwork and local-only JavaScript. Desktop and 390px mobile screenshots were inspected. The mobile inspector now follows the office and stage ribbon, keeping selection details close to the characters; the brief composer follows the inspector. The stacked breakpoint is 720px.

Browser smoke checks cover character selection and stage changes, decision focus and non-approval wording, dependent business/project filtering, plain-text brief rendering, preset add/remove/deduplication, keyboard activation, focus styling and draft clearing. No browser errors or external requests were observed. Horizontal overflow checks passed at 390, 700, 701, 707, 708, 720, 768, 1024 and 1440px.

A negative control removed the sample notice in an isolated browser page. The same notice assertion then failed with exit 1, confirming that the check detects removal of the preview boundary. The normal run passed with exit 0. The control did not alter the source file.

Visual verdict: 93/100 against the stated design brief. The daylight palette, department layout and readable ownership panels are coherent on both captured sizes. The pixel scene is deliberately a small original illustration; it is not a screenshot of the installed extension. Character motion, actual account repositories, persistence and live mission actions are outside this concept's scope.

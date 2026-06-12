# Personal Intelligence Second Assistant Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build the local-first Nexus Personal Intelligence / Second Assistant spine that filters Phill's content consumption into Nexus insights, memory candidates, and task candidates.

**Architecture:** Start with a deterministic TypeScript core that is safe, testable, and local-only. Live integrations such as YouTube API, Google Workspace, browser/search history, podcasts, and Audible exports come later behind explicit approval and privacy gates.

**Tech Stack:** Next.js / TypeScript / Jest / local docs. No production DB writes in the MVP.

**Primary operating model:** `docs/margot/PERSONAL-INTELLIGENCE-SECOND-ASSISTANT-MODEL.md`

---

## Safety preflight

Current observed repo state at plan creation:

- Repo: `/Users/phillmcgurk/Unite-Group`
- Remote: `https://github.com/CleanExpo/Unite-Group.git`
- Branch: `margot/addon-task-status-evidence`
- Existing dirty files before this lane:
  - `docs/margot/mac-mini-recovery-status.md`
  - `docs/margot/morning-report.md`
  - `docs/margot/overnight-progress-log.md`
- Do not overwrite, stash, reset, rebase, or clean these files without explicit approval.
- This lane should initially modify only new Personal Intelligence files and focused tests.

## Task 1: Create Personal Intelligence type model

**Objective:** Add local TypeScript types for normalized content, waste labels, relevance scores, Nexus mappings, memory candidates, and task candidates.

**Files:**

- Create: `src/lib/personal-intelligence/types.ts`
- Test: `tests/unit/lib/personal-intelligence/classifier.test.ts`

**Step 1: Write failing type-level/behavior test fixture**

Create test file with imports that fail until implementation exists. Include a fixture for a YouTube AI/GEO video and an entertainment/waste item.

Expected scenarios:

1. AI/GEO video maps to `ai_enhancement_pipeline` and `marketing_strategy`.
2. Entertainment item maps to `reject` / no durable memory.
3. Sensitive/private search item requires approval before storage.

**Step 2: Run test to verify failure**

Run:

```bash
npx jest tests/unit/lib/personal-intelligence/classifier.test.ts --runInBand
```

Expected: FAIL because module does not exist.

**Step 3: Implement `types.ts`**

Define:

- `ContentSourceType`
- `PrivacyClass`
- `WasteLabel`
- `TopicTag`
- `NexusMapping`
- `ContentItemInput`
- `RelevanceScores`
- `InsightCandidate`
- `MemoryCandidate`
- `TaskCandidate`
- `PersonalIntelligenceClassification`

Keep all structures serializable.

**Step 4: Re-run focused test**

Expected: still FAIL until classifier exists.

---

## Task 2: Implement deterministic classifier

**Objective:** Add a pure function that classifies explicit content items without external calls.

**Files:**

- Create: `src/lib/personal-intelligence/classifier.ts`
- Modify: `tests/unit/lib/personal-intelligence/classifier.test.ts`

**Step 1: Implement failing tests first**

Test cases:

1. Title/summary containing `GEO`, `AEO`, `SEO`, `LLM`, or `AI agent` receives matching topic tags.
2. Content with business/AI/search topics receives Nexus mappings.
3. Entertainment-only content is rejected.
4. Duplicate/hype language is marked as `hype` or `duplicate` where indicated.
5. Private/search-history content sets `approvalRequired=true` before storage.
6. Durable memory is only recommended for stable patterns, not transient model news.
7. Task candidate appears only when score/actionability crosses threshold.

**Step 2: Run test to verify RED**

Run:

```bash
npx jest tests/unit/lib/personal-intelligence/classifier.test.ts --runInBand
```

Expected: FAIL.

**Step 3: Implement classifier**

Function signature suggestion:

```ts
export function classifyContentItem(input: ContentItemInput): PersonalIntelligenceClassification
```

Implementation rules:

- normalize title/summary/transcript snippets to lowercase;
- detect topic keywords;
- estimate waste label from topic/actionability/privacy/entertainment markers;
- score revenue, operating, data, client, strategic, actionability, confidence;
- map to Nexus domains;
- create memory candidates only for durable founder/business patterns;
- create task candidates only for actionable, high-score items;
- set approval flags for private/sensitive sources.

**Step 4: Run focused test to verify GREEN**

Run:

```bash
npx jest tests/unit/lib/personal-intelligence/classifier.test.ts --runInBand
```

Expected: PASS.

---

## Task 3: Add YouTube explicit-ingestion fixture path

**Objective:** Add a local-only helper that accepts YouTube metadata/transcript text already supplied by Phill or fetched by a safe future wrapper, then classifies it.

**Files:**

- Create: `src/lib/personal-intelligence/youtube.ts`
- Create/modify: `tests/unit/lib/personal-intelligence/youtube.test.ts`

**Step 1: Write failing tests**

Test:

- `classifyYouTubeTranscript` accepts `{ url, title, channel, transcriptText }`.
- It returns source type `youtube`.
- It does not store raw transcript in the classification output by default.
- It extracts useful summary snippets or uses supplied summary.
- It maps SEO/GEO/AEO/AI-agent content into Nexus domains.

**Step 2: Run test to verify RED**

```bash
npx jest tests/unit/lib/personal-intelligence/youtube.test.ts --runInBand
```

Expected: FAIL.

**Step 3: Implement helper**

Keep it pure and local. Do not call YouTube API from this helper.

**Step 4: Verify GREEN**

```bash
npx jest tests/unit/lib/personal-intelligence/youtube.test.ts --runInBand
```

Expected: PASS.

---

## Task 4: Add candidate register document

**Objective:** Create a local register for processed or manually reviewed content candidates.

**Files:**

- Create: `docs/margot/personal-intelligence-candidate-register.md`

**Step 1: Create register template**

Sections:

- Purpose
- Intake rules
- Candidate table
- Memory candidates pending approval
- Task candidates pending approval
- Waste/rejected examples
- Weekly synthesis notes

**Step 2: Verify file exists and has required headings**

```bash
test -f docs/margot/personal-intelligence-candidate-register.md
```

---

## Task 5: Wire docs into Margot read-first surfaces after review

**Objective:** Make the operating model discoverable without disrupting existing dirty progress logs.

**Files:**

- Modify only after checking latest contents:
  - `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`
  - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
  - `docs/margot/ai-enhancement-pipeline.md`
  - `docs/margot/MARGOT-COMMAND-CENTER.md`

**Important:** Re-read each file before patching. Do not overwrite existing dirty scheduler/progress edits.

**Step 1: Patch references**

Add the Personal Intelligence model as a read-first/connected layer.

**Step 2: Verify references**

```bash
rg "PERSONAL-INTELLIGENCE-SECOND-ASSISTANT-MODEL|Personal Intelligence" docs/margot
```

---

## Task 6: Verification gate

**Objective:** Prove the MVP slice is safe and consistent.

Run:

```bash
npx jest tests/unit/lib/personal-intelligence/classifier.test.ts tests/unit/lib/personal-intelligence/youtube.test.ts --runInBand
npm run type-check
git diff --check
```

Expected:

- focused tests PASS;
- type-check PASS;
- diff hygiene PASS.

If `npm run type-check` fails due to unrelated existing issues, record exact failure and keep focused tests as slice evidence.

---

## Task 7: Review loop

Use subagent-driven-development review discipline:

1. Spec compliance review:
   - Does the implementation match the operating model?
   - Does it filter waste?
   - Does it avoid blind memory writes?
   - Does it require approval for private sources?

2. Privacy/security review:
   - Are raw transcripts/private history avoided by default?
   - Are sensitive sources approval-gated?
   - Are no production writes introduced?

3. Product/strategy review:
   - Does this actually help Phill reduce screen time?
   - Does it map insights into Nexus and $2B strategy?

4. Code quality review:
   - Pure functions, typed outputs, deterministic tests, no external side effects.

---

## Definition of done for this plan

- Operating model exists.
- Classifier and YouTube local helper exist.
- Tests prove useful/waste/private-source behavior.
- No production DB writes, account connections, external ticket creation, or deploys occur.
- Memory/task candidates are drafts, not blindly applied.
- Docs identify the next integration slice.

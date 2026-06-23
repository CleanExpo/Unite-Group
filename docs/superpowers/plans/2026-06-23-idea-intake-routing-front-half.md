# Idea Intake & Routing Front-Half — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a console flow where a founder's idea is met with clarifying questions, then classified and routed to a (stubbed) build/distribute lane, ending at an approval checkpoint.

**Architecture:** Three new endpoints (`/clarify`, `/clarify/answers`, `/classify`) + two lib modules (`clarify`, `classify-idea`) + a `LaneAdapter` stub registry, all layered on the existing `cc_tasks` model. Artefacts persist in `cc_tasks.metadata` (JSONB) — no prod migration. Model calls follow the existing `board-review.ts` pattern (`getAIClient()`, injectable client for tests).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict), Supabase, Vitest, `@anthropic-ai` via `@/lib/ai/client`.

## Global Constraints

- en-AU spelling in all copy/comments (colour, behaviour, optimise, licence).
- Single-tenant: every DB access scoped `.eq('founder_id', user.id)`; never `workspace_id`. Auth via `getUser()` from `@/lib/supabase/server`; 401 if absent.
- No new dependencies. No new Supabase tables / no migration — persist in `cc_tasks.metadata`.
- No fake-as-real (No-Invaders #1): honest `not_connected`/error states; never present empty-as-success.
- UI: `rounded-sm` only; AI/custom SVG icons only (no Lucide/Hero).
- Model calls go through a lib function with an injectable `client?: ModelClientLike` default `getAIClient()`, model `ANTHROPIC_MODELS.HAIKU`; extract text via `response.content[0]?.type === 'text' ? response.content[0].text : ''`. Best-effort: model/parse failure degrades, never throws to the user.
- Verify gauntlet after each task: `cd apps/web && pnpm run type-check && pnpm run lint && pnpm run test`.
- Commit after every task (Conventional Commits, `[front-half]` scope tag).

## Shared types (defined in Task 2, consumed by Tasks 3-8)

```ts
export type Lane = 'marketing' | 'software' | 'content' | 'unknown'
export interface LanePlanStep { title: string; detail: string; risk: 'low' | 'medium' | 'high'; reversible: boolean }
export interface RoutingDecision {
  lane: Lane
  confidence: number            // 0..1
  rationale: string
  planBuild: LanePlanStep[]
  planDistribute: LanePlanStep[]
}
export interface IdeaContext { idea: string; clarifications: { questions: string[]; answers: Record<string, string> } }
```

## File Structure

- Modify `src/lib/command-centre/tasks.ts` — add `mergeTaskMetadata` (Task 1).
- Create `src/lib/command-centre/lanes.ts` — shared types, `LaneAdapter`, stub registry (Task 2).
- Create `src/lib/command-centre/clarify.ts` — `generateClarifyingQuestions` + question filter (Task 3).
- Create `src/app/api/command-centre/clarify/route.ts` (Task 4).
- Create `src/app/api/command-centre/clarify/answers/route.ts` (Task 5).
- Create `src/lib/command-centre/classify-idea.ts` — `classifyIdea` + validator (Task 6).
- Create `src/app/api/command-centre/classify/route.ts` (Task 7).
- Modify `src/app/(founder)/founder/command-centre/IdeaConsole.tsx` — clarify/route panel (Task 8).
- Tests alongside each in `__tests__/`.

---

### Task 1: `mergeTaskMetadata` helper

**Files:**
- Modify: `src/lib/command-centre/tasks.ts` (add export after `updateTaskStatus`, ~line 366)
- Test: `src/lib/command-centre/__tests__/merge-task-metadata.test.ts`

**Interfaces:**
- Consumes: existing `getTaskById`, `SupabaseLike`, `CC_TASKS_TABLE`, `createClient`, `CommandCentreTask`.
- Produces: `mergeTaskMetadata(input: { founderId: string; taskId: string; patch: Record<string, unknown> }, client?: SupabaseLike): Promise<CommandCentreTask | null>` — shallow-merges `patch` into the task's `metadata` and writes it back; `null` if no matching row.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/command-centre/__tests__/merge-task-metadata.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mergeTaskMetadata } from '../tasks'

function clientReturning(existing: unknown, updated: unknown) {
  const single = vi.fn().mockResolvedValueOnce({ data: existing, error: null }) // getTaskById read
                       .mockResolvedValueOnce({ data: updated, error: null })  // update write
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain); chain.select = vi.fn(() => chain)
  chain.update = vi.fn(() => chain); chain.eq = vi.fn(() => chain); chain.single = single
  return { chain, single }
}

describe('mergeTaskMetadata', () => {
  it('shallow-merges patch into existing metadata and returns the row', async () => {
    const existing = { id: 't1', founder_id: 'u1', metadata: { a: 1 } }
    const updated = { id: 't1', founder_id: 'u1', metadata: { a: 1, b: 2 } }
    const { chain } = clientReturning(existing, updated)
    const res = await mergeTaskMetadata({ founderId: 'u1', taskId: 't1', patch: { b: 2 } }, chain as never)
    expect(res?.metadata).toEqual({ a: 1, b: 2 })
    expect((chain.update as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ metadata: { a: 1, b: 2 } })
  })

  it('returns null when the task does not exist', async () => {
    const { chain } = clientReturning(null, null)
    const res = await mergeTaskMetadata({ founderId: 'u1', taskId: 'missing', patch: { b: 2 } }, chain as never)
    expect(res).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run src/lib/command-centre/__tests__/merge-task-metadata.test.ts`
Expected: FAIL — `mergeTaskMetadata` is not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/command-centre/tasks.ts — add after updateTaskStatus
/**
 * Shallow-merge `patch` into a task's metadata JSONB by (founder_id, id).
 * Returns the updated row, or null when no matching row exists.
 * The `client` argument is for testing — production callers omit it.
 */
export async function mergeTaskMetadata(
  input: { founderId: string; taskId: string; patch: Record<string, unknown> },
  client?: SupabaseLike,
): Promise<CommandCentreTask | null> {
  const db = client ?? ((await createClient()) as unknown as SupabaseLike)
  const existing = await getTaskById({ founderId: input.founderId, taskId: input.taskId }, db)
  if (!existing) return null
  const merged = { ...existing.metadata, ...input.patch }
  const { data, error } = await db
    .from(CC_TASKS_TABLE)
    .update({ metadata: merged })
    .eq('founder_id', input.founderId)
    .eq('id', input.taskId)
    .select('*')
    .single()
  if (error) {
    if (!data) return null
    throw new Error(`mergeTaskMetadata failed: ${error.message}`)
  }
  return (data as CommandCentreTask) ?? null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run src/lib/command-centre/__tests__/merge-task-metadata.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/command-centre/tasks.ts src/lib/command-centre/__tests__/merge-task-metadata.test.ts
git commit -m "feat(command-centre): mergeTaskMetadata helper [front-half]"
```

---

### Task 2: Lanes module (types + `LaneAdapter` stub registry)

**Files:**
- Create: `src/lib/command-centre/lanes.ts`
- Test: `src/lib/command-centre/__tests__/lanes.test.ts`

**Interfaces:**
- Produces: the Shared types above; `LaneAdapter` interface; `LANE_ADAPTERS: Record<'marketing'|'software'|'content', LaneAdapter>`; `getLaneAdapter(lane: Lane): LaneAdapter | null`.
- `LaneAdapter = { key; matchHints: string[]; planBuild(ctx: IdeaContext): LanePlanStep[]; planDistribute(ctx: IdeaContext): LanePlanStep[] }` (no `execute` in this slice — stubs only).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/command-centre/__tests__/lanes.test.ts
import { describe, it, expect } from 'vitest'
import { LANE_ADAPTERS, getLaneAdapter } from '../lanes'

const ctx = { idea: 'Launch a winter promo', clarifications: { questions: [], answers: {} } }

describe('LaneAdapter registry', () => {
  it('has marketing, software and content adapters with hints', () => {
    expect(Object.keys(LANE_ADAPTERS).sort()).toEqual(['content', 'marketing', 'software'])
    for (const a of Object.values(LANE_ADAPTERS)) expect(a.matchHints.length).toBeGreaterThan(0)
  })

  it('each adapter returns non-empty build + distribute plans', () => {
    for (const a of Object.values(LANE_ADAPTERS)) {
      expect(a.planBuild(ctx).length).toBeGreaterThan(0)
      expect(a.planDistribute(ctx).length).toBeGreaterThan(0)
    }
  })

  it('getLaneAdapter returns null for unknown', () => {
    expect(getLaneAdapter('unknown')).toBeNull()
    expect(getLaneAdapter('marketing')?.key).toBe('marketing')
  })
})
```

- [ ] **Step 2: Run** `cd apps/web && pnpm vitest run src/lib/command-centre/__tests__/lanes.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/command-centre/lanes.ts
export type Lane = 'marketing' | 'software' | 'content' | 'unknown'
export interface LanePlanStep { title: string; detail: string; risk: 'low' | 'medium' | 'high'; reversible: boolean }
export interface RoutingDecision {
  lane: Lane; confidence: number; rationale: string
  planBuild: LanePlanStep[]; planDistribute: LanePlanStep[]
}
export interface IdeaContext { idea: string; clarifications: { questions: string[]; answers: Record<string, string> } }

export interface LaneAdapter {
  key: Exclude<Lane, 'unknown'>
  matchHints: string[]
  planBuild(ctx: IdeaContext): LanePlanStep[]
  planDistribute(ctx: IdeaContext): LanePlanStep[]
}

// Stub adapters — planned steps only. `not_connected` until the real lane ships.
const marketing: LaneAdapter = {
  key: 'marketing',
  matchHints: ['campaign', 'promo', 'social', 'audience', 'launch', 'content calendar', 'ads'],
  planBuild: () => [
    { title: 'Draft campaign brief', detail: 'Theme, objective, audience, channels from the idea + answers.', risk: 'low', reversible: true },
    { title: 'Generate assets', detail: 'Copy, creative and social posts (Synthex Campaign Engine).', risk: 'medium', reversible: true },
  ],
  planDistribute: () => [
    { title: 'Publish via Synthex', detail: 'NOT CONNECTED — pending the marketing lane + Track-A schema fix.', risk: 'high', reversible: false },
  ],
}
const software: LaneAdapter = {
  key: 'software',
  matchHints: ['feature', 'bug', 'api', 'page', 'refactor', 'integration', 'endpoint'],
  planBuild: () => [
    { title: 'Scope & branch', detail: 'Decompose into a branch + preview build.', risk: 'low', reversible: true },
    { title: 'Implement on preview', detail: 'Agents build behind a PR + preview URL.', risk: 'medium', reversible: true },
  ],
  planDistribute: () => [
    { title: 'Ship', detail: 'NOT CONNECTED — pending the software lane.', risk: 'high', reversible: false },
  ],
}
const content: LaneAdapter = {
  key: 'content',
  matchHints: ['article', 'guide', 'doc', 'knowledge', 'spec', 'research', 'post'],
  planBuild: () => [
    { title: 'Research & draft', detail: 'Spec-board engine drafts the artefact.', risk: 'low', reversible: true },
  ],
  planDistribute: () => [
    { title: 'Publish content', detail: 'NOT CONNECTED — pending the content lane.', risk: 'medium', reversible: false },
  ],
}

export const LANE_ADAPTERS: Record<LaneAdapter['key'], LaneAdapter> = { marketing, software, content }

export function getLaneAdapter(lane: Lane): LaneAdapter | null {
  return lane === 'unknown' ? null : LANE_ADAPTERS[lane]
}
```

- [ ] **Step 4: Run** the test — Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/command-centre/lanes.ts src/lib/command-centre/__tests__/lanes.test.ts
git commit -m "feat(command-centre): lane adapter stub registry [front-half]"
```

---

### Task 3: Clarify lib (`generateClarifyingQuestions`)

**Files:**
- Create: `src/lib/command-centre/clarify.ts`
- Test: `src/lib/command-centre/__tests__/clarify.test.ts`

**Interfaces:**
- Consumes: `getAIClient`, `ANTHROPIC_MODELS` from `@/lib/ai/client` (mirror `board-review.ts`).
- Produces: `filterQuestions(raw: string[]): string[]` (genuine `?`-terminated, trimmed, max 4); `generateClarifyingQuestions(idea: string, client?: ModelClientLike): Promise<string[]>` (best-effort → `[]` on any failure). `ModelClientLike = { messages: { create(args: unknown): Promise<{ content: Array<{ type: string; text?: string }> }> } }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/command-centre/__tests__/clarify.test.ts
import { describe, it, expect, vi } from 'vitest'
import { filterQuestions, generateClarifyingQuestions } from '../clarify'

function modelReturning(text: string) {
  return { messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text }] }) } }
}

describe('filterQuestions', () => {
  it('keeps only genuine questions, trims, caps at 4', () => {
    const out = filterQuestions(['Who is the audience?', 'not a question', '  What is the budget?  ', 'A?', 'B?', 'C?', 'D?', 'E?'])
    expect(out).toEqual(['Who is the audience?', 'What is the budget?', 'A?', 'B?'])
  })
})

describe('generateClarifyingQuestions', () => {
  it('parses a JSON array of questions from the model', async () => {
    const client = modelReturning('["What is the finish line?", "Who is the audience?"]')
    const out = await generateClarifyingQuestions('Build a thing', client as never)
    expect(out).toEqual(['What is the finish line?', 'Who is the audience?'])
  })

  it('returns [] when the model call throws (best-effort)', async () => {
    const client = { messages: { create: vi.fn().mockRejectedValue(new Error('429')) } }
    expect(await generateClarifyingQuestions('Build a thing', client as never)).toEqual([])
  })

  it('returns [] when output is unparseable', async () => {
    const client = modelReturning('not json at all')
    expect(await generateClarifyingQuestions('Build a thing', client as never)).toEqual([])
  })
})
```

- [ ] **Step 2: Run** the test — Expected: FAIL (module missing).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/command-centre/clarify.ts
import { getAIClient, ANTHROPIC_MODELS } from '@/lib/ai/client'

export interface ModelClientLike {
  messages: { create(args: unknown): Promise<{ content: Array<{ type: string; text?: string }> }> }
}

const CLARIFY_SYSTEM =
  'You help a founder sharpen a one-line idea. Return ONLY a JSON array of 3-4 short clarifying ' +
  'questions (each ending in "?") covering finish line, audience, constraints, out-of-scope, and ' +
  'existing assets. No prose, no markdown — just the JSON array.'

export function filterQuestions(raw: string[]): string[] {
  return raw
    .map((q) => (typeof q === 'string' ? q.trim() : ''))
    .filter((q) => q.endsWith('?'))
    .slice(0, 4)
}

function extractText(content: Array<{ type: string; text?: string }>): string {
  const first = content[0]
  return first && first.type === 'text' && first.text ? first.text : ''
}

export async function generateClarifyingQuestions(
  idea: string,
  client?: ModelClientLike,
): Promise<string[]> {
  try {
    const model = client ?? (getAIClient() as unknown as ModelClientLike)
    const res = await model.messages.create({
      model: ANTHROPIC_MODELS.HAIKU,
      max_tokens: 400,
      system: CLARIFY_SYSTEM,
      messages: [{ role: 'user', content: idea }],
    })
    const parsed = JSON.parse(extractText(res.content)) as unknown
    if (!Array.isArray(parsed)) return []
    return filterQuestions(parsed as string[])
  } catch {
    return [] // best-effort: clarify never blocks the pipeline
  }
}
```

- [ ] **Step 4: Run** the test — Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/command-centre/clarify.ts src/lib/command-centre/__tests__/clarify.test.ts
git commit -m "feat(command-centre): clarifying-question generator [front-half]"
```

---

### Task 4: `/clarify` route

**Files:**
- Create: `src/app/api/command-centre/clarify/route.ts`
- Test: `src/app/api/command-centre/clarify/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getUser`; `getTaskById`, `mergeTaskMetadata`, `appendTaskEvent`; `generateClarifyingQuestions`.
- Produces: `POST(request: Request)` → `{ questions: string[] }` (200), 401 unauth, 400 bad body, 404 task-not-found.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/command-centre/clarify/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  getTaskById: vi.fn(), mergeTaskMetadata: vi.fn(), appendTaskEvent: vi.fn(),
}))
vi.mock('@/lib/command-centre/clarify', () => ({ generateClarifyingQuestions: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import { generateClarifyingQuestions } from '@/lib/command-centre/clarify'
import { POST } from '../route'

const req = (b: object) => new Request('https://app.test/api/command-centre/clarify', { method: 'POST', body: JSON.stringify(b) })

describe('POST /api/command-centre/clarify', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    expect((await POST(req({ taskId: 't1' }))).status).toBe(401)
  })

  it('404 when the task is not the founder’s', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue(null)
    expect((await POST(req({ taskId: 'nope' }))).status).toBe(404)
  })

  it('returns questions and persists them', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: 't1', objective: 'Build a thing' } as never)
    vi.mocked(generateClarifyingQuestions).mockResolvedValue(['Who is the audience?'])
    vi.mocked(mergeTaskMetadata).mockResolvedValue({} as never)
    vi.mocked(appendTaskEvent).mockResolvedValue({} as never)
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(200)
    expect((await res.json()).questions).toEqual(['Who is the audience?'])
    expect(mergeTaskMetadata).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run** the test — Expected: FAIL (route missing).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/api/command-centre/clarify/route.ts
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import { generateClarifyingQuestions } from '@/lib/command-centre/clarify'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { taskId?: unknown }
  try { body = (await request.json()) as { taskId?: unknown } }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : ''
  if (!taskId) return NextResponse.json({ error: 'Field "taskId" is required' }, { status: 400 })

  const task = await getTaskById({ founderId: user.id, taskId })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const questions = await generateClarifyingQuestions(task.objective)
  const generatedAt = new Date().toISOString()

  await mergeTaskMetadata({
    founderId: user.id, taskId,
    patch: { clarifications: { questions, answers: {}, generatedAt, answeredAt: null } },
  })
  try {
    await appendTaskEvent({ founderId: user.id, taskId, type: 'comment', actor: 'system', payload: { kind: 'clarify', count: questions.length } })
  } catch { /* best-effort */ }

  return NextResponse.json({ questions }, { status: 200 })
}
```

> **Note on event `type`:** use an existing `TaskEventType` value. `'comment'` is used here; if the union does not include it, read `src/lib/command-centre/tasks.ts` for the valid `TaskEventType` members and pick the closest existing one (do NOT invent a new union member — that would need a typed change).

- [ ] **Step 4: Run** the test — Expected: PASS (3 tests). Then run `pnpm run type-check` to confirm the chosen event `type` is valid.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/command-centre/clarify/route.ts src/app/api/command-centre/clarify/__tests__/route.test.ts
git commit -m "feat(command-centre): /clarify route [front-half]"
```

---

### Task 5: `/clarify/answers` route

**Files:**
- Create: `src/app/api/command-centre/clarify/answers/route.ts`
- Test: `src/app/api/command-centre/clarify/answers/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getUser`, `getTaskById`, `mergeTaskMetadata`, `appendTaskEvent`.
- Produces: `POST(request)` → `{ ok: true }` (200); 401/400/404. Body `{ taskId: string; answers: Record<string,string> }`. Merges answers into `metadata.clarifications`, sets `answeredAt`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/command-centre/clarify/answers/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ getTaskById: vi.fn(), mergeTaskMetadata: vi.fn(), appendTaskEvent: vi.fn() }))
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata } from '@/lib/command-centre/tasks'
import { POST } from '../route'
const req = (b: object) => new Request('https://app.test/x', { method: 'POST', body: JSON.stringify(b) })

describe('POST /api/command-centre/clarify/answers', () => {
  beforeEach(() => vi.clearAllMocks())
  it('401 unauth', async () => { vi.mocked(getUser).mockResolvedValue(null); expect((await POST(req({ taskId: 't', answers: {} }))).status).toBe(401) })
  it('400 when answers missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    expect((await POST(req({ taskId: 't' }))).status).toBe(400)
  })
  it('persists answers and returns ok', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: 't', metadata: { clarifications: { questions: ['Q?'], answers: {}, generatedAt: 'x', answeredAt: null } } } as never)
    vi.mocked(mergeTaskMetadata).mockResolvedValue({} as never)
    const res = await POST(req({ taskId: 't', answers: { 'Q?': 'A' } }))
    expect(res.status).toBe(200)
    expect(mergeTaskMetadata).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/api/command-centre/clarify/answers/route.ts
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { taskId?: unknown; answers?: unknown }
  try { body = (await request.json()) as { taskId?: unknown; answers?: unknown } }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : ''
  if (!taskId) return NextResponse.json({ error: 'Field "taskId" is required' }, { status: 400 })
  if (typeof body.answers !== 'object' || body.answers === null || Array.isArray(body.answers)) {
    return NextResponse.json({ error: 'Field "answers" must be an object' }, { status: 400 })
  }
  const answers = body.answers as Record<string, string>

  const task = await getTaskById({ founderId: user.id, taskId })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const prev = (task.metadata?.clarifications ?? { questions: [], answers: {}, generatedAt: null }) as Record<string, unknown>
  await mergeTaskMetadata({
    founderId: user.id, taskId,
    patch: { clarifications: { ...prev, answers, answeredAt: new Date().toISOString() } },
  })
  try {
    await appendTaskEvent({ founderId: user.id, taskId, type: 'comment', actor: 'founder', payload: { kind: 'clarify_answers' } })
  } catch { /* best-effort */ }

  return NextResponse.json({ ok: true }, { status: 200 })
}
```

- [ ] **Step 4: Run** — Expected: PASS (3 tests) + type-check clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/command-centre/clarify/answers/route.ts src/app/api/command-centre/clarify/answers/__tests__/route.test.ts
git commit -m "feat(command-centre): /clarify/answers route [front-half]"
```

---

### Task 6: Classify-idea lib (`classifyIdea` + validator)

**Files:**
- Create: `src/lib/command-centre/classify-idea.ts`
- Test: `src/lib/command-centre/__tests__/classify-idea.test.ts`

**Interfaces:**
- Consumes: `getAIClient`, `ANTHROPIC_MODELS`; `ModelClientLike` from `./clarify`; `Lane`, `RoutingDecision`, `IdeaContext`, `getLaneAdapter` from `./lanes`.
- Produces: `toRoutingDecision(modelLane: unknown, modelConfidence: unknown, modelRationale: unknown, ctx: IdeaContext): RoutingDecision` (pure; validates + attaches lane plans, falling back to `unknown` with empty plans); `classifyIdea(ctx: IdeaContext, client?: ModelClientLike): Promise<RoutingDecision>` (best-effort → `unknown` on failure).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/command-centre/__tests__/classify-idea.test.ts
import { describe, it, expect, vi } from 'vitest'
import { toRoutingDecision, classifyIdea } from '../classify-idea'

const ctx = { idea: 'Run a winter promo on social', clarifications: { questions: [], answers: {} } }
const model = (text: string) => ({ messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text }] }) } })

describe('toRoutingDecision', () => {
  it('accepts a valid lane and attaches that lane’s plans', () => {
    const d = toRoutingDecision('marketing', 0.9, 'Clearly a campaign', ctx)
    expect(d.lane).toBe('marketing')
    expect(d.confidence).toBe(0.9)
    expect(d.planBuild.length).toBeGreaterThan(0)
    expect(d.planDistribute.length).toBeGreaterThan(0)
  })
  it('falls back to unknown (empty plans) on an invalid lane or bad confidence', () => {
    const d = toRoutingDecision('banana', 5, '', ctx)
    expect(d.lane).toBe('unknown')
    expect(d.confidence).toBe(0)
    expect(d.planBuild).toEqual([])
  })
})

describe('classifyIdea', () => {
  it('routes from the model JSON', async () => {
    const d = await classifyIdea(ctx, model('{"lane":"marketing","confidence":0.8,"rationale":"promo"}') as never)
    expect(d.lane).toBe('marketing')
  })
  it('returns unknown when the model fails', async () => {
    const client = { messages: { create: vi.fn().mockRejectedValue(new Error('boom')) } }
    expect((await classifyIdea(ctx, client as never)).lane).toBe('unknown')
  })
})
```

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/command-centre/classify-idea.ts
import { getAIClient, ANTHROPIC_MODELS } from '@/lib/ai/client'
import type { ModelClientLike } from './clarify'
import { type Lane, type RoutingDecision, type IdeaContext, getLaneAdapter } from './lanes'

const VALID: Lane[] = ['marketing', 'software', 'content']

const CLASSIFY_SYSTEM =
  'Classify a founder idea into exactly one lane: "marketing" (campaigns/content/social), ' +
  '"software" (features/code/APIs), or "content" (articles/guides/knowledge). Return ONLY JSON: ' +
  '{"lane": "...", "confidence": 0..1, "rationale": "one sentence"}. No markdown.'

function extractText(content: Array<{ type: string; text?: string }>): string {
  const first = content[0]
  return first && first.type === 'text' && first.text ? first.text : ''
}

export function toRoutingDecision(
  modelLane: unknown, modelConfidence: unknown, modelRationale: unknown, ctx: IdeaContext,
): RoutingDecision {
  const lane = (VALID as string[]).includes(modelLane as string) ? (modelLane as Lane) : 'unknown'
  const confidence =
    typeof modelConfidence === 'number' && modelConfidence >= 0 && modelConfidence <= 1 ? modelConfidence : 0
  const rationale = typeof modelRationale === 'string' && modelRationale.trim() ? modelRationale.trim() : 'No rationale provided.'
  const adapter = getLaneAdapter(lane)
  return {
    lane: adapter ? lane : 'unknown',
    confidence: adapter ? confidence : 0,
    rationale,
    planBuild: adapter ? adapter.planBuild(ctx) : [],
    planDistribute: adapter ? adapter.planDistribute(ctx) : [],
  }
}

export async function classifyIdea(ctx: IdeaContext, client?: ModelClientLike): Promise<RoutingDecision> {
  try {
    const model = client ?? (getAIClient() as unknown as ModelClientLike)
    const userContent = JSON.stringify({ idea: ctx.idea, clarifications: ctx.clarifications })
    const res = await model.messages.create({
      model: ANTHROPIC_MODELS.HAIKU, max_tokens: 300, system: CLASSIFY_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    })
    const parsed = JSON.parse(extractText(res.content)) as { lane?: unknown; confidence?: unknown; rationale?: unknown }
    return toRoutingDecision(parsed.lane, parsed.confidence, parsed.rationale, ctx)
  } catch {
    return toRoutingDecision(undefined, undefined, 'Could not classify the idea automatically — choose a lane manually.', ctx)
  }
}
```

- [ ] **Step 4: Run** — Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/command-centre/classify-idea.ts src/lib/command-centre/__tests__/classify-idea.test.ts
git commit -m "feat(command-centre): idea classifier + routing decision [front-half]"
```

---

### Task 7: `/classify` route

**Files:**
- Create: `src/app/api/command-centre/classify/route.ts`
- Test: `src/app/api/command-centre/classify/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getUser`; `getTaskById`, `mergeTaskMetadata`, `appendTaskEvent`; `classifyIdea`.
- Produces: `POST(request)` → `{ routing: RoutingDecision }` (200); 401/400/404. Reads `task.objective` + `task.metadata.clarifications`, builds `IdeaContext`, persists `metadata.routing`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/command-centre/classify/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ getTaskById: vi.fn(), mergeTaskMetadata: vi.fn(), appendTaskEvent: vi.fn() }))
vi.mock('@/lib/command-centre/classify-idea', () => ({ classifyIdea: vi.fn() }))
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata } from '@/lib/command-centre/tasks'
import { classifyIdea } from '@/lib/command-centre/classify-idea'
import { POST } from '../route'
const req = (b: object) => new Request('https://app.test/x', { method: 'POST', body: JSON.stringify(b) })

describe('POST /api/command-centre/classify', () => {
  beforeEach(() => vi.clearAllMocks())
  it('401 unauth', async () => { vi.mocked(getUser).mockResolvedValue(null); expect((await POST(req({ taskId: 't' }))).status).toBe(401) })
  it('404 missing task', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never); vi.mocked(getTaskById).mockResolvedValue(null)
    expect((await POST(req({ taskId: 't' }))).status).toBe(404)
  })
  it('classifies, persists routing, returns it', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: 't', objective: 'Promo', metadata: { clarifications: { questions: [], answers: {} } } } as never)
    const routing = { lane: 'marketing', confidence: 0.8, rationale: 'promo', planBuild: [{ title: 'x', detail: 'y', risk: 'low', reversible: true }], planDistribute: [] }
    vi.mocked(classifyIdea).mockResolvedValue(routing as never)
    vi.mocked(mergeTaskMetadata).mockResolvedValue({} as never)
    const res = await POST(req({ taskId: 't' }))
    expect(res.status).toBe(200)
    expect((await res.json()).routing.lane).toBe('marketing')
    expect(mergeTaskMetadata).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/api/command-centre/classify/route.ts
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import { classifyIdea } from '@/lib/command-centre/classify-idea'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { taskId?: unknown }
  try { body = (await request.json()) as { taskId?: unknown } }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : ''
  if (!taskId) return NextResponse.json({ error: 'Field "taskId" is required' }, { status: 400 })

  const task = await getTaskById({ founderId: user.id, taskId })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const clar = (task.metadata?.clarifications ?? { questions: [], answers: {} }) as { questions: string[]; answers: Record<string, string> }
  const routing = await classifyIdea({ idea: task.objective, clarifications: { questions: clar.questions ?? [], answers: clar.answers ?? {} } })

  await mergeTaskMetadata({
    founderId: user.id, taskId,
    patch: { routing: { ...routing, decidedAt: new Date().toISOString() } },
  })
  try {
    await appendTaskEvent({ founderId: user.id, taskId, type: 'comment', actor: 'system', payload: { kind: 'routed', lane: routing.lane, confidence: routing.confidence } })
  } catch { /* best-effort */ }

  return NextResponse.json({ routing }, { status: 200 })
}
```

- [ ] **Step 4: Run** — Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/command-centre/classify/route.ts src/app/api/command-centre/classify/__tests__/route.test.ts
git commit -m "feat(command-centre): /classify route [front-half]"
```

---

### Task 8: IdeaConsole clarify/route panel

**Files:**
- Modify: `src/app/(founder)/founder/command-centre/IdeaConsole.tsx` (add state + two handlers + readout panel, mirroring the existing `conveneBoard`/verdict pattern at lines 130-171 and 244-319)
- Test: `src/app/(founder)/founder/command-centre/__tests__/IdeaConsole.clarify.test.tsx`

**Interfaces:**
- Consumes: the three new endpoints; `RoutingDecision` (re-declare a local `RoutingView` type — the component must not import server-only modules).
- Produces: after a task exists, a "Clarify" action fetches `/clarify`, renders questions with inputs, a "Submit answers" action posts `/clarify/answers` then auto-calls `/classify`, and a routed-plan panel with a disabled "Approve & build — lane pending" checkpoint button. Honest error/empty states throughout.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/(founder)/founder/command-centre/__tests__/IdeaConsole.clarify.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IdeaConsole } from '../IdeaConsole'

beforeEach(() => { vi.restoreAllMocks() })

function mockFetchSequence(handlers: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true, status: 200, json: async () => handlers[new URL(url, 'https://t').pathname],
  })) as never)
}

describe('IdeaConsole clarify/route', () => {
  it('shows clarifying questions after requesting them', async () => {
    mockFetchSequence({
      '/api/command-centre/ideas': { task: { id: 't1', title: 'Promo', status: 'proposed' } },
      '/api/command-centre/clarify': { questions: ['Who is the audience?'] },
    })
    render(<IdeaConsole projects={[]} />)
    fireEvent.change(screen.getByLabelText(/idea/i), { target: { value: 'Run a winter promo' } })
    fireEvent.click(screen.getByRole('button', { name: /submit idea/i }))
    await waitFor(() => screen.getByRole('button', { name: /clarify/i }))
    fireEvent.click(screen.getByRole('button', { name: /clarify/i }))
    await waitFor(() => expect(screen.getByText('Who is the audience?')).toBeInTheDocument())
  })
})
```

> The exact label/role selectors must match the existing markup — read `IdeaConsole.tsx` lines 179-319 and align the test queries (and any `aria-label`s you add) before finalising. Keep the existing intake + board markup intact; this task only adds to the readout column.

- [ ] **Step 2: Run** the test — Expected: FAIL (no clarify button).

- [ ] **Step 3: Implement** — add to `IdeaConsole.tsx` (mirror `conveneBoard`):

```tsx
// new state (alongside existing useState calls)
const [questions, setQuestions] = useState<string[] | null>(null)
const [answers, setAnswers] = useState<Record<string, string>>({})
const [routing, setRouting] = useState<{ lane: string; confidence: number; rationale: string; planBuild: { title: string; detail: string }[]; planDistribute: { title: string; detail: string }[] } | null>(null)
const [clarifyError, setClarifyError] = useState<string | null>(null)

async function requestClarify() {
  if (!task) return
  setClarifyError(null)
  try {
    const res = await fetch('/api/command-centre/clarify', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id }),
    })
    if (!res.ok) { setClarifyError(await readError(res, 'Could not generate questions')); return }
    const data = (await res.json()) as { questions: string[] }
    setQuestions(data.questions)
  } catch { setClarifyError('Network error — could not reach the clarify service.') }
}

async function submitAnswersAndClassify() {
  if (!task) return
  setClarifyError(null)
  try {
    await fetch('/api/command-centre/clarify/answers', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, answers }),
    })
    const res = await fetch('/api/command-centre/classify', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id }),
    })
    if (!res.ok) { setClarifyError(await readError(res, 'Could not classify the idea')); return }
    const data = (await res.json()) as { routing: typeof routing }
    setRouting(data.routing)
  } catch { setClarifyError('Network error — could not reach the classify service.') }
}
```

Then in the readout column (after the task card, before/after the board verdict), render: a **Clarify** button when `task && !questions`; the questions list with an `<input>` per question bound to `answers` + a **Submit answers** button when `questions`; the routed panel when `routing` (lane + confidence + rationale + `planBuild`/`planDistribute` lists) ending with a **disabled** `Approve & build — {routing.lane} lane pending` button; and `clarifyError` in an honest error block. Use `rounded-sm` and existing `styles.*`.

- [ ] **Step 4: Run** the test — Expected: PASS. Then full gauntlet:

Run: `cd apps/web && pnpm run type-check && pnpm run lint && pnpm run test`
Expected: all green; test count = baseline + the new tests.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(founder)/founder/command-centre/IdeaConsole.tsx" "src/app/(founder)/founder/command-centre/__tests__/IdeaConsole.clarify.test.tsx"
git commit -m "feat(command-centre): clarify + route panel in IdeaConsole [front-half]"
```

---

## Final verification & PR

- [ ] Run the full gauntlet once more on the integrated branch: `cd apps/web && pnpm run type-check && pnpm run lint && pnpm run test` — capture the `Test Files`/`Tests` summary lines.
- [ ] Manual smoke (honest, real-model caveat): `pnpm dev`, submit an idea, confirm questions appear, answer, confirm a lane + plan render and the checkpoint button is present and disabled.
- [ ] Open PR into `main`: title `feat(command-centre): idea intake clarify + classify/route front-half`, body listing the endpoints, the no-migration decision, the stubbed-lane checkpoint, and the test delta. Note the marketing lane depends on Track-A.

## Self-review notes (spec coverage)
- Intake reuse ✓ (unchanged). Clarify loop ✓ (Tasks 3-5). Classify/route ✓ (Tasks 6-7). LaneAdapter stub seam ✓ (Task 2). No-migration metadata model ✓ (Task 1 + persistence in routes). Auto-with-checkpoints ✓ (disabled checkpoint button, `humanApprovalRequired` untouched). Honest error states ✓ (best-effort libs + route 4xx + UI error blocks). Testing ✓ (unit + route + component). Risk-register verify items surfaced inline (event `type` union; IdeaConsole selectors).

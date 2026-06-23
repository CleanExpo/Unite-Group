# Visual Campaign Studio — Phase 1 (Shell + Concept Round) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A canvas-first studio (Layout B) where the founder types a brief and the design agent generates concept images (Gemini), which the founder picks/refines in a docked chat — persisted to the routed idea-task.

**Architecture:** Reuse the existing Gemini image generator + the `campaign-assets` storage bucket. New `src/lib/studio/*` libs (generate-visuals, storage, brand, session) + a `/api/studio/turn` route (concept phase) + a `StudioClient` UI. Session state lives in `cc_tasks.metadata.studio` (no migration). OpenAI image gen does not exist in the app yet → the provider toggle returns an honest `not_connected` for `openai`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase (storage + DB), Vitest + @testing-library/react.

## Global Constraints
- en-AU spelling. Single-tenant: scope by `founder_id`, never `workspace_id`. Auth via `getUser()`; 401 if absent. `export const dynamic = 'force-dynamic'` on the route.
- No new dependencies, no migration. Reuse the existing `campaign-assets` Supabase bucket (path prefix `studio-concepts/`). Persist session in `cc_tasks.metadata.studio` (JSONB).
- No fake-as-real: per-image generation failure → honest error in the turn result (non-blocking); no ready brand → `not_connected` + brand picker; `provider='openai'` → honest `not_connected` (image gen not wired). Never show a failed/placeholder image as success.
- UI: `rounded-sm` only; OLED black `#050505` / cyan `#00F5FF`; AI/custom SVG or text only (no Lucide/Hero). Layout B (canvas-first, chat docked).
- Libs accept an injectable `client?`/`deps?` for tests. Event `type` must be a valid `TaskEventType` (`'comment'`).
- Verify each task: `cd apps/web && pnpm run type-check && pnpm run lint && pnpm run test`. Commit per task (`[studio-p1]`).

## Shared types (Task 1)
```ts
export type StudioProvider = 'gemini' | 'openai'
export interface ConceptImage { id: string; url: string; prompt: string }
export interface StudioBrand { brandProfileId: string; organizationId: string | null; businessKey: string | null; clientName: string }
```

## File Structure
- `src/lib/studio/generate-visuals.ts` (Task 1) — `generateVisuals`.
- `src/lib/studio/studio-storage.ts` (Task 2) — `uploadConceptImage`.
- `src/lib/studio/studio-brand.ts` (Task 3) — `resolveStudioBrand`.
- `src/lib/studio/studio-session.ts` (Task 4) — `applyConceptTurn` reducer.
- `src/app/api/studio/turn/route.ts` (Task 5) — concept-phase orchestration.
- `src/app/(founder)/founder/command-centre/studio/StudioClient.tsx` (Task 6) — UI shell.
- Tests alongside each.

---

### Task 1: `generateVisuals` (wraps the Gemini image generator)

**Files:** Create `src/lib/studio/generate-visuals.ts`; Test `src/lib/studio/__tests__/generate-visuals.test.ts`

**Interfaces:**
- Consumes: `generateCampaignImage` from `@/lib/campaigns/image-generator` (`(rawImagePrompt, brand, platform, headline, cta, visualType) => Promise<{ imageBase64: string|null; mimeType: string; error: string|null; ... }>`). **Read that file first** to import the real `BrandDNA`, `SocialPlatform`, `VisualType` types and a sensible default `VisualType`.
- Produces: the Shared types above; `generateVisuals(input: { prompt: string; count: number; brand: BrandDNA; provider: StudioProvider; deps?: { generateImage: typeof generateCampaignImage } }): Promise<{ images: Array<{ imageBase64: string; mimeType: string }>; errors: string[] }>`. For `provider='openai'` → return `{ images: [], errors: ['OpenAI image generation is not connected yet — use Gemini.'] }` (no throw). For `gemini`: call `generateImage(prompt, brand, 'instagram', null, null, <defaultVisualType>)` `count` times; collect successes (`imageBase64` non-null) into `images`, push any `error` (or "no image returned") into `errors`. Never throw.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect, vi } from 'vitest'
import { generateVisuals } from '../generate-visuals'
const brand = {} as never
describe('generateVisuals', () => {
  it('returns not-connected for openai without calling the generator', async () => {
    const generateImage = vi.fn()
    const r = await generateVisuals({ prompt: 'p', count: 3, brand, provider: 'openai', deps: { generateImage } })
    expect(r.images).toEqual([]); expect(r.errors[0]).toMatch(/not connected/i); expect(generateImage).not.toHaveBeenCalled()
  })
  it('collects gemini successes and records failures', async () => {
    const generateImage = vi.fn()
      .mockResolvedValueOnce({ imageBase64: 'AAA', mimeType: 'image/png', error: null })
      .mockResolvedValueOnce({ imageBase64: null, mimeType: 'image/png', error: 'quota' })
      .mockResolvedValueOnce({ imageBase64: 'CCC', mimeType: 'image/png', error: null })
    const r = await generateVisuals({ prompt: 'p', count: 3, brand, provider: 'gemini', deps: { generateImage } })
    expect(r.images.map(i => i.imageBase64)).toEqual(['AAA','CCC'])
    expect(r.errors).toContain('quota')
  })
})
```
- [ ] **Step 2: Run** `cd apps/web && pnpm vitest run src/lib/studio/__tests__/generate-visuals.test.ts` → FAIL.
- [ ] **Step 3: Implement** per the interface (read `image-generator.ts` for the default `VisualType`/`BrandDNA` import). Loop `count` times for gemini, `await` each, branch on `imageBase64`.
- [ ] **Step 4: Run** → PASS + type-check.
- [ ] **Step 5: Commit** `git commit -am "feat(studio): generateVisuals over the Gemini engine [studio-p1]"`

---

### Task 2: `uploadConceptImage` (reuse the campaign-assets bucket)

**Files:** Create `src/lib/studio/studio-storage.ts`; Test `…/__tests__/studio-storage.test.ts`

**Interfaces:**
- Consumes: `createServiceClient` from the same module `src/lib/campaigns/orchestrator.ts` imports it from — **read `orchestrator.ts:29–65` first** and import `createServiceClient` from the same path it uses.
- Produces: `uploadConceptImage(input: { imageBase64: string; mimeType: string; founderId: string; taskId: string; conceptId: string }, client?: { storage: { from: (b: string) => { upload: Function; getPublicUrl: Function } } }): Promise<string | null>`. Path: `studio-concepts/${founderId}/${taskId}/${conceptId}.${ext}` (`ext` = jpg if mime includes jpeg else png). Bucket `campaign-assets`. `upload(path, Buffer.from(imageBase64,'base64'), { contentType: mimeType, upsert: true })`; on error return `null`; else `getPublicUrl(path).data.publicUrl`.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect, vi } from 'vitest'
import { uploadConceptImage } from '../studio-storage'
function storage(uploadErr: unknown) {
  const api = { upload: vi.fn(async () => ({ error: uploadErr })), getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://cdn/x.png' } })) }
  return { storage: { from: vi.fn(() => api) }, _api: api }
}
describe('uploadConceptImage', () => {
  it('uploads and returns the public URL', async () => {
    const c = storage(null)
    const url = await uploadConceptImage({ imageBase64: 'AAA', mimeType: 'image/png', founderId: 'u1', taskId: 't1', conceptId: 'c1' }, c as never)
    expect(url).toBe('https://cdn/x.png')
    expect(c._api.upload).toHaveBeenCalledWith(expect.stringContaining('studio-concepts/u1/t1/c1.png'), expect.anything(), expect.objectContaining({ upsert: true }))
  })
  it('returns null on upload error', async () => {
    const url = await uploadConceptImage({ imageBase64: 'AAA', mimeType: 'image/png', founderId: 'u1', taskId: 't1', conceptId: 'c1' }, storage({ message: 'fail' }) as never)
    expect(url).toBeNull()
  })
})
```
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Default `client` = `createServiceClient()` (so production omits it). Mirror `orchestrator.ts`'s upload+getPublicUrl exactly.
- [ ] **Step 4: Run** → PASS + type-check.
- [ ] **Step 5: Commit** `git commit -am "feat(studio): uploadConceptImage to campaign-assets bucket [studio-p1]"`

---

### Task 3: `resolveStudioBrand`

**Files:** Create `src/lib/studio/studio-brand.ts`; Test `…/__tests__/studio-brand.test.ts`

**Interfaces:** Produces `resolveStudioBrand(input: { founderId: string; businessKey?: string | null }, client?: SupabaseLike): Promise<{ brand: StudioBrand; brandDNA: BrandDNA } | null>`. Query `brand_profiles.select('id, organization_id, client_name, business_key, status, website_url, industry, tone_of_voice, brand_values, colours, target_audience').eq('founder_id', founderId).eq('status','ready')` (+ `.eq('business_key', businessKey)` when provided) `.order('created_at',{ascending:false}).limit(2)`. If businessKey → first row; else exactly-one → that row, else `null`. Map the row → `StudioBrand` and a minimal `BrandDNA` (read `image-generator.ts` for `BrandDNA`'s exact required fields and map row columns to them; cast `organization_id` if not yet in generated types). Return `null` when none/ambiguous.

- [ ] **Step 1: Write the failing test** (mock the supabase chain returning rows; assert single-ready → mapped object; none → null; ambiguous → null). Use the chain-mock pattern from `resolveBrandProfile`'s test if present, else a `{ from: () => builder }` where `select/eq/order` return `this` and `limit` resolves `{ data, error }`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the query + mapping (read `image-generator.ts` BrandDNA shape first).
- [ ] **Step 4: Run** → PASS + type-check.
- [ ] **Step 5: Commit** `git commit -am "feat(studio): resolveStudioBrand for studio brand context [studio-p1]"`

---

### Task 4: `applyConceptTurn` (session reducer)

**Files:** Create `src/lib/studio/studio-session.ts`; Test `…/__tests__/studio-session.test.ts`

**Interfaces:** Produces the session shape and a pure reducer:
```ts
export interface StudioMessage { role: 'founder' | 'agent'; text: string; at: string }
export interface StudioSession { phase: 'concept' | 'platform'; provider: StudioProvider; messages: StudioMessage[]; concepts: ConceptImage[]; chosenConceptId: string | null }
export function applyConceptTurn(prev: Partial<StudioSession> | undefined, input: { founderMessage: string; agentMessage: string; newConcepts: ConceptImage[]; provider: StudioProvider; at: string }): StudioSession
```
Appends the two messages, **replaces** `concepts` with `newConcepts` (a concept round regenerates the set), keeps `phase:'concept'`, sets `provider`, preserves `chosenConceptId` if already set. Defaults when `prev` undefined: empty messages/concepts, `chosenConceptId:null`.

- [ ] **Step 1: Write the failing test** (undefined prev → seeds; existing prev → appends messages, swaps concepts, keeps phase). Assert message order founder-then-agent.
- [ ] **Step 2: Run** → FAIL. — [ ] **Step 3: Implement** the pure reducer. — [ ] **Step 4: Run** → PASS. — [ ] **Step 5: Commit** `git commit -am "feat(studio): applyConceptTurn session reducer [studio-p1]"`

---

### Task 5: `POST /api/studio/turn` (concept phase)

**Files:** Create `src/app/api/studio/turn/route.ts`; Test `…/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getUser`; `getTaskById`, `mergeTaskMetadata`, `appendTaskEvent`; `resolveStudioBrand`; `generateVisuals`; `uploadConceptImage`; `applyConceptTurn`.
- Produces: `POST(request)` body `{ taskId: string; message: string; provider?: 'gemini'|'openai' }`. 401/400/404. Flow: load task; `resolveStudioBrand({ founderId, businessKey: task.metadata?.routing?.businessKey ?? null })` → if null return 200 `{ status:'not_connected', reason:'No ready brand profile — connect or select one first.' }`; `gen = generateVisuals({ prompt: message, count: 3, brand: brandDNA, provider })`; for each `gen.images`, `uploadConceptImage(...)` → build `ConceptImage[]` (skip nulls); `agentMessage` = templated (e.g. ``Generated ${concepts.length} concept(s) from your brief. Pick one or tell me what to change.`` or, if 0, an honest "couldn't generate — try again or switch engine" + the errors); `session = applyConceptTurn(task.metadata?.studio, { founderMessage: message, agentMessage, newConcepts: concepts, provider: provider ?? 'gemini', at: new Date().toISOString() })`; `mergeTaskMetadata({ founderId, taskId, patch: { studio: session } })`; `appendTaskEvent({ … type:'comment', actor:'system', payload:{ kind:'studio_concept', count: concepts.length } })` (best-effort); return 200 `{ status:'ok', agentMessage, concepts, errors: gen.errors }`. `force-dynamic`.

- [ ] **Step 1: Write the failing test** (mock all consumed modules; mirror the strategy/analyze route test): 401; 400 missing message/taskId; 404 no task; `not_connected` when brand null; happy path → 200 with `concepts` + persists `studio` via mergeTaskMetadata; image-failure → 200 with `errors` surfaced and empty/partial concepts. Use `vi.mock` per dependency, `vi.mocked(...).mockResolvedValue(...)`.
- [ ] **Step 2: Run** → FAIL. — [ ] **Step 3: Implement** the thin orchestration. — [ ] **Step 4: Run** → PASS + type-check. — [ ] **Step 5: Commit** `git commit -am "feat(studio): /studio/turn concept phase [studio-p1]"`

---

### Task 6: Studio UI shell (Layout B, concept round)

**Files:** Create `src/app/(founder)/founder/command-centre/studio/StudioClient.tsx` + a server `page.tsx` that renders it; Test `…/__tests__/StudioClient.test.tsx`

**Interfaces:** `StudioClient({ taskId }: { taskId: string })` — Layout B: a **canvas** area (renders `concepts` as a grid of selectable image tiles; selecting one sets `chosenConceptId` locally) above a **docked chat bar** (text input → `POST /api/studio/turn` with `{ taskId, message, provider }`), plus a **provider toggle** (Gemini default / OpenAI). On response: render returned `concepts`, append `agentMessage`, and show `errors`/`not_connected` honestly. `rounded-sm`, OLED black/cyan, custom SVG/text icons only. Mirror the `fetch`/`readError`/error-state pattern used elsewhere in the founder console. The `page.tsx` reads the `taskId` from the route/searchParams and passes it down (server component).

- [ ] **Step 1: Write the failing test** — mock `fetch` to return `{ status:'ok', agentMessage:'Generated 3…', concepts:[{id:'c1',url:'https://cdn/c1.png',prompt:'p'}], errors:[] }`; render `<StudioClient taskId="t1" />`; type a brief, submit, assert a concept tile (img) appears and the agent message renders; assert an `not_connected` response renders the honest "connect a brand" block. Mirror `CommandBar.test.tsx`'s mock-first-then-import pattern; add `aria-label`s so queries resolve.
- [ ] **Step 2: Run** → FAIL. — [ ] **Step 3: Implement** the component + `page.tsx`. — [ ] **Step 4: Run** the component test + full gauntlet (`type-check && lint && test`). — [ ] **Step 5: Commit** `git commit -am "feat(studio): canvas-first studio shell + concept round UI [studio-p1]"`

---

## Final verification & PR
- [ ] Full gauntlet on the branch (capture `Test Files`/`Tests`). Run `cd apps/web && pnpm run build` with placeholder env to confirm the bundle compiles.
- [ ] Manual smoke (honest, real-model caveat): open the studio for a marketing-routed idea, type a brief, confirm 3 concepts render from Gemini; confirm the OpenAI toggle shows the honest not-connected message; confirm no-brand shows the connect-brand state.
- [ ] PR into `main`: title `feat(studio): visual campaign studio — phase 1 (shell + concept round)`; body lists the libs/route/UI, the bucket reuse, the metadata.studio session, the honest OpenAI-not-wired toggle, and the test delta. Note Phases 2 (per-platform) and 3 (lock→publish, depends on the marketing lane merging) are out of scope here.

## Self-review notes (spec coverage)
- Concept generation (Gemini) ✓ T1. Storage reuse ✓ T2. Brand context + not_connected ✓ T3/T5. Session in metadata.studio ✓ T4/T5. Turn route ✓ T5. Layout B UI + provider toggle + honest OpenAI ✓ T6. Governance: nothing posts in Phase 1 (no lock/publish) ✓. Honest states throughout ✓. No migration (reuse bucket + metadata) ✓. Risk-register items resolved: OpenAI-not-wired → honest not_connected; bucket reuse (no creation); BrandDNA mapping flagged read-first.
```

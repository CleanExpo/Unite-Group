# Visual Campaign Studio — Design

> Project: Unite-Group `apps/web` · Date: 23/06/2026 · Locale: en-AU · Status: approved design, pre-implementation
> Visual, conversational front-end for the marketing lane. Builds on the merged front-half (idea intake/routing)
> and the marketing lane (`2026-06-23-marketing-lane-design.md`: `createCampaign`, brand resolution, distribute).

## 1. Purpose
A canvas-first studio where the founder and a specialised **design agent** iterate on a campaign's creative through
conversation — the agent generates concept images, the founder reacts in chat, they refine, expand to per-platform
assets, and lock the set, which then publishes through Synthex. It **replaces the marketing lane's auto-build step**
with a human-in-the-loop visual design loop, reusing the lane's `createCampaign` + distribute for the commit half.

Confirmed in brainstorming: scope = visual campaign-creative studio; layout = **B (canvas-first, chat docked)**;
loop = **concept round → pick → per-platform round → lock**; image engines = **both, Gemini "nano-banana" default,
OpenAI gpt-image as a per-round toggle**; only the lock→publish step is gated.

## 2. Existing machinery (reuse) `[VERIFIED]`
- Image generation: `src/lib/campaigns/image-generator.ts` (Gemini + fallback); `GEMINI_API_KEY`, `OPENAI_API_KEY` wired.
- `createCampaign` (`src/lib/campaigns/create-campaign.ts`, marketing-lane branch) + brand resolution + the publish/distribute path.
- `cc_tasks` model + `getTaskById`/`mergeTaskMetadata`/`appendTaskEvent`; the front-half routes ideas to the marketing lane.

## 3. Architecture & flow
```
idea → route(marketing) → STUDIO opens
   [Phase 1] concept round:  brief+brandDNA → 3 concept images → founder picks + refines (chat) ──┐
   [Phase 2] per-platform:   chosen concept → per-platform tiles → approve/refine each            │  reversible drafts
   [Phase 3] 🔒 lock:        approved tiles → campaign_assets (ready) → marketing-lane distribute → Synthex   ← gated
```

## 4. Components
1. **Studio UI** (`src/app/(founder)/founder/command-centre/studio/StudioClient.tsx`) — Layout B: visual canvas (concept grid → per-platform grid) + docked chat; per-tile approve; single gated "Lock → Publish" bar. Client component; no server-only imports.
2. **`POST /api/studio/turn`** — the design-agent turn: `{ taskId, message, phase: 'concept'|'platform', provider: 'gemini'|'openai', conceptId? }` → builds the generation prompt from the founder's message + brand DNA + prior turns → generates/regenerates images → persists → returns `{ agentMessage, images, phase }`. Best-effort per image.
3. **Image glue** — `src/lib/studio/generate-visuals.ts`: `generateVisuals({ prompt, count, aspect, provider })` extending `image-generator.ts` for **concept** (non-platform) images and the **provider toggle**; uploads outputs to the studio storage bucket, returns URLs.
4. **Session persistence** — `src/lib/studio/session.ts`: read/write `cc_tasks.metadata.studio = { phase, provider, messages[], concepts[{id,url,prompt}], chosenConceptId, platformAssets[{platform,url,approved}], brand:{brandProfileId,organizationId,businessKey} }`.
5. **`POST /api/studio/lock`** — promote approved `platformAssets` → real `campaign_assets` (via `createCampaign` then asset inserts) → delegate to the marketing-lane distribute. (Phase 3.)
6. **Brand context** — reuse the marketing lane's `resolveBrandProfile`; if none ready → `not_connected` with a brand picker. Never invent a brand.

## 5. Data model — no migration
- Session/chat/concept state → `cc_tasks.metadata.studio` (JSONB).
- Concept images (pre-platform, don't fit `campaign_assets`' platform enum) → a **Supabase storage bucket** `studio-concepts` (create via the storage API at runtime if absent — not a SQL migration); URLs kept in `metadata.studio.concepts`.
- Locked per-platform assets → existing `campaigns`/`campaign_assets` (Phase 3).

## 6. Governance — auto with checkpoints
All generation/iteration = reversible drafts (images in the bucket / metadata; nothing posted). **Only `/studio/lock` → publish is gated** and confirms before any live posting. `humanApprovalRequired` stays true.

## 7. Error handling (No-Invaders)
Per-image generation failure → honest "couldn't generate that — retry or switch engine" (non-blocking, the turn still returns what succeeded). No ready brand → `not_connected` + brand picker. Provider error → surface + offer the other engine. Storage failure → surfaced, never a broken image as success. Re-running a turn appends to the thread (idempotent on the session).

## 8. Testing
- **Unit:** turn prompt-builder (message + brand + history → prompt); provider selection; session reducer (apply a turn → new metadata.studio); concept-vs-platform phase logic. Mocked image gen + Supabase.
- **Route tests:** `/studio/turn` (401, founder-scope, concept happy path, platform happy path, image-failure degradation, bad phase 400); `/studio/lock` (401, gated promote, not-built guard). Mirror existing command-centre route test mocks; mock `generateVisuals`.
- **Component:** StudioClient renders concept grid + docked chat, tile approve, gated lock button, honest no-brand/error states.
- Gauntlet green; `next build` clean.
- *Honest caveat:* unit tests mock the image models — real generation quality is validated manually with a throwaway session before trusting it.

## 9. Phasing (each phase = its own implementation plan)
- **Phase 1 (this plan next): Studio shell + concept round** — Layout B UI, `/studio/turn` concept phase (both providers), `generate-visuals` + storage bucket, session persistence, brand context (`not_connected` path). First demoable slice; independent of the paused marketing-lane build.
- **Phase 2: Per-platform round** — expand chosen concept → platform tiles, approve/refine.
- **Phase 3: Lock → publish** — promote → `campaign_assets`, reuse marketing-lane distribute (depends on the marketing lane merging first).

## 10. Risks & assumptions (Fabel register)
- `[UNCONFIRMED]` exact `image-generator.ts` signature + how it stores images (bucket vs returns base64) — verify in planning; `generate-visuals` adapts to it.
- `[UNCONFIRMED]` Supabase storage bucket creation from app code (runtime `createBucket`) + RLS on the bucket — verify; fall back to a gated bucket-create if runtime creation isn't permitted.
- `[INFERENCE]` the design agent is a prompt-built generation call, not a separate multi-agent system — keep it a single model-assisted prompt-builder + image gen for v1.
- `[UNCONFIRMED]` OpenAI gpt-image wiring in this app (only `OPENAI_API_KEY` confirmed present) — verify the client path in planning; if absent, Phase 1 ships Gemini with the toggle stubbed `not_connected` (honest) and OpenAI lands as a fast-follow.
- Relationship: the studio supersedes the marketing-lane *auto-build* step; the lane's `createCampaign`/`resolveBrandProfile`/distribute are reused (Phase 3). The paused marketing-lane branch should merge before Phase 3.

## 11. Out of scope
Copy generation (the agent designs *visuals*; campaign copy reuses the existing engine or a later slice); video; multi-campaign batching; the software/content lanes.

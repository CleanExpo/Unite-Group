# Content Lane — Design + Build Brief (autonomous)

> Unite-Group `apps/web` · 23/06/2026 · en-AU. Third lane of the idea platform. Auto-designed (no approval gate, per founder's standing instruction). Reuses the existing content engine end-to-end.

## Purpose & decisions
Idea routed to the **content** lane → generate content variants (reusing the live content engine) → founder reviews → **gated** publish to social channels. Mirrors the marketing-lane structure (build orchestrator + route, gated distribute orchestrator + route, IdeaConsole panel), persisting to `cc_tasks.metadata.content`. No migration.

Decisions made: contentType defaults to `'social_post'` unless the idea/clarifications clearly indicate another `ContentType`; brand resolved by `business_key` from `metadata.routing.businessKey` (else the founder's single `brand_identities` row); publish is the only gated step.

## Reuse (verified contracts)
- `generateContent(request: ContentGenerationRequest, brandIdentity: BrandIdentity, options?): Promise<ContentGenerationResultWithQuality[]>` — `src/lib/content/generator.ts:45`. `ContentGenerationRequest = { businessKey, contentType: ContentType, platform?, topic?, count?, characterPreference? }` (`src/lib/content/types.ts:49`). Result items: `{ title, body, hashtags, cta, mediaPrompt, characterUsed, platform }`.
- Brand load (`src/app/api/content/generate/route.ts`): `supabase.from('brand_identities').select('*').eq('business_key', businessKey).single()` → map snake→camel to `BrandIdentity` (copy the mapping from that route verbatim). Add `.eq('founder_id', user.id)` for scoping.
- `generated_content` insert fields (same route): `{ founder_id, business_key, content_type, platform, title, body, media_prompt, hashtags, cta, character_used, ai_model:'claude-sonnet-4-5-20250929', generation_source:'manual_request', status:'generated' }` → `.select('id').single()`.
- Promote (`src/app/api/content/[id]/promote/route.ts`): load `generated_content` by id (founder-scoped) → insert `social_posts` `{ founder_id, business_key, title, content:(body+hashtags), media_urls, platforms:[platform], status: scheduledAt?'scheduled':'draft', scheduled_at }` → update `generated_content` `{ social_post_id, status:'approved' }`. Reuse this logic in distribute (replicate the insert; it is small).
- `getTaskById`/`mergeTaskMetadata`/`appendTaskEvent` (`src/lib/command-centre/tasks.ts`), `getUser`. Event type `'comment'` is valid.
- `CONTENT_TYPES` / `ContentType` from `src/lib/content/types.ts` (read for valid values + a safe default).

## Governance / errors
Auto: generate + store content (reversible drafts in `generated_content`). **Gated:** distribute (promote → `social_posts` → live via the existing social-publisher cron). No brand identity → honest `not_connected`. Generation/promote failure → surfaced, never faked. en-AU, `founder_id` scoping, `force-dynamic` + auth on routes, no new deps.

## Build (TDD; each its own commit `[content-lane]`)
1. `src/lib/command-centre/lanes/content-build.ts` — `runContentBuild({ founderId, taskId }, deps?)`: load task → derive `{ businessKey, contentType, topic }` from `task.objective` + `metadata.clarifications.answers` + `metadata.routing` → load+map brand_identity (null → `{status:'not_connected', reason}`) → `generateContent` → insert `generated_content` rows → `mergeTaskMetadata({ content:{ generatedContentIds, status:'built', count, builtAt } })` → return `{status:'built', count, ids}`. Inject `deps` (getTaskById, mergeTaskMetadata, appendTaskEvent, generateContent, a supabase client) for tests. **Unit test** mocks all deps: not_connected on no brand; happy path generates+stores+persists; generation failure surfaced.
2. `src/app/api/command-centre/lanes/content/build/route.ts` — thin POST `{ taskId }` → 401/400 → runContentBuild → 200 `{ result }` / 500. `force-dynamic`. Route test (mock runContentBuild): 401, 400, 200, 500.
3. `src/lib/command-centre/lanes/content-distribute.ts` — `runContentDistribute({ founderId, taskId, scheduledAt? }, deps?)`: gated; read `metadata.content.generatedContentIds`; for each, promote → `social_posts` (replicate the promote insert + the generated_content status update); mark `metadata.content.status='distributed'`; return `{status:'distributed', postsCreated}` or `{status:'not_built'}` if no ids. Unit test mocks deps.
4. `src/app/api/command-centre/lanes/content/distribute/route.ts` — thin POST `{ taskId, scheduledAt? }`. Route test.
5. IdeaConsole panel — when `routing.lane==='content'`: a **"Draft content"** action → build → render the generated variants (title + body snippet) → a **gated "Publish"** button (enabled only after built) → distribute → show "Published — N posts". Honest not_connected/not_built/error states. Mirror the marketing/clarify handlers already in `IdeaConsole.tsx`. Component test (mock fetch).

## Verify & PR
Full gauntlet (`type-check && lint && test`) green; `next build` clean. PR into `main`: `feat(command-centre): content lane — idea → generate → gated publish`. Note: reuses the content engine; software lane is separate.

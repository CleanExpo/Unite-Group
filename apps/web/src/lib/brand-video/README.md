# Brand Video Studio

Queue and render consistent, on-brand faceless marketing videos from the founder
dashboard. This is the server-side counterpart to the local `/brand-video` skill
(`.claude/skills/brand-video/` at the repo root): the dashboard enqueues a job,
an out-of-band worker runs the pipeline.

## Pieces

| Piece | Path (under `apps/web`) |
| --- | --- |
| Style registry (dropdown source) | `src/lib/brand-video/styles.ts` (mirrors `.claude/skills/brand-video/styles.json`) |
| Dashboard page | `src/app/(founder)/founder/brand-video/page.tsx` |
| Studio UI (form + jobs list) | `src/components/brand-video/brand-video-studio.tsx` |
| Enqueue API | `src/app/api/brand-video/generate/route.ts` (`POST`) |
| Table + RLS | `supabase/migrations/20260627000000_brand_video_jobs.sql` |
| Worker | `scripts/brand-video-worker.mjs` |

## Data flow

1. Operator picks a **style**, **brand**, **topic**, optional **count** and hits
   **Generate**. The page `POST`s `/api/brand-video/generate`.
2. The API auth-guards on the Supabase session (`getUser()`), validates with zod,
   and inserts a `queued` row into `brand_video_jobs` owned by the caller
   (`created_by = user.id`).
3. `brand_video_jobs` is owner-scoped by RLS (owner reads/inserts their own rows;
   the worker uses `service_role`).
4. The worker claims the oldest `queued` job and runs:
   `beats(topic) -> generateImage() per beat -> ElevenLabs TTS -> ffmpeg stitch
   -> upload -> status=done + output_url`.
5. The dashboard "Recent jobs" list reflects status (queued / processing / done /
   failed / needs_local_render).

## The image-adapter seam (important)

The per-beat image step in the local skill uses **margot**, a local-only MCP.
It is **not reachable from a server or cron process**. The worker therefore calls
an adapter, `generateImage(prompt, style)`, which posts to a remote HTTP image API
defined by env:

- `IMAGE_API_URL` — endpoint that accepts `{ prompt, negative_prompt, width,
  height }` and returns PNG bytes.
- `IMAGE_API_KEY` — optional bearer token for that endpoint.

If `IMAGE_API_URL` is **absent**, the worker does **not fail** — it marks the job
`needs_local_render` (and stops before spending TTS), signalling that the operator
should finish that job locally with the `/brand-video` skill + margot. Wiring a
remote image API (e.g. a hosted SDXL / Nano-Banana endpoint) is the one follow-up
needed for full server-side rendering.

## Running the worker

```bash
# one job per invocation — wire to cron for a loop
cd apps/web && set -a && . .env.local && set +a && node scripts/brand-video-worker.mjs
```

Required env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`. Optional: `IMAGE_API_URL`,
`IMAGE_API_KEY`, `BRAND_VIDEO_BUCKET` (Supabase Storage bucket for the final mp4;
without it `output_url` is the local file path), `BRAND_VIDEO_OUT_DIR`. Requires
`ffmpeg` / `ffprobe` on `PATH`.

## Applying the migration

Sandbox-first per the repo `CLAUDE.md`:

```bash
./scripts/sandbox-wizard.sh apply apps/web/supabase/migrations/20260627000000_brand_video_jobs.sql
# promote to prod only after sandbox verification
```

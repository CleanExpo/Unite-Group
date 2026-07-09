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

The per-beat image step in the local skill uses **margot**, a local-only MCP that
is **not reachable from a server or cron process**. The worker therefore calls an
adapter, `generateImage(prompt, style)`, with two paths:

- **Default (prod):** shells to the vendored Gemini "nano-banana" adapter
  `.claude/skills/brand-video/pipeline/image_gen.py`, using `GEMINI_API_KEY`. This
  is the validated end-to-end path (`gemini-2.5-flash-image`, native 16:9 PNG over
  HTTPS) — the same model family that produced the proven look.
- **Optional override:** set `IMAGE_API_URL` (+ optional `IMAGE_API_KEY`) to POST
  the styled prompt to a custom HTTP image endpoint that returns PNG bytes.

If image generation fails (e.g. `GEMINI_API_KEY` missing or an API error), the job
is marked `failed` with the error — it no longer parks at `needs_local_render`.

## Worker host — GitHub Actions (prod render)

A Vercel function can't run ffmpeg or long jobs, so the worker runs in GitHub
Actions where ffmpeg exists: `.github/workflows/brand-video-render.yml`
(`workflow_dispatch` only). Automatic event dispatch is intentionally deferred
until a production GitHub credential and a tested queue-owner emitter are connected.
Each manual run installs ffmpeg + Node + Python, installs `apps/web` deps, then
runs the worker to claim and render one queued job, uploading the mp4 to
`BRAND_VIDEO_BUCKET` and setting `status=done` + `output_url`.

### Required GitHub Actions secrets (repo Settings → Secrets and variables → Actions)

| Secret | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini "nano-banana" image generation |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice (per-brand) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (claim jobs + write back, RLS bypass) |
| `BRAND_VIDEO_BUCKET` | Name of the Supabase Storage bucket for final mp4s |

Also create the **Supabase Storage bucket** named by `BRAND_VIDEO_BUCKET` (public,
so `getPublicUrl` returns a usable `output_url`). Without it the worker falls back
to a local file path for `output_url`.

## Running the worker locally

```bash
# one job per invocation
cd apps/web && set -a && . .env.local && set +a && node scripts/brand-video-worker.mjs
```

Required env: `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`),
`SUPABASE_SERVICE_ROLE_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`,
`GEMINI_API_KEY`. Optional: `IMAGE_API_URL` / `IMAGE_API_KEY` (override),
`BRAND_VIDEO_BUCKET`, `BRAND_VIDEO_OUT_DIR`. Requires `ffmpeg` / `ffprobe` and
`python3` on `PATH`.

## Applying the migration

Sandbox-first per the repo `CLAUDE.md`:

```bash
./scripts/sandbox-wizard.sh apply apps/web/supabase/migrations/20260627000000_brand_video_jobs.sql
# promote to prod only after sandbox verification
```

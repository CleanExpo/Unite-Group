/**
 * Brand Video Studio — job worker.
 *
 * Claims ONE queued row from public.brand_video_jobs and runs the /brand-video
 * pipeline server-side:
 *
 *     beats(topic) -> generateImage() per beat -> ElevenLabs TTS -> ffmpeg stitch
 *                  -> upload -> status=done + output_url
 *
 * Run (single job per invocation — wire to cron for a loop):
 *     cd apps/web && set -a && . .env.local && set +a && node scripts/brand-video-worker.mjs
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY        — worker writes back via service_role (RLS bypass)
 *   ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
 *   GEMINI_API_KEY                   — default image adapter (see below)
 *
 * Image adapter seam:
 *   margot (the local image MCP) is NOT reachable from a server/cron process.
 *   The per-beat image step goes through generateImage(prompt, style), which by
 *   default shells to the vendored Gemini "nano-banana" adapter
 *   (.claude/skills/brand-video/pipeline/image_gen.py, GEMINI_API_KEY) — the
 *   validated prod path that returns a native 16:9 PNG over HTTPS. Optionally,
 *   set IMAGE_API_URL to POST the styled prompt to a custom HTTP image endpoint
 *   instead. See src/lib/brand-video/README.md.
 *
 * Optional env:
 *   IMAGE_API_URL, IMAGE_API_KEY     — override: custom HTTP image generator
 *   BRAND_VIDEO_BUCKET               — Supabase Storage bucket for the final mp4
 *   BRAND_VIDEO_OUT_DIR              — local work dir (default ./.brand-video-out)
 */

import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUT_DIR = process.env.BRAND_VIDEO_OUT_DIR || path.resolve('.brand-video-out');

// apps/web/scripts -> repo root -> the vendored /brand-video skill's prod image
// adapter (Gemini "nano-banana" over HTTPS; runs server-side, unlike margot).
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const IMAGE_GEN_PY = path.join(REPO_ROOT, '.claude/skills/brand-video/pipeline/image_gen.py');

// Style POSITIVE/NEGATIVE tokens mirror .claude/skills/brand-video/styles.md.
const STYLE_TOKENS = {
  'flat-line': {
    positive: 'Clean modern flat-line explainer illustration, thick charcoal outlines, deep teal + warm amber on off-white, single clear subject, generous white space',
    negative: 'not childish, not photorealistic, no gradients, no text, no logos, no clutter',
  },
  'hand-doodle': {
    positive: 'Hand-drawn marker doodle illustration, loose sketchy black ink on white, friendly characters, whiteboard-explainer energy, single clear subject',
    negative: 'not photorealistic, not corporate-stock, no gradients, no text, no logos',
  },
  'bold-kinetic': {
    positive: 'Bold flat colour-block illustration, high-contrast saturated palette, thick geometric shapes, strong diagonal composition, single dominant subject',
    negative: 'not muted, not photorealistic, no gradients, no text, no logos',
  },
  'cinematic-photoreal': {
    positive: 'Cinematic photorealistic still, shallow depth of field, dramatic directional lighting, filmic colour grade, single clear focal subject',
    negative: 'not cartoon, not illustration, no text overlays, no logos, no watermark',
  },
  'minimal-corporate': {
    positive: 'Minimal corporate illustration, clean line + single accent colour on white, abundant whitespace, precise geometric icons, one clear subject',
    negative: 'not busy, not childish, not photorealistic, no gradients, no text, no logos',
  },
  'retro-print': {
    positive: 'Warm retro mid-century print-poster illustration, limited risograph palette, visible halftone texture, bold simplified shapes, single clear subject',
    negative: 'not photorealistic, not 3D, not glossy, no text, no logos',
  },
};

function admin() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

/** Split a topic into one beat (= one image) per sentence. */
function beatsFromTopic(topic) {
  const beats = topic
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return beats.length ? beats : [topic.trim()];
}

/**
 * Image adapter seam. Returns the saved PNG path for one beat.
 *
 * Default: the validated prod adapter — shells to the vendored Gemini
 * "nano-banana" script (GEMINI_API_KEY), which returns a native 16:9 PNG and
 * works server-side (unlike the local margot MCP). Optional override: set
 * IMAGE_API_URL to POST the styled prompt to a custom HTTP image endpoint.
 */
async function generateImage(prompt, style, outPath) {
  const tokens = STYLE_TOKENS[style] || STYLE_TOKENS['flat-line'];
  const fullPrompt = `${tokens.positive}. Scene: ${prompt}. Avoid: ${tokens.negative}.`;

  // Optional override: custom HTTP image API.
  if (process.env.IMAGE_API_URL) {
    const res = await fetch(process.env.IMAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.IMAGE_API_KEY ? { Authorization: `Bearer ${process.env.IMAGE_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        negative_prompt: tokens.negative,
        width: 1920,
        height: 1080,
      }),
    });
    if (!res.ok) throw new Error(`Image API ${res.status}: ${await res.text()}`);
    await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
    return outPath;
  }

  // Default: Gemini "nano-banana" adapter from the vendored /brand-video skill.
  await run('python3', [IMAGE_GEN_PY, fullPrompt, outPath]);
  return outPath;
}

/** ElevenLabs text-to-speech -> mp3 on disk. */
async function elevenLabsTTS(text, outPath) {
  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voice) throw new Error('Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
  return outPath;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-500)}`)),
    );
  });
}

function probeDuration(file) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
    ]);
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('error', reject);
    p.on('close', () => resolve(parseFloat(out.trim()) || 0));
  });
}

/** Stitch images + voiceover into a 1080p mp4 (each image shown for an equal slice). */
async function stitch(images, audio, workDir, outFile) {
  const duration = await probeDuration(audio);
  const per = Math.max(1, duration / images.length);
  const listPath = path.join(workDir, 'list.txt');
  const lines = [];
  for (const img of images) {
    lines.push(`file '${img}'`, `duration ${per.toFixed(3)}`);
  }
  lines.push(`file '${images[images.length - 1]}'`); // concat demuxer needs final repeat
  await writeFile(listPath, lines.join('\n'));
  await run('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-i', audio,
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
    '-r', '25', '-c:v', 'libx264', '-c:a', 'aac', '-shortest', outFile,
  ]);
  return outFile;
}

async function uploadOutput(supabase, jobId, file) {
  const bucket = process.env.BRAND_VIDEO_BUCKET;
  if (!bucket) return `file://${file}`; // no bucket configured — return local path
  const data = await readFile(file);
  const key = `${jobId}/final-1080p.mp4`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(key, data, { contentType: 'video/mp4', upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
}

/** Atomically claim the oldest queued job (guarded by status=queued). */
async function claimJob(supabase) {
  const { data: queued } = await supabase
    .from('brand_video_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!queued) return null;
  const { data: claimed } = await supabase
    .from('brand_video_jobs')
    .update({ status: 'processing' })
    .eq('id', queued.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();
  return claimed; // null if another worker won the race
}

async function main() {
  const supabase = admin();
  const job = await claimJob(supabase);
  if (!job) {
    console.log('No queued brand_video_jobs.');
    return;
  }
  console.log(`Claimed job ${job.id} (${job.brand} / ${job.style})`);
  const workDir = path.join(OUT_DIR, job.id);
  await mkdir(path.join(workDir, 'images'), { recursive: true });

  try {
    const beats = beatsFromTopic(job.topic);

    // Image step first — fail fast and cheap (before TTS) if image generation
    // errors (e.g. GEMINI_API_KEY missing or an image API error).
    const images = [];
    for (let i = 0; i < beats.length; i++) {
      const out = path.join(workDir, 'images', `${String(i + 1).padStart(2, '0')}.png`);
      images.push(await generateImage(beats[i], job.style, out));
    }

    const audio = await elevenLabsTTS(job.topic, path.join(workDir, 'voiceover.mp3'));
    const mp4 = await stitch(images, audio, workDir, path.join(workDir, 'final-1080p.mp4'));
    const outputUrl = await uploadOutput(supabase, job.id, mp4);

    await supabase
      .from('brand_video_jobs')
      .update({ status: 'done', output_url: outputUrl, error: null })
      .eq('id', job.id);
    console.log(`Done: ${outputUrl}`);
  } catch (err) {
    await supabase
      .from('brand_video_jobs')
      .update({ status: 'failed', error: String(err && err.message ? err.message : err) })
      .eq('id', job.id);
    console.error(`Job ${job.id} failed:`, err);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

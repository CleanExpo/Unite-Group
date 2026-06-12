# Unified Agentic Research-to-Video Pipeline

> The complete system architecture connecting Obsidian → Knowledge Console → Video Production → Syntax Publishing
> Date: 2026-06-03
> Owner: Pi-CEO Board
> Status: Phase 1 Active (Knowledge Console) + Phase 0 Video (Design)

---

## 1. THE UNIFIED VISION

Stop building separate tools. Build **one production line** where knowledge flows end-to-end:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UNITE-GROUP AGENTIC NEXUS                           │
│                                                                             │
│  OBSIDIAN VAULT          KNOWLEDGE CONSOLE          VIDEO PIPELINE          │
│  ──────────────          ────────────────          ───────────────          │
│                                                                             │
│  ┌──────────┐            ┌──────────┐              ┌──────────┐            │
│  │ Research │            │ Browse   │              │ Script   │            │
│  │ Notes    │───────────▶│ Search   │─────────────▶│ Generate │            │
│  │ (Daily)  │   sync     │ Filter   │   "Create    │ (Gemini) │            │
│  └──────────┘            └──────────┘    Video"    └──────────┘            │
│       ▲                       │                         │                  │
│       │                       ▼                         ▼                  │
│  ┌──────────┐            ┌──────────┐              ┌──────────┐            │
│  │ Brain    │            │ Note     │              │ Audio    │            │
│  │ Builder  │            │ Viewer   │              │ (11labs) │            │
│  │ (Cron)   │            │ (Read)   │              │          │            │
│  └──────────┘            └──────────┘              └──────────┘            │
│       │                                                 │                  │
│       │                       ┌──────────┐              ▼                  │
│       │                       │ Project  │         ┌──────────┐            │
│       └───────────────────────│ Registry │◀────────│ Video    │            │
│                               │ (Meta)   │         │ Compose  │            │
│                               └──────────┘         │ (FFMPEG) │            │
│                                                    └──────────┘            │
│                                                         │                  │
│  SYNTAX                   PUBLISHING                    ▼                  │
│  ──────                   ──────────              ┌──────────┐            │
│                                                   │ HeyGen   │            │
│  ┌──────────┐            ┌──────────┐            │ Avatar   │            │
│  │ YouTube  │◀───────────│ Queue    │◀───────────│ Video    │            │
│  │ API      │            │ (BullMQ) │  webhook   │ (MP4)    │            │
│  └──────────┘            └──────────┘            └──────────┘            │
│       ▲                       ▲                                           │
│       │                       │                                           │
│  ┌──────────┐            ┌──────────┐                                     │
│  │Facebook  │            │ Pi-CEO   │                                     │
│  │LinkedIn  │            │ Board    │                                     │
│  └──────────┘            │ Review   │                                     │
│                          └──────────┘                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**The flow is simple:**
1. Research enters the vault (automated or manual)
2. Knowledge Console makes it browsable
3. One click → "Create Video" triggers the pipeline
4. 5 minutes later → video is in Syntax queue, ready to publish

---

## 2. THE THREE COGNITIVE LAYERS

### Layer 1: Knowledge Ingestion (Already Built ✅)
| Component | What It Does | Cron |
|-----------|-------------|------|
| `obsidian-brain-builder` | Daily research synthesis | 2:00am |
| `unite-group-daily-ingestion` | Feed whitelist ingestion | 8:00pm |
| `unite-group-weekly-qa-cadence` | Research QA gates | Mon/Wed/Thu |
| Vault Scanner (`scan-vault.py`) | Gap analysis + topic suggestion | On-demand |

**Output:** Structured markdown notes in `02-Concepts/`, `06-Writing/`, `05-Projects/`

### Layer 2: Knowledge Command Center (Phase 1 Complete ✅)
| Component | What It Does |
|-----------|-------------|
| `knowledge_notes` table | All vault content in queryable DB |
| `knowledge_projects` table | Canonical entity registry (RA, DR, CCW...) |
| Knowledge Console UI | Browse, search, read, deep-link to Obsidian |
| `/api/knowledge/notes` | Paginated, filterable, full-text search |
| `/api/knowledge/projects` | Entity-scoped project listing |

**Output:** Every note is findable, searchable, cross-referenced

### Layer 3: Video Production (Phase 0 → 1)
| Component | What It Does | Status |
|-----------|-------------|--------|
| `video_jobs` table | State machine for every video | 🔄 Building now |
| Script Generator (Gemini) | Convert note → structured script | 🔄 Building now |
| Audio Generator (ElevenLabs) | Script → MP3 narration | 🔄 Building now |
| Asset Generator (Imagen/DALL-E) | Visual cues → PNG thumbnails/B-roll | 🔄 Building now |
| Video Generator (HeyGen) | Avatar + audio → MP4 | 🔄 Building now |
| Video Composer (FFMPEG) | Add overlays, stitch, burn subs | 🔄 Building now |
| Publishing Queue (Syntax) | Schedule to YT/FB/LI | ✅ Already connected |
| `/api/syntax/webhooks/heygen` | Receive async completion | 🔄 Building now |
| `knowledge-console/"Create Video"` | One-click trigger from any note | 🔄 Building now |
| `daily-video-production` cron | Auto-queue top notes for video | 🔄 Building now |

**Output:** Published videos on YouTube, Facebook, LinkedIn

---

## 3. THE DATA MODEL

### Entity Relationship

```
knowledge_notes (source)
  ├── id (uuid)
  ├── project_key (fk → knowledge_projects.key)
  ├── title, content, tags
  └── [NEW] video_job_id (nullable fk → video_jobs.id)

knowledge_projects (registry)
  ├── key: "restoreassist" | "disaster-recovery" | "ccw" | "carsi" | "nexus"
  ├── label, description, status
  └── note_count (auto-maintained)

video_jobs (production state machine)
  ├── id (uuid)
  ├── source_note_id (fk → knowledge_notes.id)
  ├── project_key (fk → knowledge_projects.key)
  ├── status: draft → scripting → audio_pending → assets_pending 
  │           → video_pending → composing → queued → published → failed
  ├── script_text, script_json (structured with timestamps)
  ├── audio_url (ElevenLabs output)
  ├── asset_urls [] (Imagen/DALL-E outputs)
  ├── heygen_video_id, heygen_status
  ├── final_video_url (after FFMPEG compose)
  ├── thumbnail_url
  ├── youtube_video_id, facebook_post_id, linkedin_post_id
  ├── cost_cents (tracked per job)
  ├── error_message (if failed)
  ├── created_at, updated_at, published_at
  └── founder_id (RLS scope)

syntax_publish_queue (publishing buffer)
  ├── video_job_id (fk)
  ├── platform: youtube | facebook | linkedin
  ├── scheduled_for (timestamp)
  ├── status: pending → publishing → published → failed
  └── platform_post_id (after publish)
```

### State Machine: video_jobs.status

```
         ┌─────────────┐
         │    DRAFT    │◀── "Create Video" button clicked
         └──────┬──────┘
                │
                ▼
         ┌─────────────┐
         │  SCRIPTING  │◀── Gemini API: note → script
         └──────┬──────┘
                │
                ▼
         ┌─────────────┐
         │AUDIO_PENDING│◀── ElevenLabs: script → MP3
         └──────┬──────┘
                │
                ▼
         ┌─────────────┐
         │ASSETS_PENDING│◀── Imagen/DALL-E: visual cues → images
         └──────┬──────┘
                │
                ▼
         ┌─────────────┐
         │VIDEO_PENDING│◀── HeyGen: avatar + audio → MP4
         └──────┬──────┘
                │ webhook received
                ▼
         ┌─────────────┐
         │ COMPOSING   │◀── FFMPEG: stitch + overlay + subs
         └──────┬──────┘
                │
                ▼
         ┌─────────────┐
         │   QUEUED    │◀── Syntax: added to publish queue
         └──────┬──────┘
                │ cron publishes
                ▼
         ┌─────────────┐
         │  PUBLISHED  │◀── Live on YT/FB/LI
         └─────────────┘
                │
                ▼ (any step)
         ┌─────────────┐
         │   FAILED    │◀── error_message captured
         └─────────────┘
```

---

## 4. THE PRODUCTION LANES

Not everything becomes a video. The system routes content intelligently:

| Content Type | Lane | Trigger | Output |
|-------------|------|---------|--------|
| **Research Note** | Knowledge Base | Auto (daily cron) | Vault entry + Console entry |
| **Deep Article** | SEO Content | Manual (approval) | Published article on site/blog |
| **Video Script** | Video Pipeline | Manual click OR auto score | 5-min YouTube video |
| **Short Form** | Social Reels | Auto (from video) | 60s TikTok/Reels/Shorts |
| **Email Brief** | Newsletter | Cron (weekly) | Subscriber email |
| **Playbook** | Runbook | Manual (PM approval) | SOP document in vault |

**The router logic:**
```
 if note.word_count > 1000 and note.quality == "published"
    → eligible for Video Pipeline
 if note.tags contains "video-priority"
    → auto-queue for video (no approval)
 if note.project_key == "restoreassist" and note.confidence == "high"
    → daily cron considers for auto-video
```

---

## 5. THE GOVERNANCE DASHBOARD

Pi-CEO Board Weekly Review now tracks **three pipelines:**

| Pipeline | Metric | Target | Status |
|----------|--------|--------|--------|
| **Knowledge** | Notes added/week | ≥10 | Tracking |
| **Video** | Videos published/week | ≥3 | Starting |
| **Publishing** | Platform reach | Per video 1,000+ views | Starting |
| **Cost** | Cost per video | ≤$3.00 | Tracking |
| **Quality** | Founder approval rate | ≥80% | Starting |

---

## 6. INTEGRATION POINTS (What Gets Built Now)

### A. Database (Migration)
- `video_jobs` table with full state machine
- `syntax_publish_queue` table for publishing buffer
- Backfill `knowledge_notes.video_job_id` nullable FK

### B. API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/knowledge/notes/{id}/create-video` | POST | One-click: note → video job |
| `/api/syntax/webhooks/heygen` | POST | Receive HeyGen completion |
| `/api/video/jobs` | GET | List video jobs with status |
| `/api/video/jobs/{id}` | GET | Detail + logs |
| `/api/video/jobs/{id}/retry` | POST | Retry failed step |
| `/api/video/stats` | GET | Pipeline metrics for CEO Board |

### C. UI Components
- **Knowledge Console:** "Create Video" button on every note (gated by quality/confidence)
- **Founder Dashboard:** Video pipeline status card (jobs in flight, this week's videos, cost)
- **Video Jobs Page:** List view with status, preview, publish actions

### D. Cron Jobs
| Cron | Schedule | Action |
|------|----------|--------|
| `obsidian-brain-builder` | Daily 2:00am | Research → vault notes |
| `unite-group-daily-ingestion` | Daily 8:00pm | Feed whitelist → vault |
| `daily-video-producer` | Daily 10:00am | Top eligible notes → video jobs |
| `syntax-publish-queue` | Every 15 min | Check queue → publish to platforms |
| `pi-ceo-weekly-review` | Sun 8:00pm | Pipeline metrics → board meeting |

---

## 7. THE COST TRACKER

Every `video_job` tracks its exact cost:

| Step | Service | Cost | Tracked In |
|------|---------|------|-----------|
| Script | Gemini Flash | $0.01 | `video_jobs.cost_cents += 1` |
| Audio | ElevenLabs | $0.50 | `video_jobs.cost_cents += 50` |
| Images | Imagen 3 (x5) | $0.15 | `video_jobs.cost_cents += 15` |
| Video | HeyGen (5min) | $2.50 | `video_jobs.cost_cents += 250` |
| Compose | FFMPEG | $0.00 | No cost |
| Publish | Syntax APIs | $0.00 | No cost |
| **Total** | | **$2.66** | **266 cents** |

**Hard ceiling:** Monthly budget = $100. When `SUM(cost_cents)` ≥ 10000, auto-pause queue and notify founder.

---

## 8. THE HUMAN GATES

Full automation is dangerous. These gates require human approval:

| Gate | Trigger | Action |
|------|---------|--------|
| **Script QA** | Script generated | Founder reviews in Console, approves/rejects |
| **Video QA** | HeyGen MP4 ready | Founder previews, approves/rejects |
| **Publish QA** | In Syntax queue | Founder confirms schedule/platform before live |
| **Emergency Stop** | Cost > budget OR quality < threshold | Auto-pause, notify, wait for founder |

**Default mode:** Draft approval — auto-generate everything, hold at "QUEUED" until founder hits "Publish".

---

## 9. SUCCESS METRICS (90-Day Targets)

| Metric | Baseline | 30 Days | 60 Days | 90 Days |
|--------|----------|---------|---------|---------|
| Knowledge notes (total) | 10 | 50 | 120 | 250 |
| Videos produced (total) | 0 | 5 | 20 | 50 |
| Videos published (total) | 0 | 3 | 15 | 40 |
| Avg cost/video | — | $3.00 | $2.50 | $2.00 |
| Founder approval rate | — | 80% | 85% | 90% |
| YouTube views (total) | 0 | 500 | 3000 | 10000 |
| Pipeline uptime | — | 95% | 98% | 99% |

---

*This document is the master blueprint. All implementation tickets derive from sections 6 and 7.*

# CRM Integration — Precise Missing Credentials Report

> Generated: 2026-06-03 13:41 AEST
> Target: `.env.local` at `/d/Unite-Hub/.env.local`
> Scan scope: CRM integration env variables only
> Total env vars scanned: 97
> Present with real values: 78
> Empty/short: 5
> **Missing entirely: 19**
> ---

## Foundational Infrastructure (ALL PRESENT)

| Variable | Source | Status |
|----------|--------|--------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase | Present |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase | Present |
| SUPABASE_SERVICE_ROLE_KEY | Supabase | Present |
| SUPABASE_ACCESS_TOKEN | Supabase | Present |
| SUPABASE_SECRET_KEY | Supabase | Present |
| DATABASE_URL | Supabase | Present |
| CRON_SECRET | Internal | Present |
| NEXT_PUBLIC_APP_URL | Config | Present |
| VERCEL_OIDC_TOKEN | Vercel | Present |

## Google Ecosystem (MOSTLY PRESENT — OAuth Incomplete)

| Variable | Status | Issue |
|----------|--------|-------|
| GOOGLE_CLIENT_ID | Present | Real value found |
| GOOGLE_CLIENT_SECRET | Present | Real value found |
| GOOGLE_CALLBACK_URL | Present | Real value found |
| GMAIL_CLIENT_ID | Present | Real value found |
| GMAIL_CLIENT_SECRET | Present | Real value found |
| GMAIL_REDIRECT_URI | Present | Real value found |
| GOOGLE_AI_API_KEY | Present | Real value found |
| **GSC_PROPERTY_ID** | **MISSING** | Not in file |
| **GA4_PROPERTY_ID** | **MISSING** | Not in file |

**Assessment:** Google OAuth credentials are configured. Only Search Console and Analytics property IDs are missing. These come from your GSC/GA4 dashboard, not from an app creation flow.

## Xero Accounting (COMPLETELY MISSING)

| Variable | Status | Note |
|----------|--------|------|
| **XERO_CLIENT_ID** | MISSING | Create at https://developer.xero.com |
| **XERO_CLIENT_SECRET** | MISSING | Create at https://developer.xero.com |
| **DR_CLIENT_ID** | MISSING | Create 2nd app for DR entity |
| **DR_CLIENT_SECRET** | MISSING | Create 2nd app for DR entity |

**Assessment:** Both CARSI and DR Xero apps need creation. This is a 15-minute task per app.

## Social Media (COMPLETELY MISSING)

| Variable | Status | Note |
|----------|--------|------|
| **META_APP_ID** | MISSING | Meta for Developers |
| **META_APP_SECRET** | MISSING | Meta for Developers |
| **FACEBOOK_APP_ID** | MISSING | (May be same as META) |
| **FACEBOOK_APP_SECRET** | MISSING | (May be same as META) |
| **LINKEDIN_CLIENT_ID** | MISSING | LinkedIn Developers |
| **LINKEDIN_CLIENT_SECRET** | MISSING | LinkedIn Developers |
| **TIKTOK_CLIENT_KEY** | MISSING | TikTok for Developers |
| **TIKTOK_CLIENT_SECRET** | MISSING | TikTok for Developers |
| **REDDIT_CLIENT_ID** | MISSING | Reddit Apps |
| **REDDIT_CLIENT_SECRET** | MISSING | Reddit Apps |
| **YOUTUBE_API_KEY** | MISSING | Google Cloud Console (separate from OAuth) |

**Assessment:** Every social platform requires app creation and API key generation. YouTube API key comes from Google Cloud Console (different from the Google OAuth client already configured).

## WhatsApp Business (COMPLETELY MISSING)

| Variable | Status | Note |
|----------|--------|------|
| **WHATSAPP_PHONE_NUMBER_ID** | MISSING | Meta Business Account |
| **WHATSAPP_ACCESS_TOKEN** | MISSING | Meta Business Account |

## GitHub (MISSING)

| Variable | Status | Note |
|----------|--------|------|
| **GITHUB_TOKEN** | MISSING | Could be `ghp_` token or app credential |

## Already Present (Not CRM but relevant)

| Service | Variables |
|---------|-----------|
| OpenAI | OPENAI_API_KEY |
| OpenRouter | OPENROUTER_API_KEY, OPENROUTER_API_KEY_2 |
| Anthropic | ANTHROPIC_API_KEY |
| ElevenLabs | ELEVENLABS_API_KEY |
| Gemini | GEMINI_API_KEY |
| SendGrid | SENDGRID_API_KEY |
| Stripe | 7 keys (publishable, secret, webhook, etc.) |
| DataForSEO | DATAFORSEO_API_LOGIN, DATAFORSEO_API_PASSWORD |
| SEMrush | SEMRUSH_API |
| Jena | JENA_API_KEY |
| DigitalOcean | DIGITALOCEAN_API_TOKEN |
| Abacus | ABACUS_API_KEY, ABACUS_CLI_KEY |
| M1 | M1_JWT_SECRET |

---

## The Real Gap: Only 7 Sources to Create

1. **Xero** (2 apps: CARSI + DR)
2. **Google Cloud** (YouTube API key + GSC/GA4 property IDs)
3. **Meta** (Facebook/Instagram/WhatsApp)
4. **LinkedIn**
5. **TikTok**
6. **Reddit** (optional — social monitoring)
7. **GitHub** (optional — token for repos)

---

## Updated Phase 0 Estimate

Original estimate: 7 sources, 3.5 hours
Revised estimate: **5 sources, 2 hours** (Reddit + GitHub are optional)

| Priority | Source | Time | Gets You |
|----------|--------|------|----------|
| P0 | Xero (2 apps) | 40 min | Revenue, invoices, bank feeds |
| P0 | Meta | 30 min | Facebook, Instagram, WhatsApp |
| P1 | LinkedIn | 20 min | Company page posts |
| P1 | TikTok | 20 min | Video publishing |
| P1 | Google (YouTube key) | 10 min | Video uploads |
| P2 | GSC/GA4 IDs | 5 min | SEO + analytics widgets |
| P3 | Reddit | 15 min | Social monitoring |
| P3 | GitHub token | 5 min | Repo integration |

---

## Recommended Order (Fastest to Business Value)

1. **Xero** first — your #1 pain point per the consultation
2. **Meta** second — unlocks FB + Insta + WhatsApp in one go
3. **LinkedIn + TikTok** third — social coverage complete
4. **YouTube API key** fourth — video pipeline already built
5. **GSC/GA4** fifth — analytics widgets
6. **GitHub** sixth — code repo visibility (optional)
7. **Reddit** last — social monitoring (optional)

---

## Required Scopes per Service

| Service | Scopes Needed |
|---------|--------------|
| Xero | `accounting.transactions accounting.contacts offline_access` |
| Google (Gmail) | `https://www.googleapis.com/auth/gmail.modify` |
| Google (Calendar) | `https://www.googleapis.com/auth/calendar` |
| Google (Drive) | `https://www.googleapis.com/auth/drive.file` |
| Google (GSC) | `https://www.googleapis.com/auth/webmasters.readonly` |
| Google (GA4) | `https://www.googleapis.com/auth/analytics.readonly` |
| Google (YouTube) | `https://www.googleapis.com/auth/youtube.upload` |
| Meta (FB) | `pages_read_engagement pages_manage_posts instagram_basic instagram_content_publish` |
| LinkedIn | `r_organization_social w_organization_social r_basicprofile` |
| TikTok | `video.publish video.upload` |
| WhatsApp | `whatsapp_business_messaging whatsapp_business_management` |
| GitHub | `repo read:user` |

---

## Next Step

Choose your path:

**Path A: I'll create all developer accounts (2 hours)**
- Use Phase 0 guide: `docs/research/PHASE_0_DEVELOPER_ACCOUNT_SETUP_GUIDE.md`
- Copy-paste each URL, create app, save credentials

**Path B: We do it together live**
- I navigate to each site in browser
- You tell me credentials as you create them
- I update `.env.local` in real-time
- Faster but requires your active attention

**Path C: Delegate specific accounts**
- You create only Xero + Meta (highest value, 1 hour)
- I get those live first, build dashboards
- You create rest while I code

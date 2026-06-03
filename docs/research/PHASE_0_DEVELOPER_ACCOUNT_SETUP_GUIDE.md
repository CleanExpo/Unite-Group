# Phase 0: Developer Account Setup Guide

> Auto-generated for Phill McGurk — Unite-Group Nexus CRM Activation
> Date: 2026-06-03
> Estimated time: 3.5 hours total
> —

## What This Is

Phase 0 is credential collection. You need to create 7 developer accounts and collect 14+ secret values. This guide gives you exact URLs, prefilled app names, and copy-paste fields so there's zero guesswork.

## Time Block Recommendation

**Block out 3.5 hours in one sitting.** Most of this is clicking through forms. Stopping and restarting means re-logging into everything.

---

## 1. Xero — CARSI Account

**URL**: https://developer.xero.com/myapps/

### Steps
1. Log in with your Xero CARSI account
2. Click **"New app"**
3. Select **"Web app"**
4. Fill in:
   - **App name**: `Unite-Group Nexus — CARSI`
   - **Company or application URL**: `https://unite-group.in`
   - **OAuth 2.0 redirect URI**: `https://unite-group.in/api/xero/callback`
   - **Terms of use URL**: `https://unite-group.in/terms`
   - **Privacy policy URL**: `https://unite-group.in/privacy`
5. Save → you get **Client ID** and **Client Secret**
6. Under **App settings** → **Scopes** → enable all accounting scopes

### What to Save in 1Password
```
Xero CARSI
├── Client ID: (copy from Xero)
├── Client Secret: (copy from Xero)
├── Account: carsi@unite-group.in (or your login email)
└── Tenant Name: CARSI Pty Ltd
```

---

## 2. Xero — DR Account

**URL**: https://developer.xero.com/myapps/

### Steps
1. Log in with your Xero DR account (different login from CARSI)
2. Click **"New app"**
3. Select **"Web app"**
4. Fill in:
   - **App name**: `Unite-Group Nexus — DR`
   - **Company or application URL**: `https://unite-group.in`
   - **OAuth 2.0 redirect URI**: `https://unite-group.in/api/xero/callback`
5. Save → **Client ID** and **Client Secret**

### What to Save in 1Password
```
Xero DR
├── Client ID: (copy from Xero)
├── Client Secret: (copy from Xero)
├── Account: phill@disasterrecovery.com.au (or your login email)
└── Tenant Name: Disaster Recovery Australia Pty Ltd
```

---

## 3. Google Cloud Project

**URL**: https://console.cloud.google.com/

### Steps
1. Log in with your Google account (phill@disasterrecovery.com.au or similar)
2. Click project selector → **"New project"**
3. **Project name**: `Unite-Group Nexus`
4. **Organization**: Select your domain if listed, or "No organization"
5. Click **Create**
6. Wait ~30 seconds for project creation
7. Click **"APIs & Services"** → **"Library"**
8. Search and enable each API (click library, click **Enable**):
   - ✅ Gmail API
   - ✅ Google Calendar API
   - ✅ Google Drive API
   - ✅ Google Search Console API
   - ✅ Google Analytics Data API
   - ✅ Google+ API
9. Go to **"OAuth consent screen"** (left sidebar)
10. Select **"External"** → click **Create**
11. Fill in:
    - **App name**: `Unite-Group Nexus`
    - **User support email**: `phill@disasterrecovery.com.au`
    - **Developer contact**: `phill@disasterrecovery.com.au`
    - Click **Save and Continue** → **Save and Complete**
12. Add test users: add your own email(s)
13. Go to **"Credentials"** → **"Create credentials"** → **"OAuth client ID"**
14. **Application type**: Web application
15. **Name**: `Unite-Hub Web Client`
16. **Authorized JavaScript origins**: `https://unite-group.in`
17. **Authorized redirect URIs**:
    - `https://unite-group.in/api/auth/google/callback`
    - `https://unite-group.in/api/auth/youtube/callback`
18. Click **Create** → copy **Client ID** and **Client Secret**
19. Go back to **Credentials** → **"Create credentials"** → **"API key"**
    - Name: `YouTube Data API Key`
    - Copy the key

### What to Save in 1Password
```
Google Cloud — Unite-Group Nexus
├── Client ID: (copy from Google)
├── Client Secret: (copy from Google)
├── API Key (YouTube): (copy from Google)
├── Project ID: (shown in project selector)
├── Console URL: https://console.cloud.google.com/apis/dashboard?project=YOUR_PROJECT_ID
└── Test users: [your emails]
```

---

## 4. Meta for Developers (Facebook + Instagram)

**URL**: https://developers.facebook.com/

### Steps
1. Log in with your Facebook account
2. Click **"My Apps"** → **"Create App"**
3. **App type**: Business → **Next**
4. Fill in:
   - **App name**: `Unite-Group Nexus Social`
   - **App contact email**: `phill@disasterrecovery.com.au`
5. Click **Create App**
6. You may need to verify identity with phone + ID (this is normal)
7. Once created, go to **"Settings"** → **"Basic"**
8. Copy **App ID** and **App Secret**
9. Scroll down → add:
   - **App domains**: `unite-group.in`
   - **Privacy Policy URL**: `https://unite-group.in/privacy`
   - **Terms of Service URL**: `https://unite-group.in/terms`
   - **Category**: Business and Pages
10. Click **Save Changes**
11. Go to **"Products"** → add **"Facebook Login for Business"**
12. Under **"Facebook Login"** → **Settings**:
    - **Valid OAuth Redirect URIs**: `https://unite-group.in/api/auth/meta/callback`

### What to Save in 1Password
```
Meta (Facebook/Instagram)
├── App ID: (copy from Meta)
├── App Secret: (copy from Meta)
├── Business Account: [your Facebook Business Manager name]
└── Connected Pages: [list your FB pages]
```

**Note**: Instagram requires a connected Facebook Business Page. If not already linked, go to your Meta Business Suite and connect your Instagram Business account to your Facebook Page.

---

## 5. LinkedIn Developers

**URL**: https://developer.linkedin.com/

### Steps
1. Log in with your LinkedIn account (the one that owns your Company Page)
2. Click **"Create app"**
3. Fill in:
   - **App name**: `Unite-Group Nexus`
   - **LinkedIn Page**: Search and select your company page
   - **App logo**: Upload your logo (required for approval)
   - **Legal agreement**: Accept terms
4. Click **"Create app"**
5. You get **Client ID** and **Client Secret**
6. Go to **"Auth"** tab:
   - **Authorized redirect URLs**: `https://unite-group.in/api/auth/linkedin/callback`
   - **OAuth 2.0 scopes**:
     - `openid`
     - `profile`
     - `email`
     - `w_member_social` (for personal posts)
     - `w_organization_social` (for company posts — requires admin role)
7. Save changes

### What to Save in 1Password
```
LinkedIn
├── Client ID: (copy from LinkedIn)
├── Client Secret: (copy from LinkedIn)
├── Company Page: [your LinkedIn company page URL]
├── Admin Status: Yes / No
└── Scopes: [list granted scopes]
```

**Note**: `w_organization_social` requires you to be an admin of the LinkedIn Company Page. If not, the app will only post to your personal profile.

---

## 6. TikTok for Developers

**URL**: https://developers.tiktok.com/

### Steps
1. Log in with your TikTok account (or TikTok for Business account)
2. Click **"Create app"** or **"My apps"** → **"Create new app"**
3. Fill in:
   - **App name**: `Unite-Group Nexus`
   - **App description**: `Social media content distribution for Unite-Group Nexus businesses`
   - **Category**: Business
4. Submit for review (may take 1-3 days)
5. Once approved, copy **Client Key** and **Client Secret**
6. Add redirect URI: `https://unite-group.in/api/auth/tiktok/callback`
7. Request **video.upload** scope (may require additional review)

### What to Save in 1Password
```
TikTok
├── Client Key: (copy from TikTok)
├── Client Secret: (copy from TikTok)
├── App Status: Approved / Pending
├── Scopes: [list granted]
└── Account: [your TikTok handle]
```

**Note**: TikTok can take 1-3 days for app approval. Submit this early.

---

## 7. GitHub (Already Done — Verify)

**URL**: https://github.com/settings/developers

### Check
1. Log into GitHub
2. Check if GitHub App exists for Unite-Hub
3. If not, create one later (not blocking)

---

## Credentals Delivery

Once all accounts are created, send Pi-DEV-OPS the following values:

### Xero (CARSI)
```
XERO_CLIENT_ID=...
XERO_CLIENT_SECRET=...
```

### Xero (DR)
```
DR_CLIENT_ID=...
DR_CLIENT_SECRET=...
```

### Google
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
YOUTUBE_API_KEY=...
```

### Meta (Facebook/Instagram)
```
META_APP_ID=...
META_APP_SECRET=...
```

### LinkedIn
```
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
```

### TikTok
```
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
```

---

## What Happens Next

Once you send these values:

| Step | ETA | What You Do |
|------|-----|-------------|
| Pi-DEV configures .env.local | Day 1 | Nothing |
| Pi-DEV sends OAuth URLs | Day 1 | Click links, log in, grant permission |
| OAuth tokens auto-store | Day 1 | Nothing |
| Testing begins | Day 2 | Nothing (unless tests fail) |
| Dashboard widgets built | Day 3-5 | Review and approve |
| Live data visible | Day 5 | Confirm accuracy |

---

## Phase 0 Gate Criteria

Before Phase 1 starts, Pi-DEV-OPS must verify:
- [ ] All Client IDs are real (not placeholders)
- [ ] All Client Secrets are present and non-empty
- [ ] All redirect URIs match the production URL
- [ ] 1Password backup of all credentials exists
- [ ] TikTok app is at minimum "pending review" (not blocking)

# Social OAuth — wiring guide (Meta · LinkedIn · TikTok · Reddit · YouTube)

> The **code is ready and hardened** (`/api/social/[platform]/connect` → signed,
> founder- and platform-bound state → `/api/social/[platform]/callback` → tokens stored,
> CSRF-protected per #307). What remains is **yours**: each provider's developer app +
> credentials + consent. I can't enter secrets or click consent. Until a platform's
> credentials are set it reads **not connected** (honest — never faked).

---

## 1. Per-platform credentials

Each platform maps to an env-var pair (`src/lib/integrations/social.ts`). Set only the
ones you want live; `isPlatformConfigured()` is per-platform.

| Platform | Env vars | Developer portal | Scopes the app must allow |
|---|---|---|---|
| **Meta** (Facebook + Instagram) | `META_APP_ID` / `META_APP_SECRET` | developers.facebook.com/apps | `pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish, whatsapp_business_management` |
| **LinkedIn** | `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | linkedin.com/developers/apps | `r_liteprofile, r_basicprofile, r_organization_social, w_organization_social, rw_organization_admin` |
| **TikTok** | `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | developers.tiktok.com/apps | `user.info.basic, video.list, video.publish` |
| **Reddit** | `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | reddit.com/prefs/apps | `read, submit, identity` |
| **YouTube** | via the **Google** app | console.cloud.google.com (YouTube Data API) | `youtube.upload, youtube.readonly` — enable the YouTube Data API on the same Google project from `GOOGLE-OAUTH-SETUP.md` |

---

## 2. Redirect URI (per platform)

Register, in each provider's app, the callback:

```
https://<your-prod-domain>/api/social/<platform>/callback
```

where `<platform>` is `facebook` / `linkedin` / `tiktok` / `reddit` / `youtube`. It must match
`${NEXT_PUBLIC_APP_URL}/api/social/<platform>/callback`. Add the `http://localhost:3000/...`
variant for local dev.

Provider gotchas:
- **Meta**: app in **Development** mode works for you as an app admin/tester; add yourself as
  a tester. The Instagram/Facebook publishing scopes need a connected Facebook Page +
  Instagram Business account.
- **LinkedIn**: the `*_organization_*` scopes require the app to be associated with a Company
  Page you administer (request the "Community Management API" product).
- **TikTok**: `video.publish` requires the app to be approved for content posting; in sandbox
  you can test with the registered test account.
- **Reddit**: create a **web app** (not "script"); the redirect URI must match exactly.

---

## 3. Environment variables (Vercel → apps/web project)

Set the pairs from §1 for the platforms you want, plus `NEXT_PUBLIC_APP_URL` (drives the
redirect URI) and the already-present `VAULT_ENCRYPTION_KEY`. Redeploy.

---

## 4. Connect each platform (you, in the browser)

Go to **`/founder/social`** and connect each platform, or hit directly:

```
https://<your-prod-domain>/api/social/<platform>/connect
```

→ provider consent → redirected back to `/founder/social?connected=<platform>`. The token is
stored against your founder id (the callback derives identity from the **session**, not the
OAuth state, and validates a signed founder+platform-bound state — #307).

---

## 5. Verify it's live

- **`GET /api/social/status`** → per-platform `configured` (env set) and `connected` (token
  stored) flags, plus `connectedCount` / `configuredCount`. This is the quickest check.
- **/founder/social** → each connected platform shows real channel state instead of
  "not connected".

If a platform shows `configured:false` after setting env: confirm both env vars are non-empty
and you redeployed. If `configured:true` but `connected:false`: complete the connect/consent;
check a `service` row landed for it.

---

## Notes

- `/api/social/status` deliberately returns **200 with everything `connected:false`** when
  unauthenticated (it's partial public config), so don't read that as "broken".
- Connecting is per-platform and per-founder; one platform failing never blocks another.

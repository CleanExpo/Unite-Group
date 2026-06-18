# Google OAuth — wiring guide (Gmail · Calendar · Drive)

> The **code is ready** (`/api/auth/google/authorize` → consent → `/api/auth/google/callback`
> → encrypted tokens in `credentials_vault`). What remains is **your** part: the Google Cloud
> project + credentials + consent. I can't enter secrets or click the consent screen for you.
> Single-user app (just you) → **Testing mode**, no Google verification needed.

---

## 1. Google Cloud project (console.cloud.google.com)

1. **Enable APIs** (APIs & Services → Library): **Gmail API**, **Google Calendar API**, and
   **Google Drive API** (Drive only needed for the Notes vault).
2. **OAuth consent screen** (APIs & Services → OAuth consent screen):
   - User type: **External**.
   - Publishing status: leave on **Testing** (do NOT publish — avoids Google's verification
     review for the restricted Gmail/Drive scopes).
   - **Test users → Add** every Google address you'll connect (see §4). Only test users can
     complete consent in Testing mode; that's fine for a single-operator app.
3. **Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorised redirect URIs** — add (must match `NEXT_PUBLIC_APP_URL` exactly):
     - `https://<your-prod-domain>/api/auth/google/callback`
     - `http://localhost:3000/api/auth/google/callback` (for local dev)
   - Save → copy the **Client ID** (`…apps.googleusercontent.com`) and **Client secret**.

---

## 2. Environment variables (Vercel → the apps/web project)

| Var | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | the `…apps.googleusercontent.com` id (NOT a placeholder) |
| `GOOGLE_CLIENT_SECRET` | the client secret |
| `NEXT_PUBLIC_APP_URL` | your prod URL, no trailing slash (the callback builds the redirect_uri from this — it must equal the redirect URI registered in §1.3) |
| `GOOGLE_DRIVE_VAULT_FOLDER_ID` | *(optional, Notes only)* the Drive folder id holding your `.md` notes |

`VAULT_ENCRYPTION_KEY` must already be set (it encrypts the stored tokens). Redeploy after
setting these so the runtime picks them up.

**Verify config:** `GET /api/health/google` → should return `configured: true` once the id
ends in `.apps.googleusercontent.com`.

---

## 3. What the connect requests

One consent grants all three integrations (scopes in
`src/app/api/auth/google/authorize/route.ts`):
`gmail.readonly` · `gmail.modify` · `gmail.send` · `calendar.readonly` · `drive.readonly` ·
`openid` · `email` · `profile`. `access_type=offline` + `prompt=consent` ensures a
**refresh token** is stored so the connection survives.

---

## 4. Connect each account (you, in the browser)

The Google accounts the app knows about (`src/lib/email-accounts.ts`, `provider: 'google'`):
`disasterrecoverynrp@gmail.com` · `airestoreassist@gmail.com` · `nrpg.team@gmail.com`
(add any others to that file first).

For each: visit **`/founder/email`** and use the connect/reconnect control, or hit directly:

```
https://<your-prod-domain>/api/auth/google/authorize?email=<the-gmail-address>
```

→ Google consent screen → approve → you're redirected back to
`/founder/email?connected=<email>`. The token is now encrypted in `credentials_vault`
(`service='google'`, one row per account).

---

## 5. Verify it's live (the NorthStar bar: real data behind auth)

- **/founder/calendar** → real upcoming events (not "not connected"). A load failure now shows
  an honest "Calendar unavailable" — not an empty all-clear (#305).
- **/founder/email** → real Gmail threads.
- **/founder/notes** → real Drive `.md` files (needs `GOOGLE_DRIVE_VAULT_FOLDER_ID` + a folder
  shared with the connected account).

If a page shows "not connected" after consent, check: the redirect URI matches exactly, the
account is a Testing test user, and `credentials_vault` has a `service='google'` row for it.

---

## Notes / gotchas

- **Restricted scopes in Testing mode** work indefinitely for test users, but a refresh token
  can expire after ~7 days of inactivity in Testing — reconnect if a page later reads
  "not connected". Publishing the app (with verification) removes that, but isn't needed for
  single-operator use.
- The callback derives your founder identity from the **session** (`getUser()`), not the OAuth
  state, and now aborts to `?error=vault_save_failed` if the token can't be stored — so a
  "connected" redirect always means the token really persisted.

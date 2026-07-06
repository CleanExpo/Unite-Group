# Cloudinary — secure image uploads

Direct browser→Cloudinary uploads where the **API secret never leaves the server**.

## Security model
- `cloudinary.ts` is **server-only** — never import it into a client component.
- The browser gets a **one-time signature** from `POST /api/cloudinary/sign` (auth-gated by `getUser()`), then uploads the file straight to Cloudinary with it.
- Uploads are namespaced per founder: `unite-group/<founder_id>/<subfolder>`. One user cannot write into another's folder.
- Only `folder` + `timestamp` are signed, so a client cannot inject transformations, `eager`, or an arbitrary `public_id`.

## Environment variables (server-only — set in Vercel, never `NEXT_PUBLIC_`, never committed)
```
CLOUDINARY_CLOUD_NAME     # public-ish, safe
CLOUDINARY_API_KEY        # public-ish, safe
CLOUDINARY_API_SECRET     # SECRET — full admin; server-only
CLOUDINARY_UPLOAD_PRESET  # recommended — a SIGNED preset (see below)
```
Set them with the Vercel CLI (encrypted at rest):
```
vercel env add CLOUDINARY_CLOUD_NAME production
vercel env add CLOUDINARY_API_KEY production
vercel env add CLOUDINARY_API_SECRET production
vercel env add CLOUDINARY_UPLOAD_PRESET production
```
Until the first three are set, `/api/cloudinary/sign` returns 503 and `isCloudinaryConfigured()` is false — nothing breaks, uploads are simply unavailable.

## Upload preset (closes the format/size/abuse holes — do this before real uploads)
In Cloudinary → Settings → Upload → Add upload preset, create a **Signed** preset and set:
- `Allowed formats`: e.g. `jpg,png,webp,pdf` — blocks arbitrary raw/video uploads (a signature is agnostic to resource_type otherwise).
- `Max file size`: e.g. 10 MB — caps a single upload; bounds quota abuse.
- `Access mode`: **Authenticated** — assets are private, delivered only via signed URLs (see below), correct for CRM client data.

Put the preset name in `CLOUDINARY_UPLOAD_PRESET`. The route signs it into the params, so the client cannot drop or swap it.

## Private delivery for client data
Assets uploaded as authenticated are NOT publicly reachable via `secure_url`. Deliver them with a signed, expiring URL:
```ts
import { signedDeliveryUrl } from '@/lib/cloudinary'
const url = signedDeliveryUrl(publicId)   // ~1h expiry
```

## Threat notes
- A Cloudinary signature is valid ~1 hour and is NOT single-use — abuse is bounded by the signed folder + the preset caps, not one-shot semantics. The preset is the real control.
- This CRM is single-founder (`apps/web/CLAUDE.md`), so "any authenticated user" is effectively just the founder — the quota/abuse surface is small today. Add per-user rate-limiting on the sign route before this ever becomes multi-tenant.

## Client usage
```tsx
const { upload, uploading, error } = useCloudinaryUpload()
const result = await upload(file, 'contacts')   // → { secureUrl, publicId, width, height, format }
```

## Private delivery (recommended for CRM/client data)
For images that shouldn't be publicly guessable, set the upload preset / asset to `authenticated` and deliver via signed, expiring URLs rather than the public `secure_url`. Extend `cloudinary.ts` with a `signedDeliveryUrl(publicId)` helper when private delivery is needed.

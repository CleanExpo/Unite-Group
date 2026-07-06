# Cloudinary — secure image uploads

Direct browser→Cloudinary uploads where the **API secret never leaves the server**.

## Security model
- `cloudinary.ts` is **server-only** — never import it into a client component.
- The browser gets a **one-time signature** from `POST /api/cloudinary/sign` (auth-gated by `getUser()`), then uploads the file straight to Cloudinary with it.
- Uploads are namespaced per founder: `unite-group/<founder_id>/<subfolder>`. One user cannot write into another's folder.
- Only `folder` + `timestamp` are signed, so a client cannot inject transformations, `eager`, or an arbitrary `public_id`.

## Environment variables (server-only — set in Vercel, never `NEXT_PUBLIC_`, never committed)
```
CLOUDINARY_CLOUD_NAME   # public-ish, safe
CLOUDINARY_API_KEY      # public-ish, safe
CLOUDINARY_API_SECRET   # SECRET — full admin; server-only
```
Set them with the Vercel CLI (encrypted at rest):
```
vercel env add CLOUDINARY_CLOUD_NAME production
vercel env add CLOUDINARY_API_KEY production
vercel env add CLOUDINARY_API_SECRET production
```
Until all three are set, `/api/cloudinary/sign` returns 503 and `isCloudinaryConfigured()` is false — nothing breaks, uploads are simply unavailable.

## Client usage
```tsx
const { upload, uploading, error } = useCloudinaryUpload()
const result = await upload(file, 'contacts')   // → { secureUrl, publicId, width, height, format }
```

## Private delivery (recommended for CRM/client data)
For images that shouldn't be publicly guessable, set the upload preset / asset to `authenticated` and deliver via signed, expiring URLs rather than the public `secure_url`. Extend `cloudinary.ts` with a `signedDeliveryUrl(publicId)` helper when private delivery is needed.

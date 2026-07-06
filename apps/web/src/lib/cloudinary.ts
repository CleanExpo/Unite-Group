import 'server-only'
import { v2 as cloudinary } from 'cloudinary'

// SERVER-ONLY (enforced by the `server-only` import above — importing this into a
// client component is a compile-time error). CLOUDINARY_API_SECRET must never
// reach the browser bundle. Browser uploads are signed here and sent directly to
// Cloudinary; the secret only produces the signature and never leaves the server.

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET
// Optional but strongly recommended: a signed upload preset that pins
// allowed_formats + max_file_size + access_mode=authenticated. When set it is
// included in the signed params, so the client cannot drop or override it.
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET

export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && apiKey && apiSecret)
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

export { cloudinary, cloudName, apiKey, uploadPreset }

/**
 * Sign a Cloudinary upload. Only the passed params are signed, so the client
 * cannot smuggle in transformations, eager derivations, an out-of-scope folder,
 * or (when a preset is signed in) a different preset. NOTE: a Cloudinary
 * signature is valid for ~1 hour and is NOT single-use — abuse is bounded by the
 * signed folder + the preset's format/size caps, not by one-shot semantics.
 */
export function signUpload(paramsToSign: Record<string, string | number>): string {
  if (!apiSecret) throw new Error('CLOUDINARY_API_SECRET not configured')
  return cloudinary.utils.api_sign_request(paramsToSign, apiSecret)
}

/**
 * Build a signed, expiring delivery URL for a private (access_mode=authenticated)
 * asset — use this for CRM client data instead of the public secure_url.
 */
export function signedDeliveryUrl(publicId: string, expiresInSeconds = 3600): string {
  if (!isCloudinaryConfigured()) throw new Error('Cloudinary not configured')
  return cloudinary.url(publicId, {
    type: 'authenticated',
    sign_url: true,
    secure: true,
    auth_token: { duration: expiresInSeconds },
  })
}

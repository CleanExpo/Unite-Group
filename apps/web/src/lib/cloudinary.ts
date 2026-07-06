import { v2 as cloudinary } from 'cloudinary'

// SERVER-ONLY. Never import this module into a client component — the
// CLOUDINARY_API_SECRET must never reach the browser bundle. Uploads from the
// browser are signed here (server) and sent directly to Cloudinary; the secret
// is used only to produce the short-lived signature and never leaves the server.

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

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

export { cloudinary, cloudName, apiKey }

/**
 * Produce a Cloudinary upload signature for a direct browser→Cloudinary upload.
 * Only the caller-approved params are signed, so the client cannot smuggle in
 * transformations, eager derivations, or an out-of-scope folder.
 */
export function signUpload(paramsToSign: Record<string, string | number>): string {
  if (!apiSecret) throw new Error('CLOUDINARY_API_SECRET not configured')
  return cloudinary.utils.api_sign_request(paramsToSign, apiSecret)
}

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { isCloudinaryConfigured, signUpload, apiKey, cloudName, uploadPreset } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

// POST /api/cloudinary/sign
// Returns a short-lived signature (~1h) the browser uses to upload a file
// DIRECTLY to Cloudinary. The API secret never leaves the server. Uploads are
// namespaced per founder so one user cannot write into another's folder, and —
// when CLOUDINARY_UPLOAD_PRESET is set — the signed-in preset pins allowed
// formats, max size, and authenticated (private) delivery.
export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 503 })
  }

  let body: { folder?: unknown } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    // body is optional — default folder is used
  }

  // Sanitise the client-supplied subfolder and pin it under the founder's namespace.
  // The dot is not in the allow-set, so `..` collapses to empty (no traversal).
  const rawSub = typeof body.folder === 'string' ? body.folder : 'uploads'
  const subfolder = rawSub.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'uploads'
  const folder = `unite-group/${user.id}/${subfolder}`
  const timestamp = Math.round(Date.now() / 1000)

  // Sign folder + timestamp (+ upload_preset when configured). Cloudinary rejects
  // any tampered/added signable param, so the client cannot change the folder,
  // swap the preset, or inject public_id/transformations.
  const paramsToSign: Record<string, string | number> = { folder, timestamp }
  if (uploadPreset) paramsToSign.upload_preset = uploadPreset
  const signature = signUpload(paramsToSign)

  return NextResponse.json({ signature, timestamp, folder, apiKey, cloudName, uploadPreset: uploadPreset ?? null })
}

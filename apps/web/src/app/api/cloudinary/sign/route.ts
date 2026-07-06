import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { isCloudinaryConfigured, signUpload, apiKey, cloudName } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

// POST /api/cloudinary/sign
// Returns a one-time signature the browser uses to upload a file DIRECTLY to
// Cloudinary. The API secret never leaves the server. Uploads are namespaced
// per founder so one user cannot write into another's folder.
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
  const rawSub = typeof body.folder === 'string' ? body.folder : 'uploads'
  const subfolder = rawSub.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'uploads'
  const folder = `unite-group/${user.id}/${subfolder}`
  const timestamp = Math.round(Date.now() / 1000)

  // Only folder + timestamp are signed. The client cannot override anything else
  // (transformations, eager, public_id) because Cloudinary rejects any unsigned param.
  const signature = signUpload({ folder, timestamp })

  return NextResponse.json({ signature, timestamp, folder, apiKey, cloudName })
}

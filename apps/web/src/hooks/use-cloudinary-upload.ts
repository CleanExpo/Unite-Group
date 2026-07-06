'use client'

import { useCallback, useState } from 'react'

export interface CloudinaryUploadResult {
  secureUrl: string
  publicId: string
  width: number
  height: number
  format: string
}

// Client uploader. Asks our server route for a short-lived signature (~1h), then
// uploads the file DIRECTLY to Cloudinary with it. The API secret never reaches
// the browser — only the signature does. When the server has a signed upload
// preset configured, format/size caps and authenticated delivery are enforced
// server-side and cannot be overridden here.
export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (file: File, folder = 'uploads'): Promise<CloudinaryUploadResult | null> => {
      setUploading(true)
      setError(null)
      try {
        const signRes = await fetch('/api/cloudinary/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder }),
        })
        if (!signRes.ok) {
          const msg = signRes.status === 503 ? 'Image uploads are not configured yet' : `Signature request failed (${signRes.status})`
          throw new Error(msg)
        }
        const { signature, timestamp, folder: signedFolder, apiKey, cloudName, uploadPreset } = (await signRes.json()) as {
          signature: string
          timestamp: number
          folder: string
          apiKey: string
          cloudName: string
          uploadPreset: string | null
        }

        const form = new FormData()
        form.append('file', file)
        form.append('api_key', apiKey)
        form.append('timestamp', String(timestamp))
        form.append('folder', signedFolder)
        if (uploadPreset) form.append('upload_preset', uploadPreset)
        form.append('signature', signature)

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: form,
        })
        if (!uploadRes.ok) throw new Error(`Upload failed (${uploadRes.status})`)
        const data = (await uploadRes.json()) as {
          secure_url: string
          public_id: string
          width: number
          height: number
          format: string
        }
        return {
          secureUrl: data.secure_url,
          publicId: data.public_id,
          width: data.width,
          height: data.height,
          format: data.format,
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
        return null
      } finally {
        setUploading(false)
      }
    },
    [],
  )

  return { upload, uploading, error }
}

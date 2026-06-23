// src/lib/studio/studio-storage.ts
// Uploads a base64-encoded concept image to the campaign-assets Supabase Storage bucket.

import { createServiceClient } from '@/lib/supabase/service'

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      upload: (...args: unknown[]) => Promise<{ error: unknown }>
      getPublicUrl: (path: string) => { data: { publicUrl: string } }
    }
  }
}

/**
 * Uploads a base64-encoded concept image to the campaign-assets bucket
 * and returns its public URL, or null on error.
 *
 * Path: studio-concepts/{founderId}/{taskId}/{conceptId}.{ext}
 */
export async function uploadConceptImage(
  input: {
    imageBase64: string
    mimeType: string
    founderId: string
    taskId: string
    conceptId: string
  },
  client: StorageClient = createServiceClient() as StorageClient,
): Promise<string | null> {
  const { imageBase64, mimeType, founderId, taskId, conceptId } = input

  const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
  const path = `studio-concepts/${founderId}/${taskId}/${conceptId}.${ext}`

  const { error } = await client.storage
    .from('campaign-assets')
    .upload(path, Buffer.from(imageBase64, 'base64'), {
      contentType: mimeType,
      upsert: true,
    })

  if (error) {
    console.warn('[studio-storage] Upload failed (non-fatal):', (error as { message?: string }).message ?? String(error))
    return null
  }

  const { data } = client.storage.from('campaign-assets').getPublicUrl(path)
  return data.publicUrl
}

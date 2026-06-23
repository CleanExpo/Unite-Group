import { describe, it, expect, vi } from 'vitest'
import { uploadConceptImage } from '../studio-storage'

function storage(uploadErr: unknown) {
  const api = { upload: vi.fn(async () => ({ error: uploadErr })), getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://cdn/x.png' } })) }
  return { storage: { from: vi.fn(() => api) }, _api: api }
}

describe('uploadConceptImage', () => {
  it('uploads and returns the public URL', async () => {
    const c = storage(null)
    const url = await uploadConceptImage({ imageBase64: 'AAA', mimeType: 'image/png', founderId: 'u1', taskId: 't1', conceptId: 'c1' }, c as never)
    expect(url).toBe('https://cdn/x.png')
    expect(c._api.upload).toHaveBeenCalledWith(expect.stringContaining('studio-concepts/u1/t1/c1.png'), expect.anything(), expect.objectContaining({ upsert: true }))
  })
  it('returns null on upload error', async () => {
    const url = await uploadConceptImage({ imageBase64: 'AAA', mimeType: 'image/png', founderId: 'u1', taskId: 't1', conceptId: 'c1' }, storage({ message: 'fail' }) as never)
    expect(url).toBeNull()
  })
})

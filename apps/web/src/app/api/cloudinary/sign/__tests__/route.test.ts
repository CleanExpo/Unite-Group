import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/cloudinary', () => ({
  isCloudinaryConfigured: vi.fn(),
  signUpload: vi.fn(),
  apiKey: 'test-key-placeholder',
  cloudName: 'test-cloud',
  uploadPreset: 'test-preset',
}))

import { getUser } from '@/lib/supabase/server'
import { isCloudinaryConfigured, signUpload } from '@/lib/cloudinary'
import { POST } from '../route'

function req(body?: unknown, raw = false) {
  return new Request('http://localhost/api/cloudinary/sign', {
    method: 'POST',
    body: body === undefined ? undefined : raw ? (body as string) : JSON.stringify(body),
  })
}

describe('POST /api/cloudinary/sign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    vi.mocked(isCloudinaryConfigured).mockReturnValue(true)
    vi.mocked(signUpload).mockReturnValue('sig-placeholder')
  })

  it('refuses unauthenticated requests and never signs', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(req({ folder: 'x' }))
    expect(res.status).toBe(401)
    expect(signUpload).not.toHaveBeenCalled()
  })

  it('returns 503 when Cloudinary is not configured', async () => {
    vi.mocked(isCloudinaryConfigured).mockReturnValue(false)
    const res = await POST(req({}))
    expect(res.status).toBe(503)
    expect(signUpload).not.toHaveBeenCalled()
  })

  // Gap: the body is optional by design; bad JSON falls back to the default
  // folder rather than 400. Hostile folder values are sanitised instead.
  it('sanitises traversal and pins the folder under the founder namespace', async () => {
    const res = await POST(req({ folder: '../../other-user/<script>' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.folder).toBe('unite-group/user-123/other-user/script')
    expect(json.folder).not.toContain('..')
    expect(signUpload).toHaveBeenCalledWith({
      folder: json.folder,
      timestamp: json.timestamp,
      upload_preset: 'test-preset',
    })
  })

  it('falls back to the default folder on invalid JSON', async () => {
    const res = await POST(req('{bad', true))
    expect(res.status).toBe(200)
    expect((await res.json()).folder).toBe('unite-group/user-123/uploads')
  })

  it('returns the signature and public config without any secret', async () => {
    const res = await POST(req({ folder: 'photos/2026' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({
      signature: 'sig-placeholder',
      apiKey: 'test-key-placeholder',
      cloudName: 'test-cloud',
      uploadPreset: 'test-preset',
      folder: 'unite-group/user-123/photos/2026',
    })
    expect(Object.keys(json)).not.toContain('apiSecret')
  })
})

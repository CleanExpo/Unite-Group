import { describe, it, expect, vi } from 'vitest'
import { generateVisuals } from '../generate-visuals'
const brand = {} as never
describe('generateVisuals', () => {
  it('returns not-connected for openai without calling the generator', async () => {
    const generateImage = vi.fn()
    const r = await generateVisuals({ prompt: 'p', count: 3, brand, provider: 'openai', deps: { generateImage } })
    expect(r.images).toEqual([]); expect(r.errors[0]).toMatch(/not connected/i); expect(generateImage).not.toHaveBeenCalled()
  })
  it('does not throw when an underlying call rejects — records it as an error', async () => {
    const generateImage = vi.fn()
      .mockResolvedValueOnce({ imageBase64: 'AAA', mimeType: 'image/png', error: null })
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ imageBase64: 'CCC', mimeType: 'image/png', error: null })
    const r = await generateVisuals({ prompt: 'p', count: 3, brand: {} as never, provider: 'gemini', deps: { generateImage } })
    expect(r.images.map(i => i.imageBase64)).toEqual(['AAA', 'CCC'])
    expect(r.errors.join(' ')).toMatch(/network down/)
  })
  it('collects gemini successes and records failures', async () => {
    const generateImage = vi.fn()
      .mockResolvedValueOnce({ imageBase64: 'AAA', mimeType: 'image/png', error: null })
      .mockResolvedValueOnce({ imageBase64: null, mimeType: 'image/png', error: 'quota' })
      .mockResolvedValueOnce({ imageBase64: 'CCC', mimeType: 'image/png', error: null })
    const r = await generateVisuals({ prompt: 'p', count: 3, brand, provider: 'gemini', deps: { generateImage } })
    expect(r.images.map(i => i.imageBase64)).toEqual(['AAA','CCC'])
    expect(r.errors).toContain('quota')
  })
})

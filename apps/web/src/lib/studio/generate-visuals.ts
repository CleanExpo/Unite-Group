// src/lib/studio/generate-visuals.ts
// Wraps the Gemini image generator for use in the Visual Campaign Studio concept round.
// Best-effort: never throws — collects successes into images[], pushes errors into errors[].

import type { BrandDNA, VisualType } from '@/lib/campaigns/types'
import { generateCampaignImage } from '@/lib/campaigns/image-generator'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StudioProvider = 'gemini' | 'openai'

export interface GeneratedVisual {
  imageBase64: string
  mimeType: string
}

export interface GenerateVisualsResult {
  images: GeneratedVisual[]
  errors: string[]
}

export interface GenerateVisualsInput {
  prompt: string
  count: number
  brand: BrandDNA
  provider: StudioProvider
  deps?: {
    generateImage: typeof generateCampaignImage
  }
}

// Default VisualType — routes directly to Gemini without PaperBanana overhead.
const DEFAULT_VISUAL_TYPE: VisualType = 'photo'

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Generates `count` images for the studio concept round using the specified provider.
 *
 * - `provider='openai'`: returns an error without calling the generator (not connected).
 * - `provider='gemini'`: calls `generateCampaignImage` `count` times in parallel;
 *   collects non-null imageBase64 results into `images`, pushes errors into `errors`.
 *
 * Never throws — all failures are collected into `errors`.
 */
export async function generateVisuals(input: GenerateVisualsInput): Promise<GenerateVisualsResult> {
  const { prompt, count, brand, provider, deps } = input
  const generateImage = deps?.generateImage ?? generateCampaignImage

  if (provider === 'openai') {
    return {
      images: [],
      errors: ['OpenAI image generation is not connected yet — use Gemini.'],
    }
  }

  // provider === 'gemini': call count times, collect successes + errors
  // Each call is wrapped with .catch() so a thrown error becomes an in-band
  // failure — it does NOT abort the other calls via Promise.all rejection.
  const results = await Promise.all(
    Array.from({ length: count }, () =>
      generateImage(prompt, brand, 'instagram', null, null, DEFAULT_VISUAL_TYPE).catch(
        (e: unknown) => ({
          imageBase64: null as null,
          mimeType: '',
          error: e instanceof Error ? e.message : String(e),
        })
      )
    )
  )

  const images: GeneratedVisual[] = []
  const errors: string[] = []

  results.forEach((result, i) => {
    if (result.imageBase64 !== null) {
      images.push({ imageBase64: result.imageBase64, mimeType: result.mimeType })
    } else {
      const detail = result.error ?? 'No image returned'
      // Log the exact failure server-side so it is diagnosable beyond the terse
      // client-facing string, then surface a concept-indexed message to the caller.
      console.error(`[generateVisuals] concept ${i + 1} failed:`, detail)
      errors.push(`Concept ${i + 1}: ${detail}`)
    }
  })

  return { images, errors }
}

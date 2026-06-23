// POST /api/content/generate — Generate AI content for a business
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateContent } from '@/lib/content/generator'
import { mapBrand } from '@/lib/content/brand-mapper'
import type { ContentGenerationRequest } from '@/lib/content/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: ContentGenerationRequest
  try {
    body = (await request.json()) as ContentGenerationRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.businessKey || !body.contentType) {
    return NextResponse.json(
      { error: 'Missing required fields: businessKey, contentType' },
      { status: 422 }
    )
  }

  const supabase = createServiceClient()

  // Load brand identity for the business
  const { data: brand, error: brandError } = await supabase
    .from('brand_identities')
    .select('*')
    .eq('business_key', body.businessKey)
    .single()

  if (brandError || !brand) {
    return NextResponse.json(
      { error: `No brand identity found for business: ${body.businessKey}. Seed brand identities first.` },
      { status: 404 }
    )
  }

  // Map DB snake_case to TypeScript camelCase
  const brandIdentity = mapBrand(brand as Record<string, unknown>)

  try {
    const results = await generateContent(body, brandIdentity)

    // Insert each result into generated_content table
    const insertedIds: string[] = []
    for (const result of results) {
      const { data: row, error: insertError } = await supabase
        .from('generated_content')
        .insert({
          founder_id: user.id,
          business_key: body.businessKey,
          content_type: body.contentType,
          platform: result.platform,
          title: result.title,
          body: result.body,
          media_prompt: result.mediaPrompt,
          hashtags: result.hashtags,
          cta: result.cta,
          character_used: result.characterUsed,
          ai_model: 'claude-sonnet-4-5-20250929',
          generation_source: 'manual_request',
          status: 'generated',
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[ContentGenerate] Insert error:', insertError.message)
      } else if (row) {
        insertedIds.push(row.id)
      }
    }

    return NextResponse.json({
      results,
      generatedContentIds: insertedIds,
      count: results.length,
    })
  } catch (error) {
    console.error('[ContentGenerate] Generation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Content generation failed' },
      { status: 500 }
    )
  }
}

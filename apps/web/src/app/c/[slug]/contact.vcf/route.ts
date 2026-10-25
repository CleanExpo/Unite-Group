import { getPublishedCard } from '@/lib/card/published'
import { buildVCard } from '@/lib/card/vcard'

const BASE_URL = 'https://unite-group.in'

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await context.params
  let card
  try {
    card = await getPublishedCard(slug)
  } catch {
    return new Response('Unavailable', { status: 500 })
  }
  // unknown, unpublished and invalid slugs are the same answer
  if (!card) return new Response('Not found', { status: 404 })
  return new Response(buildVCard(card, BASE_URL), {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${card.slug}.vcf"`,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}

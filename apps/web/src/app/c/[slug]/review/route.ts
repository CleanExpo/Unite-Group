import { classifyUserAgent, requestIdFrom } from '@/lib/card/review-link'
import { getCardReviewLink, logReviewEvent } from '@/lib/card/review-store'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * The review button and request links go through here: count the tap (no personal data), then 302 to Google's
 * write-a-review page. Every visitor gets the same destination; nothing here asks how the job went first.
 */
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await context.params
  const link = await getCardReviewLink(slug)
  if (link.state === 'unavailable') return new Response('Unavailable', { status: 503, headers: NO_STORE })
  // unknown, unpublished, invalid and no-Place-ID cards are the same answer
  if (link.state === 'none') return new Response('Not found', { status: 404, headers: NO_STORE })

  const ua = classifyUserAgent(request.headers.get('user-agent'))
  // link previewers and crawlers follow the redirect but are not counted as taps
  if (ua !== 'bot') {
    const requestId = requestIdFrom(new URL(request.url).searchParams.get('q'))
    await logReviewEvent({ slug, kind: requestId ? 'request_link_open' : 'review_tap', requestId, uaClass: ua })
  }
  return new Response(null, { status: 302, headers: { Location: link.url, ...NO_STORE, 'Referrer-Policy': 'no-referrer' } })
}

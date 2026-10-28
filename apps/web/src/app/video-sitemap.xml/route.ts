import { videoSitemapXml } from '@/lib/cards-video'

export const dynamic = 'force-static'

export function GET() {
  return new Response(videoSitemapXml(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}

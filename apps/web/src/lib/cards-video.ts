// VideoObject JSON-LD and the video sitemap for the ten card films on /cards (UNI-3061).
// Thumbnails are early frames (thumbs/), taken before the wordmark appears, so no
// thumbnail shows the company wordmark. Upload date is the day the clips were added to the repo
// (git log --diff-filter=A on public/cards/media), fixed in code, never "now".
import { AI_LABEL, EDITIONS, type Edition } from '@/app/cards/editions'
import { SITE_URL } from '@/lib/public-site'

export const CARD_FILMS_UPLOAD_DATE = '2026-10-23T08:13:31+10:00'
const PAGE_URL = `${SITE_URL}/cards`

export type CardFilm = {
  id: string
  name: string
  description: string
  thumbnailUrl: string
  contentUrl: string
  uploadDate: string
  /** Seconds, from ffprobe. */
  durationSeconds: number
}

const abs = (path: string) => `${SITE_URL}${path}`

export function cardFilm(e: Edition): CardFilm {
  return {
    id: `${PAGE_URL}#film-${e.name}`,
    name: `${e.label}: living business card film`,
    description: `${e.line} ${AI_LABEL}. Your card's film ends on your own logo and details.`,
    thumbnailUrl: abs(`/cards/media/thumbs/edition-${e.name}-thumb.jpg`),
    contentUrl: abs(e.video),
    uploadDate: CARD_FILMS_UPLOAD_DATE,
    durationSeconds: e.name === 'signature' ? 5 : 4,
  }
}

export const cardFilms = (): CardFilm[] => EDITIONS.map(cardFilm)

export function cardVideosJsonLd() {
  return cardFilms().map((f) => ({
    '@type': 'VideoObject',
    '@id': f.id,
    name: f.name,
    description: f.description,
    thumbnailUrl: [f.thumbnailUrl],
    contentUrl: f.contentUrl,
    uploadDate: f.uploadDate,
    duration: `PT${f.durationSeconds}S`,
    isFamilyFriendly: true,
    inLanguage: 'en-AU',
  }))
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** Google video sitemap: one <url> (the /cards page) carrying every film. */
export function videoSitemapXml(): string {
  const videos = cardFilms()
    .map(
      (f) => `    <video:video>
      <video:thumbnail_loc>${esc(f.thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${esc(f.name)}</video:title>
      <video:description>${esc(f.description)}</video:description>
      <video:content_loc>${esc(f.contentUrl)}</video:content_loc>
      <video:duration>${f.durationSeconds}</video:duration>
      <video:publication_date>${f.uploadDate}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>${PAGE_URL}</loc>
${videos}
  </url>
</urlset>
`
}

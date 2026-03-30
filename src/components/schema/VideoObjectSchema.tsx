import type { ClientVideo } from '@/lib/videos/getClientVideos';

interface VideoObjectSchemaProps {
  videos: ClientVideo[];
}

export function VideoObjectSchema({ videos }: VideoObjectSchemaProps) {
  if (videos.length === 0) return null;

  const schemas = videos.map((video) => ({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description ?? video.title,
    thumbnailUrl: video.thumbnail_url ?? `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`,
    uploadDate: video.upload_date,
    embedUrl: `https://www.youtube.com/embed/${video.youtube_video_id}`,
    contentUrl: `https://www.youtube.com/watch?v=${video.youtube_video_id}`,
    ...(video.duration_iso ? { duration: video.duration_iso } : {}),
  }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.length === 1 ? schemas[0] : schemas) }}
    />
  );
}

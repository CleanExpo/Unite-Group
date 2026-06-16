export interface VideoStats {
  youtube_video_id: string;
  view_count: number;
  like_count: number;
}

export async function getVideoStats(videoIds: string[]): Promise<Map<string, VideoStats>> {
  if (videoIds.length === 0) return new Map();

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn(JSON.stringify({ event: 'youtube_api_key_missing' }));
    return new Map();
  }

  const ids = videoIds.slice(0, 50).join(','); // API max 50 per request
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${apiKey}`;

  const res = await fetch(url, {
    next: { revalidate: 3600 }, // cache 1 hour
  });

  if (!res.ok) {
    console.error(JSON.stringify({ event: 'youtube_api_error', status: res.status }));
    return new Map();
  }

  const data = await res.json();
  const statsMap = new Map<string, VideoStats>();

  for (const item of data.items ?? []) {
    statsMap.set(item.id, {
      youtube_video_id: item.id,
      view_count: parseInt(item.statistics?.viewCount ?? '0', 10),
      like_count: parseInt(item.statistics?.likeCount ?? '0', 10),
    });
  }

  return statsMap;
}

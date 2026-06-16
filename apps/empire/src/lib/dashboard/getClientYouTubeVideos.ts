import { getClientVideos, type ClientVideo } from '@/lib/videos/getClientVideos';
import { getVideoStats } from '@/lib/youtube/getVideoStats';

export interface ClientVideoWithStats extends ClientVideo {
  view_count: number;
  like_count: number;
}

export async function getClientYouTubeVideos(client_id: string): Promise<ClientVideoWithStats[]> {
  const videos = await getClientVideos(client_id);

  if (videos.length === 0) return [];

  const statsMap = await getVideoStats(videos.map((v) => v.youtube_video_id));

  return videos.slice(0, 3).map((video) => {
    const stats = statsMap.get(video.youtube_video_id);
    return {
      ...video,
      view_count: stats?.view_count ?? 0,
      like_count: stats?.like_count ?? 0,
    };
  });
}

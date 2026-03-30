export interface PublishResult {
  success: boolean;
  platform_post_id?: string;
  error?: string;
}

export interface InstagramPost {
  caption: string;
  image_url?: string;
  video_url?: string;
  post_type: 'feed' | 'reel';
}

export async function publishToInstagram(
  access_token: string,
  page_id: string,
  post: InstagramPost
): Promise<PublishResult> {
  try {
    const mediaParams = new URLSearchParams({ access_token, caption: post.caption });

    if (post.post_type === 'reel' && post.video_url) {
      mediaParams.set('media_type', 'REELS');
      mediaParams.set('video_url', post.video_url);
      mediaParams.set('share_to_feed', 'true');
    } else if (post.image_url) {
      mediaParams.set('image_url', post.image_url);
    } else {
      return { success: false, error: 'No media URL provided' };
    }

    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${page_id}/media`,
      { method: 'POST', body: mediaParams }
    );
    const container = await containerRes.json();

    if (!containerRes.ok || container.error) {
      return { success: false, error: container.error?.message ?? 'Media container creation failed' };
    }

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${page_id}/media_publish`,
      { method: 'POST', body: new URLSearchParams({ access_token, creation_id: container.id }) }
    );
    const published = await publishRes.json();

    if (!publishRes.ok || published.error) {
      return { success: false, error: published.error?.message ?? 'Media publish failed' };
    }

    return { success: true, platform_post_id: published.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

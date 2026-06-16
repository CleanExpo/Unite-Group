import type { PublishResult } from './instagram';

export interface FacebookPost {
  message: string;
  link?: string;
  image_url?: string;
}

export async function publishToFacebook(
  access_token: string,
  page_id: string,
  post: FacebookPost
): Promise<PublishResult> {
  try {
    const params = new URLSearchParams({ access_token, message: post.message });
    if (post.link) params.set('link', post.link);

    const endpoint = post.image_url
      ? `https://graph.facebook.com/v19.0/${page_id}/photos`
      : `https://graph.facebook.com/v19.0/${page_id}/feed`;

    if (post.image_url) params.set('url', post.image_url);

    const res = await fetch(endpoint, { method: 'POST', body: params });
    const data = await res.json();

    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message ?? 'Facebook post failed' };
    }

    return { success: true, platform_post_id: data.id ?? data.post_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

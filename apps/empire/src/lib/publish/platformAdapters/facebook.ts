import type { PublishResult } from './instagram';
import { facebookResumableUpload } from '../resumableUpload';

export interface FacebookPost {
  message: string;
  link?: string;
  image_url?: string;
}

export interface FacebookVideo {
  bytes: Uint8Array;
  file_name: string;
  file_type: string;
}

export interface FacebookVideoPost {
  message: string;
  title?: string;
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

/**
 * Publish a video to a Facebook Page using the Resumable Upload API.
 *
 * A large video sent via a single non-resumable POST can hang for hours; this
 * uploads the (caller-supplied, pre-conformed) bytes in chunks via a resumable
 * session, obtains a file handle, then references that handle when creating the
 * Page video. The existing text/photo `publishToFacebook` is unchanged.
 *
 * NOTE: live posting also requires the `publish_video` App Review permission
 * (out of scope here — this is transport + wiring only).
 *
 * The `/{page_id}/videos` endpoint and `fbuploader_video_file_chunk`/`file_url`
 * field names are [UNCONFIRMED — verify against
 * developers.facebook.com/docs/video-api before live].
 */
export async function publishVideoToFacebook(
  access_token: string,
  page_id: string,
  app_id: string,
  video: FacebookVideo,
  post: FacebookVideoPost,
  options?: { fetchImpl?: typeof fetch; chunkSize?: number }
): Promise<PublishResult> {
  if (!access_token || !app_id) {
    return { success: false, error: 'not_configured' };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;

  try {
    const upload = await facebookResumableUpload(
      {
        access_token,
        app_id,
        file_name: video.file_name,
        file_type: video.file_type,
        bytes: video.bytes,
      },
      { fetchImpl, chunkSize: options?.chunkSize }
    );

    if (!upload.ok) {
      return { success: false, error: upload.error };
    }

    const params = new URLSearchParams({
      access_token,
      // [UNCONFIRMED — verify against developers.facebook.com/docs/video-api]
      // The uploaded-file handle is referenced as `fbuploader_video_file_chunk`.
      fbuploader_video_file_chunk: upload.handle,
      description: post.message,
    });
    if (post.title) params.set('title', post.title);

    const res = await fetchImpl(`https://graph.facebook.com/v25.0/${page_id}/videos`, {
      method: 'POST',
      body: params,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message ?? 'Facebook video publish failed' };
    }

    return { success: true, platform_post_id: data.id ?? data.post_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

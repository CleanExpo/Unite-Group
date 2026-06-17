import { publishVideoToFacebook } from '../platformAdapters/facebook';

const TOKEN = 'EAAsecret-access-token-value';
const APP_ID = '123456789';
const PAGE_ID = 'page-987';
const HANDLE = 'h-final-handle';
const POST_ID = 'page-987_555';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

function bytes(n: number): Uint8Array {
  const u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = i % 256;
  return u;
}

/**
 * Fake server: resumable-upload protocol (start/GET/transfer) then a final
 * POST /{page_id}/videos that references the upload handle.
 */
function makeServer(fileLength: number) {
  let serverOffset = 0;
  const calls: { url: string; method: string; headers: Record<string, string>; body?: string }[] = [];

  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    let body: string | undefined;
    if (init?.body instanceof URLSearchParams) body = init.body.toString();
    calls.push({ url, method, headers, body });

    if (url.includes('/uploads')) return jsonResponse({ id: 'upload:SESSION123' });

    if (url.includes('/videos')) {
      // The handle must be referenced here.
      return jsonResponse({ id: POST_ID });
    }

    // SESSION endpoint
    if (method === 'GET') return jsonResponse({ file_offset: serverOffset });

    const sentOffset = Number(headers['file_offset']);
    const bodyLength = init?.body instanceof Uint8Array ? init.body.byteLength : 0;
    serverOffset = Math.min(sentOffset + bodyLength, fileLength);
    if (serverOffset >= fileLength) return jsonResponse({ h: HANDLE });
    return jsonResponse({ file_offset: serverOffset });
  }) as unknown as typeof fetch;

  return { fetchImpl, calls };
}

describe('publishVideoToFacebook', () => {
  it('wires the upload handle into POST /{page_id}/videos and returns the post id', async () => {
    const server = makeServer(20);

    const result = await publishVideoToFacebook(
      TOKEN,
      PAGE_ID,
      APP_ID,
      { bytes: bytes(20), file_name: 'v.mp4', file_type: 'video/mp4' },
      { message: 'hello world', title: 'My Title' },
      { fetchImpl: server.fetchImpl, chunkSize: 10 }
    );

    expect(result).toEqual({ success: true, platform_post_id: POST_ID });

    const videoCall = server.calls.find((c) => c.url.includes('/videos'));
    expect(videoCall).toBeDefined();
    expect(videoCall!.method).toBe('POST');
    expect(videoCall!.url).toContain(`/${PAGE_ID}/videos`);
    // The handle obtained from the resumable upload is referenced.
    expect(videoCall!.body).toContain(encodeURIComponent(HANDLE));
    // Description comes from post.message; title from post.title.
    expect(videoCall!.body).toContain('description=hello+world');
    expect(videoCall!.body).toContain('title=My+Title');
  });

  it('returns not_configured when app_id is missing (no live call)', async () => {
    const server = makeServer(20);
    const result = await publishVideoToFacebook(
      TOKEN,
      PAGE_ID,
      '',
      { bytes: bytes(20), file_name: 'v.mp4', file_type: 'video/mp4' },
      { message: 'hi' },
      { fetchImpl: server.fetchImpl }
    );
    expect(result).toEqual({ success: false, error: 'not_configured' });
    expect(server.calls.length).toBe(0);
  });

  it('returns not_configured when access_token is missing (no live call)', async () => {
    const server = makeServer(20);
    const result = await publishVideoToFacebook(
      '',
      PAGE_ID,
      APP_ID,
      { bytes: bytes(20), file_name: 'v.mp4', file_type: 'video/mp4' },
      { message: 'hi' },
      { fetchImpl: server.fetchImpl }
    );
    expect(result).toEqual({ success: false, error: 'not_configured' });
    expect(server.calls.length).toBe(0);
  });

  it('returns the upload error (sanitised, no token) when the upload fails', async () => {
    const leakyFetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/uploads')) {
        return jsonResponse({ error: { message: `start failed for ${TOKEN}` } }, false, 400);
      }
      return jsonResponse({});
    }) as unknown as typeof fetch;

    const result = await publishVideoToFacebook(
      TOKEN,
      PAGE_ID,
      APP_ID,
      { bytes: bytes(10), file_name: 'v.mp4', file_type: 'video/mp4' },
      { message: 'hi' },
      { fetchImpl: leakyFetch, chunkSize: 10 }
    );

    expect(result.success).toBe(false);
    expect(result.error).not.toContain(TOKEN);
  });

  it('surfaces a /videos error message without echoing the token', async () => {
    const server = makeServer(10);
    const wrapped = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/videos')) {
        return jsonResponse({ error: { message: 'video create denied' } }, false, 403);
      }
      return server.fetchImpl(input, init);
    }) as unknown as typeof fetch;

    const result = await publishVideoToFacebook(
      TOKEN,
      PAGE_ID,
      APP_ID,
      { bytes: bytes(10), file_name: 'v.mp4', file_type: 'video/mp4' },
      { message: 'hi' },
      { fetchImpl: wrapped, chunkSize: 10 }
    );

    expect(result).toEqual({ success: false, error: 'video create denied' });
  });
});

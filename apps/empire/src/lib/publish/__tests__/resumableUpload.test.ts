import { facebookResumableUpload } from '../resumableUpload';

/**
 * A scripted fake fetch that emulates the Facebook Resumable Upload protocol
 * server-side, tracking an authoritative offset. Tests assert protocol
 * BEHAVIOUR (offset advances per chunk, a resume re-reads the server offset, a
 * final handle is returned) rather than brittle exact URLs.
 */

const TOKEN = 'EAAsecret-access-token-value';
const APP_ID = '123456789';
const HANDLE = 'h-final-handle';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

function bytes(n: number): Uint8Array {
  const u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = i % 256;
  return u;
}

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  bodyLength?: number;
}

/**
 * Build a fake fetch implementing the documented protocol.
 *
 * @param fileLength total file size the server expects
 * @param interruptAtOffset if set, the FIRST transfer POST starting at this
 *        offset returns an error WITHOUT advancing the server offset; the next
 *        GET reports the pre-interruption offset and the client resumes there.
 */
function makeServer(opts: {
  fileLength: number;
  chunkSize: number;
  interruptAtOffset?: number;
}) {
  let serverOffset = 0;
  let interruptionFired = false;
  const calls: Call[] = [];
  const offsetHeaderHistory: number[] = [];

  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const bodyLength =
      init?.body instanceof Uint8Array ? init.body.byteLength : undefined;
    calls.push({ url, method, headers, bodyLength });

    // START: POST .../uploads?... (query carries file params, no file_offset header)
    if (url.includes('/uploads')) {
      return jsonResponse({ id: 'upload:SESSION123' });
    }

    // SESSION endpoint (POST = transfer, GET = status)
    if (method === 'GET') {
      return jsonResponse({ file_offset: serverOffset });
    }

    // POST transfer
    const sentOffset = Number(headers['file_offset']);
    offsetHeaderHistory.push(sentOffset);

    if (
      opts.interruptAtOffset !== undefined &&
      !interruptionFired &&
      sentOffset === opts.interruptAtOffset
    ) {
      interruptionFired = true;
      // Server does NOT advance: simulate a dropped transfer.
      return jsonResponse({ error: { message: 'transient transfer failure' } }, false, 500);
    }

    // Accept the chunk: advance the authoritative offset.
    serverOffset = Math.min(sentOffset + (bodyLength ?? 0), opts.fileLength);

    if (serverOffset >= opts.fileLength) {
      return jsonResponse({ h: HANDLE });
    }
    return jsonResponse({ file_offset: serverOffset });
  }) as unknown as typeof fetch;

  return { fetchImpl, calls, offsetHeaderHistory, getServerOffset: () => serverOffset };
}

describe('facebookResumableUpload', () => {
  it('starts a session, chunks the whole file, and returns the final handle', async () => {
    const fileLength = 25;
    const chunkSize = 10;
    const server = makeServer({ fileLength, chunkSize });

    const result = await facebookResumableUpload(
      { access_token: TOKEN, app_id: APP_ID, file_name: 'v.mp4', file_type: 'video/mp4', bytes: bytes(fileLength) },
      { fetchImpl: server.fetchImpl, chunkSize }
    );

    expect(result).toEqual({ ok: true, handle: HANDLE });

    // A start call hit the /uploads endpoint.
    expect(server.calls.some((c) => c.url.includes('/uploads') && c.method === 'POST')).toBe(true);

    // The first GET-on-start reads a 0 offset (fresh session).
    expect(server.offsetHeaderHistory[0]).toBe(0);

    // Offsets advance monotonically per chunk: 0, 10, 20.
    expect(server.offsetHeaderHistory).toEqual([0, 10, 20]);

    // The whole file was transferred (server reached fileLength).
    expect(server.getServerOffset()).toBe(fileLength);
  });

  it('resumes from the SERVER-REPORTED offset after a mid-upload interruption', async () => {
    const fileLength = 30;
    const chunkSize = 10;
    // Interrupt the transfer that begins at offset 10 (the 2nd chunk).
    const server = makeServer({ fileLength, chunkSize, interruptAtOffset: 10 });

    const result = await facebookResumableUpload(
      { access_token: TOKEN, app_id: APP_ID, file_name: 'v.mp4', file_type: 'video/mp4', bytes: bytes(fileLength) },
      { fetchImpl: server.fetchImpl, chunkSize }
    );

    expect(result).toEqual({ ok: true, handle: HANDLE });

    // The transfer at offset 10 was attempted twice: it failed once, the client
    // GET the session, learned the authoritative offset (still 10), and resumed
    // from exactly that byte — never skipping or duplicating data.
    const tens = server.offsetHeaderHistory.filter((o) => o === 10);
    expect(tens.length).toBe(2);

    // Full transfer order, with the retried 10: 0, 10(fail), 10(resume), 20.
    expect(server.offsetHeaderHistory).toEqual([0, 10, 10, 20]);

    // A GET status call was issued for the resume read.
    expect(server.calls.some((c) => c.method === 'GET')).toBe(true);
    expect(server.getServerOffset()).toBe(fileLength);
  });

  it('returns not_configured when app_id is missing', async () => {
    const server = makeServer({ fileLength: 10, chunkSize: 10 });
    const result = await facebookResumableUpload(
      { access_token: TOKEN, app_id: '', file_name: 'v.mp4', file_type: 'video/mp4', bytes: bytes(10) },
      { fetchImpl: server.fetchImpl }
    );
    expect(result).toEqual({ ok: false, error: 'not_configured' });
  });

  it('returns not_configured when access_token is missing', async () => {
    const server = makeServer({ fileLength: 10, chunkSize: 10 });
    const result = await facebookResumableUpload(
      { access_token: '', app_id: APP_ID, file_name: 'v.mp4', file_type: 'video/mp4', bytes: bytes(10) },
      { fetchImpl: server.fetchImpl }
    );
    expect(result).toEqual({ ok: false, error: 'not_configured' });
  });

  it('accepts an ArrayBuffer source and uploads it whole', async () => {
    const fileLength = 16;
    const chunkSize = 8;
    const server = makeServer({ fileLength, chunkSize });
    const ab = bytes(fileLength).buffer;

    const result = await facebookResumableUpload(
      { access_token: TOKEN, app_id: APP_ID, file_name: 'v.mp4', file_type: 'video/mp4', bytes: ab },
      { fetchImpl: server.fetchImpl, chunkSize }
    );

    expect(result).toEqual({ ok: true, handle: HANDLE });
    expect(server.offsetHeaderHistory).toEqual([0, 8]);
  });

  it('never echoes the access token in a returned error (no-secret test)', async () => {
    // A server that fails the start with an error message embedding the token.
    const leakyFetch = (async () =>
      ({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: `bad token ${TOKEN} rejected` } }),
      }) as unknown as Response) as unknown as typeof fetch;

    const result = await facebookResumableUpload(
      { access_token: TOKEN, app_id: APP_ID, file_name: 'v.mp4', file_type: 'video/mp4', bytes: bytes(10) },
      { fetchImpl: leakyFetch, chunkSize: 10 }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain(TOKEN);
      expect(result.error).toContain('[redacted]');
    }
  });

  it('surfaces a sanitised error when a thrown exception contains the token', async () => {
    const throwingFetch = (async () => {
      throw new Error(`network blew up with token ${TOKEN}`);
    }) as unknown as typeof fetch;

    const result = await facebookResumableUpload(
      { access_token: TOKEN, app_id: APP_ID, file_name: 'v.mp4', file_type: 'video/mp4', bytes: bytes(10) },
      { fetchImpl: throwingFetch, chunkSize: 10 }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain(TOKEN);
    }
  });
});

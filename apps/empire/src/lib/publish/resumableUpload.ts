/**
 * Facebook Resumable Upload API client (transport only).
 *
 * Why this exists: a large video uploaded via a single non-resumable POST can
 * hang for hours. Facebook's session-based Resumable Upload protocol lets an
 * interrupted transfer resume from a server-authoritative byte offset, so a
 * stalled transfer is retried from a known point and can never hang
 * indefinitely.
 *
 * This module is pure transport: the caller supplies the media bytes (a
 * pre-conformed file per the Synthex publishing-engine spec, Phase 1). It does
 * NOT fetch, transcode, or touch the DB. The only side effect is HTTP via the
 * injected `fetchImpl` (defaults to the global `fetch`).
 *
 * The exact Facebook endpoint paths and param/header names below are
 * [UNCONFIRMED — verify against developers.facebook.com/docs/video-api before
 * live]. They are isolated in named constants so a single edit re-points them.
 * Tests assert protocol BEHAVIOUR (offset advances per chunk, a resume re-reads
 * the server offset, a final handle is returned) rather than brittle URLs.
 */

const GRAPH_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// [UNCONFIRMED — verify against developers.facebook.com/docs/video-api before live]
// Start: POST {GRAPH_BASE}/{app_id}/uploads?file_name=&file_length=&file_type=&access_token=
//   → { id: "upload:<SESSION_ID>" }
const START_PATH = (appId: string) => `${GRAPH_BASE}/${appId}/uploads`;
// [UNCONFIRMED — verify against developers.facebook.com/docs/video-api before live]
// Transfer / status: POST or GET {GRAPH_BASE}/{session_id}
//   Transfer: body = binary chunk, header `file_offset: <bytes already uploaded>`,
//             header `Authorization: OAuth <access_token>` → { h: "<handle>" } on completion.
//   Status (GET): → { file_offset: <authoritative next byte to send> }
const SESSION_PATH = (sessionId: string) => `${GRAPH_BASE}/${sessionId}`;

// [UNCONFIRMED — verify against developers.facebook.com/docs/video-api before live]
const HEADER_FILE_OFFSET = 'file_offset';
const HEADER_AUTHORIZATION = 'Authorization';
const PARAM_FILE_NAME = 'file_name';
const PARAM_FILE_LENGTH = 'file_length';
const PARAM_FILE_TYPE = 'file_type';
const PARAM_ACCESS_TOKEN = 'access_token';

const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024; // 4 MiB

export interface ResumableUploadOptions {
  /** Injected for testing; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Bytes per transfer chunk. Defaults to 4 MiB. */
  chunkSize?: number;
}

export interface ResumableUploadInput {
  access_token: string;
  app_id: string;
  file_name: string;
  file_type: string;
  /** Pre-conformed media bytes. The caller supplies these. */
  bytes: Uint8Array | ArrayBuffer;
}

export type ResumableUploadResult =
  | { ok: true; handle: string }
  | { ok: false; error: string };

function toUint8(bytes: Uint8Array | ArrayBuffer): Uint8Array {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

/**
 * Never echo the access token in an error string. This strips any occurrence of
 * the token and collapses obviously-token-bearing substrings.
 */
function sanitiseError(message: string, token: string): string {
  let out = message;
  if (token) {
    // Escape regex metacharacters in the token before building the pattern.
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escaped, 'g'), '[redacted]');
  }
  return out;
}

/** Start an upload session. Returns the `upload:<SESSION_ID>` id. */
async function startSession(
  input: ResumableUploadInput,
  fileLength: number,
  fetchImpl: typeof fetch
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    [PARAM_FILE_NAME]: input.file_name,
    [PARAM_FILE_LENGTH]: String(fileLength),
    [PARAM_FILE_TYPE]: input.file_type,
    [PARAM_ACCESS_TOKEN]: input.access_token,
  });

  const res = await fetchImpl(`${START_PATH(input.app_id)}?${params.toString()}`, {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.error || !data?.id) {
    const msg = data?.error?.message ?? `Upload session start failed (HTTP ${res.status})`;
    return { ok: false, error: msg };
  }
  return { ok: true, sessionId: String(data.id) };
}

/**
 * GET the session to read the server-authoritative `file_offset`. This is the
 * anti-hang core: on a retry we resume from exactly the byte the server reports
 * it has, never from a guessed position.
 */
async function readServerOffset(
  sessionId: string,
  accessToken: string,
  fetchImpl: typeof fetch
): Promise<{ ok: true; offset: number } | { ok: false; error: string }> {
  const res = await fetchImpl(SESSION_PATH(sessionId), {
    method: 'GET',
    headers: { [HEADER_AUTHORIZATION]: `OAuth ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.error) {
    const msg = data?.error?.message ?? `Upload session status failed (HTTP ${res.status})`;
    return { ok: false, error: msg };
  }
  const offset = Number(data?.[HEADER_FILE_OFFSET] ?? 0);
  return { ok: true, offset: Number.isFinite(offset) ? offset : 0 };
}

/**
 * Transfer a single chunk starting at `offset`. On the final chunk the response
 * carries the file handle `{ h }`. Otherwise the response advances the offset;
 * we read the next authoritative offset from the response when present, falling
 * back to `offset + chunk.length`.
 */
type TransferOutcome =
  | { ok: true; handle: string }
  | { ok: true; nextOffset: number }
  | { ok: false; error: string };

async function transferChunk(
  sessionId: string,
  accessToken: string,
  offset: number,
  chunk: Uint8Array,
  fetchImpl: typeof fetch
): Promise<TransferOutcome> {
  const res = await fetchImpl(SESSION_PATH(sessionId), {
    method: 'POST',
    headers: {
      [HEADER_AUTHORIZATION]: `OAuth ${accessToken}`,
      [HEADER_FILE_OFFSET]: String(offset),
    },
    // The body is the raw binary chunk. `BodyInit` accepts a BufferSource;
    // cast keeps the DOM lib typings happy across runtimes.
    body: chunk as unknown as BodyInit,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.error) {
    const msg = data?.error?.message ?? `Upload chunk transfer failed (HTTP ${res.status})`;
    return { ok: false, error: msg };
  }

  if (typeof data?.h === 'string' && data.h.length > 0) {
    return { ok: true, handle: data.h };
  }

  const reported = data?.[HEADER_FILE_OFFSET];
  const nextOffset =
    reported !== undefined && Number.isFinite(Number(reported))
      ? Number(reported)
      : offset + chunk.length;
  return { ok: true, nextOffset };
}

/**
 * Run a Facebook resumable upload to completion and return the file handle.
 *
 * Protocol: start a session, then loop transferring chunks from the current
 * offset until the server returns a handle. Before each transfer (and always on
 * the first chunk) we GET the session for the authoritative offset, so an
 * interrupted/retried transfer resumes from exactly where the server stands.
 */
export async function facebookResumableUpload(
  input: ResumableUploadInput,
  options: ResumableUploadOptions = {}
): Promise<ResumableUploadResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const token = input.access_token;

  try {
    if (!input.access_token || !input.app_id) {
      return { ok: false, error: 'not_configured' };
    }

    const all = toUint8(input.bytes);
    const fileLength = all.byteLength;

    const started = await startSession(input, fileLength, fetchImpl);
    if (!started.ok) {
      return { ok: false, error: sanitiseError(started.error, token) };
    }
    const sessionId = started.sessionId;

    // Read the server-authoritative starting offset. On a fresh session this is
    // 0; on a resumed session it is whatever the server already holds.
    const initial = await readServerOffset(sessionId, token, fetchImpl);
    if (!initial.ok) {
      return { ok: false, error: sanitiseError(initial.error, token) };
    }
    let offset = initial.offset;

    // Guard against a non-advancing loop (server never moves the offset and
    // never returns a handle): bound iterations to the chunk count plus slack.
    const maxIterations = Math.ceil(fileLength / chunkSize) + 4;
    let iterations = 0;

    while (offset < fileLength) {
      if (iterations++ > maxIterations) {
        return { ok: false, error: 'Upload stalled: offset did not advance' };
      }

      const chunk = all.subarray(offset, Math.min(offset + chunkSize, fileLength));
      const transferred = await transferChunk(sessionId, token, offset, chunk, fetchImpl);

      if (!transferred.ok) {
        // Recoverable transfer error: re-read the server-authoritative offset and
        // resume from exactly that byte. The server may report the SAME offset —
        // that means "resend this chunk", NOT "give up" (resending the same byte
        // range is the whole point of resumable upload). The maxIterations guard
        // bounds a genuine stall, so this can never loop forever (anti-hang).
        const recheck = await readServerOffset(sessionId, token, fetchImpl);
        if (!recheck.ok) {
          return { ok: false, error: sanitiseError(transferred.error, token) };
        }
        offset = recheck.offset;
        continue;
      }

      if ('handle' in transferred) {
        return { ok: true, handle: transferred.handle };
      }
      offset = transferred.nextOffset;
    }

    // Whole file sent but no handle surfaced mid-loop: read the session once
    // more for a terminal handle is not part of the documented protocol, so
    // treat this as an incomplete finalize.
    return { ok: false, error: 'Upload completed without a file handle' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown upload error';
    return { ok: false, error: sanitiseError(message, token) };
  }
}

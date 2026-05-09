/**
 * Integration tests: /api/telegram/feed and /api/telegram/send
 *
 * Tests the full request → handler → response path.
 * Supabase and the Telegram Bot API are mocked at the network level.
 * No real credentials are required.
 */

import { NextRequest } from 'next/server';

// ── Supabase mock ──────────────────────────────────────────────────────────
// We mock the module before importing the route so the route sees the mock.
const mockSelect   = jest.fn();
const mockOrder    = jest.fn();
const mockLimit    = jest.fn();
const mockInsert   = jest.fn();
const mockFrom     = jest.fn();
const mockSupabase = { from: mockFrom };

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// ── Route imports (after mock setup) ──────────────────────────────────────
import { GET  } from '@/app/api/telegram/feed/route';
import { POST } from '@/app/api/telegram/send/route';

// ── Helpers ────────────────────────────────────────────────────────────────
function makeGetReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/telegram/feed');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

function makePostReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/telegram/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── Setup ──────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();

  // Default Supabase chain: from().select().order().limit() → success
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockSelect.mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert });
  mockInsert.mockResolvedValue({ error: null });

  // Default env
  process.env.NEXT_PUBLIC_SUPABASE_URL   = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY  = 'test-service-key';
  process.env.TELEGRAM_BOT_TOKEN         = 'test-bot-token';
  process.env.TELEGRAM_CHAT_ID           = '12345';

  // Reset global fetch mock
  global.fetch = jest.fn();
});

// ── /api/telegram/feed ─────────────────────────────────────────────────────
describe('/api/telegram/feed GET', () => {

  test('returns empty messages array when table is empty', async () => {
    const res = await GET(makeGetReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('messages');
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages).toHaveLength(0);
  });

  test('passes limit param to Supabase query', async () => {
    await GET(makeGetReq({ limit: '5' }));
    expect(mockLimit).toHaveBeenCalledWith(5);
  });

  test('defaults to limit 20 when no param provided', async () => {
    await GET(makeGetReq());
    expect(mockLimit).toHaveBeenCalledWith(20);
  });

  test('transforms Supabase rows into flattened turn pairs', async () => {
    mockLimit.mockResolvedValue({
      data: [
        {
          id: 'row-1',
          sender_name: 'Phill',
          is_from_bot: false,
          message: 'Hello Margot',
          response: 'Hello Phill, how can I help?',
          platform: 'telegram',
          created_at: '2026-05-10T08:00:00Z',
        },
      ],
      error: null,
    });

    const res = await GET(makeGetReq({ limit: '5' }));
    const body = await res.json();

    // One DB row → two turns: the inbound message + the bot response
    expect(body.messages).toHaveLength(2);

    const [userTurn, botTurn] = body.messages;
    expect(userTurn.isBot).toBe(false);
    expect(userTurn.text).toBe('Hello Margot');
    expect(userTurn.from).toBe('Phill');

    expect(botTurn.isBot).toBe(true);
    expect(botTurn.text).toBe('Hello Phill, how can I help?');
  });

  test('omits bot turn when response is null', async () => {
    mockLimit.mockResolvedValue({
      data: [{
        id: 'row-2',
        sender_name: 'Phill',
        is_from_bot: false,
        message: 'Still waiting',
        response: null,
        platform: 'telegram',
        created_at: '2026-05-10T08:01:00Z',
      }],
      error: null,
    });

    const res = await GET(makeGetReq());
    const body = await res.json();

    // Only the inbound turn — no bot response yet
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].isBot).toBe(false);
  });

  test('returns messages oldest-first (reversed from DB order)', async () => {
    mockLimit.mockResolvedValue({
      data: [
        { id: 'newer', sender_name: 'Phill', is_from_bot: false, message: 'Second', response: null, platform: 'telegram', created_at: '2026-05-10T08:02:00Z' },
        { id: 'older', sender_name: 'Phill', is_from_bot: false, message: 'First',  response: null, platform: 'telegram', created_at: '2026-05-10T08:00:00Z' },
      ],
      error: null,
    });

    // DB returns newest-first (order: created_at DESC) — feed reverses for display
    const res = await GET(makeGetReq());
    const body = await res.json();

    expect(body.messages[0].text).toBe('First');
    expect(body.messages[1].text).toBe('Second');
  });

  test('returns empty messages (not error status) when Supabase fails', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'connection refused' } });

    const res = await GET(makeGetReq());
    const body = await res.json();

    // Graceful degradation — not a 500
    expect(res.status).toBe(200);
    expect(body.messages).toHaveLength(0);
    expect(body.error).toBe('connection refused');
  });

});

// ── /api/telegram/send ─────────────────────────────────────────────────────
describe('/api/telegram/send POST', () => {

  test('returns 400 when text is missing from body', async () => {
    const res = await POST(makePostReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/text required/i);
  });

  test('returns 400 when text is empty string', async () => {
    const res = await POST(makePostReq({ text: '   ' }));
    expect(res.status).toBe(400);
  });

  test('returns 500 when TELEGRAM_BOT_TOKEN is not set', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const res = await POST(makePostReq({ text: 'Hello' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/not configured/i);
  });

  test('returns 500 when TELEGRAM_CHAT_ID is not set', async () => {
    delete process.env.TELEGRAM_CHAT_ID;
    const res = await POST(makePostReq({ text: 'Hello' }));
    expect(res.status).toBe(500);
  });

  test('calls Telegram Bot API with correct message and chat ID', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 999 } }),
    });

    await POST(makePostReq({ text: 'Test message', persist: false }));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"text":"Test message"'),
      })
    );
    // Verify chat_id is embedded in the request body
    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(callBody.chat_id).toBe('12345');
  });

  test('returns 200 with message_id on successful send', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 42 } }),
    });

    const res = await POST(makePostReq({ text: 'Hello', persist: false }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message_id).toBe(42);
  });

  test('persists message to Supabase when persist=true', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 7 } }),
    });

    await POST(makePostReq({ text: 'Persist me', persist: true }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Persist me',
        is_from_bot: false,
        sender_name: 'Phill',
      })
    );
  });

  test('does NOT write to Supabase when persist=false', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 8 } }),
    });

    await POST(makePostReq({ text: 'No persist', persist: false }));

    expect(mockInsert).not.toHaveBeenCalled();
  });

  test('returns 400 when Telegram API returns not-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ ok: false, description: 'Forbidden: bot was blocked' }),
    });

    const res = await POST(makePostReq({ text: 'Blocked message' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('blocked');
  });

  test('truncates message to 2000 chars when persisting', async () => {
    const longText = 'A'.repeat(3000);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 9 } }),
    });

    await POST(makePostReq({ text: longText, persist: true }));

    const insertedMessage = mockInsert.mock.calls[0][0].message;
    expect(insertedMessage.length).toBeLessThanOrEqual(2000);
  });

});

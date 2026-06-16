/**
 * SYN-521: Tests for generateWeeklyCalendar
 */

// Mock modules before imports
const mockReadDigestSignals = jest.fn();
const mockScheduleSlots = jest.fn();
const mockGenerateCaptions = jest.fn();
const mockTrackPipelineCost = jest.fn();
const mockSupabaseUpsert = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseSingle = jest.fn();

jest.mock('./digestReader', () => ({ readDigestSignals: mockReadDigestSignals }));
jest.mock('./slotScheduler', () => ({
  scheduleSlots: mockScheduleSlots,
  getNextMonday: () => new Date('2026-04-06T00:00:00.000Z'),
}));
jest.mock('./captionGenerator', () => ({ generateCaptions: mockGenerateCaptions }));
jest.mock('@/lib/pipelines/track-cost', () => ({ trackPipelineCost: mockTrackPipelineCost }));
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      upsert: () => ({
        select: () => ({
          single: mockSupabaseSingle,
        }),
      }),
    }),
  }),
}));

import { generateWeeklyCalendar } from './generateWeeklyCalendar';

const mockClientContext = {
  business_name: 'Test Business',
  industry: 'Retail',
  brand_voice: 'friendly',
};

const mockSignals = {
  client_id: 'client-123',
  top_content_types: ['educational', 'promotional', 'engagement'],
  peak_engagement_hours: [9, 12, 17],
  peak_days: [1, 2, 3],
  winning_hashtag_clusters: [['#retail', '#australia']],
  best_platform: 'instagram' as const,
  avg_engagement_rate: 4.5,
  digest_count: 3,
};

const mockSlot = {
  slot_id: 'slot_0',
  day_of_week: 1,
  scheduled_at: '2026-04-06T09:00:00.000Z',
  platform: 'instagram' as const,
  content_type: 'educational' as const,
  hashtag_set: ['#retail'],
  topic_hint: 'educational content',
  based_on_content_type: 'educational',
};

describe('generateWeeklyCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('returns cold_start when fewer than 3 digests exist', async () => {
    mockReadDigestSignals.mockResolvedValue({ signals: null, digest_count: 2 });

    const result = await generateWeeklyCalendar('client-123', mockClientContext);

    expect(result.calendar).toBeNull();
    expect(result.skipped_reason).toBe('cold_start');
    expect(result.cost_usd).toBe(0);
  });

  it('generates a 7-slot calendar on happy path', async () => {
    mockReadDigestSignals.mockResolvedValue({ signals: mockSignals, digest_count: 3 });
    mockScheduleSlots.mockReturnValue(Array(7).fill(mockSlot));
    mockGenerateCaptions.mockResolvedValue({
      captions: ['Cap 1', 'Cap 2', 'Cap 3'],
      input_tokens: 50,
      output_tokens: 80,
    });
    mockSupabaseSingle.mockResolvedValue({ data: { id: 'cal-uuid' }, error: null });
    mockTrackPipelineCost.mockResolvedValue(undefined);

    const result = await generateWeeklyCalendar('client-123', mockClientContext);

    expect(result.calendar).not.toBeNull();
    expect(result.calendar!.slots).toHaveLength(7);
    expect(result.skipped_reason).toBeUndefined();
  });

  it('calendar has status draft', async () => {
    mockReadDigestSignals.mockResolvedValue({ signals: mockSignals, digest_count: 3 });
    mockScheduleSlots.mockReturnValue(Array(7).fill(mockSlot));
    mockGenerateCaptions.mockResolvedValue({
      captions: ['Cap 1', 'Cap 2', 'Cap 3'],
      input_tokens: 50,
      output_tokens: 80,
    });
    mockSupabaseSingle.mockResolvedValue({ data: { id: 'cal-uuid' }, error: null });

    const result = await generateWeeklyCalendar('client-123', mockClientContext);
    expect(result.calendar!.status).toBe('draft');
  });

  it('all slots have 3 caption variations', async () => {
    mockReadDigestSignals.mockResolvedValue({ signals: mockSignals, digest_count: 3 });
    mockScheduleSlots.mockReturnValue(Array(7).fill(mockSlot));
    mockGenerateCaptions.mockResolvedValue({
      captions: ['Cap 1', 'Cap 2', 'Cap 3'],
      input_tokens: 50,
      output_tokens: 80,
    });
    mockSupabaseSingle.mockResolvedValue({ data: { id: 'cal-uuid' }, error: null });

    const result = await generateWeeklyCalendar('client-123', mockClientContext);
    for (const slot of result.calendar!.slots) {
      expect(slot.captions).toHaveLength(3);
    }
  });

  it('calls trackPipelineCost after generation', async () => {
    mockReadDigestSignals.mockResolvedValue({ signals: mockSignals, digest_count: 3 });
    mockScheduleSlots.mockReturnValue(Array(7).fill(mockSlot));
    mockGenerateCaptions.mockResolvedValue({
      captions: ['Cap 1', 'Cap 2', 'Cap 3'],
      input_tokens: 50,
      output_tokens: 80,
    });
    mockSupabaseSingle.mockResolvedValue({ data: { id: 'cal-uuid' }, error: null });
    mockTrackPipelineCost.mockResolvedValue(undefined);

    await generateWeeklyCalendar('client-123', mockClientContext);
    expect(mockTrackPipelineCost).toHaveBeenCalledWith(
      expect.objectContaining({
        pipeline_name: 'content-calendar-generation',
        client_id: 'client-123',
        model: 'claude-haiku-4-5-20251001',
      })
    );
  });
});

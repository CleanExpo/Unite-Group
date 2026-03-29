import { createClient } from '@/lib/supabase/server';
import { ContentCalendar, CalendarSlot } from '@/lib/calendar/types';
import CalendarClientWrapper from './CalendarClientWrapper';

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-8 text-center text-gray-500">
        Please sign in to view your calendar.
      </div>
    );
  }

  // Get user profile for calendar_mode and client_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('calendar_mode, client_id')
    .eq('id', user.id)
    .single();

  const calendarMode: 'shadow' | 'live' =
    profile?.calendar_mode === 'live' ? 'live' : 'shadow';

  const clientId = profile?.client_id as string | undefined;

  // Compute the start of the current week (Monday)
  function getMondayOfCurrentWeek(): string {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? -6 : 1 - day; // days to subtract to get to Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }

  const weekStart = getMondayOfCurrentWeek();

  // Fetch this week's calendar
  let calendar: (ContentCalendar & { slots: Array<CalendarSlot & { db_id: string; status: 'draft' | 'approved' | 'rejected' }> }) | null = null;

  if (clientId) {
    const { data: calendarData } = await supabase
      .from('content_calendars')
      .select('*')
      .eq('client_id', clientId)
      .eq('week_start', weekStart)
      .single();

    if (calendarData) {
      // Normalise slots: ensure db_id and status fields exist
      const rawSlots = (calendarData.slots ?? []) as any[];
      const normalisedSlots = rawSlots.map((slot: any) => ({
        ...slot,
        db_id: slot.db_id ?? slot.slot_id,
        status: slot.status ?? 'draft',
      }));

      calendar = {
        ...calendarData,
        slots: normalisedSlots,
      } as any;
    }
  }

  // Compute approval rate for the toggle
  const approvalRate =
    calendar && calendar.slots.length > 0
      ? Math.round(
          (calendar.slots.filter((s) => s.status === 'approved').length /
            calendar.slots.length) *
            100
        )
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
      </div>

      {/* Calendar client wrapper handles all interactive state */}
      <CalendarClientWrapper
        calendar={calendar}
        calendarMode={calendarMode}
        approvalRate={approvalRate}
        clientId={clientId ?? ''}
      />
    </div>
  );
}

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
      <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#475569", fontSize: 14 }}>Please sign in to view your calendar.</p>
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
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }

  const weekStart = getMondayOfCurrentWeek();

  let calendar: (ContentCalendar & { slots: Array<CalendarSlot & { db_id: string; status: 'draft' | 'approved' | 'rejected' }> }) | null = null;

  if (clientId) {
    const { data: calendarData } = await supabase
      .from('content_calendars')
      .select('*')
      .eq('client_id', clientId)
      .eq('week_start', weekStart)
      .single();

    if (calendarData) {
      const rawSlots = (calendarData.slots ?? []) as any[];
      const normalisedSlots = rawSlots.map((slot: any) => ({
        ...slot,
        db_id: slot.db_id ?? slot.slot_id,
        status: slot.status ?? 'draft',
      }));
      calendar = { ...calendarData, slots: normalisedSlots } as any;
    }
  }

  const approvalRate =
    calendar && calendar.slots.length > 0
      ? Math.round(
          (calendar.slots.filter((s) => s.status === 'approved').length /
            calendar.slots.length) *
            100
        )
      : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f8fafc" }}>
      {/* Page title */}
      <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em", margin: 0, fontFamily: "var(--font-display)" }}>
            Calendar
          </h1>
          <p style={{ fontSize: 11, color: "#52525b", margin: "3px 0 0", fontFamily: "var(--font-mono)" }}>Week of {weekStart}</p>
        </div>
      </div>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "32px 24px" }}>
        <CalendarClientWrapper
          calendar={calendar}
          calendarMode={calendarMode}
          approvalRate={approvalRate}
          clientId={clientId ?? ''}
        />
      </div>
    </div>
  );
}

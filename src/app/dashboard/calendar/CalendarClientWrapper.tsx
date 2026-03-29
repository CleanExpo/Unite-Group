'use client';

import { useState } from 'react';
import { ContentCalendar, CalendarSlot } from '@/lib/calendar/types';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import ShadowLiveToggle from '@/components/calendar/ShadowLiveToggle';

type SlotWithMeta = CalendarSlot & { db_id: string; status: 'draft' | 'approved' | 'rejected' };
type CalendarWithSlots = ContentCalendar & { slots: SlotWithMeta[] };

interface CalendarClientWrapperProps {
  calendar: CalendarWithSlots | null;
  calendarMode: 'shadow' | 'live';
  approvalRate: number;
  clientId: string;
}

export default function CalendarClientWrapper({
  calendar: initialCalendar,
  calendarMode,
  approvalRate: initialApprovalRate,
  clientId,
}: CalendarClientWrapperProps) {
  const [mode, setMode] = useState<'shadow' | 'live'>(calendarMode);
  const [calendar, setCalendar] = useState<CalendarWithSlots | null>(initialCalendar);

  const approvalRate =
    calendar && calendar.slots.length > 0
      ? Math.round(
          (calendar.slots.filter((s) => s.status === 'approved').length /
            calendar.slots.length) *
            100
        )
      : initialApprovalRate;

  async function handleModeChange(newMode: 'shadow' | 'live') {
    const res = await fetch('/api/calendar/mode', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode }),
    });
    if (!res.ok) {
      throw new Error('Failed to update mode');
    }
    setMode(newMode);
  }

  function handleApprove(slotId: string) {
    if (!calendar) return;
    const prev = calendar;
    const updated: CalendarWithSlots = {
      ...calendar,
      slots: calendar.slots.map((s: SlotWithMeta): SlotWithMeta =>
        s.db_id === slotId ? { ...s, status: 'approved' } : s
      ),
    };
    setCalendar(updated);

    fetch(`/api/calendar/posts/${slotId}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    }).catch(() => {
      // Revert on error
      setCalendar(prev);
    });
  }

  function handleReject(slotId: string) {
    if (!calendar) return;
    const prev = calendar;
    const updated: CalendarWithSlots = {
      ...calendar,
      slots: calendar.slots.map((s: SlotWithMeta): SlotWithMeta =>
        s.db_id === slotId ? { ...s, status: 'rejected' } : s
      ),
    };
    setCalendar(updated);

    fetch(`/api/calendar/posts/${slotId}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    }).catch(() => {
      setCalendar(prev);
    });
  }

  function handleEdit(slotId: string, newCaption: string) {
    if (!calendar) return;
    const updated: CalendarWithSlots = {
      ...calendar,
      slots: calendar.slots.map((s: SlotWithMeta): SlotWithMeta => {
        if (s.db_id === slotId) {
          const updatedCaptions: [string, string, string] = [newCaption, s.captions[1], s.captions[2]];
          return { ...s, captions: updatedCaptions };
        }
        return s;
      }),
    };
    setCalendar(updated);
  }

  return (
    <div className="space-y-6">
      <ShadowLiveToggle
        currentMode={mode}
        approvalRate={approvalRate}
        onModeChange={handleModeChange}
      />

      {calendar ? (
        <CalendarGrid
          calendar={calendar}
          mode={mode}
          onApprove={handleApprove}
          onReject={handleReject}
          onEdit={handleEdit}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 text-base max-w-sm">
            Your calendar for this week is being generated. Check back Monday morning.
          </p>
        </div>
      )}
    </div>
  );
}

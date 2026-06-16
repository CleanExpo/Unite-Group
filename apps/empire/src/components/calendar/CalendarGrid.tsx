'use client';

import { useState } from 'react';
import { ContentCalendar, CalendarSlot } from '@/lib/calendar/types';
import PostCard from './PostCard';
import PostEditor from './PostEditor';

interface CalendarGridProps {
  calendar: ContentCalendar & {
    slots: Array<CalendarSlot & { db_id: string; status: 'draft' | 'approved' | 'rejected' }>;
  };
  mode: 'shadow' | 'live';
  onApprove: (slotId: string) => void;
  onReject: (slotId: string) => void;
  onEdit: (slotId: string, caption: string) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatWeekOf(weekStart: string): string {
  const date = new Date(weekStart);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getDayDate(weekStart: string, dayIndex: number): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayIndex);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

// Map day_of_week (0=Sun, 1=Mon ... 6=Sat) to Mon-Sun index (0=Mon ... 6=Sun)
function dayOfWeekToGridIndex(dow: number): number {
  // dow: 0=Sun → index 6, 1=Mon → 0, ..., 6=Sat → 5
  return dow === 0 ? 6 : dow - 1;
}

export default function CalendarGrid({ calendar, mode, onApprove, onReject, onEdit }: CalendarGridProps) {
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  // Build a 7-slot array indexed by Mon-Sun (0-6)
  const slotsByDay: (typeof calendar.slots[0] | null)[] = Array(7).fill(null);
  for (const slot of calendar.slots) {
    const idx = dayOfWeekToGridIndex(slot.day_of_week);
    if (idx >= 0 && idx < 7) {
      slotsByDay[idx] = slot;
    }
  }

  const approved = calendar.slots.filter((s) => s.status === 'approved').length;
  const rejected = calendar.slots.filter((s) => s.status === 'rejected').length;
  const draft = calendar.slots.filter((s) => s.status === 'draft').length;

  async function handleEditSave(slotId: string, newCaption: string) {
    onEdit(slotId, newCaption);
    setEditingSlotId(null);
  }

  return (
    <div className="space-y-4">
      {/* Week header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">
          Week of {formatWeekOf(calendar.week_start)}
        </h2>
        {/* Summary bar */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-600 font-medium">{approved} approved</span>
          <span className="text-red-500 font-medium">{rejected} rejected</span>
          <span className="text-gray-500 font-medium">{draft} draft</span>
        </div>
      </div>

      {/* Grid: 7 columns on md+, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {slotsByDay.map((slot, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            {/* Day header */}
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-600">{DAY_LABELS[idx]}</p>
              <p className="text-xs text-gray-400">{getDayDate(calendar.week_start, idx)}</p>
            </div>

            {slot ? (
              editingSlotId === slot.db_id ? (
                <PostEditor
                  slot={slot}
                  onSave={handleEditSave}
                  onCancel={() => setEditingSlotId(null)}
                />
              ) : (
                <PostCard
                  slot={slot}
                  mode={mode}
                  onApprove={onApprove}
                  onReject={onReject}
                  onEdit={(slotId) => setEditingSlotId(slotId)}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-24 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400">
                No post
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

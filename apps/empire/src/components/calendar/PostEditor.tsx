'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarSlot } from '@/lib/calendar/types';

interface PostEditorProps {
  slot: CalendarSlot & { db_id: string };
  onSave: (slotId: string, newCaption: string) => Promise<void>;
  onCancel: () => void;
}

const MAX_CHARS = 2200;

export default function PostEditor({ slot, onSave, onCancel }: PostEditorProps) {
  const [caption, setCaption] = useState(slot.captions[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_CHARS - caption.length;

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await onSave(slot.db_id, caption);
    } catch (err) {
      setError('Failed to save. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 p-4 border border-indigo-200 rounded-lg bg-white shadow-sm">
      <label className="block text-sm font-medium text-gray-700">Edit Caption</label>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={5}
        maxLength={MAX_CHARS}
        disabled={loading}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
      />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${remaining < 50 ? 'text-red-500' : 'text-gray-400'}`}>
          {remaining} characters remaining
        </span>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={loading || caption.trim().length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

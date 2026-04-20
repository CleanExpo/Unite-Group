'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarSlot } from '@/lib/calendar/types';

interface PostCardProps {
  slot: CalendarSlot & { db_id: string; status: 'draft' | 'approved' | 'rejected' };
  mode: 'shadow' | 'live';
  onApprove: (slotId: string) => void;
  onReject: (slotId: string) => void;
  onEdit: (slotId: string, caption: string) => void;
}

const platformIcon: Record<string, string> = {
  instagram: '📸',
  linkedin: '💼',
  twitter: '🐦',
  facebook: '👥',
  tiktok: '🎵',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

function formatScheduledAt(iso: string): string {
  const date = new Date(iso);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  const minuteStr = minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`;
  return `${dayName} ${day} ${month} · ${hours}${minuteStr}${ampm}`;
}

export default function PostCard({ slot, mode, onApprove, onReject, onEdit }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeVariant, setActiveVariant] = useState<0 | 1 | 2>(0);

  const activeCaption = slot.captions[activeVariant];
  const preview = activeCaption.length > 80 ? activeCaption.slice(0, 80) + '...' : activeCaption;

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-lg" title={slot.platform}>
            {platformIcon[slot.platform] ?? '📱'}
          </span>
          <span className="text-xs text-gray-500">{formatScheduledAt(slot.scheduled_at)}</span>
        </div>

        {/* Content type badge + status */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs capitalize">
            {slot.content_type.replace(/-/g, ' ')}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs capitalize ${statusColors[slot.status]}`}
          >
            {slot.status}
          </Badge>
          {mode === 'live' && (
            <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200" variant="outline">
              Auto-publish
            </Badge>
          )}
        </div>

        {/* Variant selector A/B/C */}
        <div className="flex gap-1">
          {(['A', 'B', 'C'] as const).map((label, idx) => (
            <button
              key={label}
              onClick={() => setActiveVariant(idx as 0 | 1 | 2)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                activeVariant === idx
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Caption preview / expanded */}
        <div className="text-sm text-gray-700 leading-relaxed">
          {expanded ? (
            <div className="space-y-2">
              {slot.captions.map((caption, idx) => (
                <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                  <span className="font-semibold text-gray-500 mr-1">
                    {['A', 'B', 'C'][idx]}:
                  </span>
                  {caption}
                </div>
              ))}
            </div>
          ) : (
            <p>{preview}</p>
          )}
        </div>

        {activeCaption.length > 80 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-indigo-600 hover:underline"
          >
            {expanded ? 'Show less' : 'Show all variants'}
          </button>
        )}

        {/* Hashtag count */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs text-gray-500">
            # {slot.hashtag_set.length} hashtags
          </Badge>
        </div>

        {/* Actions */}
        {mode === 'shadow' && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
              onClick={() => onApprove(slot.db_id)}
              disabled={slot.status === 'approved'}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-400 text-red-600 hover:bg-red-50 text-xs"
              onClick={() => onReject(slot.db_id)}
              disabled={slot.status === 'rejected'}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => onEdit(slot.db_id, activeCaption)}
            >
              Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

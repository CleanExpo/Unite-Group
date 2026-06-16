'use client';

/**
 * SYN-525: Notification Badge
 * Unread count dot for dashboard nav icon.
 * Polls /api/notifications on mount and every 60s.
 */

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  className?: string;
  iconClassName?: string;
}

export function NotificationBadge({ className, iconClassName }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silent fail
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={cn('relative inline-flex', className)}>
      <Bell className={cn('h-5 w-5', iconClassName)} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </span>
  );
}

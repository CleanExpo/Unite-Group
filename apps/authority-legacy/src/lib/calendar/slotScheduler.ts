/**
 * SYN-521: Slot Scheduler
 * Maps DigestSignals to 7 CalendarSlots for the upcoming week.
 */
import type { DigestSignals, CalendarSlot, ContentType, Platform } from './types';

export function scheduleSlots(
  signals: DigestSignals,
  weekStart: Date // always a Monday
): Omit<CalendarSlot, 'captions'>[] {
  const slots: Omit<CalendarSlot, 'captions'>[] = [];

  const contentTypes = signals.top_content_types.length > 0
    ? signals.top_content_types
    : ['educational', 'engagement', 'promotional'];

  // Pick best posting hour for each day (default 9am if no signal)
  const peakHours = signals.peak_engagement_hours.length > 0
    ? signals.peak_engagement_hours
    : [9, 12, 17];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const slotDate = new Date(weekStart);
    slotDate.setDate(weekStart.getDate() + dayOffset);

    // Pick hour: cycle through peak hours
    const hour = peakHours[dayOffset % peakHours.length];
    slotDate.setHours(hour, 0, 0, 0);

    const contentType = contentTypes[dayOffset % contentTypes.length] as ContentType;
    const hashtagSet = signals.winning_hashtag_clusters[dayOffset % Math.max(1, signals.winning_hashtag_clusters.length)] ?? [];

    slots.push({
      slot_id: `slot_${weekStart.toISOString().slice(0, 10)}_${dayOffset}`,
      day_of_week: slotDate.getDay(),
      scheduled_at: slotDate.toISOString(),
      platform: signals.best_platform,
      content_type: contentType,
      hashtag_set: hashtagSet,
      topic_hint: `${contentType} content for ${signals.best_platform}`,
      based_on_content_type: contentType,
    });
  }

  return slots;
}

export function getNextMonday(from: Date = new Date()): Date {
  const d = new Date(from);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

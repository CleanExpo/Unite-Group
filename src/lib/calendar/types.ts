/**
 * SYN-521: Weekly Content Calendar — Type Definitions
 */

export type CalendarStatus = 'draft' | 'approved' | 'published' | 'archived';
export type Platform = 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'tiktok';
export type ContentType = 'educational' | 'promotional' | 'engagement' | 'storytelling' | 'behind-the-scenes' | 'user-generated' | 'news';

export interface CalendarSlot {
  slot_id: string;
  day_of_week: number; // 0=Sun, 1=Mon, 6=Sat
  scheduled_at: string; // ISO datetime
  platform: Platform;
  content_type: ContentType;
  captions: [string, string, string]; // 3 variations
  hashtag_set: string[];
  topic_hint: string;
  based_on_content_type: string;
  /** Approval workflow status — populated when slot is fetched from the database */
  status?: 'draft' | 'approved' | 'rejected';
}

export interface ContentCalendar {
  calendar_id: string;
  client_id: string;
  week_start: string; // ISO date — always a Monday
  slots: CalendarSlot[];
  status: CalendarStatus;
  generation_cost_usd: number;
  created_at: string;
}

export interface DigestSignals {
  client_id: string;
  top_content_types: string[];
  peak_engagement_hours: number[];
  peak_days: number[]; // 0=Sun..6=Sat
  winning_hashtag_clusters: string[][];
  best_platform: Platform;
  avg_engagement_rate: number;
  digest_count: number;
}

export interface ClientContext {
  business_name: string;
  industry: string;
  brand_voice: string; // e.g. 'professional', 'friendly', 'authoritative'
}

export interface GenerateCalendarResult {
  calendar: ContentCalendar | null;
  skipped_reason?: 'cold_start' | 'error';
  cost_usd: number;
}

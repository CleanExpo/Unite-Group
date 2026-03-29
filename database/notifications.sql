-- SYN-525: First Win Notification System
-- Run this migration in Supabase SQL Editor

-- 1. Create client_notifications table
CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'first_win' | 'trial_ending' | 'brand_iq_unlocked' | 'general'
  payload JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Index for fast client lookup
CREATE INDEX IF NOT EXISTS idx_client_notifications_client_id ON client_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_unread ON client_notifications(client_id, read) WHERE read = false;

-- RLS: clients see only their own notifications
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON client_notifications FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can update own notifications (mark read)"
  ON client_notifications FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Service role can insert notifications"
  ON client_notifications FOR INSERT
  WITH CHECK (true); -- restricted to service role in app

-- 2. Add first_win_detected + conversion_copy_variant to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_win_detected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_win_detected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conversion_copy_variant TEXT NOT NULL DEFAULT 'control', -- 'win' | 'control'
  ADD COLUMN IF NOT EXISTS brand_iq_unlocked BOOLEAN NOT NULL DEFAULT false;

-- Comment for future developers
COMMENT ON COLUMN profiles.first_win_detected IS 'Set to true when detectFirstWin() fires for the first time. Triggers BrandIQ unlock and win-anchored trial conversion.';
COMMENT ON COLUMN profiles.conversion_copy_variant IS 'A/B test variant for trial-end conversion copy. win=anchored to first win result, control=original copy.';

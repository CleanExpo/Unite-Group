-- founder_notifications — in-app notification inbox (founder-scoped)
-- Ported from apps/empire client_notifications; adapted for founder_id scoping.

CREATE TABLE IF NOT EXISTS public.founder_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES auth.users(id),
  type       TEXT NOT NULL,
  payload    JSONB DEFAULT '{}',
  read       BOOLEAN DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.founder_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_all" ON public.founder_notifications
  FOR ALL USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());

CREATE POLICY "service_role_all" ON public.founder_notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX ON public.founder_notifications (founder_id, read, created_at DESC);

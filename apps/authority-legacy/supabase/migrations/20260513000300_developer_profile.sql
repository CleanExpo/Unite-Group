-- 20260513000300_developer_profile.sql
-- One row per human contractor or staff developer. Joins commits across
-- repos to a single person even when their git author email differs.

BEGIN;

-- citext extension if not present
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.developer_profile (
  id BIGSERIAL PRIMARY KEY,
  display_name TEXT NOT NULL,                  -- 'Rana Muzamil'
  primary_email CITEXT NOT NULL UNIQUE,        -- 'ranamuzamil1199@gmail.com'
  git_author_emails CITEXT[] NOT NULL DEFAULT '{}',  -- alternate emails
  github_login TEXT,                           -- 'rana-muzamil'
  linear_user_id TEXT REFERENCES public.integration_linear_teams(id) DEFERRABLE,
  onepassword_vault TEXT,                      -- e.g. 'Developers'
  role TEXT,                                   -- 'contract-engineer' | 'staff' | 'fractional'
  hourly_rate_aud NUMERIC(8,2),
  weekly_capacity_hours INT,
  country TEXT,                                -- ISO 3166 country code
  timezone TEXT,                               -- IANA, e.g. 'Asia/Karachi'
  hired_at DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_profile_active ON public.developer_profile(active) WHERE active = true;

-- Branch <-> Ticket map: derived from commit messages + branch names
CREATE TABLE IF NOT EXISTS public.developer_branch_map (
  repo TEXT NOT NULL,                          -- 'CleanExpo/RestoreAssist'
  branch TEXT NOT NULL,
  linear_issue_id TEXT REFERENCES public.integration_linear_issues(id) ON DELETE SET NULL,
  developer_email CITEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (repo, branch)
);

CREATE INDEX IF NOT EXISTS idx_branch_map_developer ON public.developer_branch_map(developer_email);

-- RLS
ALTER TABLE public.developer_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_branch_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_read ON public.developer_profile;
CREATE POLICY admin_read ON public.developer_profile FOR SELECT TO authenticated USING (
  (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin'
);
DROP POLICY IF EXISTS admin_write ON public.developer_profile;
CREATE POLICY admin_write ON public.developer_profile FOR ALL TO authenticated
  USING ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin');

DROP POLICY IF EXISTS admin_all ON public.developer_branch_map;
CREATE POLICY admin_all ON public.developer_branch_map FOR ALL TO authenticated
  USING ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin');

-- Standard Supabase role grants (mirrors prod-default privileges so seeds + API
-- access work after a sandbox wipe-and-mirror that strips role-level grants).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_profile TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_profile TO authenticated;
GRANT SELECT ON public.developer_profile TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.developer_profile_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.developer_profile_id_seq TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_branch_map TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_branch_map TO authenticated;
GRANT SELECT ON public.developer_branch_map TO anon;

COMMIT;

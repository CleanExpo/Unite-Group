-- Migration: auth_signup_allowlist
-- Two-layer signup defence for the private founder CRM:
--   1. before_user_created_hook  — blocks account creation for non-allowlisted emails
--   2. custom_access_token_hook  — denies JWT issuance if account somehow exists
-- Both hooks are registered in Supabase Auth via the Management API.
-- The allowlist table controls which emails are permitted.

-- ── Allowlist table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_allowlist (
  email TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.auth_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.auth_allowlist
  FOR ALL USING (auth.role() = 'service_role');

-- Phill's authorised emails
INSERT INTO public.auth_allowlist (email) VALUES
  ('phill.mcgurk@gmail.com'),
  ('contact@unite-group.in'),
  ('support@synthex.social')
ON CONFLICT DO NOTHING;

-- ── Hook 1: block account creation ──────────────────────────────────────────
-- Registered: hook_before_user_created_enabled=true
-- URI: pg-functions://postgres/public/before_user_created_hook
CREATE OR REPLACE FUNCTION public.before_user_created_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
BEGIN
  _email := lower(trim(coalesce(event->'user'->>'email', '')));
  IF _email = '' OR NOT EXISTS (
    SELECT 1 FROM public.auth_allowlist WHERE email = _email
  ) THEN
    RAISE EXCEPTION 'This application is private. Email % is not authorised.', _email;
  END IF;
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) FROM PUBLIC;

-- ── Hook 2: deny JWT if account exists but is not on allowlist ───────────────
-- Registered: hook_custom_access_token_enabled=true
-- URI: pg-functions://postgres/public/custom_access_token_hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_email TEXT;
BEGIN
  SELECT email INTO _user_email
  FROM auth.users
  WHERE id = (event->>'user_id')::uuid;

  _user_email := lower(trim(coalesce(_user_email, '')));

  IF _user_email = '' OR NOT EXISTS (
    SELECT 1 FROM public.auth_allowlist WHERE email = _user_email
  ) THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'This application is private. Access denied.'
      )
    );
  END IF;

  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC;

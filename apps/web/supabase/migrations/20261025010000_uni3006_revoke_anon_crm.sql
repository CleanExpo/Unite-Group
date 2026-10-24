-- UNI-3006: revoke the anon role's access to the CRM contact tables.
--
-- Why: in production the anon role holds ALL privileges on crm_leads,
-- contacts and crm_contacts. No migration grants this; it comes from the
-- platform's default privileges. RLS currently hides the rows, but one policy
-- mistake would expose them to a logged-out visitor. A code audit (25/10/2026)
-- found no code path that uses anon on these tables: public forms write with
-- the service-role key and every other path runs as an authenticated user or
-- service_role. The authenticated role also loses TRUNCATE, REFERENCES and
-- TRIGGER (TRUNCATE ignores RLS). service_role is not touched.
--
-- Safe whichever way contacts exists: production has it as an ordinary TABLE,
-- the repo migration 20260630000000_crm_unify_contacts_view makes it a VIEW.
-- Every statement is guarded with to_regclass, so a missing object is skipped,
-- and re-running changes nothing. Revoking a privilege that is not held is a
-- no-op, so TRUNCATE / TRIGGER on a view is harmless.
--
-- APPLY ONLY WITH FOUNDER APPROVAL. Not applied to any database by this commit.
--
-- Rollback (restores the previous platform default grants; run only the lines
-- for objects that exist):
--   GRANT ALL ON public.crm_leads TO anon;
--   GRANT ALL ON public.crm_contacts TO anon;
--   GRANT ALL ON public.contacts TO anon;
--   GRANT ALL ON public.contacts_legacy_deprecated TO anon;
--   GRANT TRUNCATE, REFERENCES, TRIGGER ON public.crm_leads TO authenticated;
--   GRANT TRUNCATE, REFERENCES, TRIGGER ON public.crm_contacts TO authenticated;
--   GRANT TRUNCATE, REFERENCES, TRIGGER ON public.contacts TO authenticated;

DO $uni3006$
DECLARE
  rel text;
BEGIN
  FOREACH rel IN ARRAY ARRAY['crm_leads', 'crm_contacts', 'contacts']
  LOOP
    IF to_regclass('public.' || rel) IS NULL THEN
      RAISE NOTICE 'UNI-3006: public.% not found, skipped', rel;
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', rel);
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM authenticated', rel);
  END LOOP;

  IF to_regclass('public.contacts_legacy_deprecated') IS NOT NULL THEN
    REVOKE ALL ON public.contacts_legacy_deprecated FROM anon;
  ELSE
    RAISE NOTICE 'UNI-3006: public.contacts_legacy_deprecated not found, skipped';
  END IF;
END
$uni3006$;

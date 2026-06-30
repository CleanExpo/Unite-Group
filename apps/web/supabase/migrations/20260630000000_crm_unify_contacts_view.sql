-- P2 — CRM duplicate-model unification (Board mandate 2026-06-30).
-- Canonical = crm_contacts (1887 real rows, populated by the import-contacts cron).
-- The app reads the legacy `contacts` table (1 row) across ~15 routes, so those
-- 1887 contacts were invisible to the UI. This unifies onto crm_contacts WITHOUT
-- rewriting the routes: add the app-specific columns to crm_contacts, then expose
-- a `contacts` VIEW (security_invoker, auto-updatable) that aliases the renamed
-- CRM fields. Reversible. Founder promotes from the branch after diff review.
--
-- Pre-verified on prod (read-only): no FK references or dependent views on
-- `contacts` (safe to retire); crm_contacts CHECK constraints inspected.

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Add the app-specific columns crm_contacts lacks (idempotent, types match
--    the legacy contacts table). Renamed equivalents (email/phone/company/role/
--    business_id) are NOT duplicated — the view aliases them instead.
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS industry            varchar,
  ADD COLUMN IF NOT EXISTS buying_intent       varchar,
  ADD COLUMN IF NOT EXISTS decision_stage      varchar,
  ADD COLUMN IF NOT EXISTS role_type           varchar,
  ADD COLUMN IF NOT EXISTS engagement_velocity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sentiment_score     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_signals        text[]  DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS opportunity_signals text[]  DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ai_analysis         jsonb   DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_analysis_at    timestamp,
  ADD COLUMN IF NOT EXISTS primary_email_id    uuid,
  ADD COLUMN IF NOT EXISTS custom_fields       jsonb   DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_contacted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS created_by          uuid,
  ADD COLUMN IF NOT EXISTS email_count         integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tenant_id           uuid,
  ADD COLUMN IF NOT EXISTS obsidian_note_path  text,
  ADD COLUMN IF NOT EXISTS obsidian_synced_at  timestamptz,
  ADD COLUMN IF NOT EXISTS embedding           vector,
  ADD COLUMN IF NOT EXISTS tags                text[]  DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS metadata            jsonb   NOT NULL DEFAULT '{}'::jsonb;

-- 2. Reconcile the status vocabulary: the app writes 'contact'/'lead'/'prospect'/
--    'churned'; crm_contacts allowed only its own set. Union both during the
--    transition (reversible — only loosens the constraint).
ALTER TABLE public.crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_status_check;
ALTER TABLE public.crm_contacts ADD CONSTRAINT crm_contacts_status_check
  CHECK (status = ANY (ARRAY[
    'active','lead_only','client_contact','nurture','do_not_contact','archived','blocked_review',
    'contact','lead','prospect','churned','customer'
  ]));

-- 3. crm_contacts.display_name is NOT NULL with no default; app inserts via the
--    view won't supply it. Fill it from names / email so view-inserts succeed
--    and the minimum-identity check holds.
CREATE OR REPLACE FUNCTION public.crm_contacts_fill_display_name()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.display_name IS NULL OR btrim(NEW.display_name) = '' THEN
    NEW.display_name := NULLIF(btrim(concat_ws(' ', NEW.first_name, NEW.last_name)), '');
    IF NEW.display_name IS NULL THEN
      NEW.display_name := COALESCE(NULLIF(btrim(NEW.primary_email), ''), 'Unknown');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_crm_contacts_fill_display_name ON public.crm_contacts;
CREATE TRIGGER trg_crm_contacts_fill_display_name
  BEFORE INSERT OR UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_contacts_fill_display_name();

-- 4. Carry the legacy contacts rows into crm_contacts (idempotent by email).
--    status omitted -> crm default; legacy values still allowed by the union above.
INSERT INTO public.crm_contacts
  (founder_id, first_name, last_name, primary_email, primary_phone, company_name,
   role_title, linked_business_id, source, industry, buying_intent, decision_stage,
   role_type, engagement_velocity, sentiment_score, risk_signals, opportunity_signals,
   ai_analysis, last_analysis_at, primary_email_id, custom_fields, last_contacted_at,
   created_by, email_count, tenant_id, obsidian_note_path, obsidian_synced_at,
   embedding, tags, metadata)
SELECT c.founder_id, c.first_name, c.last_name, c.email, c.phone, c.company,
   c.role, c.business_id, COALESCE(c.source,'legacy_contacts'), c.industry, c.buying_intent,
   c.decision_stage, c.role_type, c.engagement_velocity, c.sentiment_score, c.risk_signals,
   c.opportunity_signals, c.ai_analysis, c.last_analysis_at, c.primary_email_id, c.custom_fields,
   c.last_contacted_at, c.created_by, c.email_count, c.tenant_id, c.obsidian_note_path,
   c.obsidian_synced_at, c.embedding, c.tags, c.metadata
FROM public.contacts c
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_contacts k
  WHERE (k.primary_email IS NOT DISTINCT FROM c.email AND c.email IS NOT NULL)
);

-- 5. Retire the legacy table (no FK/view deps — verified). Keep it renamed for
--    rollback rather than dropping.
ALTER TABLE public.contacts RENAME TO contacts_legacy_deprecated;

-- 6. Expose crm_contacts in the legacy `contacts` shape. security_invoker=true so
--    crm_contacts' RLS (founder_id scoping) is enforced through the view.
CREATE VIEW public.contacts
  WITH (security_invoker = true) AS
SELECT
  id, founder_id, first_name, last_name, source, status, created_at, updated_at,
  primary_email      AS email,
  primary_phone      AS phone,
  company_name       AS company,
  role_title         AS role,
  linked_business_id AS business_id,
  industry, buying_intent, decision_stage, role_type, engagement_velocity,
  sentiment_score, risk_signals, opportunity_signals, ai_analysis, last_analysis_at,
  primary_email_id, custom_fields, last_contacted_at, created_by, email_count,
  tenant_id, obsidian_note_path, obsidian_synced_at, embedding, tags, metadata
FROM public.crm_contacts;

COMMENT ON VIEW public.contacts IS
  'Compatibility view over crm_contacts (P2 unification 2026-06-30). Aliases renamed CRM fields so legacy app routes read/write the canonical 1887-row table. Migrate routes to crm_contacts directly, then drop this view.';

COMMIT;

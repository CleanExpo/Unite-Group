-- FOUNDER-GATED: validate this migration on a Supabase database branch first.
-- This file does not authorise production application or producer enrollment.
-- Signature verification belongs to the trusted server adapter. Admission binds
-- the exact registrations it verified while serialising against revocation.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cc_idea_evidence_sources (
  source_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  registration jsonb NOT NULL CHECK (jsonb_typeof(registration) = 'object'),
  canonical_registration text NOT NULL,
  registration_hash text NOT NULL CHECK (registration_hash ~ '^[a-f0-9]{64}$'),
  enrolled_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  revocation_reason text,
  PRIMARY KEY (source_id, version),
  CHECK ((revoked_at IS NULL) = (revocation_reason IS NULL))
);

CREATE TABLE IF NOT EXISTS public.cc_idea_evidence_grants (
  grant_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  source_id text NOT NULL,
  source_version integer NOT NULL,
  founder_id uuid NOT NULL REFERENCES auth.users(id),
  task_id uuid NOT NULL REFERENCES public.cc_tasks(id),
  registration jsonb NOT NULL CHECK (jsonb_typeof(registration) = 'object'),
  canonical_registration text NOT NULL,
  registration_hash text NOT NULL CHECK (registration_hash ~ '^[a-f0-9]{64}$'),
  enrolled_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  revocation_reason text,
  PRIMARY KEY (grant_id, version),
  FOREIGN KEY (source_id, source_version)
    REFERENCES public.cc_idea_evidence_sources(source_id, version),
  CHECK ((revoked_at IS NULL) = (revocation_reason IS NULL))
);

CREATE TABLE IF NOT EXISTS public.cc_idea_evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  source_version integer NOT NULL,
  event_id text NOT NULL,
  grant_id text NOT NULL,
  grant_version integer NOT NULL,
  founder_id uuid NOT NULL REFERENCES auth.users(id),
  task_id uuid NOT NULL REFERENCES public.cc_tasks(id),
  record_kind text NOT NULL DEFAULT 'evidence' CHECK (record_kind IN ('evidence', 'withdrawal')),
  withdrawal_of uuid REFERENCES public.cc_idea_evidence_events(id),
  envelope jsonb NOT NULL CHECK (jsonb_typeof(envelope) = 'object'),
  canonical_envelope text NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  signature text,
  occurred_at timestamptz NOT NULL,
  admitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (source_id, event_id),
  FOREIGN KEY (source_id, source_version)
    REFERENCES public.cc_idea_evidence_sources(source_id, version),
  FOREIGN KEY (grant_id, grant_version)
    REFERENCES public.cc_idea_evidence_grants(grant_id, version),
  CHECK ((record_kind = 'withdrawal') = (withdrawal_of IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS cc_idea_evidence_events_owner_task
  ON public.cc_idea_evidence_events(founder_id, task_id, admitted_at);
CREATE INDEX IF NOT EXISTS cc_idea_evidence_events_withdrawal
  ON public.cc_idea_evidence_events(withdrawal_of) WHERE withdrawal_of IS NOT NULL;

ALTER TABLE public.cc_idea_evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_idea_evidence_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_idea_evidence_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_idea_evidence_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_idea_evidence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_idea_evidence_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cc_idea_evidence_grants_owner_select ON public.cc_idea_evidence_grants;
CREATE POLICY cc_idea_evidence_grants_owner_select ON public.cc_idea_evidence_grants
  FOR SELECT TO authenticated USING (founder_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS cc_idea_evidence_events_owner_select ON public.cc_idea_evidence_events;
CREATE POLICY cc_idea_evidence_events_owner_select ON public.cc_idea_evidence_events
  FOR SELECT TO authenticated USING (founder_id = (SELECT auth.uid()));
REVOKE ALL ON public.cc_idea_evidence_sources, public.cc_idea_evidence_grants,
  public.cc_idea_evidence_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.cc_idea_evidence_grants, public.cc_idea_evidence_events TO authenticated;
GRANT SELECT ON public.cc_idea_evidence_sources, public.cc_idea_evidence_grants,
  public.cc_idea_evidence_events TO service_role;

-- Exact UTF-8 bytes are part of the signature contract. JSON equality prevents
-- a verified byte string and a different stored JSON document being combined.
CREATE OR REPLACE FUNCTION public.cc_idea_evidence_document_hash_v1(p_document jsonb, p_canonical text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
BEGIN
  IF p_document IS NULL OR p_canonical IS NULL OR octet_length(p_canonical) > 1048576
     OR p_canonical::jsonb IS DISTINCT FROM p_document THEN
    RAISE EXCEPTION 'Evidence canonical document mismatch' USING ERRCODE = '22023';
  END IF;
  RETURN encode(sha256(convert_to(p_canonical, 'UTF8')), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.cc_idea_evidence_enroll_source_v1(p_registration jsonb, p_canonical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_hash text := public.cc_idea_evidence_document_hash_v1(p_registration, p_canonical);
  v_row public.cc_idea_evidence_sources%ROWTYPE;
  v_key text;
BEGIN
  IF jsonb_typeof(p_registration) IS DISTINCT FROM 'object'
     OR COALESCE(p_registration->>'source_id', '') !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$'
     OR COALESCE(p_registration->>'version', '') !~ '^[1-9][0-9]{0,8}$'
     OR COALESCE(p_registration->>'kind', '') NOT IN ('builtin_factory', 'ed25519')
     OR COALESCE(p_registration->>'event_kind', '') NOT IN
       ('reviewed_handoff_persisted', 'independent_review_verified', 'production_journey_verified', 'customer_value_achieved') THEN
    RAISE EXCEPTION 'Invalid evidence source registration' USING ERRCODE = '22023';
  END IF;
  FOREACH v_key IN ARRAY ARRAY['adapter_version','repository','product_id','environment'] LOOP
    IF jsonb_typeof(p_registration->v_key) IS DISTINCT FROM 'string'
       OR length(p_registration->>v_key) NOT BETWEEN 1 AND 300 THEN
      RAISE EXCEPTION 'Missing source scope: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF p_registration->>'adapter_version' IS DISTINCT FROM (CASE p_registration->>'event_kind'
      WHEN 'reviewed_handoff_persisted' THEN 'factory_handoff_v1'
      WHEN 'independent_review_verified' THEN 'nexus_release_gate_v1'
      WHEN 'production_journey_verified' THEN 'canonical_factory_journey_v1'
      WHEN 'customer_value_achieved' THEN 'product_value_action_v1' END)
     OR (p_registration->>'kind' = 'ed25519' AND p_registration->>'event_kind' = 'reviewed_handoff_persisted')
     OR (p_registration->>'kind' = 'builtin_factory' AND
      (p_registration->>'event_kind' <> 'reviewed_handoff_persisted' OR p_registration->'public_key' IS DISTINCT FROM 'null'::jsonb))
     OR (p_registration->>'kind' = 'ed25519' AND
      (jsonb_typeof(p_registration->'public_key') IS DISTINCT FROM 'string' OR length(p_registration->>'public_key') < 32)) THEN
    RAISE EXCEPTION 'Source mechanism does not match its evidence kind' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.cc_idea_evidence_sources(source_id, version, registration, canonical_registration, registration_hash)
  VALUES (p_registration->>'source_id', (p_registration->>'version')::integer, p_registration, p_canonical, v_hash)
  ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT v_row FROM public.cc_idea_evidence_sources
    WHERE source_id = p_registration->>'source_id' AND version = (p_registration->>'version')::integer FOR UPDATE;
  IF v_row.canonical_registration IS DISTINCT FROM p_canonical OR v_row.registration IS DISTINCT FROM p_registration THEN
    RAISE EXCEPTION 'Source version is immutable' USING ERRCODE = '23505';
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.cc_idea_evidence_enroll_grant_v1(p_registration jsonb, p_canonical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_hash text := public.cc_idea_evidence_document_hash_v1(p_registration, p_canonical);
  v_source public.cc_idea_evidence_sources%ROWTYPE;
  v_row public.cc_idea_evidence_grants%ROWTYPE;
  v_task public.cc_tasks%ROWTYPE;
  v_key text;
  v_now timestamptz;
BEGIN
  SELECT * INTO STRICT v_source FROM public.cc_idea_evidence_sources
    WHERE source_id = p_registration->>'source_id' AND version = (p_registration->>'source_version')::integer FOR UPDATE;
  -- All authority mutations take source -> grant -> task locks, in that order.
  SELECT * INTO v_row FROM public.cc_idea_evidence_grants
    WHERE grant_id = p_registration->>'grant_id' AND version = (p_registration->>'version')::integer FOR UPDATE;
  IF FOUND THEN
    IF v_row.canonical_registration IS DISTINCT FROM p_canonical OR v_row.registration IS DISTINCT FROM p_registration THEN
      RAISE EXCEPTION 'Grant version is immutable' USING ERRCODE = '23505';
    END IF;
    RETURN to_jsonb(v_row);
  END IF;
  v_now := clock_timestamp();
  IF v_source.revoked_at IS NOT NULL OR jsonb_typeof(p_registration) IS DISTINCT FROM 'object'
     OR COALESCE(p_registration->>'grant_id', '') !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$'
     OR COALESCE(p_registration->>'version', '') !~ '^[1-9][0-9]{0,8}$'
     OR COALESCE(p_registration->>'lifecycle_revision', '') !~ '^[1-9][0-9]{0,8}$'
     OR COALESCE(p_registration->>'brief_hash', '') !~ '^[a-f0-9]{64}$'
     OR COALESCE(p_registration->>'contract_hash', '') !~ '^[a-f0-9]{64}$'
     OR (p_registration->>'valid_from')::timestamptz >= (p_registration->>'valid_until')::timestamptz
     OR (p_registration->>'valid_until')::timestamptz <= v_now
     OR NOT (p_registration ?& ARRAY['valid_from','valid_until','outcome_hash','outcome_canonical'])
     OR jsonb_typeof(p_registration->'valid_from') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_registration->'valid_until') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_registration->'outcome_canonical') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'Invalid or revoked evidence grant' USING ERRCODE = '22023';
  END IF;
  FOREACH v_key IN ARRAY ARRAY['repository','product_id','environment'] LOOP
    IF p_registration->v_key IS DISTINCT FROM v_source.registration->v_key THEN
      RAISE EXCEPTION 'Grant exceeds source scope: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;
  FOREACH v_key IN ARRAY ARRAY['release_id','event_name'] LOOP
    IF jsonb_typeof(p_registration->v_key) IS DISTINCT FROM 'string' OR length(p_registration->>v_key) NOT BETWEEN 1 AND 300 THEN
      RAISE EXCEPTION 'Missing grant scope: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF jsonb_typeof(p_registration->'subject') IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_registration#>'{subject,namespace}') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_registration#>'{subject,id}') IS DISTINCT FROM 'string'
     OR length(p_registration#>>'{subject,namespace}') NOT BETWEEN 1 AND 200
     OR length(p_registration#>>'{subject,id}') NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Missing grant subject identity' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO STRICT v_task FROM public.cc_tasks WHERE id = (p_registration->>'task_id')::uuid FOR UPDATE;
  IF v_task.founder_id IS DISTINCT FROM (p_registration->>'founder_id')::uuid
     OR v_task.metadata#>>'{lifecycle,revision}' IS DISTINCT FROM p_registration->>'lifecycle_revision'
     OR v_task.metadata#>>'{lifecycle,brief,hash}' IS DISTINCT FROM p_registration->>'brief_hash'
     OR COALESCE(v_task.metadata#>'{lifecycle,outcome}', 'null'::jsonb) IS DISTINCT FROM (p_registration->>'outcome_canonical')::jsonb THEN
    RAISE EXCEPTION 'Grant does not match current owned brief' USING ERRCODE = '40001';
  END IF;
  IF (p_registration->>'outcome_canonical')::jsonb = 'null'::jsonb THEN
    IF p_registration->'outcome_hash' IS DISTINCT FROM 'null'::jsonb THEN
      RAISE EXCEPTION 'Null outcome requires null hash' USING ERRCODE = '22023';
    END IF;
  ELSIF public.cc_idea_evidence_document_hash_v1((p_registration->>'outcome_canonical')::jsonb, p_registration->>'outcome_canonical')
       IS DISTINCT FROM p_registration->>'outcome_hash' THEN
    RAISE EXCEPTION 'Outcome hash mismatch' USING ERRCODE = '22023';
  END IF;
  IF p_registration ? 'stripe_binding' AND p_registration->'stripe_binding' <> 'null'::jsonb THEN
    FOREACH v_key IN ARRAY ARRAY['account_id','customer_id','product_id','verified_at','association_ref','association_digest'] LOOP
      IF jsonb_typeof(p_registration#>ARRAY['stripe_binding',v_key]) IS DISTINCT FROM 'string'
         OR length(p_registration#>>ARRAY['stripe_binding',v_key]) = 0 THEN
        RAISE EXCEPTION 'Incomplete verified Stripe association: %', v_key USING ERRCODE = '22023';
      END IF;
    END LOOP;
    IF p_registration#>>'{stripe_binding,association_digest}' !~ '^[a-f0-9]{64}$'
       OR p_registration#>>'{subject,namespace}' IS DISTINCT FROM 'stripe_customer'
       OR p_registration#>>'{stripe_binding,customer_id}' IS DISTINCT FROM p_registration#>>'{subject,id}'
       OR p_registration#>>'{stripe_binding,product_id}' IS DISTINCT FROM p_registration->>'product_id'
       OR (p_registration#>>'{stripe_binding,verified_at}')::timestamptz > v_now + interval '5 minutes' THEN
      RAISE EXCEPTION 'Invalid verified Stripe association' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF v_source.registration->>'event_kind' = 'customer_value_achieved' AND
     (p_registration->'stripe_binding' IS NULL OR p_registration->'stripe_binding' = 'null'::jsonb
      OR COALESCE(v_task.metadata#>'{lifecycle,outcome}', 'null'::jsonb) = 'null'::jsonb
      OR p_registration#>>'{stripe_binding,account_id}' IS DISTINCT FROM v_task.metadata#>>'{lifecycle,outcome,stripeAccountId}'
      OR p_registration#>>'{stripe_binding,product_id}' IS DISTINCT FROM v_task.metadata#>>'{lifecycle,outcome,productId}'
      OR p_registration->>'event_name' IS DISTINCT FROM v_task.metadata#>>'{lifecycle,outcome,activationEvent}') THEN
    RAISE EXCEPTION 'Customer value requires a verified association for the current commercial contract' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.cc_idea_evidence_grants(grant_id, version, source_id, source_version, founder_id, task_id,
    registration, canonical_registration, registration_hash)
  VALUES (p_registration->>'grant_id', (p_registration->>'version')::integer, v_source.source_id, v_source.version,
    v_task.founder_id, v_task.id, p_registration, p_canonical, v_hash) RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.cc_idea_evidence_revoke_source_v1(p_source_id text, p_source_version integer, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_row public.cc_idea_evidence_sources%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'A revocation reason is required'; END IF;
  SELECT * INTO STRICT v_row FROM public.cc_idea_evidence_sources WHERE source_id = p_source_id AND version = p_source_version FOR UPDATE;
  IF v_row.revoked_at IS NULL THEN
    UPDATE public.cc_idea_evidence_sources SET revoked_at = clock_timestamp(), revocation_reason = p_reason
      WHERE source_id = p_source_id AND version = p_source_version RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.cc_idea_evidence_revoke_grant_v1(p_grant_id text, p_grant_version integer, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_row public.cc_idea_evidence_grants%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'A revocation reason is required'; END IF;
  SELECT * INTO STRICT v_row FROM public.cc_idea_evidence_grants WHERE grant_id = p_grant_id AND version = p_grant_version;
  PERFORM 1 FROM public.cc_idea_evidence_sources WHERE source_id = v_row.source_id AND version = v_row.source_version FOR UPDATE;
  SELECT * INTO STRICT v_row FROM public.cc_idea_evidence_grants WHERE grant_id = p_grant_id AND version = p_grant_version FOR UPDATE;
  IF v_row.revoked_at IS NULL THEN
    UPDATE public.cc_idea_evidence_grants SET revoked_at = clock_timestamp(), revocation_reason = p_reason
      WHERE grant_id = p_grant_id AND version = p_grant_version RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

-- Private common admission transaction. Public service RPCs choose mechanism;
-- callers cannot select builtin_factory through the external ingestion RPC.
CREATE OR REPLACE FUNCTION public.cc_idea_evidence_admit_locked_v1(
  p_envelope jsonb, p_canonical text, p_signature text, p_verified_source_hash text,
  p_verified_grant_hash text, p_mechanism text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_hash text := public.cc_idea_evidence_document_hash_v1(p_envelope, p_canonical);
  v_source public.cc_idea_evidence_sources%ROWTYPE;
  v_grant public.cc_idea_evidence_grants%ROWTYPE;
  v_event public.cc_idea_evidence_events%ROWTYPE;
  v_task public.cc_tasks%ROWTYPE;
  v_key text;
  v_now timestamptz;
  v_occurred timestamptz;
BEGIN
  SELECT * INTO STRICT v_source FROM public.cc_idea_evidence_sources
    WHERE source_id = p_envelope->>'source_id' AND version = (p_envelope->>'source_version')::integer FOR UPDATE;
  SELECT * INTO STRICT v_grant FROM public.cc_idea_evidence_grants
    WHERE grant_id = p_envelope->>'grant_id' AND version = (p_envelope->>'grant_version')::integer FOR UPDATE;
  IF v_source.registration_hash IS DISTINCT FROM p_verified_source_hash
     OR v_grant.registration_hash IS DISTINCT FROM p_verified_grant_hash
     OR v_grant.source_id IS DISTINCT FROM v_source.source_id OR v_grant.source_version IS DISTINCT FROM v_source.version
     OR v_source.registration->>'kind' IS DISTINCT FROM p_mechanism
     OR (p_mechanism = 'ed25519' AND (p_signature IS NULL OR length(p_signature) = 0))
     OR (p_mechanism = 'builtin_factory' AND p_signature IS NOT NULL) THEN
    RAISE EXCEPTION 'Verified authority binding mismatch' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_event FROM public.cc_idea_evidence_events
    WHERE source_id = v_source.source_id AND event_id = p_envelope->>'event_id';
  IF FOUND THEN
    IF v_event.record_kind <> 'evidence' OR v_event.canonical_envelope IS DISTINCT FROM p_canonical
       OR v_event.envelope IS DISTINCT FROM p_envelope OR v_event.signature IS DISTINCT FROM p_signature THEN
      RAISE EXCEPTION 'Conflicting evidence identity reuse' USING ERRCODE = '23505';
    END IF;
    RETURN to_jsonb(v_event); -- Historical retry never refreshes time or authority.
  END IF;
  v_now := clock_timestamp();
  v_occurred := (p_envelope->>'occurred_at')::timestamptz;
  IF v_source.revoked_at IS NOT NULL OR v_grant.revoked_at IS NOT NULL
     OR v_now < (v_grant.registration->>'valid_from')::timestamptz
     OR v_now >= (v_grant.registration->>'valid_until')::timestamptz
     OR v_occurred IS NULL OR v_occurred < (v_grant.registration->>'valid_from')::timestamptz
     OR v_occurred >= (v_grant.registration->>'valid_until')::timestamptz
     OR v_occurred > v_now + interval '5 minutes'
     OR v_occurred < v_now - interval '24 hours'
     OR COALESCE(p_envelope->>'event_id', '') !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$'
     OR jsonb_typeof(p_envelope->'payload') IS DISTINCT FROM 'object'
     OR p_envelope->>'event_kind' IS DISTINCT FROM v_source.registration->>'event_kind' THEN
    RAISE EXCEPTION 'Evidence is outside active admission authority' USING ERRCODE = '22023';
  END IF;
  FOREACH v_key IN ARRAY ARRAY['founder_id','task_id','lifecycle_revision','brief_hash','outcome_hash',
      'repository','product_id','release_id','environment','subject','event_name','contract_hash'] LOOP
    IF p_envelope->v_key IS DISTINCT FROM v_grant.registration->v_key THEN
      RAISE EXCEPTION 'Evidence grant context mismatch: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;
  SELECT * INTO STRICT v_task FROM public.cc_tasks WHERE id = v_grant.task_id FOR UPDATE;
  IF v_task.founder_id IS DISTINCT FROM v_grant.founder_id
     OR v_task.metadata#>>'{lifecycle,revision}' IS DISTINCT FROM v_grant.registration->>'lifecycle_revision'
     OR v_task.metadata#>>'{lifecycle,brief,hash}' IS DISTINCT FROM v_grant.registration->>'brief_hash'
     OR COALESCE(v_task.metadata#>'{lifecycle,outcome}', 'null'::jsonb) IS DISTINCT FROM (v_grant.registration->>'outcome_canonical')::jsonb THEN
    RAISE EXCEPTION 'Evidence no longer matches current owned brief' USING ERRCODE = '40001';
  END IF;
  INSERT INTO public.cc_idea_evidence_events(source_id, source_version, event_id, grant_id, grant_version,
    founder_id, task_id, envelope, canonical_envelope, payload_hash, signature, occurred_at, admitted_at)
  VALUES (v_source.source_id, v_source.version, p_envelope->>'event_id', v_grant.grant_id, v_grant.version,
    v_grant.founder_id, v_grant.task_id, p_envelope, p_canonical, v_hash, p_signature, v_occurred, v_now)
  RETURNING * INTO v_event;
  RETURN to_jsonb(v_event);
END;
$$;

CREATE OR REPLACE FUNCTION public.cc_idea_evidence_admit_v1(
  p_envelope jsonb, p_canonical text, p_signature text, p_verified_source_hash text, p_verified_grant_hash text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT public.cc_idea_evidence_admit_locked_v1(p_envelope, p_canonical, p_signature,
    p_verified_source_hash, p_verified_grant_hash, 'ed25519');
$$;

CREATE OR REPLACE FUNCTION public.cc_idea_evidence_persist_handoff_v1(
  p_envelope jsonb, p_canonical text, p_verified_source_hash text, p_verified_grant_hash text,
  p_expected_metadata jsonb, p_expected_updated_at timestamptz, p_expected_revision integer, p_next_lifecycle jsonb,
  p_handoff_canonical text, p_next_metadata_canonical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_task public.cc_tasks%ROWTYPE;
  v_source public.cc_idea_evidence_sources%ROWTYPE;
  v_grant public.cc_idea_evidence_grants%ROWTYPE;
  v_previous public.cc_idea_evidence_events%ROWTYPE;
  v_old jsonb;
  v_handoff jsonb := p_next_lifecycle->'handoff';
  v_last jsonb := p_next_lifecycle->'history'->-1;
  v_event jsonb;
  v_outputs integer;
BEGIN
  SELECT * INTO STRICT v_source FROM public.cc_idea_evidence_sources
    WHERE source_id = p_envelope->>'source_id' AND version = (p_envelope->>'source_version')::integer FOR UPDATE;
  SELECT * INTO STRICT v_grant FROM public.cc_idea_evidence_grants
    WHERE grant_id = p_envelope->>'grant_id' AND version = (p_envelope->>'grant_version')::integer FOR UPDATE;
  -- Identical retries return the original event even after task revision/revoke.
  SELECT * INTO v_previous FROM public.cc_idea_evidence_events
    WHERE source_id = v_source.source_id AND event_id = p_envelope->>'event_id';
  IF FOUND THEN
    v_event := public.cc_idea_evidence_admit_locked_v1(p_envelope, p_canonical, NULL,
      p_verified_source_hash, p_verified_grant_hash, 'builtin_factory');
    SELECT * INTO STRICT v_task FROM public.cc_tasks WHERE id = v_grant.task_id;
    RETURN jsonb_build_object('event', v_event, 'task', to_jsonb(v_task));
  END IF;
  SELECT * INTO STRICT v_task FROM public.cc_tasks WHERE id = v_grant.task_id FOR UPDATE;
  v_old := v_task.metadata->'lifecycle';
  IF v_task.founder_id IS DISTINCT FROM v_grant.founder_id
     OR v_task.metadata IS DISTINCT FROM p_expected_metadata
     OR v_task.updated_at IS DISTINCT FROM p_expected_updated_at
     OR v_old->>'revision' IS DISTINCT FROM p_expected_revision::text
     OR v_task.status = 'running'
     OR (v_task.metadata#>>'{delivery,lease,expiresAt}')::timestamptz > clock_timestamp()
     OR (p_next_lifecycle - ARRAY['handoff','history','updatedAt']) IS DISTINCT FROM (v_old - ARRAY['handoff','history','updatedAt'])
     OR v_old#>>'{approval,scope}' IS DISTINCT FROM 'research_brief_only'
     OR v_old#>>'{approval,actorId}' IS DISTINCT FROM v_task.founder_id::text
     OR v_old#>>'{approval,briefHash}' IS DISTINCT FROM v_old#>>'{brief,hash}'
     OR v_old#>>'{approval,revision}' IS DISTINCT FROM p_expected_revision::text
     OR v_old#>>'{brief,snapshot,revision}' IS DISTINCT FROM p_expected_revision::text
     OR v_handoff->>'schemaVersion' IS DISTINCT FROM '1'
     OR v_handoff->>'mode' IS DISTINCT FROM 'non_executable_draft'
     OR v_handoff->>'approved' IS DISTINCT FROM 'true'
     OR v_handoff->>'revision' IS DISTINCT FROM p_expected_revision::text
     OR v_handoff->>'briefHash' IS DISTINCT FROM v_old#>>'{brief,hash}'
     OR COALESCE(v_handoff->>'manifestHash', '') !~ '^[a-f0-9]{64}$'
     OR p_envelope->>'event_kind' IS DISTINCT FROM 'reviewed_handoff_persisted'
     OR p_envelope#>>'{payload,handoff_digest}' IS DISTINCT FROM
        public.cc_idea_evidence_document_hash_v1(v_handoff, p_handoff_canonical)
     OR p_envelope#>>'{payload,persisted_metadata_digest}' IS DISTINCT FROM
        public.cc_idea_evidence_document_hash_v1(jsonb_set(p_expected_metadata, '{lifecycle}', p_next_lifecycle), p_next_metadata_canonical)
     OR p_envelope#>>'{payload,adapter_version}' IS DISTINCT FROM 'factory_handoff_v1'
     OR COALESCE(p_envelope#>>'{payload,handoff_id}', '') = ''
     OR v_last->>'action' IS DISTINCT FROM 'create_handoff'
     OR v_last->>'revision' IS DISTINCT FROM p_expected_revision::text
     OR v_last->>'actorId' IS DISTINCT FROM v_task.founder_id::text
     OR v_last->>'at' IS DISTINCT FROM p_next_lifecycle->>'updatedAt'
     OR v_handoff->>'createdAt' IS DISTINCT FROM p_next_lifecycle->>'updatedAt'
     OR (p_next_lifecycle->>'updatedAt')::timestamptz IS NULL
     OR (p_next_lifecycle->>'updatedAt')::timestamptz < v_task.updated_at
     OR (p_next_lifecycle->>'updatedAt')::timestamptz > clock_timestamp() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Reviewed handoff compare-and-set or approval mismatch' USING ERRCODE = '40001';
  END IF;
  IF jsonb_typeof(v_old#>'{brief,snapshot,brief,outputs}') IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_old#>'{brief,snapshot,brief,outputs}') <> 13
     OR jsonb_typeof(v_old->'history') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_next_lifecycle->'history') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_next_lifecycle->'history') <> LEAST(100, jsonb_array_length(v_old->'history') + 1) THEN
    RAISE EXCEPTION 'Handoff requires thirteen outputs and one history append' USING ERRCODE = '22023';
  END IF;
  SELECT count(DISTINCT (x->>'id')::integer) INTO v_outputs
    FROM jsonb_array_elements(v_old#>'{brief,snapshot,brief,outputs}') x
    WHERE (x->>'id')::integer BETWEEN 1 AND 13 AND x->>'status' IN ('included','blocked','deferred','not_applicable')
      AND length(trim(x->>'content')) > 0;
  IF v_outputs <> 13 OR (SELECT COALESCE(jsonb_agg(x ORDER BY n), '[]'::jsonb)
      FROM jsonb_array_elements(v_old->'history') WITH ORDINALITY a(x,n)
      WHERE n > GREATEST(0, jsonb_array_length(v_old->'history') - 99)) || jsonb_build_array(v_last)
        IS DISTINCT FROM p_next_lifecycle->'history' THEN
    RAISE EXCEPTION 'Handoff output or history integrity mismatch' USING ERRCODE = '22023';
  END IF;
  -- Insert and guarded task update share one transaction: either both persist,
  -- or neither does. Any constraint/read-back failure rolls back admission.
  v_event := public.cc_idea_evidence_admit_locked_v1(p_envelope, p_canonical, NULL,
    p_verified_source_hash, p_verified_grant_hash, 'builtin_factory');
  UPDATE public.cc_tasks SET metadata = jsonb_set(metadata, '{lifecycle}', p_next_lifecycle),
    updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')
    WHERE id = v_task.id AND founder_id = v_task.founder_id AND metadata = p_expected_metadata
      AND updated_at = p_expected_updated_at RETURNING * INTO STRICT v_task;
  IF v_task.metadata->'lifecycle' IS DISTINCT FROM p_next_lifecycle THEN RAISE EXCEPTION 'Handoff read-back failed'; END IF;
  RETURN jsonb_build_object('event', v_event, 'task', to_jsonb(v_task));
END;
$$;

-- Withdrawal is a new decision record, never an edit/deletion of past evidence.
-- It remains available after prospective revocation to quarantine compromised proof.
CREATE OR REPLACE FUNCTION public.cc_idea_evidence_withdraw_v1(p_event_id uuid, p_withdrawal_id text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_target public.cc_idea_evidence_events%ROWTYPE;
  v_row public.cc_idea_evidence_events%ROWTYPE;
  v_document jsonb;
  v_canonical text;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 4000
     OR COALESCE(p_withdrawal_id, '') !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$' THEN
    RAISE EXCEPTION 'Withdrawal identity and reason are required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO STRICT v_target FROM public.cc_idea_evidence_events WHERE id = p_event_id AND record_kind = 'evidence';
  PERFORM 1 FROM public.cc_idea_evidence_sources WHERE source_id = v_target.source_id AND version = v_target.source_version FOR UPDATE;
  PERFORM 1 FROM public.cc_idea_evidence_grants WHERE grant_id = v_target.grant_id AND version = v_target.grant_version FOR UPDATE;
  v_document := jsonb_build_object('withdrawal_of', p_event_id, 'reason', p_reason);
  v_canonical := v_document::text;
  SELECT * INTO v_row FROM public.cc_idea_evidence_events WHERE source_id = v_target.source_id AND event_id = p_withdrawal_id;
  IF FOUND THEN
    IF v_row.record_kind <> 'withdrawal' OR v_row.envelope IS DISTINCT FROM v_document THEN
      RAISE EXCEPTION 'Conflicting withdrawal identity reuse' USING ERRCODE = '23505';
    END IF;
    RETURN to_jsonb(v_row);
  END IF;
  INSERT INTO public.cc_idea_evidence_events(source_id, source_version, event_id, grant_id, grant_version, founder_id, task_id,
    record_kind, withdrawal_of, envelope, canonical_envelope, payload_hash, occurred_at)
  VALUES (v_target.source_id, v_target.source_version, p_withdrawal_id, v_target.grant_id, v_target.grant_version,
    v_target.founder_id, v_target.task_id, 'withdrawal', v_target.id, v_document, v_canonical,
    public.cc_idea_evidence_document_hash_v1(v_document, v_canonical), clock_timestamp()) RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

-- No direct writes, including from service_role. Only these narrowly scoped
-- SECURITY DEFINER RPCs mutate registrations and append-only event history.
REVOKE ALL ON FUNCTION public.cc_idea_evidence_document_hash_v1(jsonb,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.cc_idea_evidence_admit_locked_v1(jsonb,text,text,text,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.cc_idea_evidence_enroll_source_v1(jsonb,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cc_idea_evidence_enroll_grant_v1(jsonb,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cc_idea_evidence_revoke_source_v1(text,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cc_idea_evidence_revoke_grant_v1(text,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cc_idea_evidence_admit_v1(jsonb,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cc_idea_evidence_persist_handoff_v1(jsonb,text,text,text,jsonb,timestamptz,integer,jsonb,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cc_idea_evidence_withdraw_v1(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cc_idea_evidence_enroll_source_v1(jsonb,text),
  public.cc_idea_evidence_enroll_grant_v1(jsonb,text), public.cc_idea_evidence_revoke_source_v1(text,integer,text),
  public.cc_idea_evidence_revoke_grant_v1(text,integer,text), public.cc_idea_evidence_admit_v1(jsonb,text,text,text,text),
  public.cc_idea_evidence_persist_handoff_v1(jsonb,text,text,text,jsonb,timestamptz,integer,jsonb,text,text),
  public.cc_idea_evidence_withdraw_v1(uuid,text,text) TO service_role;
COMMIT;

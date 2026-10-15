-- Run ONLY on an isolated Supabase database branch after the FOUNDER-GATED
-- migration. psql: -v ON_ERROR_STOP=1 -f this-file. Everything rolls back.
-- Fixtures are software proof, never founder/customer/release evidence.
BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE FUNCTION pg_temp.expect_error(p_sql text, p_state text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE v_state text;
BEGIN
  BEGIN EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM p_state THEN
    RAISE EXCEPTION 'Expected SQLSTATE %, got % for %', p_state, COALESCE(v_state, 'success'), p_sql;
  END IF;
END;
$$;

INSERT INTO auth.users(id, aud, role, email) VALUES
  ('ee161900-0000-4000-8000-000000000001','authenticated','authenticated','evidence-owner-a@example.invalid'),
  ('ee161900-0000-4000-8000-000000000002','authenticated','authenticated','evidence-owner-b@example.invalid');
CREATE TEMP TABLE evidence_fixture(name text PRIMARY KEY, value jsonb NOT NULL);
GRANT SELECT, INSERT, UPDATE ON evidence_fixture TO service_role;
GRANT SELECT ON evidence_fixture TO authenticated;

INSERT INTO public.cc_tasks(id, founder_id, title, metadata, updated_at)
SELECT 'ee161900-0000-4000-8000-000000000003'::uuid, 'ee161900-0000-4000-8000-000000000001'::uuid,
  'Isolated evidence SQL fixture', jsonb_build_object('untouched', 'must survive', 'lifecycle', jsonb_build_object(
    'revision',1,'outcome',NULL,'updatedAt',clock_timestamp() - interval '1 minute','history','[]'::jsonb,'handoff',NULL,
    'approval',jsonb_build_object('scope','research_brief_only','actorId','ee161900-0000-4000-8000-000000000001',
      'revision',1,'briefHash',repeat('a',64)),
    'brief',jsonb_build_object('hash',repeat('a',64),'snapshot',jsonb_build_object('revision',1,'brief',jsonb_build_object(
      'outputs',(SELECT jsonb_agg(jsonb_build_object('id',n,'status','included','content','Fixture output ' || n)) FROM generate_series(1,13) n))))
  )), clock_timestamp() - interval '1 minute';

INSERT INTO evidence_fixture VALUES ('source', jsonb_build_object(
  'source_id','sql.fixture.review','version',1,'kind','ed25519','event_kind','independent_review_verified',
  'adapter_version','nexus_release_gate_v1','repository','CleanExpo/Unite-Group','product_id','factory',
  'environment','staging','public_key','TEST-ONLY-public-key-not-used-for-SQL-signature-verification',
  'review_policy',jsonb_build_object('verifier_digest',repeat('e',64),'collector_policy_digest',repeat('f',64),'implementer_vendor','test-implementer')));
INSERT INTO evidence_fixture VALUES ('grant', jsonb_build_object(
  'grant_id','ee161900-0000-4000-8000-000000000004','version',1,'source_id','sql.fixture.review','source_version',1,
  'founder_id','ee161900-0000-4000-8000-000000000001','task_id','ee161900-0000-4000-8000-000000000003',
  'lifecycle_revision',1,'brief_hash',repeat('a',64),'outcome_hash',NULL,'outcome_canonical','null',
  'repository','CleanExpo/Unite-Group','product_id','factory','release_id',repeat('b',40),'environment','staging',
  'subject',jsonb_build_object('namespace','founder','id','ee161900-0000-4000-8000-000000000001'),
  'event_name','review.verified.v1','contract_hash',repeat('c',64),
  'valid_from',clock_timestamp()-interval '1 hour','valid_until',clock_timestamp()+interval '1 hour'));

SET LOCAL ROLE service_role;
SELECT pg_temp.expect_error(format('SELECT public.cc_idea_evidence_enroll_source_v1(%L::jsonb,%L)',
  value - 'review_policy',(value - 'review_policy')::text),'22023') FROM evidence_fixture WHERE name='source';
INSERT INTO evidence_fixture SELECT 'source_row', public.cc_idea_evidence_enroll_source_v1(value, value::text)
  FROM evidence_fixture WHERE name='source';
INSERT INTO evidence_fixture SELECT 'grant_row', public.cc_idea_evidence_enroll_grant_v1(value, value::text)
  FROM evidence_fixture WHERE name='grant';
INSERT INTO evidence_fixture SELECT 'envelope', (value - ARRAY['version','source_version','outcome_canonical','valid_from','valid_until']) ||
  jsonb_build_object('source_version',1,'grant_version',1,'event_id','review-event-1',
    'event_kind','independent_review_verified','occurred_at',clock_timestamp(),'payload',jsonb_build_object('fixture',true))
  FROM evidence_fixture WHERE name='grant';
INSERT INTO evidence_fixture SELECT 'event', public.cc_idea_evidence_admit_v1(e.value,e.value::text,'TEST-ONLY-server-verified-signature',
  s.value->>'registration_hash',g.value->>'registration_hash') FROM evidence_fixture e,evidence_fixture s,evidence_fixture g
  WHERE e.name='envelope' AND s.name='source_row' AND g.name='grant_row';
RESET ROLE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cc_idea_evidence_events WHERE event_id='review-event-1') THEN RAISE EXCEPTION 'Admission did not persist'; END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid IN ('public.cc_idea_evidence_sources'::regclass,
      'public.cc_idea_evidence_grants'::regclass,'public.cc_idea_evidence_events'::regclass)
      AND (NOT relrowsecurity OR NOT relforcerowsecurity)) THEN RAISE EXCEPTION 'RLS must be enabled and forced'; END IF;
  IF has_function_privilege('authenticated','public.cc_idea_evidence_admit_v1(jsonb,text,text,text,text)','EXECUTE')
     OR has_function_privilege('anon','public.cc_idea_evidence_enroll_source_v1(jsonb,text)','EXECUTE')
     OR has_function_privilege('service_role','public.cc_idea_evidence_admit_locked_v1(jsonb,text,text,text,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Privileged RPC is exposed';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','ee161900-0000-4000-8000-000000000001',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.cc_idea_evidence_events) <> 1
     OR (SELECT count(*) FROM public.cc_idea_evidence_grants) <> 1 THEN RAISE EXCEPTION 'Owner cannot read own evidence'; END IF;
END; $$;
SELECT pg_temp.expect_error('INSERT INTO public.cc_idea_evidence_events DEFAULT VALUES','42501');
SELECT pg_temp.expect_error('UPDATE public.cc_idea_evidence_grants SET revoked_at=now()','42501');
SELECT pg_temp.expect_error('DELETE FROM public.cc_idea_evidence_events','42501');
SELECT pg_temp.expect_error('SELECT public.cc_idea_evidence_enroll_source_v1(''{}''::jsonb,''{}'')','42501');
SELECT pg_temp.expect_error('SELECT * FROM public.cc_idea_evidence_sources','42501');
SELECT set_config('request.jwt.claim.sub','ee161900-0000-4000-8000-000000000002',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.cc_idea_evidence_events) OR EXISTS (SELECT 1 FROM public.cc_idea_evidence_grants) THEN
    RAISE EXCEPTION 'Owner B can read owner A evidence'; END IF;
END; $$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.expect_error('SELECT * FROM public.cc_idea_evidence_events','42501');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.expect_error('UPDATE public.cc_idea_evidence_sources SET registration=''{}''::jsonb','42501');
SELECT pg_temp.expect_error('DELETE FROM public.cc_idea_evidence_events','42501');

DO $$
DECLARE s jsonb; g jsonb; e jsonb; old_event jsonb; retried jsonb; changed jsonb;
BEGIN
  SELECT value INTO s FROM evidence_fixture WHERE name='source_row';
  SELECT value INTO g FROM evidence_fixture WHERE name='grant_row';
  SELECT value INTO e FROM evidence_fixture WHERE name='envelope';
  SELECT value INTO old_event FROM evidence_fixture WHERE name='event';
  PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_enroll_source_v1(%L::jsonb,%L)',
    s->'registration', (s->'registration' || '{"product_id":"transplant"}'::jsonb)::text),'22023');
  changed := s->'registration' || '{"product_id":"transplant"}'::jsonb;
  PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_enroll_source_v1(%L::jsonb,%L)',changed,changed::text),'23505');
  PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_admit_v1(%L::jsonb,%L,%L,%L,%L)',
    e,e::text,'TEST-ONLY-server-verified-signature',repeat('0',64),g->>'registration_hash'),'22023');
  changed := e || '{"event_id":"wrong-owner","founder_id":"ee161900-0000-4000-8000-000000000002"}'::jsonb;
  PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_admit_v1(%L::jsonb,%L,%L,%L,%L)',
    changed,changed::text,'TEST-ONLY-server-verified-signature',s->>'registration_hash',g->>'registration_hash'),'22023');
  changed := e || '{"payload":{"fixture":"conflict"}}'::jsonb;
  PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_admit_v1(%L::jsonb,%L,%L,%L,%L)',
    changed,changed::text,'TEST-ONLY-server-verified-signature',s->>'registration_hash',g->>'registration_hash'),'23505');
  PERFORM public.cc_idea_evidence_revoke_grant_v1(g->>'grant_id',1,'SQL test prospective revocation');
  retried := public.cc_idea_evidence_admit_v1(e,e::text,'TEST-ONLY-server-verified-signature',s->>'registration_hash',g->>'registration_hash');
  IF retried IS DISTINCT FROM old_event THEN RAISE EXCEPTION 'Revoked exact retry changed original record or timestamps'; END IF;
  changed := e || '{"event_id":"backdated-after-revoke"}'::jsonb;
  PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_admit_v1(%L::jsonb,%L,%L,%L,%L)',
    changed,changed::text,'TEST-ONLY-server-verified-signature',s->>'registration_hash',g->>'registration_hash'),'22023');
  PERFORM public.cc_idea_evidence_withdraw_v1((old_event->>'id')::uuid,'withdraw-1','SQL test quarantine');
  retried := public.cc_idea_evidence_admit_v1(e,e::text,'TEST-ONLY-server-verified-signature',s->>'registration_hash',g->>'registration_hash');
  IF retried IS DISTINCT FROM old_event THEN RAISE EXCEPTION 'Withdrawal rewrote historical evidence'; END IF;
END;
$$;

-- Atomic handoff: wrong CAS, unrelated mutation, forged approval and incomplete
-- output list must all leave both task metadata and event history untouched.
DO $$
DECLARE s jsonb; g jsonb; e jsonb; t public.cc_tasks%ROWTYPE; next_lifecycle jsonb;
  handoff jsonb; next_metadata jsonb; result jsonb; changed jsonb; handoff_at timestamptz := clock_timestamp();
  changed_lifecycle jsonb; changed_metadata jsonb; changed_envelope jsonb; changed_task public.cc_tasks%ROWTYPE;
  backdated_at timestamptz; missing_clock_at timestamptz; changed_handoff jsonb;
BEGIN
  SELECT * INTO STRICT t FROM public.cc_tasks WHERE id='ee161900-0000-4000-8000-000000000003';
  s := jsonb_build_object('source_id','sql.fixture.handoff','version',1,'kind','builtin_factory','event_kind','reviewed_handoff_persisted',
    'adapter_version','factory_handoff_v1','repository','CleanExpo/Unite-Group','product_id','factory','environment','staging','public_key',NULL);
  s := public.cc_idea_evidence_enroll_source_v1(s,s::text);
  SELECT value || jsonb_build_object('grant_id','ee161900-0000-4000-8000-000000000005','source_id','sql.fixture.handoff',
    'event_name','factory.research_handoff_persisted.v1','release_id','factory-fixture') INTO g FROM evidence_fixture WHERE name='grant';
  g := public.cc_idea_evidence_enroll_grant_v1(g,g::text);
  handoff := jsonb_build_object('schemaVersion',1,'mode','non_executable_draft','revision',1,'briefHash',repeat('a',64),
    'manifestHash',repeat('d',64),'createdAt',handoff_at,'approved',true);
  next_lifecycle := t.metadata->'lifecycle' || jsonb_build_object('handoff',handoff,'updatedAt',handoff_at,
    'history',jsonb_build_array(jsonb_build_object('revision',1,'action','create_handoff','actorId',t.founder_id,'at',handoff_at)));
  next_metadata := jsonb_set(t.metadata,'{lifecycle}',next_lifecycle);
  e := ((g->'registration') - ARRAY['version','source_version','outcome_canonical','valid_from','valid_until']) || jsonb_build_object(
    'source_version',1,'grant_version',1,'event_id','handoff-1','event_kind','reviewed_handoff_persisted','occurred_at',handoff_at,
    'payload',jsonb_build_object('adapter_version','factory_handoff_v1','handoff_id','fixture-handoff',
      'handoff_digest',encode(sha256(convert_to(handoff::text,'UTF8')),'hex'),
      'persisted_metadata_digest',encode(sha256(convert_to(next_metadata::text,'UTF8')),'hex')));
  PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_admit_v1(%L::jsonb,%L,%L,%L,%L)',
    e,e::text,'fake-signature',s->>'registration_hash',g->>'registration_hash'),'22023');
  PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_persist_handoff_v1(%L::jsonb,%L,%L,%L,%L::jsonb,%L::timestamptz,1,%L::jsonb,%L,%L)',
    e,e::text,s->>'registration_hash',g->>'registration_hash',t.metadata,t.updated_at-interval '1 second',next_lifecycle,handoff::text,next_metadata::text),'PT409');
  changed := next_lifecycle || '{"title":"unrelated mutation"}'::jsonb;
  PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_persist_handoff_v1(%L::jsonb,%L,%L,%L,%L::jsonb,%L::timestamptz,1,%L::jsonb,%L,%L)',
    e,e::text,s->>'registration_hash',g->>'registration_hash',t.metadata,t.updated_at,changed,handoff::text,next_metadata::text),'PT409');
  BEGIN
    -- Alter the persisted approval, not just a caller's stale expected value.
    UPDATE public.cc_tasks SET metadata=jsonb_set(t.metadata,'{lifecycle,approval,actorId}',
      '"ee161900-0000-4000-8000-000000000002"'::jsonb) WHERE id=t.id RETURNING * INTO changed_task;
    changed_lifecycle := jsonb_set(next_lifecycle,'{approval,actorId}','"ee161900-0000-4000-8000-000000000002"'::jsonb);
    changed_metadata := jsonb_set(changed_task.metadata,'{lifecycle}',changed_lifecycle);
    changed_envelope := jsonb_set(e,'{payload,persisted_metadata_digest}',
      to_jsonb(encode(sha256(convert_to(changed_metadata::text,'UTF8')),'hex')));
    PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_persist_handoff_v1(%L::jsonb,%L,%L,%L,%L::jsonb,%L::timestamptz,1,%L::jsonb,%L,%L)',
      changed_envelope,changed_envelope::text,s->>'registration_hash',g->>'registration_hash',changed_task.metadata,
      changed_task.updated_at,changed_lifecycle,handoff::text,changed_metadata::text),'PT409');
    RAISE EXCEPTION 'Rollback forged approval fixture' USING ERRCODE='ZX001';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
  BEGIN
    -- Keep hashes/expected metadata consistent; the missing thirteenth output
    -- itself must prevent admission rather than an unrelated CAS mismatch.
    UPDATE public.cc_tasks SET metadata=jsonb_set(t.metadata,'{lifecycle,brief,snapshot,brief,outputs}',
      (t.metadata#>'{lifecycle,brief,snapshot,brief,outputs}') - 12) WHERE id=t.id RETURNING * INTO changed_task;
    changed_lifecycle := jsonb_set(next_lifecycle,'{brief,snapshot,brief,outputs}',
      (next_lifecycle#>'{brief,snapshot,brief,outputs}') - 12);
    changed_metadata := jsonb_set(changed_task.metadata,'{lifecycle}',changed_lifecycle);
    changed_envelope := jsonb_set(e,'{payload,persisted_metadata_digest}',
      to_jsonb(encode(sha256(convert_to(changed_metadata::text,'UTF8')),'hex')));
    PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_persist_handoff_v1(%L::jsonb,%L,%L,%L,%L::jsonb,%L::timestamptz,1,%L::jsonb,%L,%L)',
      changed_envelope,changed_envelope::text,s->>'registration_hash',g->>'registration_hash',changed_task.metadata,
      changed_task.updated_at,changed_lifecycle,handoff::text,changed_metadata::text),'22023');
    RAISE EXCEPTION 'Rollback incomplete output fixture' USING ERRCODE='ZX002';
  EXCEPTION WHEN SQLSTATE 'ZX002' THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.cc_idea_evidence_events WHERE event_id='handoff-1')
     OR (SELECT metadata FROM public.cc_tasks WHERE id=t.id) IS DISTINCT FROM t.metadata THEN
    RAISE EXCEPTION 'Failed CAS left a task/event mutation'; END IF;

  BEGIN
    -- Missing prior business-clock provenance must not disable monotonicity.
    UPDATE public.cc_tasks SET metadata=t.metadata #- '{lifecycle,updatedAt}'
      WHERE id=t.id RETURNING * INTO changed_task;
    missing_clock_at := clock_timestamp() + interval '1 second';
    changed_handoff := jsonb_set(handoff,'{createdAt}',to_jsonb(missing_clock_at));
    changed_lifecycle := jsonb_set(jsonb_set(jsonb_set(next_lifecycle,'{handoff}',changed_handoff),
      '{updatedAt}',to_jsonb(missing_clock_at)),'{history,0,at}',to_jsonb(missing_clock_at));
    changed_metadata := jsonb_set(changed_task.metadata,'{lifecycle}',changed_lifecycle);
    changed_envelope := jsonb_set(jsonb_set(jsonb_set(e,'{occurred_at}',to_jsonb(missing_clock_at)),
      '{payload,handoff_digest}',to_jsonb(encode(sha256(convert_to(changed_handoff::text,'UTF8')),'hex'))),
      '{payload,persisted_metadata_digest}',to_jsonb(encode(sha256(convert_to(changed_metadata::text,'UTF8')),'hex')));
    PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_persist_handoff_v1(%L::jsonb,%L,%L,%L,%L::jsonb,%L::timestamptz,1,%L::jsonb,%L,%L)',
      changed_envelope,changed_envelope::text,s->>'registration_hash',g->>'registration_hash',changed_task.metadata,
      changed_task.updated_at,changed_lifecycle,changed_handoff::text,changed_metadata::text),'PT409');
    RAISE EXCEPTION 'Rollback missing prior timestamp fixture' USING ERRCODE='ZX003';
  EXCEPTION WHEN SQLSTATE 'ZX003' THEN NULL;
  END;

  -- A valid application lifecycle timestamp may precede a later database row
  -- write. Preserve the exact DB-row CAS while ordering business timestamps
  -- against the previous lifecycle timestamp from that same clock domain.
  UPDATE public.cc_tasks SET updated_at=clock_timestamp() WHERE id=t.id RETURNING * INTO t;
  handoff_at := (t.metadata#>>'{lifecycle,updatedAt}')::timestamptz + interval '1 second';
  IF handoff_at >= t.updated_at OR handoff_at < (t.metadata#>>'{lifecycle,updatedAt}')::timestamptz THEN
    RAISE EXCEPTION 'Clock regression fixture does not separate application and database clocks'; END IF;
  handoff := jsonb_set(handoff,'{createdAt}',to_jsonb(handoff_at));
  next_lifecycle := jsonb_set(jsonb_set(jsonb_set(next_lifecycle,'{handoff}',handoff),
    '{updatedAt}',to_jsonb(handoff_at)),'{history,0,at}',to_jsonb(handoff_at));
  next_metadata := jsonb_set(t.metadata,'{lifecycle}',next_lifecycle);
  e := jsonb_set(jsonb_set(jsonb_set(e,'{occurred_at}',to_jsonb(handoff_at)),
    '{payload,handoff_digest}',to_jsonb(encode(sha256(convert_to(handoff::text,'UTF8')),'hex'))),
    '{payload,persisted_metadata_digest}',to_jsonb(encode(sha256(convert_to(next_metadata::text,'UTF8')),'hex')));

  -- An actual backwards business timestamp still fails with a terminal HTTP
  -- conflict, even when every handoff/history/hash field agrees with it.
  backdated_at := (t.metadata#>>'{lifecycle,updatedAt}')::timestamptz - interval '1 second';
  changed_handoff := jsonb_set(handoff,'{createdAt}',to_jsonb(backdated_at));
  changed_lifecycle := jsonb_set(jsonb_set(jsonb_set(next_lifecycle,'{handoff}',changed_handoff),
    '{updatedAt}',to_jsonb(backdated_at)),'{history,0,at}',to_jsonb(backdated_at));
  changed_metadata := jsonb_set(t.metadata,'{lifecycle}',changed_lifecycle);
  changed_envelope := jsonb_set(jsonb_set(e,'{payload,handoff_digest}',
    to_jsonb(encode(sha256(convert_to(changed_handoff::text,'UTF8')),'hex'))),
    '{payload,persisted_metadata_digest}',to_jsonb(encode(sha256(convert_to(changed_metadata::text,'UTF8')),'hex')));
  PERFORM pg_temp.expect_error(format('SELECT public.cc_idea_evidence_persist_handoff_v1(%L::jsonb,%L,%L,%L,%L::jsonb,%L::timestamptz,1,%L::jsonb,%L,%L)',
    changed_envelope,changed_envelope::text,s->>'registration_hash',g->>'registration_hash',t.metadata,t.updated_at,
    changed_lifecycle,changed_handoff::text,changed_metadata::text),'PT409');
  IF EXISTS (SELECT 1 FROM public.cc_idea_evidence_events WHERE event_id='handoff-1')
     OR (SELECT metadata FROM public.cc_tasks WHERE id=t.id) IS DISTINCT FROM t.metadata THEN
    RAISE EXCEPTION 'Backdated clock rejection changed task or evidence'; END IF;

  result := public.cc_idea_evidence_persist_handoff_v1(e,e::text,s->>'registration_hash',g->>'registration_hash',
    t.metadata,t.updated_at,1,next_lifecycle,handoff::text,next_metadata::text);
  IF result#>'{task,metadata}' IS DISTINCT FROM next_metadata OR result#>'{event,envelope}' IS DISTINCT FROM e
     OR result#>>'{task,metadata,untouched}' <> 'must survive' THEN RAISE EXCEPTION 'Atomic handoff confirmation mismatch'; END IF;
  PERFORM public.cc_idea_evidence_revoke_source_v1('sql.fixture.handoff',1,'SQL fixture source rotation');
  IF public.cc_idea_evidence_persist_handoff_v1(e,e::text,s->>'registration_hash',g->>'registration_hash',
      t.metadata,t.updated_at,1,next_lifecycle,handoff::text,next_metadata::text)->'event' IS DISTINCT FROM result->'event' THEN
    RAISE EXCEPTION 'Historical handoff retry changed its original event'; END IF;
END;
$$;
RESET ROLE;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.cc_idea_evidence_events WHERE source_id LIKE 'sql.fixture.%') <> 3 THEN
    RAISE EXCEPTION 'Expected review, withdrawal and handoff only'; END IF;
END; $$;
ROLLBACK;

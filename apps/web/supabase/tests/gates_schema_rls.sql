-- UNI-3269 (GATES-0) behaviour proof for schema gates. Runs ONLY on the throwaway database built by
-- scripts/gates-schema-db-proof.sh. Prints GATES_RLS_PROOF_PASS when every check held; any failed
-- check raises, which stops psql (ON_ERROR_STOP) before the token is printed.
\set ON_ERROR_STOP 1

-- Fixtures, written as service_role (the only writer). Org A and org B each get one row per table.
set role service_role;
do $$
declare
  o uuid;
  b uuid; c uuid; s uuid; e uuid; ch uuid; g uuid; p uuid;
  tag text;
begin
  foreach o in array array['aaaaaaaa-0000-4000-8000-000000000001'::uuid, 'bbbbbbbb-0000-4000-8000-000000000002'::uuid] loop
    tag := left(o::text, 1);
    insert into gates.brands (org_id, slug, name) values (o, 'brand-' || tag, 'Brand ' || tag) returning id into b;
    insert into gates.campaigns (org_id, brand_id, name) values (o, b, 'Campaign ' || tag) returning id into c;
    insert into gates.sites (org_id, brand_id, domain) values (o, b, tag || '.example.com') returning id into s;
    insert into gates.events (org_id, site_id, ts, path, visitor_hash, session_hash)
      values (o, s, '2026-11-15 01:00:00+00', '/', repeat(tag, 32), repeat(tag, 32));
    insert into gates.daily_rollup (org_id, site_id, day, pageviews) values (o, s, '2026-11-15', 1);
    insert into gates.experiments (org_id, campaign_id, site_id, key, hypothesis, metric, variants, min_sample, stop_rule)
      values (o, c, s, 'exp-' || tag, 'h', 'lead', '["a","b"]', 100, 'fixed horizon') returning id into e;
    insert into gates.assignments (org_id, experiment_id, visitor_hash, variant) values (o, e, repeat(tag, 32), 'a');
    insert into gates.channels (org_id, brand_id, platform, handle) values (o, b, 'linkedin', 'h-' || tag) returning id into ch;
    insert into gates.gate_results (org_id, campaign_id, gate, verdict) values (o, c, 1, 'PASS') returning id into g;
    insert into gates.posts (org_id, campaign_id, channel_id, body, status, gate_result_id, approved_by, approved_at, scheduled_at)
      values (o, c, ch, 'post ' || tag, 'scheduled', g, gen_random_uuid(), now(), now()) returning id into p;
    insert into gates.post_metrics (org_id, post_id, impressions) values (o, p, 10);
    insert into gates.audience_evidence (org_id, campaign_id, kind, metric, value, captured_at)
      values (o, c, 'crm', 'leads', 12, now());
  end loop;
end $$;
reset role;

-- Integrity checks that hold for every writer, service_role included.
set role service_role;
do $$
declare
  a constant uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  site_b uuid := (select id from gates.sites where org_id = 'bbbbbbbb-0000-4000-8000-000000000002');
  camp_a uuid := (select id from gates.campaigns where org_id = a);
  chan_a uuid := (select id from gates.channels where org_id = a);
begin
  -- 1. a row cannot point at a parent in another org
  begin
    insert into gates.events (org_id, site_id, ts, path, visitor_hash, session_hash)
      values (a, site_b, '2026-11-15 02:00:00+00', '/x', repeat('x', 32), repeat('x', 32));
    raise exception 'CHECK FAILED: cross-org event insert was accepted';
  exception when foreign_key_violation then null;
  end;
  -- 2. a post cannot be scheduled without a gate result and an approver
  begin
    insert into gates.posts (org_id, campaign_id, channel_id, body, status, scheduled_at)
      values (a, camp_a, chan_a, 'no gate', 'scheduled', now());
    raise exception 'CHECK FAILED: post scheduled without gate result was accepted';
  exception when check_violation then null;
  end;
  -- 3. events route to their month partition, and anything outside the range to the default
  insert into gates.events (org_id, site_id, ts, path, visitor_hash, session_hash)
    values (a, (select id from gates.sites where org_id = a), '2030-01-01 00:00:00+00', '/later', repeat('y', 32), repeat('y', 32));
  if (select count(*) from gates.events_y2026m11) <> 2 then
    raise exception 'CHECK FAILED: November 2026 events are not in events_y2026m11';
  end if;
  if (select count(*) from gates.events_default) <> 1 then
    raise exception 'CHECK FAILED: out-of-range event did not land in events_default';
  end if;
end $$;
reset role;

-- Signed-in user of org A: sees exactly org A's rows, in every table, and can write nothing.
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","app_metadata":{"org_id":"aaaaaaaa-0000-4000-8000-000000000001"}}', false);
do $$
declare
  t text;
  n_all bigint;
  n_mine bigint;
begin
  foreach t in array array['brands','campaigns','sites','events','daily_rollup','experiments','assignments',
                           'channels','posts','post_metrics','audience_evidence','gate_results'] loop
    execute format('select count(*), count(*) filter (where org_id = %L) from gates.%I',
                   'aaaaaaaa-0000-4000-8000-000000000001', t) into n_all, n_mine;
    if n_mine < 1 then raise exception 'CHECK FAILED: org A cannot read its own % row', t; end if;
    if n_all <> n_mine then raise exception 'CHECK FAILED: org A can read another org''s % rows', t; end if;
  end loop;

  -- writes are refused (no grant), even for the user's own org
  begin
    insert into gates.brands (org_id, slug, name) values ('aaaaaaaa-0000-4000-8000-000000000001', 'sneaky', 'x');
    raise exception 'CHECK FAILED: authenticated insert into gates.brands was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update gates.posts set status = 'published';
    raise exception 'CHECK FAILED: authenticated update of gates.posts was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from gates.gate_results;
    raise exception 'CHECK FAILED: authenticated delete from gates.gate_results was accepted';
  exception when insufficient_privilege then null;
  end;
  -- a partition cannot be read directly
  begin
    perform count(*) from gates.events_y2026m11;
    raise exception 'CHECK FAILED: authenticated read a gates.events partition directly';
  exception when insufficient_privilege then null;
  end;
end $$;

-- An org_id placed in user_metadata (user-editable) grants nothing.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","user_metadata":{"org_id":"aaaaaaaa-0000-4000-8000-000000000001"}}', false);
do $$ begin
  if (select count(*) from gates.brands) <> 0 then raise exception 'CHECK FAILED: user_metadata org_id granted rows'; end if;
end $$;

-- A malformed claim yields no rows and no error.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","app_metadata":{"org_id":"not-a-uuid"}}', false);
do $$ begin
  if (select count(*) from gates.events) <> 0 then raise exception 'CHECK FAILED: malformed org claim granted rows'; end if;
end $$;

-- No claim at all yields no rows.
select set_config('request.jwt.claims', '', false);
do $$ begin
  if (select count(*) from gates.posts) <> 0 then raise exception 'CHECK FAILED: missing org claim granted rows'; end if;
end $$;
reset role;

-- anon cannot even reach the schema.
set role anon;
do $$ begin
  begin
    perform count(*) from gates.brands;
    raise exception 'CHECK FAILED: anon read gates.brands';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'GATES_RLS_PROOF_PASS' as result;

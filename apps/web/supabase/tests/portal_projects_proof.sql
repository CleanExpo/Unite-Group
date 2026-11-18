-- Client project loop proof (portal_projects, portal_project_items). Run as a superuser on a THROWAWAY database after
-- every portal migration and 20261119090000_portal_projects.sql: scripts/portal-project-db-proof.sh. Never on a live
-- project. Any failed expectation raises, so PORTAL_PROJECT_PROOF_PASS prints only when every step held.
-- Synthetic tenants only: "ccw-demo" (A, user ...a1) and "other-co" (B, user ...b1). No real client data.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@proof.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@proof.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'nobody@proof.test');
insert into public.portal_tenant_members (tenant_slug, user_id, role) values
  ('ccw-demo', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('other-co', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.portal_projects (tenant_slug, slug, name, objective, health, production_hold, hold_reason) values
  ('ccw-demo', 'optix', 'Optix ERP (synthetic)', 'Synthetic proof project', 'on_hold', true, 'Production hold (synthetic)'),
  ('other-co', 'site', 'Other website', 'Second tenant', 'on_track', false, null);

create function pg_temp.expect_raise(stmt text, msg text, label text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlerrm like '%' || msg || '%' then return; end if;
    raise exception 'WRONG ERROR for %: got % (%), wanted %', label, sqlstate, sqlerrm, msg;
  end;
  raise exception 'ALLOWED but should fail: %', label;
end $$;
create function pg_temp.expect_value(q text, want text, label text) returns void
language plpgsql as $$
declare got text;
begin
  execute q into got;
  if got is distinct from want then raise exception 'VALUE for %: got %, wanted %', label, got, want; end if;
end $$;
create function pg_temp.act_as(p_sub text, p_aal text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_sub, false);
  perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'aal', p_aal, 'role', 'authenticated')::text, false);
end $$;
grant execute on function pg_temp.expect_raise(text, text, text), pg_temp.expect_value(text, text, text),
  pg_temp.act_as(text, text) to authenticated, service_role;

set role authenticated;

-- ===== who may submit =====
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal1');
select pg_temp.expect_raise($$select public.portal_submit_project_request('optix', 'Show stock by branch', 'key-aal1-0001')$$, 'portal_not_owner', 'aal1 owner submits');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1', 'aal2');
select pg_temp.expect_raise($$select public.portal_submit_project_request('optix', 'Show stock by branch', 'key-none-0001')$$, 'portal_not_owner', 'non-member submits');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1', 'aal2');
select pg_temp.expect_raise($$select public.portal_submit_project_request('optix', 'Into the other tenant', 'key-b-x-0001')$$, 'portal_not_found', 'tenant B submits to tenant A project');

-- ===== A submits once per key; original text kept; labelled human =====
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal2');
select pg_temp.expect_raise($$select public.portal_submit_project_request('optix', 'hi', 'key-short-001')$$, 'portal_bad_input', 'too-short text');
select pg_temp.expect_raise($$select public.portal_submit_project_request('optix', 'A proper request', 'bad key!')$$, 'portal_bad_input', 'bad idempotency key');
select public.portal_submit_project_request('optix', E'  Show stock on hand by branch\nfor the Brisbane store  ', 'key-a-0000001');
select pg_temp.expect_value($$select public.portal_submit_project_request('optix', E'Show stock on hand by branch\nfor the Brisbane store', 'key-a-0000001')::text = (select id::text from public.portal_project_items where idempotency_key = 'key-a-0000001')$$, 'true', 'retry with same key and text returns first item');
select pg_temp.expect_raise($$select public.portal_submit_project_request('optix', 'Different text, same key', 'key-a-0000001')$$, 'portal_idempotency_conflict', 'same key, different text');
select pg_temp.expect_value($$select count(*)::text from public.portal_project_items where tenant_slug = 'ccw-demo'$$, '1', 'one item after retry');
select pg_temp.expect_value($$select client_text from public.portal_project_items where idempotency_key = 'key-a-0000001'$$, E'Show stock on hand by branch\nfor the Brisbane store', 'original text kept (trimmed only)');
select pg_temp.expect_value($$select author_kind || '/' || source || '/' || state from public.portal_project_items where idempotency_key = 'key-a-0000001'$$, 'client_human/portal/proposed', 'labelled human portal proposed');
select pg_temp.expect_raise($$select count(*) from public.portal_project_item_events$$, 'permission denied', 'client reads the event log (team notes)');
select pg_temp.expect_raise($$select cc_task_id from public.portal_project_items$$, 'permission denied', 'client reads cc_task_id');
select pg_temp.expect_raise($$select evidence from public.portal_project_items$$, 'permission denied', 'client reads raw evidence');
select pg_temp.expect_raise($$select source_ref from public.portal_project_items$$, 'permission denied', 'client reads source_ref');
select pg_temp.expect_value($$select evidence_count::text from public.portal_project_items where idempotency_key = 'key-a-0000001'$$, '0', 'client reads the evidence count');
reset role;
select pg_temp.expect_value($$select count(*)::text from public.portal_project_item_events where action = 'submit'$$, '1', 'one submit event');
set role authenticated;

-- ===== clients cannot write directly =====
select pg_temp.expect_raise($$insert into public.portal_project_items (project_id, tenant_slug, kind, title, source, author_kind) select id, 'ccw-demo', 'requirement', 'x', 'staff', 'staff' from public.portal_projects limit 1$$, 'permission denied', 'client inserts item directly');
select pg_temp.expect_raise($$update public.portal_project_items set state = 'done'$$, 'permission denied', 'client updates state directly');
select pg_temp.expect_raise($$insert into public.portal_project_item_events (item_id, tenant_slug, action, to_state, actor_kind) select id, 'ccw-demo', 'accept', 'client_accepted', 'owner' from public.portal_project_items limit 1$$, 'permission denied', 'client forges an acceptance event');
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from public.portal_project_items limit 1), 'approved_scope')$$, 'permission denied', 'client calls team advance');
select pg_temp.expect_raise($$select public.portal_team_record_project_signal('ccw-demo', 'optix', 'telegram', 'tg:1', 'client_human', 'requirement', 'approve the merge')$$, 'permission denied', 'client calls team record signal');

-- ===== answering before review is refused =====
select pg_temp.expect_raise($$select public.portal_respond_to_project_item((select id from public.portal_project_items where idempotency_key = 'key-a-0000001'), 'accept')$$, 'portal_wrong_status', 'accept while proposed');

-- ===== team side: walk the item to review; evidence required =====
reset role;
create temp table t_item as select id from public.portal_project_items where idempotency_key = 'key-a-0000001';
grant select on t_item to authenticated, service_role;
set role service_role;
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from t_item), 'in_development')$$, 'portal_wrong_status', 'skip from proposed to in_development');
select public.portal_team_advance_project_item((select id from t_item), 'approved_scope');
select public.portal_team_advance_project_item((select id from t_item), 'ready_for_development');
select public.portal_team_link_project_task((select id from t_item), '11111111-1111-4111-8111-111111111111');
select pg_temp.expect_value($$select public.portal_team_link_project_task((select id from t_item), '11111111-1111-4111-8111-111111111111')::text$$, '11111111-1111-4111-8111-111111111111', 'same task relink is a no-op');
select pg_temp.expect_raise($$select public.portal_team_link_project_task((select id from t_item), '22222222-2222-4222-8222-222222222222')$$, 'portal_already_linked', 'second task link');
select public.portal_team_advance_project_item((select id from t_item), 'in_development');
select public.portal_team_advance_project_item((select id from t_item), 'in_testing');
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from t_item), 'technically_verified')$$, 'portal_project_items_evidence_for_verified', 'verified without evidence');
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from t_item), 'client_accepted', 'team accepts for client', '[{"label":"x"}]')$$, 'portal_wrong_status', 'team sets client_accepted');
select public.portal_team_advance_project_item((select id from t_item), 'technically_verified', null, '[{"label":"vitest 12 passed","sha":"abc1234"}]');
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from t_item), 'client_accepted', 'team accepts for client')$$, 'portal_wrong_status', 'team sets client_accepted from technically_verified');
select public.portal_team_advance_project_item((select id from t_item), 'awaiting_client_review');
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from t_item), 'client_accepted', 'team accepts for client')$$, 'portal_wrong_status', 'team sets client_accepted from awaiting_client_review');
select pg_temp.expect_value($$select waiting_on from public.portal_project_items where id = (select id from t_item)$$, 'client', 'review waits on client');
select pg_temp.expect_raise($$update public.portal_project_items set client_text = 'rewritten' where id = (select id from t_item)$$, 'portal_source_immutable', 'original text rewritten');

-- ===== tenant B cannot see or answer A's item =====
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1', 'aal2');
select pg_temp.expect_value($$select count(*)::text from public.portal_project_items$$, '0', 'B sees none of A items');
select pg_temp.expect_value($$select count(*)::text from public.portal_projects$$, '1', 'B sees only its own project');
select pg_temp.expect_raise($$select count(*) from public.portal_project_item_events$$, 'permission denied', 'B reads any event');
select pg_temp.expect_raise($$select public.portal_respond_to_project_item((select id from t_item), 'accept')$$, 'portal_not_found', 'B accepts A item');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal1');
select pg_temp.expect_raise($$select public.portal_respond_to_project_item((select id from t_item), 'accept')$$, 'portal_not_owner', 'A accepts at aal1');

-- ===== A asks for changes (note required), team re-reviews, A accepts =====
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal2');
select pg_temp.expect_value($$select count(*)::text from public.portal_project_items$$, '1', 'A sees its item');
select pg_temp.expect_raise($$select public.portal_respond_to_project_item((select id from t_item), 'request_changes')$$, 'portal_bad_input', 'request changes without a note');
select pg_temp.expect_raise($$select public.portal_respond_to_project_item((select id from t_item), 'approve_release', 'ship it')$$, 'portal_bad_input', 'client tries a release verdict');
select pg_temp.expect_value($$select public.portal_respond_to_project_item((select id from t_item), 'request_changes', 'Also show transfers in transit')$$, 'clarification_required', 'request changes');
select pg_temp.expect_value($$select waiting_on from public.portal_project_items where id = (select id from t_item)$$, 'unite', 'after the client asks for changes, the team owes the next step');
select pg_temp.expect_raise($$select public.portal_respond_to_project_item((select id from t_item), 'answer', 'unasked answer')$$, 'portal_wrong_status', 'client answers when the team asked nothing');

-- ===== the team asks the client a question; only then can the client answer it =====
reset role; set role service_role;
select public.portal_team_advance_project_item((select id from t_item), 'proposed');
select public.portal_team_advance_project_item((select id from t_item), 'clarification_required', 'Which branches should see transfers?');
select pg_temp.expect_value($$select waiting_on from public.portal_project_items where id = (select id from t_item)$$, 'client', 'team question waits on client');
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal2');
select pg_temp.expect_raise($$select public.portal_respond_to_project_item((select id from t_item), 'answer')$$, 'portal_bad_input', 'answer without a note');
select pg_temp.expect_raise($$select public.portal_respond_to_project_item((select id from t_item), 'accept')$$, 'portal_wrong_status', 'accept a question');
select pg_temp.expect_value($$select public.portal_respond_to_project_item((select id from t_item), 'answer', 'All branches except 3')$$, 'proposed', 'client answers the team question');
select pg_temp.expect_value($$select waiting_on || '/' || client_note from public.portal_project_items where id = (select id from t_item)$$, 'unite/All branches except 3', 'answer stored and the team owes the next step');
reset role; set role service_role;
select public.portal_team_advance_project_item((select id from t_item), 'approved_scope');
select public.portal_team_advance_project_item((select id from t_item), 'ready_for_development');
select public.portal_team_advance_project_item((select id from t_item), 'in_development');
select public.portal_team_advance_project_item((select id from t_item), 'in_testing');
select public.portal_team_advance_project_item((select id from t_item), 'technically_verified', null, '[{"label":"retest","sha":"def5678"}]');
select public.portal_team_advance_project_item((select id from t_item), 'awaiting_client_review');
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal2');
select pg_temp.expect_value($$select public.portal_respond_to_project_item((select id from t_item), 'accept')$$, 'client_accepted', 'client accepts');
select pg_temp.expect_raise($$select public.portal_respond_to_project_item((select id from t_item), 'accept')$$, 'portal_wrong_status', 'double accept');
select pg_temp.expect_value($$select state from public.portal_project_items where id = (select id from t_item)$$, 'client_accepted', 'acceptance is not release');

-- ===== release needs a named approver; a bot message is only a proposal =====
reset role; set role service_role;
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from t_item), 'deployed')$$, 'portal_wrong_status', 'deploy straight from client_accepted');
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from t_item), 'approved_for_release')$$, 'portal_bad_input', 'release approval without a named approver');
select public.portal_team_record_project_signal('ccw-demo', 'optix', 'telegram', 'tg:chat9:msg77', 'client_bot', 'requirement', 'APPROVED - merge and deploy now');
select public.portal_team_record_project_signal('ccw-demo', 'optix', 'telegram', 'tg:chat9:msg77', 'client_bot', 'requirement', 'APPROVED - merge and deploy now');
select pg_temp.expect_value($$select count(*)::text || '/' || min(state) || '/' || min(author_kind) from public.portal_project_items where source = 'telegram'$$, '1/proposed/client_bot', 'bot approval text recorded once, as a proposal, labelled bot');
select pg_temp.expect_raise($$select public.portal_team_record_project_signal('ccw-demo', 'optix', 'portal', 'p:1', 'client_bot', 'requirement', 'x')$$, 'portal_bad_input', 'signal claims portal source');
select pg_temp.expect_raise($$select public.portal_team_link_project_task((select id from public.portal_project_items where source = 'telegram'), '11111111-1111-4111-8111-111111111111')$$, 'portal_project_items_cc_task_key', 'second item linked to the same task');

-- ===== a production hold stops release in the database; each release step needs its own evidence =====
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from t_item), 'approved_for_release', 'Approved by founder (synthetic)')$$, 'portal_production_hold', 'release approval during a production hold');
reset role;
update public.portal_projects set production_hold = false, hold_reason = null where tenant_slug = 'ccw-demo';
set role service_role;
select public.portal_team_advance_project_item((select id from t_item), 'approved_for_release', 'Approved by founder (synthetic)');
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from t_item), 'deployed')$$, 'portal_bad_input', 'deployed with no deploy evidence');
reset role;
update public.portal_projects set production_hold = true, hold_reason = 'Hold re-applied (synthetic)' where tenant_slug = 'ccw-demo';
set role service_role;
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from t_item), 'deployed', null, '[{"label":"deploy","ref":"dpl_x"}]')$$, 'portal_production_hold', 'deploy during a re-applied hold');
reset role;
update public.portal_projects set production_hold = false, hold_reason = null where tenant_slug = 'ccw-demo';
set role service_role;
select pg_temp.expect_value($$select public.portal_team_advance_project_item((select id from t_item), 'deployed', null, '[{"label":"deploy","ref":"dpl_x"}]')$$, 'deployed', 'deploy with evidence once the hold is lifted');
select pg_temp.expect_raise($$select public.portal_team_advance_project_item((select id from t_item), 'production_verified')$$, 'portal_bad_input', 'production verified with no check evidence');
reset role;
select pg_temp.expect_raise($$insert into public.portal_project_items (project_id, tenant_slug, kind, title, source, author_kind) select id, 'ccw-demo', 'requirement', 'x', 'portal', 'client_bot' from public.portal_projects where slug = 'optix'$$, 'portal_project_items_portal_is_human', 'portal item labelled bot');
select pg_temp.expect_raise($$insert into public.portal_project_items (project_id, tenant_slug, kind, title, source, author_kind) select id, 'ccw-demo', 'requirement', 'x', 'staff', 'staff' from public.portal_projects where slug = 'site'$$, 'portal_project_items_project_fk', 'item tenant differs from project tenant');

select 'PORTAL_PROJECT_PROOF_PASS';

-- FOUNDER-GATED rollback for 20261105040000_gates_schema.sql (UNI-3269, GATES-0).
-- Removes schema gates and EVERYTHING in it, including any rows GATES-1..10 have written
-- (analytics events, experiments, posts, gate verdicts). Only run it with Phill's approval,
-- ideally before GATES-1 starts collecting. Nothing outside schema gates is touched: the
-- forward migration created nothing elsewhere.
-- Refuses to run if anything outside the forward migration's objects depends on gates.

begin;

set local lock_timeout = '5s';

do $$
declare
  v_dep text;
begin
  if not exists (select 1 from pg_namespace where nspname = 'gates') then
    raise exception 'gates_schema_rollback: schema gates does not exist; nothing to do';
  end if;
  -- Objects in other schemas that depend on something in gates (views, foreign keys, functions).
  select string_agg(distinct dn.nspname || '.' || coalesce(dc.relname, rwc.relname, dp.proname, conc.relname || '.' || con.conname, d.classid::regclass::text), ', ')
    into v_dep
  from pg_depend d
  join pg_class rc on d.refclassid = 'pg_class'::regclass and rc.oid = d.refobjid
  join pg_namespace rn on rn.oid = rc.relnamespace and rn.nspname = 'gates'
  left join pg_class dc on d.classid = 'pg_class'::regclass and dc.oid = d.objid
  left join pg_rewrite rw on d.classid = 'pg_rewrite'::regclass and rw.oid = d.objid
  left join pg_class rwc on rwc.oid = rw.ev_class
  left join pg_proc dp on d.classid = 'pg_proc'::regclass and dp.oid = d.objid
  left join pg_constraint con on d.classid = 'pg_constraint'::regclass and con.oid = d.objid
  left join pg_class conc on conc.oid = con.conrelid
  join pg_namespace dn on dn.oid = coalesce(dc.relnamespace, rwc.relnamespace, dp.pronamespace, conc.relnamespace)
  where dn.nspname not in ('gates', 'pg_toast');
  if v_dep is not null then
    raise exception 'gates_schema_rollback: objects outside gates depend on it: %; resolve those first', v_dep;
  end if;
end
$$;

drop schema gates cascade;

commit;

-- FOUNDER-GATED rollback for 20261105040000_gates_schema.sql (UNI-3269, GATES-0).
-- Removes schema gates and EVERYTHING in it, including any rows GATES-1..10 have written
-- (analytics events, experiments, posts, gate verdicts). Only run it with Phill's approval,
-- ideally before GATES-1 starts collecting. The forward migration created nothing outside gates.
--
-- `drop schema gates cascade` would also silently drop anything OUTSIDE gates that hangs off it:
-- a view or policy calling gates.jwt_org_id(), a foreign key to a gates table, a column of a gates
-- row type, a default, a trigger. Listing every such dependency shape is how an earlier draft of
-- this file missed some, so this file does not try. Instead it records every object outside gates
-- (relations, columns, defaults, constraints, policies, triggers, rules, functions, types) BEFORE
-- the drop, checks each one still exists AFTER it, and raises if any is gone. The whole file is one
-- transaction, so that raise undoes the drop: either only gates goes, or nothing changes.

begin;

set local lock_timeout = '5s';

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'gates') then
    raise exception 'gates_schema_rollback: schema gates does not exist; nothing to do';
  end if;
end
$$;

create temporary table gates_rollback_outside (cat text not null, oid oid not null, sub int not null, ident text not null)
  on commit drop;

-- Namespaces whose objects must survive: everything except gates and the per-session temp/toast ones.
with keep as (
  select oid from pg_namespace
  where nspname <> 'gates' and nspname <> 'pg_toast' and nspname not like 'pg_temp_%' and nspname not like 'pg_toast_temp_%'
),
rels as (select c.oid from pg_class c where c.relnamespace in (select oid from keep))
insert into gates_rollback_outside (cat, oid, sub, ident)
select 'pg_class', c.oid, 0, c.oid::regclass::text from pg_class c where c.oid in (select oid from rels)
union all
select 'pg_attribute', a.attrelid, a.attnum, a.attrelid::regclass::text || '.' || a.attname
  from pg_attribute a where a.attrelid in (select oid from rels) and a.attnum > 0 and not a.attisdropped
union all
select 'pg_attrdef', d.oid, 0, 'default on ' || d.adrelid::regclass::text from pg_attrdef d where d.adrelid in (select oid from rels)
union all
select 'pg_constraint', k.oid, 0, k.conname || ' on ' || coalesce(nullif(k.conrelid, 0)::regclass::text, k.contypid::regtype::text)
  from pg_constraint k where k.connamespace in (select oid from keep)
union all
select 'pg_policy', p.oid, 0, p.polname || ' on ' || p.polrelid::regclass::text from pg_policy p where p.polrelid in (select oid from rels)
union all
select 'pg_trigger', t.oid, 0, t.tgname || ' on ' || t.tgrelid::regclass::text from pg_trigger t where t.tgrelid in (select oid from rels)
union all
select 'pg_rewrite', r.oid, 0, r.rulename || ' on ' || r.ev_class::regclass::text from pg_rewrite r where r.ev_class in (select oid from rels)
union all
select 'pg_proc', f.oid, 0, f.oid::regprocedure::text from pg_proc f where f.pronamespace in (select oid from keep)
union all
select 'pg_type', y.oid, 0, y.oid::regtype::text from pg_type y where y.typnamespace in (select oid from keep);

drop schema gates cascade;

do $$
declare
  v_gone text;
begin
  select string_agg(o.ident, ', ' order by o.ident) into v_gone
  from gates_rollback_outside o
  where not case o.cat
    when 'pg_class' then exists (select 1 from pg_class where oid = o.oid)
    when 'pg_attribute' then exists (select 1 from pg_attribute where attrelid = o.oid and attnum = o.sub and not attisdropped)
    when 'pg_attrdef' then exists (select 1 from pg_attrdef where oid = o.oid)
    when 'pg_constraint' then exists (select 1 from pg_constraint where oid = o.oid)
    when 'pg_policy' then exists (select 1 from pg_policy where oid = o.oid)
    when 'pg_trigger' then exists (select 1 from pg_trigger where oid = o.oid)
    when 'pg_rewrite' then exists (select 1 from pg_rewrite where oid = o.oid)
    when 'pg_proc' then exists (select 1 from pg_proc where oid = o.oid)
    when 'pg_type' then exists (select 1 from pg_type where oid = o.oid)
  end;
  if v_gone is not null then
    raise exception 'gates_schema_rollback: the drop would also remove objects outside gates: %; nothing changed, resolve those first', v_gone;
  end if;
end
$$;

commit;

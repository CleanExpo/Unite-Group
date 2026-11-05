-- FOUNDER-GATED rollback for 20261105040000_gates_schema.sql (UNI-3269, GATES-0).
-- Removes schema gates and EVERYTHING in it, including any rows GATES-1..10 have written
-- (analytics events, experiments, posts, gate verdicts). Only run it with Phill's approval,
-- ideally before GATES-1 starts collecting. The forward migration created nothing outside gates.
--
-- No CASCADE anywhere. `drop schema gates cascade` also drops, silently, anything OUTSIDE gates
-- that hangs off it: views, policies, defaults, foreign keys, row-type columns, functions taking
-- gates types, extended statistics. Two earlier drafts tried to detect those by listing catalogs,
-- and each review found a kind the list missed. Postgres's own dependency check has no such list:
-- every drop below is RESTRICT, so if any object outside these drops depends on them, Postgres
-- refuses ("... because other objects depend on it" or "... on them", SQLSTATE 2BP01) and names the dependant.
-- The whole file is one transaction, so that refusal changes nothing.
-- The twelve tables are dropped in one statement, so their foreign keys to each other do not block
-- the drop; the events partitions go with their parent. If GATES-1..10 later add objects to gates,
-- the final `drop schema gates restrict` refuses until this file is updated to name them.

begin;

set local lock_timeout = '5s';

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'gates') then
    raise exception 'gates_schema_rollback: schema gates does not exist; nothing to do';
  end if;
end
$$;

drop table
  gates.post_metrics, gates.posts, gates.gate_results, gates.channels, gates.assignments,
  gates.experiments, gates.audience_evidence, gates.daily_rollup, gates.events, gates.sites,
  gates.campaigns, gates.brands
  restrict;

drop function gates.jwt_org_id() restrict;

drop schema gates restrict;

commit;

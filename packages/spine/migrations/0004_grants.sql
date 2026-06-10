-- 0004 — grants. RLS filters rows; the role still needs schema/table privileges to attempt access.
grant usage on schema core, marketing, leadgen, onboarding, nrpg, carsi, field, sales to authenticated;
do $$
declare s text;
begin
  foreach s in array array['core','marketing','leadgen','onboarding','nrpg','carsi','field','sales'] loop
    execute format('grant select on all tables in schema %I to authenticated', s);
    execute format('grant execute on all functions in schema %I to authenticated', s);
  end loop;
end $$;
-- member-writable surfaces (RLS WITH CHECK still constrains to own org)
grant insert, update, delete on all tables in schema field to authenticated;
grant insert, update, delete on carsi.enrollment to authenticated;
grant insert, update on onboarding.application to authenticated;

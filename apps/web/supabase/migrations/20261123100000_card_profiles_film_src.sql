-- FOUNDER-GATED: NOT applied to production. Apply only under the founder's break-glass approval, after a Supabase database branch run.
-- Proven on a throwaway local Postgres 15 only: supabase/tests/card_film_src_rls.sql (scripts/card-db-proof.sh, section 7).
-- Living Card client film (UNI-3528). Additive only; stacks on 20261025090000_card_profiles and 20261102140000_card_review_requests.
--  1. card_profiles.film_src: the site path of the film a client's card plays, one of our own files under /cards/media/.
--     Nullable: a card with no film is unchanged. A path, never a URL: the CHECK refuses anything that leaves /cards/media/
--     (a '..' segment, an absolute http(s) URL, a scheme, a backslash or a percent-encoded character).
--  2. Anon may read film_src, and only through the existing policy (published rows). Nobody but service_role writes it:
--     the owner's authenticated grants are NOT extended, so a film is chosen by us, not set from a signed-in browser.
-- Re-appliable: add column if not exists, guarded constraint, grant is idempotent.
-- Rollback (reviewed forward migration): alter table public.card_profiles drop column film_src. The column-level grant goes with it.
--   No other table is touched.

alter table public.card_profiles add column if not exists film_src text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'card_profiles_film_src_local_media') then
    alter table public.card_profiles add constraint card_profiles_film_src_local_media
      check (
        film_src is null
        or (
          film_src like '/cards/media/%'
          and film_src not like '%..%'
          and char_length(film_src) <= 200
          and film_src ~ '^/cards/media/[A-Za-z0-9._/-]+$'
        )
      );
  end if;
end $$;
grant select (film_src) on table public.card_profiles to anon;

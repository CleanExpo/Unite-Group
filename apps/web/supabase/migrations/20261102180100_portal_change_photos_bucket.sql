-- FOUNDER-GATED: NOT applied to any database. Apply only through a reviewed, approved branch, after
-- 20261102180000_portal_change_requests.sql (it uses public.portal_owner_tenant_slug()).
-- Proven against a minimal storage stand-in on a throwaway in-memory Postgres (PGlite): supabase/tests/portal_s3_rls.sql.
-- Private bucket for the optional photo on a change request (UNI-3168). Additive only.
--  * Not public. 5 MB cap. JPG, PNG and WebP only.
--  * An aal2 owner may upload and read only under "<her tenant>/<uuid>.<jpg|png|webp>". No update, no delete.
--  * Our team reads through service_role. No signed or public URL is created by this migration.
-- Rollback (reviewed forward migration): drop the two policies below; delete the bucket only after its objects
--   have been reviewed (never automatically).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portal-change-photos', 'portal-change-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists portal_change_photos_owner_insert on storage.objects;
create policy portal_change_photos_owner_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'portal-change-photos'
    and (storage.foldername(name))[1] = (select public.portal_owner_tenant_slug())
    and name ~ ('^' || (select public.portal_owner_tenant_slug())
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$')
  );

drop policy if exists portal_change_photos_owner_select on storage.objects;
create policy portal_change_photos_owner_select on storage.objects
  for select to authenticated using (
    bucket_id = 'portal-change-photos'
    and (storage.foldername(name))[1] = (select public.portal_owner_tenant_slug())
  );

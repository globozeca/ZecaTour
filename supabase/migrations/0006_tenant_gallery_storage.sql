-- Tenant gallery storage bucket and tenant-scoped object policies.
-- Public visitors can read images; only members of the owning tenant can write them.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-gallery',
  'tenant-gallery',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists tenant_gallery_public_read on storage.objects;
create policy tenant_gallery_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'tenant-gallery');

drop policy if exists tenant_gallery_member_insert on storage.objects;
create policy tenant_gallery_member_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'tenant-gallery'
  and coalesce(array_length(storage.foldername(name), 1), 0) >= 1
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_tenant_role(((storage.foldername(name))[1])::uuid)
);

drop policy if exists tenant_gallery_member_update on storage.objects;
create policy tenant_gallery_member_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'tenant-gallery'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_tenant_role(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'tenant-gallery'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_tenant_role(((storage.foldername(name))[1])::uuid)
);

drop policy if exists tenant_gallery_member_delete on storage.objects;
create policy tenant_gallery_member_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'tenant-gallery'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_tenant_role(((storage.foldername(name))[1])::uuid)
);

commit;

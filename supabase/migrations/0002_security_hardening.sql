-- ZecaTour hardening migration
-- Tightens function execution grants and prevents cross-tenant menu category links.

begin;

-- A SECURITY DEFINER helper must not be executable by arbitrary roles by default.
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.has_tenant_role(uuid, public.member_role[]) from public, anon;
revoke all on function public.is_active_tenant(uuid) from public;
revoke all on function public.get_public_tenant_by_slug(text) from public;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.has_tenant_role(uuid, public.member_role[]) to authenticated;
grant execute on function public.is_active_tenant(uuid) to anon, authenticated;
grant execute on function public.get_public_tenant_by_slug(text) to anon, authenticated;

-- Enforce that a product's category belongs to the same tenant.
alter table public.menu_categories
  add constraint menu_categories_tenant_id_id_key unique (tenant_id, id);

alter table public.menu_products
  drop constraint if exists menu_products_category_id_fkey;

alter table public.menu_products
  add constraint menu_products_category_tenant_fkey
  foreign key (tenant_id, category_id)
  references public.menu_categories (tenant_id, id)
  on delete set null (category_id);

commit;

-- Public, allow-listed profile fields for tenant websites.
begin;

create or replace function public.get_public_tenant_profile_by_slug(input_slug text)
returns table (
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  default_locale text,
  supported_locales text[],
  contact_phone text,
  address text,
  map_url text,
  whatsapp_number text,
  brand_primary text,
  brand_secondary text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.name,
    t.slug,
    t.default_locale,
    t.supported_locales,
    t.contact_phone,
    s.address,
    s.map_url,
    s.whatsapp_number,
    s.brand_primary,
    s.brand_secondary
  from public.tenants t
  left join public.tenant_settings s on s.tenant_id = t.id
  where t.slug = input_slug
    and t.status in ('trial','active')
  limit 1;
$$;

revoke all on function public.get_public_tenant_profile_by_slug(text) from public;
grant execute on function public.get_public_tenant_profile_by_slug(text) to anon, authenticated;

commit;

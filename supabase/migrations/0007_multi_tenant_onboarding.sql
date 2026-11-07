-- Multi-tenant onboarding and authenticated tenant discovery.
-- Existing migrations remain immutable. Tenant creation is atomic and self-service
-- creates the caller as owner; tenant membership is never inferred from a client-supplied ID.

begin;

create policy tenants_member_read
on public.tenants
for select
to authenticated
using (public.has_tenant_role(id));

create or replace function public.get_my_tenants()
returns table (
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  tenant_status public.tenant_status,
  member_role public.member_role
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, t.slug, t.status, tm.role
  from public.tenant_members tm
  join public.tenants t on t.id = tm.tenant_id
  where tm.user_id = (select auth.uid())
    and t.status in ('trial', 'active')
  union all
  select t.id, t.name, t.slug, t.status, 'owner'::public.member_role
  from public.tenants t
  where public.is_platform_admin()
    and not exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = t.id and tm.user_id = (select auth.uid())
    )
  order by tenant_name;
$$;

create or replace function public.create_tenant_for_current_user(
  input_name text,
  input_slug text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_name text := trim(input_name);
  v_slug text := lower(trim(input_slug));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_name is null or length(v_name) not between 2 and 120 then
    raise exception 'Invalid tenant name' using errcode = '22023';
  end if;

  if v_slug is null or length(v_slug) not between 3 and 60
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid tenant slug' using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  insert into public.tenants (name, slug, status)
  values (v_name, v_slug, 'trial')
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, v_user_id, 'owner');

  insert into public.subscriptions (
    tenant_id, plan_code, status, trial_ends_at
  )
  values (
    v_tenant_id, 'starter', 'trialing', now() + interval '30 days'
  );

  insert into public.tenant_settings (tenant_id)
  values (v_tenant_id);

  return v_tenant_id;
end;
$$;

revoke all on function public.get_my_tenants() from public, anon;
revoke all on function public.create_tenant_for_current_user(text, text) from public, anon;
grant execute on function public.get_my_tenants() to authenticated;
grant execute on function public.create_tenant_for_current_user(text, text) to authenticated;

commit;

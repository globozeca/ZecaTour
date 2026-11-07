-- Platform administration for ZecaTour.
-- Platform privileges are granted only through Supabase Auth app_metadata:
-- { "platform_role": "superadmin" }. Never use user_metadata for authorization.

begin;

create or replace function public.get_my_tenants()
returns table (tenant_id uuid, tenant_name text, tenant_slug text, tenant_status public.tenant_status, member_role public.member_role)
language sql stable security definer set search_path = '' as $function$
  select t.id, t.name, t.slug, t.status, case when public.is_platform_admin() then 'owner'::public.member_role else tm.role end
  from public.tenants t
  left join public.tenant_members tm on tm.tenant_id = t.id and tm.user_id = (select auth.uid())
  where public.is_platform_admin() or (tm.user_id = (select auth.uid()) and t.status in ('trial', 'active'))
  order by t.name;
$function$;

create or replace function public.get_platform_tenants()
returns table (
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  tenant_status public.tenant_status,
  created_at timestamptz,
  owner_email text,
  member_count bigint,
  plan_code text,
  subscription_status public.subscription_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  return query
  select
    t.id,
    t.name,
    t.slug,
    t.status,
    t.created_at,
    (select u.email
       from public.tenant_members tm_owner
       join auth.users u on u.id = tm_owner.user_id
      where tm_owner.tenant_id = t.id
        and tm_owner.role = 'owner'::public.member_role
      order by tm_owner.created_at
      limit 1),
    (select count(*) from public.tenant_members tm_count where tm_count.tenant_id = t.id),
    s.plan_code,
    s.status
  from public.tenants t
  left join public.subscriptions s on s.tenant_id = t.id
  order by t.created_at desc;
end;
$$;

create or replace function public.create_tenant_for_platform_admin(
  input_name text,
  input_slug text,
  input_owner_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_owner_id uuid;
  v_name text := trim(input_name);
  v_slug text := lower(trim(input_slug));
  v_email text := lower(trim(input_owner_email));
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  if v_name is null or length(v_name) not between 2 and 120 then
    raise exception 'Invalid tenant name' using errcode = '22023';
  end if;

  if v_slug is null or length(v_slug) not between 3 and 60
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid tenant slug' using errcode = '22023';
  end if;

  if v_email is null or length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'A valid owner email is required' using errcode = '22023';
  end if;

  select u.id into v_owner_id
  from auth.users u
  where lower(u.email) = v_email
  limit 1;

  if v_owner_id is null then
    raise exception 'Owner account not found in Supabase Auth. Create the user account first.' using errcode = 'P0002';
  end if;

  insert into public.profiles (id)
  values (v_owner_id)
  on conflict (id) do nothing;

  insert into public.tenants (name, slug, status)
  values (v_name, v_slug, 'trial')
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, v_owner_id, 'owner');

  insert into public.subscriptions (tenant_id, plan_code, status, trial_ends_at)
  values (v_tenant_id, 'starter', 'trialing', now() + interval '30 days');

  insert into public.tenant_settings (tenant_id)
  values (v_tenant_id);

  return v_tenant_id;
end;
$$;

revoke all on function public.get_platform_tenants() from public, anon;
revoke all on function public.create_tenant_for_platform_admin(text, text, text) from public, anon;
grant execute on function public.get_platform_tenants() to authenticated;
grant execute on function public.create_tenant_for_platform_admin(text, text, text) to authenticated;

create or replace function public.get_platform_tenant_members()
returns table (
  tenant_id uuid,
  user_id uuid,
  member_email text,
  member_role public.member_role,
  member_created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  return query
  select tm.tenant_id, tm.user_id, u.email, tm.role, tm.created_at
  from public.tenant_members tm
  join auth.users u on u.id = tm.user_id
  order by tm.tenant_id, tm.role, u.email;
end;
$function$;

create or replace function public.platform_add_tenant_manager(
  input_tenant_id uuid,
  input_email text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_email text := lower(trim(input_email));
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tenants t where t.id = input_tenant_id) then
    raise exception 'Tenant not found' using errcode = 'P0002';
  end if;
  if v_email is null or length(v_email) > 254
     or v_email not like '%@%.%' then
    raise exception 'A valid email is required' using errcode = '22023';
  end if;

  select u.id into v_user_id from auth.users u where lower(u.email) = v_email limit 1;
  if v_user_id is null then
    raise exception 'User account not found in Supabase Auth' using errcode = 'P0002';
  end if;

  insert into public.profiles (id) values (v_user_id) on conflict (id) do nothing;
  insert into public.tenant_members (tenant_id, user_id, role)
  values (input_tenant_id, v_user_id, 'manager')
  on conflict (tenant_id, user_id) do nothing;
end;
$function$;

create or replace function public.platform_remove_tenant_manager(
  input_tenant_id uuid,
  input_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  delete from public.tenant_members
  where tenant_id = input_tenant_id
    and user_id = input_user_id
    and role = 'manager';
end;
$function$;

revoke all on function public.get_platform_tenant_members() from public, anon;
revoke all on function public.platform_add_tenant_manager(uuid, text) from public, anon;
revoke all on function public.platform_remove_tenant_manager(uuid, uuid) from public, anon;
grant execute on function public.get_platform_tenant_members() to authenticated;
grant execute on function public.platform_add_tenant_manager(uuid, text) to authenticated;
grant execute on function public.platform_remove_tenant_manager(uuid, uuid) to authenticated;

commit;

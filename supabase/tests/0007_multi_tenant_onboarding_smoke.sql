-- Smoke tests for the multi-tenant onboarding migration.
-- Run after 0007 in Supabase SQL Editor or psql. These checks verify
-- function/policy/grant presence; row-level isolation still requires the
-- two-user staging test matrix in docs/multi-tenant-security-checklist.md.

do $$
declare
  v_get_my_tenants regprocedure := 'public.get_my_tenants()'::regprocedure;
  v_create_tenant regprocedure := 'public.create_tenant_for_current_user(text,text)'::regprocedure;
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tenants'
      and policyname = 'tenants_member_read'
      and cmd = 'SELECT'
  ) then
    raise exception 'Missing tenants_member_read policy';
  end if;

  if not has_function_privilege('authenticated', v_get_my_tenants, 'EXECUTE') then
    raise exception 'authenticated cannot execute get_my_tenants';
  end if;

  if has_function_privilege('anon', v_get_my_tenants, 'EXECUTE') then
    raise exception 'anon must not execute get_my_tenants';
  end if;

  if not has_function_privilege('authenticated', v_create_tenant, 'EXECUTE') then
    raise exception 'authenticated cannot execute create_tenant_for_current_user';
  end if;

  if has_function_privilege('anon', v_create_tenant, 'EXECUTE') then
    raise exception 'anon must not execute create_tenant_for_current_user';
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_tenant_for_current_user'
      and p.prosecdef = true
      and p.proconfig is not null
      and exists (select 1 from unnest(p.proconfig) setting where setting like 'search_path=%')
  ) then
    raise exception 'Tenant creation RPC must be SECURITY DEFINER with empty search_path';
  end if;
end;
$$;

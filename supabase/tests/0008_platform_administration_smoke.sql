-- Smoke tests for platform administration migration 0008.
-- These verify grants and function hardening, not cross-tenant behaviour.
do $$
declare
  v_list regprocedure := 'public.get_platform_tenants()'::regprocedure;
  v_members regprocedure := 'public.get_platform_tenant_members()'::regprocedure;
  v_create regprocedure := 'public.create_tenant_for_platform_admin(text,text,text)'::regprocedure;
  v_add regprocedure := 'public.platform_add_tenant_manager(uuid,text)'::regprocedure;
  v_remove regprocedure := 'public.platform_remove_tenant_manager(uuid,uuid)'::regprocedure;
begin
  if not has_function_privilege('authenticated', v_list, 'EXECUTE')
     or not has_function_privilege('authenticated', v_members, 'EXECUTE')
     or not has_function_privilege('authenticated', v_create, 'EXECUTE')
     or not has_function_privilege('authenticated', v_add, 'EXECUTE')
     or not has_function_privilege('authenticated', v_remove, 'EXECUTE') then
    raise exception 'authenticated role is missing a platform RPC grant';
  end if;
  if has_function_privilege('anon', v_list, 'EXECUTE')
     or has_function_privilege('anon', v_members, 'EXECUTE')
     or has_function_privilege('anon', v_create, 'EXECUTE')
     or has_function_privilege('anon', v_add, 'EXECUTE')
     or has_function_privilege('anon', v_remove, 'EXECUTE') then
    raise exception 'anon must not execute platform administration RPCs';
  end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in ('get_platform_tenants','get_platform_tenant_members','create_tenant_for_platform_admin','platform_add_tenant_manager','platform_remove_tenant_manager')
      and p.prosecdef = true and p.proconfig @> array['search_path=""']) <> 5 then
    raise exception 'Platform RPCs must be SECURITY DEFINER with empty search_path';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'get_my_tenants' and p.prosecdef = true) then
    raise exception 'get_my_tenants must remain SECURITY DEFINER';
  end if;
end;
$$;
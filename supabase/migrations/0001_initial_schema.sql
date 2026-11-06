-- ZecaTour initial schema
-- Apply with Supabase SQL Editor or Supabase CLI. Review policies in staging before production.
begin;

create extension if not exists pgcrypto;

create type public.tenant_status as enum ('trial','active','suspended','cancelled');
create type public.member_role as enum ('owner','manager');
create type public.subscription_status as enum ('trialing','active','past_due','cancelled','expired');
create type public.reservation_status as enum ('pending','confirmed','rejected','cancelled','completed');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.tenant_status not null default 'trial',
  default_locale text not null default 'pt' check (default_locale in ('pt','en','fr')),
  supported_locales text[] not null default array['pt','en','fr'],
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'manager',
  created_at timestamptz not null default now(),
  unique (tenant_id,user_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  plan_code text not null default 'starter',
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  page_key text not null,
  title jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,page_key)
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.menu_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  price numeric(12,2) not null check (price >= 0),
  currency char(3) not null default 'AOA',
  image_path text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title jsonb not null default '{}'::jsonb,
  image_path text not null,
  alt_text jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  reservation_date date not null,
  reservation_time time,
  party_size integer not null check (party_size between 1 and 100),
  message text,
  status public.reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  unique (tenant_id,weekday),
  check (is_closed or (opens_at is not null and closes_at is not null))
);

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform text not null,
  url text not null,
  sort_order integer not null default 0,
  unique (tenant_id,platform)
);

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  logo_path text,
  cover_path text,
  brand_primary text,
  brand_secondary text,
  address text,
  map_url text,
  whatsapp_number text,
  timezone text not null default 'Africa/Luanda',
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index tenant_members_user_idx on public.tenant_members(user_id);
create index pages_tenant_published_idx on public.pages(tenant_id,is_published);
create index menu_categories_tenant_idx on public.menu_categories(tenant_id,is_active,sort_order);
create index menu_products_tenant_idx on public.menu_products(tenant_id,is_available,sort_order);
create index galleries_tenant_idx on public.galleries(tenant_id,is_published,sort_order);
create index reservations_tenant_date_idx on public.reservations(tenant_id,reservation_date,status);

-- SECURITY DEFINER helpers avoid recursive RLS checks on tenant_members.
create or replace function public.is_platform_admin()
returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_role') = 'superadmin', false);
$$;

create or replace function public.has_tenant_role(target_tenant uuid, allowed_roles public.member_role[] default array['owner','manager']::public.member_role[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = target_tenant
      and tm.user_id = (select auth.uid())
      and tm.role = any(allowed_roles)
  );
$$;

create or replace function public.is_active_tenant(target_tenant uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tenants t
    where t.id = target_tenant and t.status in ('trial','active')
  );
$$;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.pages enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_products enable row level security;
alter table public.galleries enable row level security;
alter table public.reservations enable row level security;
alter table public.business_hours enable row level security;
alter table public.social_links enable row level security;
alter table public.tenant_settings enable row level security;

-- Tenant discovery is restricted to active/trial tenants; private tenant data remains protected.
create policy tenants_public_read on public.tenants for select to anon, authenticated
using (status in ('trial','active'));
create policy tenants_admin_all on public.tenants for all to authenticated
using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy profiles_read_self on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_platform_admin());
create policy profiles_insert_self on public.profiles for insert to authenticated
with check (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy members_read_own_tenant on public.tenant_members for select to authenticated
using (user_id = (select auth.uid()) or public.has_tenant_role(tenant_id,array['owner']::public.member_role[]));
create policy members_platform_admin on public.tenant_members for all to authenticated
using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy members_owner_insert_manager on public.tenant_members for insert to authenticated
with check (
  public.has_tenant_role(tenant_id,array['owner']::public.member_role[])
  and role = 'manager'
);
create policy members_owner_update_manager on public.tenant_members for update to authenticated
using (public.has_tenant_role(tenant_id,array['owner']::public.member_role[]) and role = 'manager')
with check (public.has_tenant_role(tenant_id,array['owner']::public.member_role[]) and role = 'manager');
create policy members_owner_delete_manager on public.tenant_members for delete to authenticated
using (public.has_tenant_role(tenant_id,array['owner']::public.member_role[]) and role = 'manager');

create policy subscriptions_read_owner on public.subscriptions for select to authenticated
using (public.has_tenant_role(tenant_id,array['owner']::public.member_role[]) or public.is_platform_admin());
create policy subscriptions_admin_manage on public.subscriptions for all to authenticated
using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Public content: visitors only see content belonging to an active/trial tenant.
create policy pages_public_read on public.pages for select to anon, authenticated
using (is_published and public.is_active_tenant(tenant_id));
create policy pages_tenant_manage on public.pages for all to authenticated
using (public.has_tenant_role(tenant_id)) with check (public.has_tenant_role(tenant_id));

create policy categories_public_read on public.menu_categories for select to anon, authenticated
using (is_active and public.is_active_tenant(tenant_id));
create policy categories_tenant_manage on public.menu_categories for all to authenticated
using (public.has_tenant_role(tenant_id)) with check (public.has_tenant_role(tenant_id));

create policy products_public_read on public.menu_products for select to anon, authenticated
using (is_available and public.is_active_tenant(tenant_id));
create policy products_tenant_manage on public.menu_products for all to authenticated
using (public.has_tenant_role(tenant_id)) with check (public.has_tenant_role(tenant_id));

create policy galleries_public_read on public.galleries for select to anon, authenticated
using (is_published and public.is_active_tenant(tenant_id));
create policy galleries_tenant_manage on public.galleries for all to authenticated
using (public.has_tenant_role(tenant_id)) with check (public.has_tenant_role(tenant_id));

-- Anonymous users may submit a reservation but cannot read, list or modify reservations.
create policy reservations_public_insert on public.reservations for insert to anon, authenticated
with check (
  public.is_active_tenant(tenant_id)
  and status = 'pending'
  and length(trim(customer_name)) between 2 and 120
  and length(trim(customer_phone)) between 5 and 40
);
create policy reservations_tenant_read on public.reservations for select to authenticated
using (public.has_tenant_role(tenant_id));
create policy reservations_tenant_update on public.reservations for update to authenticated
using (public.has_tenant_role(tenant_id))
with check (public.has_tenant_role(tenant_id));

create policy hours_public_read on public.business_hours for select to anon, authenticated
using (public.is_active_tenant(tenant_id));
create policy hours_tenant_manage on public.business_hours for all to authenticated
using (public.has_tenant_role(tenant_id)) with check (public.has_tenant_role(tenant_id));

create policy socials_public_read on public.social_links for select to anon, authenticated
using (public.is_active_tenant(tenant_id));
create policy socials_tenant_manage on public.social_links for all to authenticated
using (public.has_tenant_role(tenant_id)) with check (public.has_tenant_role(tenant_id));

create policy settings_public_read on public.tenant_settings for select to anon, authenticated
using (public.is_active_tenant(tenant_id));
create policy settings_tenant_manage on public.tenant_settings for all to authenticated
using (public.has_tenant_role(tenant_id)) with check (public.has_tenant_role(tenant_id));

-- Grants are constrained further by RLS policies.
grant usage on schema public to anon, authenticated;
grant select on public.tenants, public.pages, public.menu_categories, public.menu_products,
  public.galleries, public.business_hours, public.social_links, public.tenant_settings to anon, authenticated;
grant insert on public.reservations to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.tenant_members,
  public.subscriptions, public.pages, public.menu_categories, public.menu_products,
  public.galleries, public.reservations, public.business_hours, public.social_links,
  public.tenant_settings to authenticated;

commit;

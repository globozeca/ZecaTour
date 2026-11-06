-- ZecaTour operational integrity improvements
begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create trigger pages_set_updated_at
before update on public.pages
for each row execute function public.set_updated_at();

create trigger menu_products_set_updated_at
before update on public.menu_products
for each row execute function public.set_updated_at();

create trigger reservations_set_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

create trigger tenant_settings_set_updated_at
before update on public.tenant_settings
for each row execute function public.set_updated_at();

drop policy if exists reservations_public_insert on public.reservations;
create policy reservations_public_insert on public.reservations
for insert to anon, authenticated
with check (
  public.is_active_tenant(tenant_id)
  and status = 'pending'
  and length(trim(customer_name)) between 2 and 120
  and length(trim(customer_phone)) between 5 and 40
  and (customer_email is null or length(trim(customer_email)) <= 254)
  and (message is null or length(message) <= 1000)
  and reservation_date between current_date and current_date + 365
);

commit;

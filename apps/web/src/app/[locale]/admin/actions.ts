'use server';

import {redirect} from 'next/navigation';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {getCurrentUserTenantRole} from '@/lib/supabase/tenant-access';

const localeSchema = z.enum(['pt', 'en', 'fr']);
const uuidSchema = z.string().uuid();

function localeFrom(formData: FormData) {
  return localeSchema.catch('pt').parse(formData.get('locale'));
}

function back(locale: string, tenantId: string, result: 'saved' | string): never {
  redirect('/' + locale + '/admin?tenant=' + encodeURIComponent(tenantId) + (result === 'saved' ? '&saved=1' : '&error=' + encodeURIComponent(result)));
}

async function requireTenant(formData: FormData) {
  const locale = localeFrom(formData);
  const parsedId = uuidSchema.safeParse(formData.get('tenant_id'));
  if (!parsedId.success) redirect('/' + locale + '/admin?error=invalid-tenant');

  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin?error=config');

  const role = await getCurrentUserTenantRole(supabase, parsedId.data);
  if (!role) redirect('/' + locale + '/admin?error=forbidden');

  return {locale, tenantId: parsedId.data, role, supabase};
}

export async function loginAdmin(formData: FormData) {
  const locale = localeFrom(formData);
  const email = z.string().email().safeParse(formData.get('email'));
  const password = z.string().min(1).safeParse(formData.get('password'));
  if (!email.success || !password.success) redirect('/' + locale + '/admin/login?error=credentials');

  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin/login?error=config');
  const {error} = await supabase.auth.signInWithPassword({email: email.data, password: password.data});
  if (error) redirect('/' + locale + '/admin/login?error=credentials');
  redirect('/' + locale + '/admin');
}

export async function logoutAdmin(formData: FormData) {
  const locale = localeFrom(formData);
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect('/' + locale + '/admin/login');
}

export async function createTenant(formData: FormData) {
  const locale = localeFrom(formData);
  const name = z.string().trim().min(2).max(120).safeParse(formData.get('name'));
  const slug = z.string().trim().toLowerCase().min(3).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).safeParse(formData.get('slug'));
  if (!name.success || !slug.success) redirect('/' + locale + '/admin?error=tenant-fields');

  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin?error=config');
  const {data: authData} = await supabase.auth.getUser();
  if (!authData.user) redirect('/' + locale + '/admin/login');

  const {data: tenantId, error} = await supabase.rpc('create_tenant_for_current_user', {
    input_name: name.data,
    input_slug: slug.data
  });
  if (error || !tenantId) redirect('/' + locale + '/admin?error=tenant-create');
  redirect('/' + locale + '/admin?tenant=' + encodeURIComponent(tenantId) + '&created=1');
}

export async function updateBusinessSettings(formData: FormData) {
  const {locale, tenantId, supabase} = await requireTenant(formData);
  const address = z.string().max(250).catch('').parse(formData.get('address'));
  const mapUrl = z.string().url().max(1000).or(z.literal('')).catch('').parse(formData.get('map_url'));
  const whatsapp = z.string().max(40).catch('').parse(formData.get('whatsapp_number'));
  const primary = z.string().regex(/^#[0-9a-fA-F]{6}$/).catch('#173b35').parse(formData.get('brand_primary'));
  const secondary = z.string().regex(/^#[0-9a-fA-F]{6}$/).catch('#d6a46b').parse(formData.get('brand_secondary'));

  const {error} = await supabase.from('tenant_settings').upsert({
    tenant_id: tenantId, address, map_url: mapUrl, whatsapp_number: whatsapp,
    brand_primary: primary, brand_secondary: secondary, timezone: 'Africa/Luanda'
  }, {onConflict: 'tenant_id'});
  if (error) back(locale, tenantId, 'save');
  back(locale, tenantId, 'saved');
}

export async function updateReservationStatus(formData: FormData) {
  const {locale, tenantId, supabase} = await requireTenant(formData);
  const id = uuidSchema.safeParse(formData.get('reservation_id'));
  const status = z.enum(['confirmed', 'rejected', 'completed', 'cancelled']).safeParse(formData.get('status'));
  if (!id.success || !status.success) back(locale, tenantId, 'reservation');

  const {error} = await supabase.from('reservations').update({status: status.data})
    .eq('id', id.data).eq('tenant_id', tenantId);
  if (error) back(locale, tenantId, 'reservation');
  back(locale, tenantId, 'saved');
}

export async function createMenuCategory(formData: FormData) {
  const {locale, tenantId, supabase} = await requireTenant(formData);
  const name = z.string().trim().min(2).max(80).safeParse(formData.get('name'));
  if (!name.success) back(locale, tenantId, 'category');
  const {error} = await supabase.from('menu_categories').insert({
    tenant_id: tenantId, name: {pt: name.data, en: name.data, fr: name.data}
  });
  if (error) back(locale, tenantId, 'category');
  back(locale, tenantId, 'saved');
}

export async function createMenuProduct(formData: FormData) {
  const {locale, tenantId, supabase} = await requireTenant(formData);
  const categoryId = z.string().uuid().or(z.literal('')).safeParse(formData.get('category_id'));
  const name = z.string().trim().min(2).max(100).safeParse(formData.get('name'));
  const description = z.string().max(500).catch('').parse(formData.get('description'));
  const price = z.coerce.number().finite().min(0).max(1000000000).safeParse(formData.get('price'));
  if (!categoryId.success || !name.success || !price.success) back(locale, tenantId, 'product');
  const {error} = await supabase.from('menu_products').insert({
    tenant_id: tenantId, category_id: categoryId.data || null,
    name: {pt: name.data, en: name.data, fr: name.data},
    description: {pt: description, en: description, fr: description},
    price: price.data, currency: 'AOA'
  });
  if (error) back(locale, tenantId, 'product');
  back(locale, tenantId, 'saved');
}

export async function updateMenuCategory(formData: FormData) {
  const {locale, tenantId, supabase} = await requireTenant(formData);
  const id = uuidSchema.safeParse(formData.get('category_id'));
  const name = z.string().trim().min(2).max(80).safeParse(formData.get('name'));
  const sortOrder = z.coerce.number().int().min(0).max(10000).safeParse(formData.get('sort_order'));
  if (!id.success || !name.success || !sortOrder.success) back(locale, tenantId, 'category');
  const {error} = await supabase.from('menu_categories').update({
    name: {pt: name.data, en: name.data, fr: name.data},
    sort_order: sortOrder.data, is_active: formData.get('is_active') === 'on'
  }).eq('id', id.data).eq('tenant_id', tenantId);
  if (error) back(locale, tenantId, 'category');
  back(locale, tenantId, 'saved');
}

export async function deleteMenuCategory(formData: FormData) {
  const {locale, tenantId, supabase} = await requireTenant(formData);
  const id = uuidSchema.safeParse(formData.get('category_id'));
  if (!id.success) back(locale, tenantId, 'category');
  const {error} = await supabase.from('menu_categories').delete()
    .eq('id', id.data).eq('tenant_id', tenantId);
  if (error) back(locale, tenantId, 'category');
  back(locale, tenantId, 'saved');
}

export async function updateMenuProduct(formData: FormData) {
  const {locale, tenantId, supabase} = await requireTenant(formData);
  const id = uuidSchema.safeParse(formData.get('product_id'));
  const categoryId = z.string().uuid().or(z.literal('')).safeParse(formData.get('category_id'));
  const name = z.string().trim().min(2).max(100).safeParse(formData.get('name'));
  const description = z.string().max(500).catch('').parse(formData.get('description'));
  const price = z.coerce.number().finite().min(0).max(1000000000).safeParse(formData.get('price'));
  const sortOrder = z.coerce.number().int().min(0).max(10000).safeParse(formData.get('sort_order'));
  if (!id.success || !categoryId.success || !name.success || !price.success || !sortOrder.success) back(locale, tenantId, 'product');
  const {error} = await supabase.from('menu_products').update({
    category_id: categoryId.data || null,
    name: {pt: name.data, en: name.data, fr: name.data},
    description: {pt: description, en: description, fr: description},
    price: price.data, sort_order: sortOrder.data,
    is_available: formData.get('is_available') === 'on'
  }).eq('id', id.data).eq('tenant_id', tenantId);
  if (error) back(locale, tenantId, 'product');
  back(locale, tenantId, 'saved');
}

export async function deleteMenuProduct(formData: FormData) {
  const {locale, tenantId, supabase} = await requireTenant(formData);
  const id = uuidSchema.safeParse(formData.get('product_id'));
  if (!id.success) back(locale, tenantId, 'product');
  const {error} = await supabase.from('menu_products').delete()
    .eq('id', id.data).eq('tenant_id', tenantId);
  if (error) back(locale, tenantId, 'product');
  back(locale, tenantId, 'saved');
}

export async function saveBusinessHour(formData: FormData) {
  const {locale, tenantId, supabase} = await requireTenant(formData);
  const weekday = z.coerce.number().int().min(0).max(6).safeParse(formData.get('weekday'));
  const isClosed = formData.get('is_closed') === 'on';
  const opensAt = z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).safeParse(formData.get('opens_at'));
  const closesAt = z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).safeParse(formData.get('closes_at'));
  if (!weekday.success || (!isClosed && (!opensAt.success || !closesAt.success))) back(locale, tenantId, 'hours');
  const {error} = await supabase.from('business_hours').upsert({
    tenant_id: tenantId, weekday: weekday.data, is_closed: isClosed,
    opens_at: isClosed ? null : opensAt.data, closes_at: isClosed ? null : closesAt.data
  }, {onConflict: 'tenant_id,weekday'});
  if (error) back(locale, tenantId, 'hours');
  back(locale, tenantId, 'saved');
}

export async function saveSocialLink(formData: FormData) {
  const {locale, tenantId, supabase} = await requireTenant(formData);
  const platform = z.enum(['Instagram','Facebook','LinkedIn','TikTok','YouTube','X','Website']).safeParse(formData.get('platform'));
  const url = z.string().url().max(1000).refine((value) => value.startsWith('https://')).safeParse(formData.get('url'));
  if (!platform.success || !url.success) back(locale, tenantId, 'social');
  const {error} = await supabase.from('social_links').upsert({
    tenant_id: tenantId, platform: platform.data, url: url.data
  }, {onConflict: 'tenant_id,platform'});
  if (error) back(locale, tenantId, 'social');
  back(locale, tenantId, 'saved');
}

export async function deleteSocialLink(formData: FormData) {
  const {locale, tenantId, supabase} = await requireTenant(formData);
  const platform = z.string().min(2).max(40).safeParse(formData.get('platform'));
  if (!platform.success) back(locale, tenantId, 'social');
  const {error} = await supabase.from('social_links').delete()
    .eq('tenant_id', tenantId).eq('platform', platform.data);
  if (error) back(locale, tenantId, 'social');
  back(locale, tenantId, 'saved');
}

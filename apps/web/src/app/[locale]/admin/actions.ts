'use server';

import {redirect} from 'next/navigation';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';

const localeSchema = z.enum(['pt', 'en', 'fr']);

export async function loginAdmin(formData: FormData) {
  const locale = localeSchema.catch('pt').parse(formData.get('locale'));
  const email = z.string().email().safeParse(formData.get('email'));
  const password = z.string().min(1).safeParse(formData.get('password'));
  if (!email.success || !password.success) {
    redirect('/' + locale + '/admin/login?error=credentials');
  }

  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin/login?error=config');

  const {error} = await supabase.auth.signInWithPassword({
    email: email.data,
    password: password.data
  });

  if (error) redirect('/' + locale + '/admin/login?error=credentials');
  redirect('/' + locale + '/admin');
}

export async function logoutAdmin(formData: FormData) {
  const locale = localeSchema.catch('pt').parse(formData.get('locale'));
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect('/' + locale + '/admin/login');
}

export async function updateBusinessSettings(formData: FormData) {
  const locale = localeSchema.catch('pt').parse(formData.get('locale'));
  const tenantId = z.string().uuid().safeParse(formData.get('tenant_id'));
  if (!tenantId.success) redirect('/' + locale + '/admin?error=invalid');

  const values = {
    tenant_id: tenantId.data,
    address: z.string().max(250).catch('').parse(formData.get('address')),
    map_url: z.string().url().max(1000).or(z.literal('')).catch('').parse(formData.get('map_url')),
    whatsapp_number: z.string().max(40).catch('').parse(formData.get('whatsapp_number')),
    brand_primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).catch('#173b35').parse(formData.get('brand_primary')),
    brand_secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).catch('#d6a46b').parse(formData.get('brand_secondary')),
    timezone: 'Africa/Luanda'
  };

  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin?error=config');
  const {error} = await supabase.from('tenant_settings').upsert(values, {onConflict: 'tenant_id'});
  if (error) redirect('/' + locale + '/admin?error=save');
  redirect('/' + locale + '/admin?saved=1');
}

export async function updateReservationStatus(formData: FormData) {
  const locale = localeSchema.catch('pt').parse(formData.get('locale'));
  const id = z.string().uuid().safeParse(formData.get('reservation_id'));
  const status = z.enum(['confirmed', 'rejected', 'completed', 'cancelled']).safeParse(formData.get('status'));
  if (!id.success || !status.success) redirect('/' + locale + '/admin?error=invalid');

  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin?error=config');
  const {error} = await supabase.from('reservations').update({status: status.data}).eq('id', id.data);
  if (error) redirect('/' + locale + '/admin?error=reservation');
  redirect('/' + locale + '/admin?saved=1');
}

export async function createMenuCategory(formData: FormData) {
  const locale = localeSchema.catch('pt').parse(formData.get('locale'));
  const tenantId = z.string().uuid().safeParse(formData.get('tenant_id'));
  const name = z.string().trim().min(2).max(80).safeParse(formData.get('name'));
  if (!tenantId.success || !name.success) redirect('/' + locale + '/admin?error=category');

  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin?error=config');
  const {error} = await supabase.from('menu_categories').insert({
    tenant_id: tenantId.data,
    name: {pt: name.data, en: name.data, fr: name.data}
  });
  if (error) redirect('/' + locale + '/admin?error=category');
  redirect('/' + locale + '/admin?saved=1');
}

export async function createMenuProduct(formData: FormData) {
  const locale = localeSchema.catch('pt').parse(formData.get('locale'));
  const tenantId = z.string().uuid().safeParse(formData.get('tenant_id'));
  const categoryId = z.string().uuid().or(z.literal('')).safeParse(formData.get('category_id'));
  const name = z.string().trim().min(2).max(100).safeParse(formData.get('name'));
  const description = z.string().max(500).catch('').parse(formData.get('description'));
  const price = z.coerce.number().finite().min(0).max(1000000000).safeParse(formData.get('price'));
  if (!tenantId.success || !categoryId.success || !name.success || !price.success) {
    redirect('/' + locale + '/admin?error=product');
  }

  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin?error=config');
  const {error} = await supabase.from('menu_products').insert({
    tenant_id: tenantId.data,
    category_id: categoryId.data || null,
    name: {pt: name.data, en: name.data, fr: name.data},
    description: {pt: description, en: description, fr: description},
    price: price.data,
    currency: 'AOA'
  });
  if (error) redirect('/' + locale + '/admin?error=product');
  redirect('/' + locale + '/admin?saved=1');
}

export async function saveBusinessHour(formData: FormData) {
  const locale = localeSchema.catch('pt').parse(formData.get('locale'));
  const tenantId = z.string().uuid().safeParse(formData.get('tenant_id'));
  const weekday = z.coerce.number().int().min(0).max(6).safeParse(formData.get('weekday'));
  const isClosed = formData.get('is_closed') === 'on';
  const opensAt = z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).safeParse(formData.get('opens_at'));
  const closesAt = z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).safeParse(formData.get('closes_at'));
  if (!tenantId.success || !weekday.success || (!isClosed && (!opensAt.success || !closesAt.success))) redirect('/' + locale + '/admin?error=hours');
  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin?error=config');
  const {error} = await supabase.from('business_hours').upsert({
    tenant_id: tenantId.data,
    weekday: weekday.data,
    is_closed: isClosed,
    opens_at: isClosed ? null : opensAt.data,
    closes_at: isClosed ? null : closesAt.data
  }, {onConflict: 'tenant_id,weekday'});
  if (error) redirect('/' + locale + '/admin?error=hours');
  redirect('/' + locale + '/admin?saved=1');
}

export async function saveSocialLink(formData: FormData) {
  const locale = localeSchema.catch('pt').parse(formData.get('locale'));
  const tenantId = z.string().uuid().safeParse(formData.get('tenant_id'));
  const platform = z.enum(['Instagram','Facebook','LinkedIn','TikTok','YouTube','X','Website']).safeParse(formData.get('platform'));
  const url = z.string().url().max(1000).refine((value) => value.startsWith('https://')).safeParse(formData.get('url'));
  if (!tenantId.success || !platform.success || !url.success) redirect('/' + locale + '/admin?error=social');
  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin?error=config');
  const {error} = await supabase.from('social_links').upsert({
    tenant_id: tenantId.data,
    platform: platform.data,
    url: url.data
  }, {onConflict: 'tenant_id,platform'});
  if (error) redirect('/' + locale + '/admin?error=social');
  redirect('/' + locale + '/admin?saved=1');
}

export async function deleteSocialLink(formData: FormData) {
  const locale = localeSchema.catch('pt').parse(formData.get('locale'));
  const tenantId = z.string().uuid().safeParse(formData.get('tenant_id'));
  const platform = z.string().min(2).max(40).safeParse(formData.get('platform'));
  if (!tenantId.success || !platform.success) redirect('/' + locale + '/admin?error=social');
  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin?error=config');
  const {error} = await supabase.from('social_links').delete().eq('tenant_id', tenantId.data).eq('platform', platform.data);
  if (error) redirect('/' + locale + '/admin?error=social');
  redirect('/' + locale + '/admin?saved=1');
}

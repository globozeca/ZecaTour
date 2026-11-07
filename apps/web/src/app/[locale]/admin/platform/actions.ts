'use server';

import {redirect} from 'next/navigation';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';

const localeSchema = z.enum(['pt', 'en', 'fr']);
const uuidSchema = z.string().uuid();

function localeFrom(formData: FormData) {
  return localeSchema.catch('pt').parse(formData.get('locale'));
}

async function requirePlatformAdmin(locale: string) {
  const supabase = await createClient();
  if (!supabase) redirect('/' + locale + '/admin/login?error=config');
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/' + locale + '/admin/login');
  if (data.user.app_metadata?.platform_role !== 'superadmin') {
    redirect('/' + locale + '/admin?error=forbidden');
  }
  return supabase;
}

export async function createPlatformTenant(formData: FormData) {
  const locale = localeFrom(formData);
  const name = z.string().trim().min(2).max(120).safeParse(formData.get('name'));
  const slug = z.string().trim().toLowerCase().min(3).max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).safeParse(formData.get('slug'));
  const ownerEmail = z.string().trim().email().max(254).safeParse(formData.get('owner_email'));
  if (!name.success || !slug.success || !ownerEmail.success) {
    redirect('/' + locale + '/admin/platform?error=fields');
  }

  const supabase = await requirePlatformAdmin(locale);
  const {data, error} = await supabase.rpc('create_tenant_for_platform_admin', {
    input_name: name.data,
    input_slug: slug.data,
    input_owner_email: ownerEmail.data
  });
  if (error || !data) redirect('/' + locale + '/admin/platform?error=create');
  redirect('/' + locale + '/admin/platform?created=1');
}

export async function updatePlatformTenantStatus(formData: FormData) {
  const locale = localeFrom(formData);
  const id = uuidSchema.safeParse(formData.get('tenant_id'));
  const status = z.enum(['trial', 'active', 'suspended', 'cancelled'])
    .safeParse(formData.get('status'));
  if (!id.success || !status.success) redirect('/' + locale + '/admin/platform?error=fields');

  const supabase = await requirePlatformAdmin(locale);
  const {error} = await supabase.from('tenants')
    .update({status: status.data})
    .eq('id', id.data);
  if (error) redirect('/' + locale + '/admin/platform?error=update');
  redirect('/' + locale + '/admin/platform?saved=1');
}

export async function logoutPlatformAdmin(formData: FormData) {
  const locale = localeFrom(formData);
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect('/' + locale + '/admin/login');
}

'use server';

import {redirect} from 'next/navigation';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';

const reservationSchema = z.object({
  locale: z.enum(['pt', 'en', 'fr']),
  slug: z.string().regex(/^[a-z0-9-]{2,80}$/),
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(5).max(40),
  customer_email: z.string().trim().email().max(254).optional().or(z.literal('')),
  reservation_date: z.string().date(),
  reservation_time: z.string().optional(),
  party_size: z.coerce.number().int().min(1).max(100),
  message: z.string().max(1000).optional()
});

export async function createReservation(formData: FormData) {
  const parsed = reservationSchema.safeParse({
    locale: formData.get('locale'),
    slug: formData.get('slug'),
    customer_name: formData.get('customer_name'),
    customer_phone: formData.get('customer_phone'),
    customer_email: formData.get('customer_email') || '',
    reservation_date: formData.get('reservation_date'),
    reservation_time: formData.get('reservation_time') || null,
    party_size: formData.get('party_size'),
    message: formData.get('message') || ''
  });

  if (!parsed.success) {
    redirect('/pt/alfa?reservation=invalid#reservar');
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect('/pt/alfa?reservation=unavailable#reservar');
  }

  const {data: tenantRows, error: tenantError} = await supabase.rpc(
    'get_public_tenant_by_slug',
    {input_slug: parsed.data.slug}
  );

  if (tenantError || !tenantRows?.length) {
    redirect('/pt/alfa?reservation=unavailable#reservar');
  }

  const {error} = await supabase.from('reservations').insert({
    tenant_id: tenantRows[0].tenant_id,
    customer_name: parsed.data.customer_name,
    customer_phone: parsed.data.customer_phone,
    customer_email: parsed.data.customer_email || null,
    reservation_date: parsed.data.reservation_date,
    reservation_time: parsed.data.reservation_time || null,
    party_size: parsed.data.party_size,
    message: parsed.data.message || null,
    status: 'pending'
  });

  const base = '/' + parsed.data.locale + '/' + parsed.data.slug;
  if (error) redirect(base + '?reservation=error#reservar');
  redirect(base + '?reservation=received#reservar');
}

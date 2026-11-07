import type {SupabaseClient} from '@supabase/supabase-js';

export type TenantRole = 'owner' | 'manager';

export async function getCurrentUserTenantRole(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantRole | null> {
  const {data: authData, error: authError} = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const {data: membership, error} = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (error || !membership) return null;
  if (membership.role !== 'owner' && membership.role !== 'manager') return null;
  return membership.role;
}

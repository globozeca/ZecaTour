import {redirect} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';
import {createClient} from '@/lib/supabase/server';
import {addPlatformTenantManager, createPlatformTenant, logoutPlatformAdmin, removePlatformTenantManager, updatePlatformTenantDetails, updatePlatformTenantStatus} from './actions';

type PlatformMember = { tenant_id: string; user_id: string; member_email: string; member_role: 'owner' | 'manager'; member_created_at: string; };\n\ntype PlatformTenant = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  created_at: string;
  owner_email: string | null;
  member_count: number;
  plan_code: string | null;
  subscription_status: string | null;
};

const statusLabels: Record<PlatformTenant['tenant_status'], string> = {
  trial: 'Experimental', active: 'Activo', suspended: 'Suspenso', cancelled: 'Cancelado'
};

export default async function PlatformAdminDashboard({
  params,
  searchParams
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{created?: string; saved?: string; error?: string}>;
}) {
  const {locale} = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  if (!supabase) return <main className="min-h-screen p-8">Configure as variáveis públicas do Supabase.</main>;
  const {data: authData} = await supabase.auth.getUser();
  if (!authData.user) redirect('/' + locale + '/admin/login');
  if (authData.user.app_metadata?.platform_role !== 'superadmin') redirect('/' + locale + '/admin');

  const {data, error} = await supabase.rpc('get_platform_tenants');
  const tenants = (data || []) as PlatformTenant[];
  const alertText = query.created ? 'Empresa criada e responsável associado.' :
    query.saved ? 'Estado da empresa actualizado.' :
    query.error === 'fields' ? 'Verifique os campos do formulário.' :
    query.error === 'create' ? 'Não foi possível criar a empresa. Confirme se o responsável já tem conta no Supabase Auth e se o slug está disponível.' :
    query.error === 'update' ? 'Não foi possível actualizar a empresa.' :\n    query.error === 'member' ? 'Não foi possível gerir o membro. Confirme se a conta existe no Supabase Auth.' :
    query.error ? 'Não foi possível concluir a operação.' : '';

  return <main className="min-h-screen bg-[#f7f5ef] text-[#18332d]">
    <header className="border-b border-[#e1dbcf] bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div><p className="text-xs font-bold tracking-[0.2em] text-[#a56e3f]">ZECATOUR · PLATFORM</p><h1 className="mt-1 text-2xl font-semibold">Administração da plataforma</h1><p className="mt-1 text-xs text-[#66756d]">Sessão: {authData.user.email}</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <a href={'/' + locale + '/admin'} className="rounded-full border border-[#d5cfc3] px-4 py-2 text-sm">Painel de empresa</a>
          <form action={logoutPlatformAdmin}><input type="hidden" name="locale" value={locale}/><button className="rounded-full border border-[#d5cfc3] px-4 py-2 text-sm">Terminar sessão</button></form>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      {alertText && <p role="status" className="rounded-xl bg-[#e7eee8] p-4 text-sm">{alertText}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">Não foi possível carregar os dados globais. Confirme que a migração 0008 está aplicada.</p>}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-6"><p className="text-sm text-[#66756d]">Empresas</p><p className="mt-2 text-3xl font-semibold">{tenants.length}</p></div>
        <div className="rounded-2xl bg-white p-6"><p className="text-sm text-[#66756d]">Activas</p><p className="mt-2 text-3xl font-semibold">{tenants.filter((item) => item.tenant_status === 'active').length}</p></div>
        <div className="rounded-2xl bg-white p-6"><p className="text-sm text-[#66756d]">Em período experimental</p><p className="mt-2 text-3xl font-semibold">{tenants.filter((item) => item.tenant_status === 'trial').length}</p></div>
      </section>

      <section className="rounded-2xl bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Registar empresa e responsável</h2>
        <p className="mt-2 text-sm text-[#66756d]">O responsável tem de possuir uma conta no Supabase Auth. Será associado como proprietário; a empresa começa em período experimental de 30 dias.</p>
        <form action={createPlatformTenant} className="mt-5 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="locale" value={locale}/>
          <label className="grid gap-1 text-sm">Nome da empresa<input required name="name" minLength={2} maxLength={120} className="rounded-xl border border-[#d5cfc3] px-4 py-3"/></label>
          <label className="grid gap-1 text-sm">Slug público<input required name="slug" minLength={3} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="hotel-atlantico" className="rounded-xl border border-[#d5cfc3] px-4 py-3"/></label>
          <label className="grid gap-1 text-sm">Email do proprietário<input required type="email" name="owner_email" maxLength={254} placeholder="responsavel@empresa.com" className="rounded-xl border border-[#d5cfc3] px-4 py-3"/></label>
          <button className="rounded-full bg-[#173b35] px-6 py-3 font-semibold text-white md:col-span-3 md:justify-self-start">Criar empresa</button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Todas as empresas</h2><p className="mt-1 text-sm text-[#66756d]">Visão global da plataforma, independentemente da associação do utilizador.</p></div><span className="text-sm text-[#66756d]">{tenants.length} registo(s)</span></div>
        {tenants.length ? <div className="mt-6 space-y-3">{tenants.map((tenant) => <article key={tenant.tenant_id} className="rounded-xl border border-[#e1dbcf] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h3 className="font-semibold">{tenant.tenant_name}</h3><p className="mt-1 text-xs text-[#66756d]">/{locale}/{tenant.tenant_slug} · {tenant.owner_email || 'Sem proprietário associado'}</p><p className="mt-1 text-xs text-[#66756d]">{tenant.member_count} membro(s) · Plano {tenant.plan_code || '—'} · Subscrição {tenant.subscription_status || '—'}</p></div>
            <div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#f1eee7] px-3 py-2 text-xs">{statusLabels[tenant.tenant_status]}</span><a href={'/' + locale + '/' + tenant.tenant_slug} target="_blank" rel="noreferrer" className="rounded-full border border-[#d5cfc3] px-3 py-2 text-xs">Página pública</a><a href={'/' + locale + '/admin?tenant=' + tenant.tenant_id} className="rounded-full border border-[#d5cfc3] px-3 py-2 text-xs">Abrir gestão</a></div>
          </div>
          <details className="mt-4 rounded-xl bg-[#f7f5ef] p-4">
            <summary className="cursor-pointer text-sm font-semibold">Editar empresa e gerir equipa</summary>
            <form action={updatePlatformTenantDetails} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/>
              <label className="grid gap-1 text-xs">Nome<input name="name" required minLength={2} maxLength={120} defaultValue={tenant.tenant_name} className="rounded-lg border border-[#d5cfc3] bg-white px-3 py-2 text-sm"/></label>
              <label className="grid gap-1 text-xs">Slug<input name="slug" required minLength={3} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={tenant.tenant_slug} className="rounded-lg border border-[#d5cfc3] bg-white px-3 py-2 text-sm"/></label>
              <button className="rounded-full border border-[#173b35] px-4 py-2 text-xs font-semibold sm:col-span-2 sm:justify-self-start">Guardar dados da empresa</button>
            </form>
            <div className="mt-5 border-t border-[#e1dbcf] pt-4">
              <h4 className="text-sm font-semibold">Membros e funcionários</h4>
              <ul className="mt-3 space-y-2">{members.filter((member) => member.tenant_id === tenant.tenant_id).map((member) => <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs"><span>{member.member_email} · {member.member_role === 'owner' ? 'Proprietário' : 'Gestor'}</span>{member.member_role === 'manager' && <form action={removePlatformTenantManager}><input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/><input type="hidden" name="user_id" value={member.user_id}/><button className="text-red-700 underline">Remover gestor</button></form>}</li>)}</ul>
              <form action={addPlatformTenantManager} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/>
                <input required type="email" name="email" placeholder="email@empresa.com" className="min-w-0 flex-1 rounded-lg border border-[#d5cfc3] bg-white px-3 py-2 text-sm"/>
                <button className="rounded-full bg-[#173b35] px-4 py-2 text-xs font-semibold text-white">Adicionar gestor</button>
              </form>
              <p className="mt-2 text-xs text-[#66756d]">A conta do gestor tem de existir previamente no Supabase Auth. O proprietário não pode ser removido por esta operação.</p>
            </div>
          </details>
          <form action={updatePlatformTenantStatus} className="mt-4 flex flex-wrap items-center gap-2">
            <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/>
            <label className="text-xs text-[#66756d]">Estado <select name="status" defaultValue={tenant.tenant_status} className="ml-2 rounded-lg border border-[#d5cfc3] bg-white px-3 py-2">{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <button className="rounded-full bg-[#173b35] px-4 py-2 text-xs font-semibold text-white">Guardar estado</button>
          </form>
        </article>)}</div> : <p className="mt-6 text-sm text-[#66756d]">Ainda não existem empresas registadas.</p>}
      </section>
    </div>
  </main>;
}

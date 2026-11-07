import {redirect} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';
import {createClient} from '@/lib/supabase/server';
import {createMenuCategory, createMenuProduct, deleteSocialLink, logoutAdmin, saveBusinessHour, saveSocialLink, updateBusinessSettings, updateReservationStatus} from './actions';

export default async function AdminDashboard({
  params,
  searchParams
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{saved?: string; error?: string}>;
}) {
  const {locale} = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const supabase = await createClient();
  if (!supabase) return <main className="min-h-screen p-10">Configure as variáveis públicas do Supabase para activar o painel.</main>;

  const {data: authData} = await supabase.auth.getUser();
  if (!authData.user) redirect('/' + locale + '/admin/login');

  const {data: tenantRows} = await supabase.rpc('get_public_tenant_by_slug', {input_slug: 'alfa'});
  const tenant = tenantRows?.[0];
  if (!tenant) return <main className="min-h-screen p-10">O estabelecimento ALFA não está disponível.</main>;

  const {data: membership} = await supabase.from('tenant_members')
    .select('role').eq('tenant_id', tenant.tenant_id).eq('user_id', authData.user.id).maybeSingle();

  if (!membership) return <main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-6 text-[#18332d]">
    <div className="max-w-xl rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Acesso ainda não autorizado</h1>
      <p className="mt-4 leading-7 text-[#66756d]">A conta iniciou sessão, mas ainda não está associada ao ALFA Beach Bar. O responsável pela plataforma deve atribuir-lhe o papel de proprietário ou gestor na tabela tenant_members.</p>
      <form action={logoutAdmin} className="mt-6"><input type="hidden" name="locale" value={locale}/><button className="rounded-full bg-[#173b35] px-5 py-3 text-white">Terminar sessão</button></form>
    </div>
  </main>;

  const [settingsResult, reservationsResult, categoriesResult, productsResult, hoursResult, socialsResult] = await Promise.all([
    supabase.from('tenant_settings').select('address,map_url,whatsapp_number,brand_primary,brand_secondary').eq('tenant_id', tenant.tenant_id).maybeSingle(),
    supabase.from('reservations').select('id,customer_name,customer_phone,customer_email,reservation_date,reservation_time,party_size,message,status,created_at').eq('tenant_id', tenant.tenant_id).order('created_at', {ascending: false}).limit(100),
    supabase.from('menu_categories').select('id,name,is_active,sort_order').eq('tenant_id', tenant.tenant_id).order('sort_order'),
    supabase.from('menu_products').select('id,name,price,currency,is_available,category_id').eq('tenant_id', tenant.tenant_id).order('sort_order'),
    supabase.from('business_hours').select('weekday,opens_at,closes_at,is_closed').eq('tenant_id', tenant.tenant_id).order('weekday'),
    supabase.from('social_links').select('platform,url').eq('tenant_id', tenant.tenant_id).order('sort_order')
  ]);
  const settings = settingsResult.data;
  const reservations = reservationsResult.data || [];
  const categories = categoriesResult.data || [];
  const products = productsResult.data || [];
  const hours = hoursResult.data || [];
  const socials = socialsResult.data || [];
  const weekdayNames = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const statusLabel: Record<string,string> = {pending:'Pendente',confirmed:'Confirmada',rejected:'Recusada',cancelled:'Cancelada',completed:'Concluída'};
  const alertText = query.saved ? 'Alterações guardadas.' : query.error ? 'Não foi possível guardar. Verifique os campos e as permissões.' : '';

  return <main className="min-h-screen bg-[#f7f5ef] text-[#18332d]">
    <header className="border-b border-[#e1dbcf] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div><p className="text-xs font-bold tracking-[0.2em] text-[#a56e3f]">ZECATOUR · ALFA</p><h1 className="mt-1 text-xl font-semibold">Painel de gestão</h1></div>
        <form action={logoutAdmin}><input type="hidden" name="locale" value={locale}/><button className="rounded-full border border-[#d5cfc3] px-4 py-2 text-sm">Terminar sessão</button></form>
      </div>
    </header>
    <div className="mx-auto max-w-7xl space-y-10 px-6 py-10">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-6"><p className="text-sm text-[#66756d]">Pedidos de reserva</p><p className="mt-2 text-3xl font-semibold">{reservations.length}</p></div>
        <div className="rounded-2xl bg-white p-6"><p className="text-sm text-[#66756d]">Categorias do menu</p><p className="mt-2 text-3xl font-semibold">{categories.length}</p></div>
        <div className="rounded-2xl bg-white p-6"><p className="text-sm text-[#66756d]">Produtos</p><p className="mt-2 text-3xl font-semibold">{products.length}</p></div>
      </div>
      {alertText && <p role="status" className="rounded-xl bg-[#e7eee8] p-4 text-sm">{alertText}</p>}

      <section className="rounded-2xl bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Dados públicos do estabelecimento</h2>
        <p className="mt-2 text-sm text-[#66756d]">Estes dados são apresentados no website público do ALFA.</p>
        <form action={updateBusinessSettings} className="mt-6 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/>
          <label className="grid gap-2 text-sm sm:col-span-2">Morada<input name="address" defaultValue={settings?.address || ''} maxLength={250} className="rounded-xl border border-[#d5cfc3] px-4 py-3"/></label>
          <label className="grid gap-2 text-sm">WhatsApp<input name="whatsapp_number" defaultValue={settings?.whatsapp_number || ''} maxLength={40} className="rounded-xl border border-[#d5cfc3] px-4 py-3"/></label>
          <label className="grid gap-2 text-sm">Ligação do mapa<input name="map_url" type="url" defaultValue={settings?.map_url || ''} className="rounded-xl border border-[#d5cfc3] px-4 py-3"/></label>
          <label className="grid gap-2 text-sm">Cor principal<input name="brand_primary" type="color" defaultValue={settings?.brand_primary || '#173b35'} className="h-12 w-full rounded-xl border border-[#d5cfc3] p-1"/></label>
          <label className="grid gap-2 text-sm">Cor secundária<input name="brand_secondary" type="color" defaultValue={settings?.brand_secondary || '#d6a46b'} className="h-12 w-full rounded-xl border border-[#d5cfc3] p-1"/></label>
          <button className="rounded-full bg-[#173b35] px-6 py-3 font-semibold text-white sm:col-span-2 sm:justify-self-start">Guardar dados</button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Horários de funcionamento</h2>
        <p className="mt-2 text-sm text-[#66756d]">Configure cada dia da semana. Os horários são apresentados no website público.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {weekdayNames.map((day, weekday) => {
            const current = hours.find((item) => item.weekday === weekday);
            return <form key={weekday} action={saveBusinessHour} className="grid gap-3 rounded-xl bg-[#f7f5ef] p-4">
              <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/><input type="hidden" name="weekday" value={weekday}/>
              <div className="flex items-center justify-between gap-3"><strong className="text-sm">{day}</strong><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_closed" defaultChecked={current?.is_closed || false}/> Encerrado</label></div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs">Abertura<input type="time" name="opens_at" defaultValue={current?.opens_at ? String(current.opens_at).slice(0,5) : '09:00'} className="rounded-lg border border-[#d5cfc3] bg-white px-3 py-2"/></label>
                <label className="grid gap-1 text-xs">Fecho<input type="time" name="closes_at" defaultValue={current?.closes_at ? String(current.closes_at).slice(0,5) : '18:00'} className="rounded-lg border border-[#d5cfc3] bg-white px-3 py-2"/></label>
              </div>
              <button className="rounded-full border border-[#173b35] px-4 py-2 text-xs font-semibold sm:justify-self-start">Guardar horário</button>
            </form>;
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Redes sociais e ligações</h2>
        <form action={saveSocialLink} className="mt-6 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
          <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/>
          <select name="platform" required className="rounded-xl border border-[#d5cfc3] bg-white px-4 py-3"><option value="Instagram">Instagram</option><option value="Facebook">Facebook</option><option value="LinkedIn">LinkedIn</option><option value="TikTok">TikTok</option><option value="YouTube">YouTube</option><option value="X">X</option><option value="Website">Website</option></select>
          <input name="url" type="url" required placeholder="https://..." className="rounded-xl border border-[#d5cfc3] px-4 py-3"/>
          <button className="rounded-full bg-[#173b35] px-5 py-3 text-sm font-semibold text-white">Guardar ligação</button>
        </form>
        {socials.length ? <ul className="mt-5 space-y-2">{socials.map((social) => <li key={social.platform} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f7f5ef] p-3 text-sm">
          <span><strong>{social.platform}</strong> · <a href={social.url} target="_blank" rel="noreferrer" className="underline">{social.url}</a></span>
          <form action={deleteSocialLink}><input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/><input type="hidden" name="platform" value={social.platform}/><button className="text-xs text-red-700 underline">Eliminar</button></form>
        </li>)}</ul> : <p className="mt-5 text-sm text-[#66756d]">Ainda não existem ligações configuradas.</p>}
      </section>

      <section className="rounded-2xl bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Menu digital</h2>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <form action={createMenuCategory} className="grid content-start gap-3">
            <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/>
            <h3 className="font-semibold">Nova categoria</h3>
            <input required name="name" placeholder="Ex.: Bebidas" maxLength={80} className="rounded-xl border border-[#d5cfc3] px-4 py-3"/>
            <button className="rounded-full border border-[#173b35] px-5 py-3 text-sm font-semibold">Adicionar categoria</button>
          </form>
          <form action={createMenuProduct} className="grid content-start gap-3">
            <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/>
            <h3 className="font-semibold">Novo produto</h3>
            <input required name="name" placeholder="Nome do produto" maxLength={100} className="rounded-xl border border-[#d5cfc3] px-4 py-3"/>
            <textarea name="description" placeholder="Descrição (opcional)" maxLength={500} rows={2} className="rounded-xl border border-[#d5cfc3] px-4 py-3"/>
            <select name="category_id" className="rounded-xl border border-[#d5cfc3] bg-white px-4 py-3"><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name?.pt || category.name?.en || 'Categoria'}</option>)}</select>
            <input required name="price" type="number" min="0" step="0.01" placeholder="Preço em Kz" className="rounded-xl border border-[#d5cfc3] px-4 py-3"/>
            <button className="rounded-full border border-[#173b35] px-5 py-3 text-sm font-semibold">Adicionar produto</button>
          </form>
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div><h3 className="mb-3 font-semibold">Categorias existentes</h3>{categories.length ? <ul className="space-y-2 text-sm">{categories.map((category) => <li key={category.id} className="rounded-lg bg-[#f7f5ef] p-3">{category.name?.pt || category.name?.en || 'Categoria'}</li>)}</ul> : <p className="text-sm text-[#66756d]">Ainda não existem categorias.</p>}</div>
          <div><h3 className="mb-3 font-semibold">Produtos existentes</h3>{products.length ? <ul className="space-y-2 text-sm">{products.map((product) => <li key={product.id} className="flex justify-between gap-3 rounded-lg bg-[#f7f5ef] p-3"><span>{product.name?.pt || product.name?.en || 'Produto'}</span><strong>{Number(product.price).toLocaleString('pt-PT')} Kz</strong></li>)}</ul> : <p className="text-sm text-[#66756d]">Ainda não existem produtos.</p>}</div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Pedidos de reserva</h2>
        {reservations.length ? <div className="mt-6 space-y-4">{reservations.map((reservation) => <article key={reservation.id} className="rounded-xl border border-[#e4ded3] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-semibold">{reservation.customer_name}</h3><p className="mt-1 text-sm text-[#66756d]">{reservation.customer_phone}{reservation.customer_email ? ' · ' + reservation.customer_email : ''}</p><p className="mt-2 text-sm">{reservation.reservation_date}{reservation.reservation_time ? ' · ' + String(reservation.reservation_time).slice(0,5) : ''} · {reservation.party_size} pessoa(s)</p>{reservation.message && <p className="mt-2 text-sm text-[#66756d]">{reservation.message}</p>}</div>
            <span className="rounded-full bg-[#f1eee7] px-3 py-1 text-xs font-semibold">{statusLabel[reservation.status] || reservation.status}</span>
          </div>
          {reservation.status === 'pending' && <form action={updateReservationStatus} className="mt-4 flex flex-wrap gap-2">
            <input type="hidden" name="locale" value={locale}/><input type="hidden" name="reservation_id" value={reservation.id}/>
            <button name="status" value="confirmed" className="rounded-full bg-[#173b35] px-4 py-2 text-xs font-semibold text-white">Confirmar</button>
            <button name="status" value="rejected" className="rounded-full border border-[#d5cfc3] px-4 py-2 text-xs font-semibold">Recusar</button>
          </form>}
        </article>)}</div> : <p className="mt-5 text-sm text-[#66756d]">Ainda não foram recebidos pedidos de reserva.</p>}
      </section>
    </div>
  </main>;
}

import {redirect} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';
import {createClient} from '@/lib/supabase/server';
import {createMenuCategory, createMenuProduct, deleteMenuCategory, deleteMenuProduct, logoutAdmin, updateBusinessSettings, updateMenuCategory, updateMenuProduct, updateReservationStatus} from './actions';

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

  const [settingsResult, reservationsResult, categoriesResult, productsResult] = await Promise.all([
    supabase.from('tenant_settings').select('address,map_url,whatsapp_number,brand_primary,brand_secondary').eq('tenant_id', tenant.tenant_id).maybeSingle(),
    supabase.from('reservations').select('id,customer_name,customer_phone,customer_email,reservation_date,reservation_time,party_size,message,status,created_at').eq('tenant_id', tenant.tenant_id).order('created_at', {ascending: false}).limit(100),
    supabase.from('menu_categories').select('id,name,is_active,sort_order').eq('tenant_id', tenant.tenant_id).order('sort_order'),
    supabase.from('menu_products').select('id,name,description,price,currency,is_available,category_id,sort_order').eq('tenant_id', tenant.tenant_id).order('sort_order')
  ]);
  const settings = settingsResult.data;
  const reservations = reservationsResult.data || [];
  const categories = categoriesResult.data || [];
  const products = productsResult.data || [];
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
          <button className="rounded-full bg-[#173b35] px-6 py-3 font-semibold text-white sm:col-span-2 sm:justify-self-start">Guardar dados</button>
        </form>
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
        <div className="mt-8 grid gap-8">
          <div>
            <h3 className="mb-3 font-semibold">Gerir categorias</h3>
            {categories.length ? <div className="space-y-3">{categories.map((category) => <div key={category.id} className="rounded-xl bg-[#f7f5ef] p-4">
              <form action={updateMenuCategory} className="grid gap-3 sm:grid-cols-[1fr_100px_auto] sm:items-end">
                <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/><input type="hidden" name="category_id" value={category.id}/>
                <label className="grid gap-1 text-xs">Nome<input name="name" required maxLength={80} defaultValue={category.name?.pt || category.name?.en || ''} className="rounded-lg border border-[#d5cfc3] bg-white px-3 py-2 text-sm"/></label>
                <label className="grid gap-1 text-xs">Ordem<input name="sort_order" type="number" min="0" defaultValue={category.sort_order} className="rounded-lg border border-[#d5cfc3] bg-white px-3 py-2 text-sm"/></label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_active" defaultChecked={category.is_active}/> Activa</label>
                <button className="rounded-full border border-[#173b35] px-4 py-2 text-xs font-semibold sm:col-span-3 sm:justify-self-start">Guardar categoria</button>
              </form>
              <form action={deleteMenuCategory} className="mt-2">
                <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/><input type="hidden" name="category_id" value={category.id}/>
                <button className="text-xs text-red-700 underline">Eliminar categoria</button>
              </form>
            </div>)}</div> : <p className="text-sm text-[#66756d]">Ainda não existem categorias.</p>}
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Gerir produtos</h3>
            {products.length ? <div className="grid gap-3 lg:grid-cols-2">{products.map((product) => <div key={product.id} className="rounded-xl bg-[#f7f5ef] p-4">
              <form action={updateMenuProduct} className="grid gap-3">
                <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/><input type="hidden" name="product_id" value={product.id}/>
                <label className="grid gap-1 text-xs">Nome<input name="name" required maxLength={100} defaultValue={product.name?.pt || product.name?.en || ''} className="rounded-lg border border-[#d5cfc3] bg-white px-3 py-2 text-sm"/></label>
                <label className="grid gap-1 text-xs">Descrição<textarea name="description" maxLength={500} rows={2} defaultValue={product.description?.pt || product.description?.en || ''} className="rounded-lg border border-[#d5cfc3] bg-white px-3 py-2 text-sm"/></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-xs">Preço (Kz)<input name="price" type="number" min="0" step="0.01" required defaultValue={Number(product.price)} className="rounded-lg border border-[#d5cfc3] bg-white px-3 py-2 text-sm"/></label>
                  <label className="grid gap-1 text-xs">Ordem<input name="sort_order" type="number" min="0" defaultValue={product.sort_order} className="rounded-lg border border-[#d5cfc3] bg-white px-3 py-2 text-sm"/></label>
                </div>
                <label className="grid gap-1 text-xs">Categoria<select name="category_id" defaultValue={product.category_id || ''} className="rounded-lg border border-[#d5cfc3] bg-white px-3 py-2 text-sm"><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name?.pt || category.name?.en || 'Categoria'}</option>)}</select></label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_available" defaultChecked={product.is_available}/> Disponível no menu público</label>
                <button className="rounded-full border border-[#173b35] px-4 py-2 text-xs font-semibold">Guardar produto</button>
              </form>
              <form action={deleteMenuProduct} className="mt-2">
                <input type="hidden" name="locale" value={locale}/><input type="hidden" name="tenant_id" value={tenant.tenant_id}/><input type="hidden" name="product_id" value={product.id}/>
                <button className="text-xs text-red-700 underline">Eliminar produto</button>
              </form>
            </div>)}</div> : <p className="text-sm text-[#66756d]">Ainda não existem produtos.</p>}
          </div>
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

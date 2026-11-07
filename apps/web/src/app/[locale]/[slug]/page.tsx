import {notFound} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';
import {createClient} from '@/lib/supabase/server';
import {createReservation} from '../reservations/actions';

type JsonText = string | Record<string, string> | null | undefined;

type TenantProfile = {
  tenant_id: string;
  tenant_name?: string | null;
  brand_primary?: string | null;
  brand_secondary?: string | null;
  contact_phone?: string | null;
  whatsapp_number?: string | null;
  address?: string | null;
  map_url?: string | null;
};

type MenuCategory = {
  id: string;
  name: JsonText;
  description: JsonText;
  sort_order: number;
};

type MenuProduct = {
  id: string;
  category_id: string | null;
  name: JsonText;
  description: JsonText;
  price: number | string;
  currency: string;
  sort_order: number;
};

type BusinessHour = {
  weekday: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type SocialLink = {
  platform: string;
  url: string;
};

type GalleryImage = {
  id: string;
  title: JsonText;
  alt_text: JsonText;
  image_path: string;
  sort_order: number;
};

function localized(value: JsonText, locale: string) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value[locale] || value.pt || value.en || value.fr || '';
}

const copy = {
  pt: {
    welcome: 'Bem-vindo ao', intro: 'Consulte o nosso menu e envie um pedido de reserva.',
    menu: 'Menu', menuEmpty: 'O menu está a ser actualizado. Volte em breve.',
    hours: 'Horário', hoursEmpty: 'Horário a actualizar.',
    contact: 'Contactos', reserve: 'Pedir uma reserva', name: 'Nome completo',
    phone: 'Telefone', email: 'Email (opcional)', date: 'Data', time: 'Hora (opcional)',
    people: 'Número de pessoas', message: 'Observações (opcional)', send: 'Enviar pedido',
    received: 'Pedido enviado. A reserva ficará pendente de confirmação pelo estabelecimento.',
    invalid: 'Verifique os dados do formulário.', unavailable: 'O serviço de reservas não está disponível neste momento.',
    failed: 'Não foi possível enviar o pedido. Tente novamente mais tarde.',
    closed: 'Encerrado', days: ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'],
    currency: 'Kz'
  },
  en: {
    welcome: 'Welcome to', intro: 'Browse our menu and send a reservation request.',
    menu: 'Menu', menuEmpty: 'The menu is being updated. Please check again soon.',
    hours: 'Opening hours', hoursEmpty: 'Opening hours to be updated.',
    contact: 'Contact', reserve: 'Request a reservation', name: 'Full name',
    phone: 'Phone', email: 'Email (optional)', date: 'Date', time: 'Time (optional)',
    people: 'Number of guests', message: 'Notes (optional)', send: 'Send request',
    received: 'Request sent. Your reservation is pending confirmation by the venue.',
    invalid: 'Please check the form details.', unavailable: 'Reservations are currently unavailable.',
    failed: 'The request could not be sent. Please try again later.',
    closed: 'Closed', days: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    currency: 'Kz'
  },
  fr: {
    welcome: 'Bienvenue chez', intro: 'Consultez notre menu et envoyez une demande de réservation.',
    menu: 'Menu', menuEmpty: 'Le menu est en cours de mise à jour.',
    hours: 'Horaires', hoursEmpty: 'Horaires à mettre à jour.',
    contact: 'Contacts', reserve: 'Demander une réservation', name: 'Nom complet',
    phone: 'Téléphone', email: 'E-mail (facultatif)', date: 'Date', time: 'Heure (facultatif)',
    people: 'Nombre de personnes', message: 'Remarques (facultatif)', send: 'Envoyer la demande',
    received: 'Demande envoyée. La réservation attend la confirmation de l’établissement.',
    invalid: 'Vérifiez les informations du formulaire.', unavailable: 'Les réservations sont momentanément indisponibles.',
    failed: 'La demande n’a pas pu être envoyée. Réessayez plus tard.',
    closed: 'Fermé', days: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
    currency: 'Kz'
  }
} as const;

export default async function TenantHome({
  params,
  searchParams
}: {
  params: Promise<{locale: string; slug: string}>;
  searchParams: Promise<{reservation?: string}>;
}) {
  const {locale, slug} = await params;
  const query = await searchParams;
  if (!['pt','en','fr'].includes(locale) || !/^[a-z0-9-]{2,80}$/.test(slug)) notFound();
  setRequestLocale(locale);

  const t = copy[locale as keyof typeof copy];
  const supabase = await createClient();
  let profile: TenantProfile | null = null;
  let categories: MenuCategory[] = [];
  let products: MenuProduct[] = [];
  let hours: BusinessHour[] = [];
  let socials: SocialLink[] = [];
  let gallery: GalleryImage[] = [];

  if (supabase) {
    const {data: profileData} = await supabase.rpc('get_public_tenant_profile_by_slug', {input_slug: slug});
    if (profileData?.length) {
      profile = profileData[0] as unknown as TenantProfile;
    } else {
      const {data: basicData, error} = await supabase.rpc('get_public_tenant_by_slug', {input_slug: slug});
      if (error || !basicData?.length) notFound();
      profile = basicData[0] as unknown as TenantProfile;
    }

    const tenantId = profile.tenant_id as string;
    const [categoryResult, productResult, hoursResult, socialResult, galleryResult] = await Promise.all([
      supabase.from('menu_categories').select('id,name,description,sort_order').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
      supabase.from('menu_products').select('id,category_id,name,description,price,currency,sort_order').eq('tenant_id', tenantId).eq('is_available', true).order('sort_order'),
      supabase.from('business_hours').select('weekday,opens_at,closes_at,is_closed').eq('tenant_id', tenantId).order('weekday'),
      supabase.from('social_links').select('platform,url').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('galleries').select('id,title,alt_text,image_path,sort_order').eq('tenant_id', tenantId).eq('is_published', true).order('sort_order')
    ]);
    categories = (categoryResult.data ?? []) as unknown as MenuCategory[];
    products = (productResult.data ?? []) as unknown as MenuProduct[];
    hours = (hoursResult.data ?? []) as unknown as BusinessHour[];
    socials = (socialResult.data ?? []) as unknown as SocialLink[];
    gallery = (galleryResult.data ?? []) as unknown as GalleryImage[];
  } else if (slug !== 'alfa') {
    notFound();
  }

  const tenantName = profile?.tenant_name || 'ALFA Beach Bar';
  const primary = profile?.brand_primary || '#173b35';
  const secondary = profile?.brand_secondary || '#d6a46b';
  const today = new Date().toISOString().slice(0, 10);
  const status = query.reservation;
  const statusMessage = status === 'received' ? t.received :
    status === 'invalid' ? t.invalid :
    status === 'unavailable' ? t.unavailable :
    status === 'error' ? t.failed : '';

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#18332d]" style={{'--brand-primary': primary, '--brand-secondary': secondary} as React.CSSProperties}>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <a href={'/' + locale + '/' + slug} className="text-sm font-bold tracking-[0.22em]"> {tenantName.toUpperCase()} </a>
        <nav className="flex items-center gap-5 text-sm">
          <a href="#menu">{t.menu}</a><a href="#horario">{t.hours}</a><a href="#reservar">{t.reserve}</a>
          <a href={'/' + locale + '/admin/login'} className="rounded-full border border-[#d8d2c6] px-4 py-2">Gestão</a>
        </nav>
      </header>

      <section className="relative overflow-hidden bg-[var(--brand-primary)] px-6 py-28 text-white sm:py-36">
        <div className="mx-auto max-w-7xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-secondary)]">{t.welcome}</p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] sm:text-7xl">{tenantName}</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-white/75">{t.intro}</p>
          <a href="#reservar" className="mt-10 inline-flex rounded-full bg-[var(--brand-secondary)] px-7 py-3 font-semibold text-[#1c2d28]">{t.reserve}</a>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-8 -top-8 h-64 w-64 rounded-full border border-white/10" />
      </section>

      <section id="menu" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#a56e3f]">ALFA</p><h2 className="text-4xl font-semibold">{t.menu}</h2></div>
          <span className="text-sm text-[#66756d]">AOA</span>
        </div>
        {categories.length === 0 || products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#cfc8ba] p-8 text-[#66756d]">{t.menuEmpty}</p>
        ) : (
          <div className="grid gap-10 md:grid-cols-2">
            {categories.map((category) => {
              const items = products.filter((product) => product.category_id === category.id);
              if (!items.length) return null;
              return <div key={category.id}>
                <h3 className="mb-5 border-b border-[#d9d3c8] pb-3 text-xl font-semibold">{localized(category.name, locale)}</h3>
                <div className="space-y-5">
                  {items.map((product) => <article key={product.id} className="flex items-start justify-between gap-5">
                    <div><h4 className="font-semibold">{localized(product.name, locale)}</h4><p className="mt-1 text-sm leading-6 text-[#66756d]">{localized(product.description, locale)}</p></div>
                    <span className="shrink-0 font-semibold">{Number(product.price).toLocaleString(locale)} {t.currency}</span>
                  </article>)}
                </div>
              </div>;
            })}
          </div>
        )}
      </section>

      {gallery.length > 0 && <section id="galeria" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-8"><p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#a56e3f]">{tenantName}</p><h2 className="text-4xl font-semibold">Galeria</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((photo) => <figure key={photo.id} className="overflow-hidden rounded-2xl bg-white">
            <img src={supabase?.storage.from('tenant-gallery').getPublicUrl(photo.image_path).data.publicUrl}
              alt={localized(photo.alt_text, locale) || localized(photo.title, locale)}
              loading="lazy" className="aspect-[4/3] w-full object-cover"/>
            {localized(photo.title, locale) && <figcaption className="p-4 text-sm font-medium">{localized(photo.title, locale)}</figcaption>}
          </figure>)}
        </div>
      </section>}

      <section className="bg-[#eeeae1] px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2">
          <div id="horario" className="scroll-mt-8">
            <h2 className="mb-6 text-3xl font-semibold">{t.hours}</h2>
            {hours.length ? <div className="space-y-3">{hours.map((item) => <div key={item.weekday} className="flex justify-between border-b border-[#d5cfc3] pb-3 text-sm">
              <span>{t.days[item.weekday]}</span><span>{item.is_closed ? t.closed : String(item.opens_at).slice(0,5) + ' – ' + String(item.closes_at).slice(0,5)}</span>
            </div>)}</div> : <p className="text-[#66756d]">{t.hoursEmpty}</p>}
          </div>
          <div>
            <h2 className="mb-6 text-3xl font-semibold">{t.contact}</h2>
            <div className="space-y-3 text-sm text-[#52635b]">
              {profile?.contact_phone && <p>Telefone: <a href={'tel:' + profile.contact_phone} className="font-semibold text-[#18332d]">{profile.contact_phone}</a></p>}
              {profile?.whatsapp_number && <p>WhatsApp: <a href={'https://wa.me/' + String(profile.whatsapp_number).replace(/\D/g,'')} target="_blank" rel="noreferrer" className="font-semibold text-[#18332d]">{profile.whatsapp_number}</a></p>}
              {profile?.address && <p>{profile.address}</p>}
              {profile?.map_url && <a href={profile.map_url} target="_blank" rel="noreferrer" className="inline-block underline">Ver localização</a>}
              {socials.map((social) => <p key={social.platform}><a href={social.url} target="_blank" rel="noreferrer" className="underline">{social.platform}</a></p>)}
              {!profile?.contact_phone && !profile?.whatsapp_number && !profile?.address && socials.length === 0 && <p className="text-[#66756d]">Os contactos serão publicados em breve.</p>}
            </div>
          </div>
        </div>
      </section>

      <section id="reservar" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20">
        <div className="grid gap-12 md:grid-cols-[0.8fr_1.2fr]">
          <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#a56e3f]">ALFA</p><h2 className="text-4xl font-semibold">{t.reserve}</h2><p className="mt-5 leading-7 text-[#66756d]">{t.intro}</p></div>
          <div>
            {statusMessage && <p role="status" className="mb-5 rounded-xl bg-[#e7eee8] p-4 text-sm">{statusMessage}</p>}
            <form action={createReservation} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="locale" value={locale} /><input type="hidden" name="slug" value={slug} />
              <label className="grid gap-2 text-sm sm:col-span-2">{t.name}<input required name="customer_name" minLength={2} maxLength={120} className="rounded-xl border border-[#d5cfc3] bg-white px-4 py-3" /></label>
              <label className="grid gap-2 text-sm">{t.phone}<input required name="customer_phone" minLength={5} maxLength={40} className="rounded-xl border border-[#d5cfc3] bg-white px-4 py-3" /></label>
              <label className="grid gap-2 text-sm">{t.email}<input type="email" name="customer_email" className="rounded-xl border border-[#d5cfc3] bg-white px-4 py-3" /></label>
              <label className="grid gap-2 text-sm">{t.date}<input required type="date" min={today} name="reservation_date" className="rounded-xl border border-[#d5cfc3] bg-white px-4 py-3" /></label>
              <label className="grid gap-2 text-sm">{t.time}<input type="time" name="reservation_time" className="rounded-xl border border-[#d5cfc3] bg-white px-4 py-3" /></label>
              <label className="grid gap-2 text-sm">{t.people}<input required type="number" min="1" max="100" defaultValue="2" name="party_size" className="rounded-xl border border-[#d5cfc3] bg-white px-4 py-3" /></label>
              <label className="grid gap-2 text-sm sm:col-span-2">{t.message}<textarea name="message" maxLength={1000} rows={3} className="rounded-xl border border-[#d5cfc3] bg-white px-4 py-3" /></label>
              <button className="rounded-full bg-[var(--brand-primary)] px-7 py-3 font-semibold text-white sm:col-span-2 sm:justify-self-start">{t.send}</button>
            </form>
          </div>
        </div>
      </section>
      <footer className="bg-[#173b35] px-6 py-8 text-center text-sm text-white/70">© {new Date().getFullYear()} {tenantName} · ZecaTour</footer>
    </main>
  );
}

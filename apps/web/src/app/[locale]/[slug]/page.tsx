import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

export default async function TenantHome({
  params
}: {
  params: Promise<{locale: string; slug: string}>;
}) {
  const {locale, slug} = await params;
  setRequestLocale(locale);

  if (!/^[a-z0-9-]{2,80}$/.test(slug)) notFound();

  const supabase = await createClient();
  let tenantName = slug;

  if (supabase) {
    const {data, error} = await supabase.rpc('get_public_tenant_by_slug', {
      input_slug: slug
    });
    if (error || !data?.length) notFound();
    tenantName = data[0].tenant_name;
  } else if (slug !== 'alfa') {
    notFound();
  }

  const t = await getTranslations('Home');

  return (
    <main className="min-h-screen px-6 py-16 sm:px-10">
      <div className="mx-auto flex min-h-[75vh] max-w-5xl flex-col justify-between">
        <header className="flex items-center justify-between">
          <span className="text-sm font-semibold tracking-[0.24em]">ZECATOUR</span>
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{locale}</span>
        </header>
        <section className="max-w-3xl py-20">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">{tenantName}</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] tracking-tight sm:text-7xl">{t('title')}</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">{t('description')}</p>
          <div className="mt-10 inline-flex rounded-full border border-[#c9c3b6] px-5 py-3 text-sm">{t('comingSoon')}</div>
        </section>
        <footer className="border-t border-[#ded9cf] pt-5 text-xs text-[var(--muted)]">© {new Date().getFullYear()} ZecaTour · {tenantName}</footer>
      </div>
    </main>
  );
}
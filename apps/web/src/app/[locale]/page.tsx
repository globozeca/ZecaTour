import {notFound} from 'next/navigation';
import {hasLocale} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {routing} from '@/i18n/routing';

const copy = {
  pt: {
    eyebrow: 'TECNOLOGIA PARA NEGÓCIOS DE HOSPITALIDADE',
    title: 'A presença digital do seu negócio, num só lugar.',
    intro: 'O ZecaTour ajuda hotéis, restaurantes, bares e operadores turísticos a apresentar os seus serviços e a receber pedidos de reserva online.',
    cta: 'Aceder à gestão', discover: 'Conhecer um estabelecimento', featuresTitle: 'Uma plataforma para o seu negócio',
    features: [
      ['Website próprio', 'Apresente a sua empresa através de uma página pública com a sua identidade.'],
      ['Menu e galeria', 'Organize produtos, serviços, fotografias e informação essencial.'],
      ['Reservas e contactos', 'Receba pedidos e mantenha os dados do estabelecimento actualizados.']
    ],
    login: 'Já tem conta? Entre no painel', footer: 'Plataforma digital para hotelaria, restauração e turismo.'
  },
  en: {
    eyebrow: 'TECHNOLOGY FOR HOSPITALITY BUSINESSES',
    title: 'Your business presence, in one place.',
    intro: 'ZecaTour helps hotels, restaurants, bars and tourism operators present their services and receive online reservation requests.',
    cta: 'Open management', discover: 'Explore a business', featuresTitle: 'One platform for your business',
    features: [
      ['Your own website', 'Present your business with a public page and your own identity.'],
      ['Menu and gallery', 'Organise products, services, photos and essential information.'],
      ['Reservations and contacts', 'Receive requests and keep business details up to date.']
    ],
    login: 'Already have an account? Sign in', footer: 'Digital platform for hospitality, restaurants and tourism.'
  },
  fr: {
    eyebrow: 'TECHNOLOGIE POUR LES ENTREPRISES TOURISTIQUES',
    title: 'La présence numérique de votre entreprise, au même endroit.',
    intro: 'ZecaTour aide les hôtels, restaurants, bars et opérateurs touristiques à présenter leurs services et à recevoir des demandes de réservation en ligne.',
    cta: 'Accéder à la gestion', discover: 'Découvrir un établissement', featuresTitle: 'Une plateforme pour votre activité',
    features: [
      ['Votre propre site', 'Présentez votre entreprise avec une page publique à votre identité.'],
      ['Menu et galerie', 'Organisez produits, services, photos et informations essentielles.'],
      ['Réservations et contacts', 'Recevez des demandes et gardez vos informations à jour.']
    ],
    login: 'Vous avez déjà un compte ? Connectez-vous', footer: 'Plateforme numérique pour l’hôtellerie, la restauration et le tourisme.'
  }
} as const;

export default async function LocaleIndex({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = copy[locale as keyof typeof copy] || copy.pt;

  return <main className="min-h-screen bg-[#f7f5ef] text-[#18332d]">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <a href={'/' + locale} className="text-lg font-bold tracking-[0.2em] text-[#173b35]">ZECATOUR</a>
      <a href={'/' + locale + '/admin/login'} className="rounded-full border border-[#d5cfc3] px-5 py-2 text-sm font-semibold">{t.cta}</a>
    </header>
    <section className="bg-[#173b35] px-6 py-24 text-white sm:py-32">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a46b]">{t.eyebrow}</p>
        <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.05] sm:text-7xl">{t.title}</h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-white/75">{t.intro}</p>
        <div className="mt-10 flex flex-wrap gap-3"><a href={'/' + locale + '/admin/login'} className="rounded-full bg-[#d6a46b] px-7 py-3 font-semibold text-[#18332d]">{t.cta}</a><a href={'/' + locale + '/alfa'} className="rounded-full border border-white/30 px-7 py-3 font-semibold text-white">{t.discover}</a></div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-6 py-20">
      <h2 className="text-3xl font-semibold">{t.featuresTitle}</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{t.features.map(([title,description]) => <article key={title} className="rounded-2xl bg-white p-7"><h3 className="text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-[#66756d]">{description}</p></article>)}</div>
    </section>
    <footer className="border-t border-[#e1dbcf] px-6 py-8 text-center text-sm text-[#66756d]"><p>{t.footer}</p><a className="mt-2 inline-block underline" href={'/' + locale + '/admin/login'}>{t.login}</a></footer>
  </main>;
}

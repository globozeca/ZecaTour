import {notFound, redirect} from 'next/navigation';
import {hasLocale} from 'next-intl';
import {routing} from '@/i18n/routing';

export default async function LocaleIndex({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  redirect(`/${locale}/alfa`);
}

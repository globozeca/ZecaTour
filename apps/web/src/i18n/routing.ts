import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pt', 'en', 'fr'],
  defaultLocale: 'pt',
  localePrefix: 'always'
});
export const supportedLocales = ['pt', 'en', 'fr'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const defaultLocale: SupportedLocale = 'pt';
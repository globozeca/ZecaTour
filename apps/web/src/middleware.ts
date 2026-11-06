import {createServerClient, type CookieOptions} from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import type {NextRequest} from 'next/server';
import {routing} from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  let response = handleI18nRouting(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: {name: string; value: string; options: CookieOptions}[]) {
        cookiesToSet.forEach(({name, value, options}) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  // Refreshes the Supabase session before protected server pages are rendered.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)'
};

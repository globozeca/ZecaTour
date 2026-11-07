import {setRequestLocale} from 'next-intl/server';
import {loginAdmin} from '../actions';

export default async function AdminLogin({
  params,
  searchParams
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{error?: string}>;
}) {
  const {locale} = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const message = query.error === 'config'
    ? 'A ligação ao Supabase ainda não está configurada.'
    : query.error ? 'Não foi possível iniciar sessão. Confirme as credenciais.' : '';

  return <main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-6 py-12 text-[#18332d]">
    <div className="w-full max-w-md rounded-3xl border border-[#e1dbcf] bg-white p-8 shadow-sm">
      <a href={'/' + locale} className="text-xs font-bold tracking-[0.25em] text-[#a56e3f]">ZECATOUR</a>
      <h1 className="mt-8 text-3xl font-semibold">Painel de gestão</h1>
      <p className="mt-3 text-sm leading-6 text-[#66756d]">Acesso reservado a administradores da plataforma e equipas dos estabelecimentos.</p>
      {message && <p role="alert" className="mt-5 rounded-xl bg-[#f8e9e5] p-3 text-sm text-[#8b3427]">{message}</p>}
      <form action={loginAdmin} className="mt-8 grid gap-4">
        <input type="hidden" name="locale" value={locale} />
        <label className="grid gap-2 text-sm">Email<input required type="email" name="email" autoComplete="username" className="rounded-xl border border-[#d5cfc3] px-4 py-3" /></label>
        <label className="grid gap-2 text-sm">Palavra-passe<input required type="password" name="password" autoComplete="current-password" className="rounded-xl border border-[#d5cfc3] px-4 py-3" /></label>
        <button className="mt-2 rounded-full bg-[#173b35] px-6 py-3 font-semibold text-white">Entrar</button>
      </form>
      <a href={'/' + locale} className="mt-7 inline-block text-sm text-[#66756d] underline">Voltar ao website</a>
    </div>
  </main>;
}

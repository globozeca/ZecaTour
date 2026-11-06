# Preparação do projecto Supabase

Esta configuração é feita uma vez para o ambiente inicial. Não coloques chaves privadas no GitHub nem as envies numa conversa.

## 1. Criar o projecto

1. Entrar em https://supabase.com/dashboard.
2. Criar um projecto chamado `zecatour`.
3. Escolher uma região próxima dos utilizadores iniciais, tendo em conta latência e disponibilidade.
4. Guardar a palavra-passe da base de dados num gestor de palavras-passe.
5. Aguardar que a base de dados fique disponível.

## 2. Aplicar as migrações

No projecto Supabase, abrir **SQL Editor** e executar, pela ordem indicada, o conteúdo integral de cada ficheiro:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_security_hardening.sql`
3. `supabase/migrations/0003_operational_integrity.sql`

Executar cada migração uma única vez e confirmar que termina sem erros. Se uma migração falhar, parar e corrigir o erro antes de executar a seguinte. Não executar apenas partes de uma migração.

A primeira migração cria o tenant de demonstração `alfa`, com período experimental de 30 dias. Não cria menus, preços ou conteúdos comerciais fictícios.

## 3. Obter as variáveis públicas

Em **Project Settings → API**, copiar:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key (ou anon key, conforme a interface) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Criar `apps/web/.env.local` a partir de `.env.example` e preencher apenas estes dois valores para começar.

A chave `service_role` / secret key não é necessária para a página pública inicial. Nunca a colocar no browser, no GitHub, em mensagens ou em `NEXT_PUBLIC_*`.

## 4. Verificação inicial

Depois de aplicar as três migrações, confirmar no Table Editor:
- existe o tenant `ALFA Beach Bar` com slug `alfa`;
- existe uma subscrição Starter em estado trialing;
- existe uma linha de definições para o tenant;
- RLS está activo nas tabelas operacionais.

Testar a função pública no SQL Editor:

```sql
select *
from public.get_public_tenant_by_slug('alfa');
```

A função deve devolver apenas os campos públicos definidos na migração. Não expõe reservas, membros ou dados de subscrição.

## 5. Limites desta fase

A execução das migrações não equivale a uma auditoria de segurança. Antes de produção, testar sessões anónimas, owner, manager, superadmin e dois tenants distintos. A criação de utilizadores e a atribuição inicial do papel owner serão implementadas no fluxo de onboarding, não por metadados enviados pelo browser.

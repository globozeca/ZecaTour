# Arquitectura do ZecaTour

## Visão geral

O ZecaTour é uma aplicação SaaS multiempresa, multilingue e multiestabelecimento. Existe uma única aplicação Next.js e uma única base de dados Supabase. Cada estabelecimento pertence a uma empresa identificada por `tenant_id`.

O ALFA Beach Bar é o primeiro tenant de demonstração e validação funcional. Não deve existir código exclusivo do ALFA no núcleo da plataforma: identidade visual, conteúdos e configurações são dados do tenant.

## Camadas

1. Apresentação: Next.js App Router, React, Tailwind CSS e shadcn/ui.
2. Internacionalização: next-intl, com português, inglês e francês.
3. Validação: Zod nos limites de entrada; React Hook Form nos formulários.
4. Identidade: Supabase Auth.
5. Dados e autorização: PostgreSQL com RLS; as políticas são a fronteira efectiva de segurança.
6. Ficheiros: Supabase Storage, com caminhos e políticas separados por tenant.
7. Deploy: Cloudflare Workers em produção; previews podem usar Vercel.

## Resolução do tenant

O website público resolve o estabelecimento pelo slug, por exemplo `/pt/alfa`. O slug identifica o tenant, mas nunca constitui prova de autorização. Toda a leitura e escrita de dados privados continua sujeita a RLS.

Os domínios personalizados serão associados ao tenant numa fase posterior. A resolução por domínio deve produzir o mesmo contexto de tenant, sem duplicar aplicações.

## Papéis

- `superadmin`: operador da plataforma; privilégio global atribuído apenas por mecanismo administrativo confiável.
- `owner`: proprietário de um tenant; gere os membros e os dados desse estabelecimento.
- `manager`: gere as operações permitidas do estabelecimento, sem privilégios de proprietário.

A pertença é representada por `tenant_members`. Um utilizador pode pertencer a mais de um tenant.

## Regras essenciais

- Todas as tabelas operacionais incluem `tenant_id`.
- RLS fica activado em todas as tabelas expostas à API.
- Nunca colocar a chave `service_role` no browser.
- Não confiar em `tenant_id`, papel ou slug enviados pelo cliente sem validação no servidor e RLS.
- Reservas públicas podem ser submetidas sem autenticação, mas não podem ser consultadas publicamente.
- Operações administrativas devem ser auditáveis antes da abertura comercial.

## Modelo de dados inicial

A migração `supabase/migrations/0001_initial_schema.sql` cria tenants, perfis, membros, subscrições, páginas, menu, galeria, reservas, horários, ligações sociais e definições.

## Evolução

A primeira versão privilegia a segurança e um modelo de dados simples. Pagamentos, facturação, notificações, domínios personalizados, auditoria detalhada e métricas comerciais serão acrescentados em migrações próprias, sem alterar o princípio de isolamento por tenant.
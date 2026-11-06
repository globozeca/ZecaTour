# ZecaTour

Plataforma SaaS multiempresa para hotelaria, restauração e turismo.

## Objectivo

O ZecaTour permite que cada estabelecimento tenha um website público multilingue e um painel de gestão próprio, mantendo uma única aplicação e uma base de dados partilhada. O isolamento entre empresas é imposto no PostgreSQL através de Row Level Security (RLS).

O **ALFA Beach Bar** é o primeiro estabelecimento de referência para validar o produto.

## Stack definida

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase PostgreSQL, Auth e Storage
- next-intl (PT/EN/FR)
- Zod + React Hook Form
- Cloudflare Workers para produção
- GitHub para versionamento

## Estrutura

```text
apps/web/                 Aplicação Next.js
packages/shared/          Tipos e utilitários partilhados
supabase/migrations/      Migrações SQL versionadas
docs/                     Arquitectura e deployment
```

## Princípios de arquitectura

1. Uma aplicação e uma base de dados para todos os clientes.
2. Cada registo pertencente a um estabelecimento contém `tenant_id`.
3. O isolamento é aplicado no PostgreSQL com RLS, nunca apenas no frontend.
4. Os papéis são distintos: `superadmin` (plataforma), `owner` e `manager` (estabelecimento).
5. Segredos ficam em variáveis de ambiente e nunca são versionados.
6. Conteúdo público só é exposto através de políticas de leitura explicitamente definidas.

## Primeira entrega

- Fundação multiempresa e modelo de dados.
- Perfis, membros e permissões.
- Políticas RLS e funções auxiliares.
- Website público ALFA Beach Bar em PT/EN/FR.
- Painel de gestão, reservas, menu e galeria.

## Estado

Fundação técnica em preparação. A migração SQL é a fonte de verdade para a estrutura inicial da base de dados. Consultar:
- [Arquitectura](docs/architecture.md)
- [Plano de implementação](docs/implementation-plan.md)
- [Configuração e deployment](docs/deployment.md)
- [Segurança](docs/security.md)

# ZecaTour Web

Aplicação Next.js do ZecaTour.

## Desenvolvimento

A partir da raiz do repositório:

```bash
npm install
cp .env.example apps/web/.env.local
npm run dev
```

Preencher as variáveis Supabase em `apps/web/.env.local` antes de ligar a aplicação à base de dados. A página do tenant ALFA apresenta apenas o estado de demonstração quando as variáveis ainda não estão configuradas.

## Rotas

- `/pt/alfa`
- `/en/alfa`
- `/fr/alfa`

O tenant é resolvido através da função RPC pública `get_public_tenant_by_slug`, que devolve apenas os campos definidos para apresentação pública.
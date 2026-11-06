# Configuração e deployment

## Pré-requisitos

- Node.js LTS compatível com a versão de Next.js adoptada.
- npm.
- Projecto Supabase.
- Conta Cloudflare para produção.
- Git.

## Configuração local

1. Clonar o repositório.
2. Instalar dependências com `npm install`.
3. Copiar `.env.example` para `.env.local`.
4. Preencher os valores do projecto Supabase.
5. Aplicar as migrações SQL pela CLI do Supabase ou pelo SQL Editor.
6. Iniciar o servidor com `npm run dev`.

## Variáveis de ambiente

Consultar `.env.example`. As variáveis públicas podem ser usadas no browser. A chave `SUPABASE_SERVICE_ROLE_KEY`, quando necessária em operações estritamente servidoras, nunca pode ter prefixo `NEXT_PUBLIC_` nem ser enviada ao cliente.

## Deploy

A plataforma foi escolhida para Cloudflare Workers. A configuração concreta de build/runtime deve ser validada com a versão do adaptador OpenNext para Cloudflare adoptada pelo projecto. Não assumir que um build Next.js genérico é automaticamente compatível com Workers.

Vercel pode ser usado para previews e testes, respeitando os limites e condições comerciais do plano utilizado.

## Ambientes

Manter ambientes separados para desenvolvimento, staging e produção, com projectos/credenciais Supabase próprios. Nunca copiar dados reais de clientes para previews públicos.

## Antes de publicar

- Validar build e lint.
- Aplicar migrações em staging.
- Testar RLS com utilizadores de tenants diferentes e sessão anónima.
- Confirmar CORS, URLs de redireccionamento Auth e domínios.
- Configurar backups e monitorização.
- Verificar que não existem segredos no bundle nem no histórico Git.
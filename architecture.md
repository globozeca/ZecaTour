# Arquitectura GloboZeca Turismo

## Princípios
1. Uma aplicação para vários estabelecimentos (multi-tenant).
2. Cada registo de conteúdo tem `tenant_id`.
3. Isolamento de dados no PostgreSQL com Row Level Security.
4. O cliente gere apenas o seu estabelecimento.
5. O superadministrador gere todos os estabelecimentos.
6. Conteúdo multilingue guardado em JSONB por idioma (`pt`, `en`, `fr`).
7. Reservas começam como pedidos; a confirmação é feita pela equipa via WhatsApp/telefone.
8. A demonstração é controlada por `demo_enabled`, `demo_expires_at`, `plan_code` e estado da subscrição.

## Domínios e rotas
- Protótipo: `/<locale>/<slug>` (ex.: `/pt/alfa`).
- Administração: `/admin`.
- Superadmin: `/superadmin`.
- Futuro: domínios próprios resolvidos para o tenant correspondente.

## Segurança
- Não confiar em `tenant_id` enviado pelo browser.
- Verificar a associação do utilizador ao tenant em cada operação.
- Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no cliente.
- Não conceder SELECT anónimo às tabelas internas.
- Expor dados públicos através de consultas server-side limitadas ou RPCs específicas.
- Validar formulários no servidor e aplicar rate limiting/anti-spam nas reservas.
- O papel `superadmin` só pode ser atribuído por procedimento administrativo controlado.

## Demonstração
A demonstração não deve apagar conteúdo ao expirar. Deve alterar a experiência pública e bloquear funcionalidades administrativas/comerciais conforme o plano. A activação paga será uma mudança de estado, sem reconstrução do site.

## Deploy
Cloudflare Workers é a opção a validar para produção comercial. A documentação actual recomenda `vinext` como caminho novo, mas está em beta; validar compatibilidade antes de produção. Vercel Hobby não deve alojar deployments comerciais.

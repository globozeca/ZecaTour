# Segurança e isolamento multiempresa

## Princípio

O PostgreSQL é a autoridade final de autorização. A interface, o middleware e as verificações TypeScript melhoram a experiência, mas não substituem Row Level Security (RLS).

## Requisitos obrigatórios

- Activar RLS em todas as tabelas acessíveis pela API.
- Usar `tenant_members` para determinar pertença e papel.
- Validar operações com políticas que consultam o tenant da linha.
- Não aceitar o papel `superadmin` a partir de metadados editáveis pelo utilizador.
- Reservar privilégios globais para um mecanismo administrativo confiável, por exemplo app_metadata definido apenas no servidor.
- Não expor a chave service role no cliente.
- Aplicar limites, validação e protecção anti-abuso ao endpoint público de reservas.
- Não devolver dados pessoais de reservas em endpoints públicos.
- Restringir uploads por tenant, tipo MIME, dimensão e política de acesso.
- Registar operações administrativas sensíveis numa futura tabela de auditoria.

## Testes mínimos

1. Utilizador A não lê nem altera linhas do tenant B.
2. Manager não adiciona nem remove owners.
3. Utilizador sem membership não acede ao painel.
4. Sessão anónima só lê conteúdo publicado.
5. Sessão anónima pode inserir reserva válida, mas não listar nem consultar reservas.
6. Alterar manualmente o slug ou tenant_id no browser não contorna RLS.

## Nota

As políticas iniciais constituem uma base de arranque e devem ser testadas num projecto Supabase real antes de produção. Não inserir dados de clientes nem activar comercialização antes da validação dos testes acima.
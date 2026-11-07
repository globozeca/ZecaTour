# Validação multiempresa — ZecaTour

## Âmbito

Esta lista valida o onboarding, a descoberta de empresas e o isolamento entre tenants introduzidos pela migração `0007_multi_tenant_onboarding.sql`.

**Não considerar a segurança validada apenas porque o build passa.** Executar os cenários com duas contas reais num projecto Supabase de staging antes de integrar a branch.

## Preparação

1. Confirmar que as migrações `0001` a `0007` estão aplicadas por ordem. A `0006` cria o bucket `tenant-gallery`; a `0007` cria as funções de onboarding e descoberta.
2. Criar duas contas autenticadas distintas: Utilizador A e Utilizador B.
3. Criar um tenant com A através do painel. Registar o UUID.
4. Criar um segundo tenant com B. Registar o UUID.
5. Confirmar em `tenant_members` que cada utilizador ficou associado ao seu tenant com role `owner`, e em `subscriptions` e `tenant_settings` que existem os registos iniciais.

## Matriz de testes

| Cenário | Utilizador | Resultado esperado |
| --- | --- | --- |
| Consultar `get_my_tenants()` | A | Apenas os tenants de A |
| Consultar `get_my_tenants()` | B | Apenas os tenants de B |
| Abrir o painel sem tenant na URL | A | Selecciona o primeiro tenant autorizado |
| Abrir o painel com UUID de B | A | Não apresenta dados de B |
| Criar categoria/produto no tenant de B | A | Server Action rejeita; RLS não permite escrita |
| Alterar reserva do tenant de B | A | Server Action rejeita; RLS não permite alteração |
| Alterar horários, redes sociais ou perfil de B | A | Server Action rejeita; RLS não permite escrita |
| Upload/eliminação na pasta Storage de B | A | Storage RLS rejeita |
| Gerir membros do tenant | Manager | Não pode adicionar, alterar ou remover membros |
| Gerir membros do tenant | Owner | Pode gerir apenas gestores do próprio tenant |
| Consultar subscrição | Manager | Sem acesso à subscrição |
| Consultar subscrição | Owner | Consulta apenas a subscrição do próprio tenant |

## Testes negativos adicionais

- Tentar criar um tenant sem sessão autenticada: a RPC deve falhar.
- Tentar criar slug com maiúsculas, espaços, underscore, pontuação ou menos de 3 caracteres: a validação da Server Action/RPC deve rejeitar.
- Tentar reutilizar um slug existente: a operação deve falhar sem criar tenant, membership, subscription ou settings parciais.
- Alterar manualmente `tenant_id` num formulário para UUID de outra empresa: a Server Action deve rejeitar antes da escrita.
- Tentar chamar directamente as tabelas Supabase com o JWT de A e UUID de B: SELECT não deve revelar dados privados e INSERT/UPDATE/DELETE não deve modificar linhas.
- Confirmar que o utilizador anónimo não consegue executar `get_my_tenants()` nem `create_tenant_for_current_user()`.

## Critério de aprovação

Todos os testes acima devem passar em staging, incluindo tentativas directas à API Supabase. Guardar evidência dos resultados antes do merge. Não executar deploy de produção nesta etapa.

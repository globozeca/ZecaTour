# ZecaTour — administração da plataforma

## Activar o primeiro Platform Admin

A autorização usa exclusivamente o campo `app_metadata` do Supabase Auth, nunca `user_metadata` nem valores enviados pelo browser.

1. No Supabase Dashboard, abrir **Authentication → Users**.
2. Localizar a conta do administrador inicial pelo email exacto.
3. Editar os metadados do utilizador e definir em **App Metadata**:

```json
{
  "platform_role": "superadmin"
}
```

4. Guardar, terminar a sessão ZecaTour e iniciar sessão novamente para renovar o JWT.
5. O login encaminha essa conta para `/pt/admin/platform`. As contas normais continuam a entrar em `/pt/admin`.

Não colocar o privilégio em User Metadata. Não expor a chave service role no frontend.

## Aplicação da migração

Aplicar `supabase/migrations/0008_platform_administration.sql` no SQL Editor do projecto Supabase ZecaTour. Depois executar `supabase/tests/0008_platform_administration_smoke.sql`.

## Operações disponíveis

- Consultar todas as empresas, estado, responsável, número de membros e subscrição.
- Criar empresa e associar um proprietário que já exista em Supabase Auth.
- Editar nome e slug público.
- Activar, suspender ou cancelar uma empresa.
- Consultar proprietários e gestores; adicionar/remover gestores existentes.
- Abrir a página pública e o painel de gestão de cada empresa.

A gestão de utilizadores pressupõe que a conta já foi criada em Supabase Auth. O convite e recuperação de palavra-passe não são executados por esta interface.

## Segurança

As RPCs administrativas são `SECURITY DEFINER`, usam `search_path` vazio e verificam `public.is_platform_admin()` dentro da própria função. O acesso às RPCs é concedido a `authenticated`, mas a função recusa qualquer utilizador sem `app_metadata.platform_role = superadmin`. O painel também valida os metadados no servidor. As políticas RLS existentes continuam a controlar o acesso aos dados.
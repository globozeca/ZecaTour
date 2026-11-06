# Plano de implementação

## Fase 1 — Fundação

- [x] Repositório GitHub criado e acesso confirmado.
- [x] README e documentação inicial.
- [ ] Aplicação Next.js com TypeScript e App Router.
- [ ] Configuração de next-intl (pt, en, fr).
- [ ] Projecto Supabase e variáveis de ambiente.
- [ ] Migração inicial e políticas RLS.
- [ ] Testes de isolamento entre tenants.

## Fase 2 — ALFA Beach Bar

- Website público responsivo com identidade tropical rústica premium.
- Páginas institucionais e contactos.
- Menu digital por categorias, produtos e preços.
- Galeria de imagens.
- Horários, localização e ligações sociais.
- Conteúdo em português, inglês e francês.
- Metadados SEO e dados estruturados adequados.

## Fase 3 — Painel de gestão

- Autenticação e recuperação de acesso.
- Contexto de tenant e gestão de membros.
- Gestão de páginas, menu, preços e galeria.
- Consulta e gestão de reservas.
- Gestão de horários e contactos.
- Separação clara entre superadmin, owner e manager.

## Fase 4 — Comercialização

- Onboarding de novos estabelecimentos.
- Demonstração de 30 dias e planos comerciais.
- Gestão de subscrições.
- Domínios personalizados.
- Métricas e monitorização.
- Procedimentos de suporte, cópias de segurança e resposta a incidentes.

## Critérios de aceitação da fundação

1. Um utilizador de um tenant não consegue ler ou alterar dados de outro tenant.
2. Um manager não consegue executar operações reservadas ao owner.
3. Um visitante pode consultar apenas conteúdo publicado e enviar uma reserva.
4. Reservas e dados privados não são legíveis anonimamente.
5. Os idiomas suportados funcionam sem duplicar conteúdo ou lógica de negócio.
6. Nenhum segredo real é guardado no repositório.

## Ordem de execução

Concluir a fundação e os testes RLS antes de desenvolver o website e o painel. O ALFA é implementado como tenant de referência, não como aplicação independente.
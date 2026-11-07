# ZecaTour — dossier de entrega e demonstração

**Versão:** demonstração funcional  
**Data:** 7 de Novembro de 2026  
**Produto:** ZecaTour  
**Estabelecimento-piloto:** ALFA Beach Bar  
**Website de demonstração:** https://zecatour.globozeca.workers.dev/pt/alfa  
**Painel:** https://zecatour.globozeca.workers.dev/pt/admin/login

## 1. Resumo executivo

O ZecaTour é uma plataforma web concebida para apoiar estabelecimentos de hotelaria, restauração e turismo na sua presença digital e gestão operacional. A solução reúne, numa aplicação central, websites públicos por estabelecimento e funcionalidades de gestão, com uma arquitectura preparada para vários estabelecimentos (multi-tenant).

O ALFA Beach Bar é o primeiro caso de utilização implementado. A demonstração permite consultar o menu digital, visualizar informação pública e submeter pedidos de reserva. A equipa do estabelecimento pode aceder ao painel para consultar pedidos, gerir o respectivo estado e manter dados básicos e elementos do menu.

## 2. Problema e oportunidade

Muitos pequenos e médios estabelecimentos necessitam de uma presença digital própria, informação actualizada e um canal simples para receber pedidos de clientes, sem terem de desenvolver e manter sistemas independentes.

O ZecaTour propõe centralizar estas necessidades numa plataforma comum, reduzindo a duplicação técnica e permitindo que cada estabelecimento tenha a sua identidade e os seus conteúdos.

## 3. Objectivos do produto

- Disponibilizar uma página pública própria para cada estabelecimento.
- Apresentar menus digitais organizados por categorias e produtos.
- Facilitar o envio de pedidos de reserva.
- Permitir a consulta e o tratamento dos pedidos num painel de gestão.
- Centralizar a gestão técnica de vários estabelecimentos numa única aplicação.
- Preparar a expansão para funcionalidades comerciais e operacionais adicionais.

## 4. Funcionalidades implementadas e verificadas

| Área | Implementação / evidência |
|---|---|
| Website público | Página do ALFA acessível através de URL próprio. |
| Menu digital | 15 categorias e 86 produtos importados; apresentação pública confirmada pelo responsável do projecto. |
| Preços | Apresentação dos preços em Kz. |
| Autenticação | Entrada no painel com credenciais Supabase válidas; credenciais inválidas são rejeitadas. |
| Painel de gestão | Consulta de indicadores, categorias, produtos, dados públicos e pedidos de reserva. |
| Menu no painel | Formulários para criação de categorias e produtos. |
| Reservas | Formulário público e acções de confirmação/recusa no painel implementados no código; teste ponta-a-ponta ainda por executar. |
| Deployment | Aplicação publicada em Cloudflare Workers. |
| Base de dados | Supabase PostgreSQL com migrações SQL versionadas. |

## 5. Arquitectura e tecnologias

- **Frontend e aplicação:** Next.js App Router e TypeScript.
- **Interface:** React e Tailwind CSS.
- **Autenticação e dados:** Supabase Auth e PostgreSQL.
- **Segurança de dados:** Row Level Security (RLS) e políticas na base de dados.
- **Internacionalização:** estrutura PT, EN e FR com next-intl.
- **Validação:** Zod.
- **Hosting:** Cloudflare Workers, com adaptador OpenNext.
- **Versionamento e entrega:** GitHub e integração de deployment.

### Modelo multi-tenant

A arquitectura utiliza uma aplicação e uma base de dados partilhadas. Os dados associados a estabelecimentos são relacionados através de tenant_id. O modelo prevê os papéis superadmin, owner e manager. A separação efectiva dos dados depende das políticas RLS e das verificações de autorização no servidor.

**Nota de rigor:** a arquitectura e o esquema de dados foram preparados para multi-tenancy, mas a validação completa de isolamento entre dois estabelecimentos e o fluxo de criação autónoma de novos clientes ainda não estão concluídos. O painel actualmente utilizado na demonstração está ligado ao estabelecimento ALFA.

## 6. Demonstração prática recomendada

1. Abrir o website público do ALFA Beach Bar.
2. Percorrer o menu e mostrar as categorias, os produtos e os preços.
3. Apresentar a área de contactos e o formulário de pedido de reserva.
4. Abrir o painel de gestão e efectuar a autenticação.
5. Mostrar os indicadores de reservas, categorias e produtos.
6. Mostrar a área de dados públicos e os formulários de criação de categorias e produtos.
7. Mostrar a área de pedidos de reserva e as opções de tratamento disponíveis.

**Atenção:** não simular uma reserva como se tivesse sido efectivamente recebida e processada sem executar e verificar o teste no ambiente publicado.

## 7. Limitações conhecidas da versão de demonstração

As seguintes capacidades não devem ser apresentadas como concluídas:

- Onboarding e criação automática de novos estabelecimentos.
- Gestão global de clientes e subscrições comerciais.
- Validação integral do isolamento RLS entre estabelecimentos distintos.
- Gestão completa de membros e atribuição de papéis pela interface.
- Edição e eliminação de produtos e categorias.
- Gestão integral de horários, galerias e ligações sociais pelo painel.
- Tradução editorial dos 86 produtos do ALFA para inglês e francês.
- Integração de pagamentos, facturação e notificações automáticas.
- Testes completos de carga, segurança, recuperação e continuidade.

A estrutura multilingue está presente, mas a importação do menu do ALFA foi efectuada em português. Não se deve afirmar que todo o conteúdo está traduzido.

## 8. Segurança e operação

A solução utiliza Supabase Auth para autenticação e RLS no PostgreSQL para controlar o acesso aos dados. As chaves privadas, em particular a chave service_role, não devem ser expostas no browser nem incluídas no repositório.

Antes de uma abertura comercial, devem ser concluídos:
- testes de autorização para utilizadores sem sessão e para cada papel;
- testes de isolamento entre tenants;
- revisão das server actions e validação de entradas;
- políticas de backup e recuperação;
- monitorização, registo de eventos e procedimento de resposta a incidentes.

## 9. Modelo de exploração comercial proposto

O modelo de negócio a validar é SaaS (Software as a Service): os estabelecimentos utilizam a plataforma mediante subscrição, com planos e funcionalidades definidos comercialmente.

Possíveis componentes de oferta, a validar:
- website e página pública do estabelecimento;
- menu digital e actualização de conteúdos;
- gestão de pedidos de reserva;
- suporte e manutenção;
- funcionalidades avançadas em planos superiores.

Os preços, períodos de demonstração, limites por plano e condições comerciais ainda carecem de decisão e validação junto do mercado. Não são apresentados neste dossier como valores aprovados.

## 10. Próximas etapas

1. Executar e documentar um teste ponta-a-ponta de reserva.
2. Rever as server actions e reforçar verificações explícitas de sessão e papel.
3. Validar RLS com pelo menos dois tenants de teste e utilizadores distintos.
4. Tornar o painel independente do slug fixo ALFA e implementar selecção de tenant autorizada.
5. Completar gestão de horários, contactos, galerias e edição de menu.
6. Preparar onboarding, planos, subscrições e domínios personalizados.
7. Realizar testes de segurança, acessibilidade, desempenho e compatibilidade móvel.

## 11. Conclusão

O ZecaTour dispõe de uma demonstração publicada e funcional, validada no caso-piloto ALFA Beach Bar, com website público, menu digital, autenticação e painel de gestão. A solução apresenta uma base técnica adequada à evolução para um serviço SaaS multiestabelecimento.

A versão apresentada deve ser entendida como **protótipo funcional / MVP de demonstração**, e não ainda como plataforma comercial integralmente concluída. Esta distinção permite demonstrar resultados concretos, apresentar uma arquitectura de expansão e identificar com transparência o trabalho necessário para a entrada em operação comercial.

---
**ZecaTour — uma plataforma digital para hotelaria, restauração e turismo.**